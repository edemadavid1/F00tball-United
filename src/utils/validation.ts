import { z } from 'zod';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './auth';

// Active season date boundaries
export const SEASON_START_DATE = '2026-02-14';
export const SEASON_END_DATE = '2026-12-31';

/**
 * Player performance item validation schema
 */
export const performanceSchema = z.object({
  playerId: z.string().min(1, { message: 'Player must have a valid identifier' }),
  playerName: z.string().min(1, { message: 'Player name is required' }),
  teamSide: z.enum(['home', 'away'], { message: "Team side must be 'home' or 'away'" }),
  goals: z.coerce.number()
    .int({ message: 'Goals must be an integer' })
    .nonnegative({ message: 'Goals must be non-negative' }),
  isMvp: z.boolean().default(false),
});

/**
 * Enterprise-grade Match Validation Schema (Zod)
 */
export const matchSchema = z.object({
  leagueId: z.string().min(1, { message: 'League must have a valid identifier' }),
  matchDate: z.string().refine(
    (dateStr) => {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return false;
      return dateStr >= SEASON_START_DATE && dateStr <= SEASON_END_DATE;
    },
    {
      message: `Match date must fall within the active season bounds (${SEASON_START_DATE} to ${SEASON_END_DATE})`,
    }
  ),
  homeTeamName: z.string().min(1, { message: 'Home team name is required' }),
  awayTeamName: z.string().min(1, { message: 'Away team name is required' }),
  homeScore: z.coerce.number()
    .int({ message: 'Home score must be an integer' })
    .nonnegative({ message: 'Home score must be non-negative' }),
  awayScore: z.coerce.number()
    .int({ message: 'Away score must be an integer' })
    .nonnegative({ message: 'Away score must be non-negative' }),
  isCompleted: z.boolean().default(false),
  homeSquad: z.array(z.string()).refine(
    (arr) => new Set(arr).size === arr.length,
    { message: 'Home team roster cannot contain duplicate players' }
  ),
  awaySquad: z.array(z.string()).refine(
    (arr) => new Set(arr).size === arr.length,
    { message: 'Away team roster cannot contain duplicate players' }
  ),
  performances: z.array(performanceSchema),
})
.superRefine((data, ctx) => {
  // 1. Ensure home and away teams are different
  if (data.homeTeamName.trim().toLowerCase() === data.awayTeamName.trim().toLowerCase()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Home team and Away team names must be unique',
      path: ['awayTeamName'],
    });
  }

  // 2. Ensure players are not double-booked across home and away rosters
  const homeSet = new Set(data.homeSquad);
  const overlaps = data.awaySquad.filter((p) => homeSet.has(p));
  if (overlaps.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Rosters contain overlapping players. A player cannot play on both teams in the same match.',
      path: ['awaySquad'],
    });
  }

  // 3. For completed matches, validate that sum of individual player goals matches team scores
  if (data.isCompleted) {
    const homeGoalsSum = data.performances
      .filter((p) => p.teamSide === 'home')
      .reduce((sum, p) => sum + p.goals, 0);

    const awayGoalsSum = data.performances
      .filter((p) => p.teamSide === 'away')
      .reduce((sum, p) => sum + p.goals, 0);

    if (homeGoalsSum !== data.homeScore) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Sum of home player goals (${homeGoalsSum}) must equal the entered Home Team Score (${data.homeScore})`,
        path: ['homeScore'],
      });
    }

    if (awayGoalsSum !== data.awayScore) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Sum of away player goals (${awayGoalsSum}) must equal the entered Away Team Score (${data.awayScore})`,
        path: ['awayScore'],
      });
    }
  }
});

export type MatchFormValues = z.infer<typeof matchSchema>;

export interface AuditReportItem {
  matchId: string;
  matchDate: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  homePlayerGoalsSum: number;
  awayPlayerGoalsSum: number;
  hasMismatch: boolean;
  mismatchDetails: string;
}

/**
 * React utility function to audit active completed matches against their performances
 */
export async function runGlobalDataAudit(): Promise<AuditReportItem[]> {
  try {
    const matchesSnap = await getDocs(
      query(collection(db, 'go_matches_prod'), where('is_completed', '==', true))
    );
    const matches = matchesSnap.docs.map(d => d.data());

    const performancesSnap = await getDocs(collection(db, 'match_performances'));
    const performances = performancesSnap.docs.map(d => d.data());

    const reports: AuditReportItem[] = [];

    for (const match of matches) {
      const matchPerfs = performances.filter(p => p.match_id === match.id);

      const homeGoalsSum = matchPerfs
        .filter((p) => p.team_side === 'home')
        .reduce((sum, p) => sum + (p.goals || 0), 0);

      const awayGoalsSum = matchPerfs
        .filter((p) => p.team_side === 'away')
        .reduce((sum, p) => sum + (p.goals || 0), 0);

      const homeMismatch = homeGoalsSum !== (match.home_score || 0);
      const awayMismatch = awayGoalsSum !== (match.away_score || 0);
      const hasMismatch = homeMismatch || awayMismatch;

      let mismatchDetails = 'Data Healthy';
      if (homeMismatch && awayMismatch) {
        mismatchDetails = `Home player goals sum (${homeGoalsSum}) vs team score (${match.home_score}) AND Away goals sum (${awayGoalsSum}) vs team score (${match.away_score}) mismatch.`;
      } else if (homeMismatch) {
        mismatchDetails = `Home player goals sum (${homeGoalsSum}) vs team score (${match.home_score}) mismatch.`;
      } else if (awayMismatch) {
        mismatchDetails = `Away player goals sum (${awayGoalsSum}) vs team score (${match.away_score}) mismatch.`;
      }

      reports.push({
        matchId: match.id,
        matchDate: match.match_date,
        homeTeam: match.home_team_name,
        awayTeam: match.away_team_name,
        homeScore: match.home_score || 0,
        awayScore: match.away_score || 0,
        homePlayerGoalsSum: homeGoalsSum,
        awayPlayerGoalsSum: awayGoalsSum,
        hasMismatch,
        mismatchDetails,
      });
    }

    return reports;
  } catch (error) {
    console.error('Audit failed to run:', error);
    return [];
  }
}

/**
 * Triggers the backend validator endpoint to ensure all Match Cards are synced with Session Cards
 */
export async function callBackendSyncValidator() {
  try {
    const response = await fetch('/api/sync/validate_matches_sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (response.ok) {
      const data = await response.json();
      console.log('✅ [Backend Sync Validator]', data.message, data);
      return data;
    } else {
      console.warn('⚠️ [Backend Sync Validator] HTTP status:', response.status);
    }
  } catch (e) {
    console.error('❌ [Backend Sync Validator] Call failed:', e);
  }
  return null;
}

/**
 * Fetches backend registered present players for a session or match
 */
export async function fetchSessionPresentPlayers(sessionIdOrDate: string) {
  try {
    const response = await fetch('/api/session/present_players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionIdOrDate })
    });
    if (response.ok) {
      const data = await response.json();
      return data.present_players || [];
    }
  } catch (e) {
    console.error('❌ [Fetch Present Players] Call failed:', e);
  }
  return null;
}


