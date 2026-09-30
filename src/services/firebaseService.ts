import { db } from '../utils/auth';
import { AppStateTree } from '../types';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc,
  deleteDoc, 
  updateDoc, 
  query, 
  where, 
  writeBatch 
} from 'firebase/firestore';

export interface MatchPayload {
  leagueId: string;
  matchDate: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore?: string | number | null;
  awayScore?: string | number | null;
  isCompleted?: boolean;
}

export interface PerformancePayload {
  playerId: string;
  teamSide: 'home' | 'away';
  goals: string | number;
  isMvc?: boolean; // Most Valuable Player
}

/**
 * Validates scores as integers and cleans payloads.
 */
function validateAndParseScore(score: string | number | null | undefined): number | null {
  if (score === undefined || score === null || score === '') {
    return null;
  }
  const parsed = parseInt(String(score), 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Helper to generate a random UUID-like ID if needed
 */
function generateUUID(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Create a new match in Firestore with validation and corresponding performance metrics
 */
export async function createMatch(match: MatchPayload, performances: PerformancePayload[] = []) {
  const matchId = generateUUID();
  const homeScore = validateAndParseScore(match.homeScore);
  const awayScore = validateAndParseScore(match.awayScore);

  const batch = writeBatch(db);

  // 1. Create match document
  const matchRef = doc(db, 'go_matches_prod', matchId);
  const matchData = {
    id: matchId,
    league_id: match.leagueId,
    match_date: match.matchDate,
    home_team_name: match.homeTeamName,
    away_team_name: match.awayTeamName,
    home_score: homeScore,
    away_score: awayScore,
    is_completed: match.isCompleted ?? false,
    created_at: new Date().toISOString()
  };
  batch.set(matchRef, matchData);

  // 2. Create performance documents
  performances.forEach(perf => {
    // Unique performance document ID: matchId_playerId
    const perfId = `${matchId}_${perf.playerId}`;
    const perfRef = doc(db, 'match_performances', perfId);
    batch.set(perfRef, {
      id: perfId,
      match_id: matchId,
      player_id: perf.playerId,
      team_side: perf.teamSide,
      goals: parseInt(String(perf.goals), 10) || 0,
      is_mvp: perf.isMvc ?? false,
      created_at: new Date().toISOString()
    });
  });

  await batch.commit();
  return matchData;
}

/**
 * Update an existing match record in Firestore
 */
export async function updateMatch(
  matchId: string, 
  updates: Partial<MatchPayload>, 
  performances?: PerformancePayload[]
) {
  const batch = writeBatch(db);

  // 1. Prepare match update payload
  const payload: Record<string, any> = {};
  if (updates.leagueId !== undefined) payload.league_id = updates.leagueId;
  if (updates.matchDate !== undefined) payload.match_date = updates.matchDate;
  if (updates.homeTeamName !== undefined) payload.home_team_name = updates.homeTeamName;
  if (updates.awayTeamName !== undefined) payload.away_team_name = updates.awayTeamName;
  if (updates.homeScore !== undefined) payload.home_score = validateAndParseScore(updates.homeScore);
  if (updates.awayScore !== undefined) payload.away_score = validateAndParseScore(updates.awayScore);
  if (updates.isCompleted !== undefined) payload.is_completed = updates.isCompleted;

  const matchRef = doc(db, 'go_matches_prod', matchId);
  batch.update(matchRef, payload);

  // 2. Synchronize performances if provided
  if (performances !== undefined) {
    // Find all existing performances for this match and delete them
    const q = query(collection(db, 'match_performances'), where('match_id', '==', matchId));
    const snapshot = await getDocs(q);
    snapshot.forEach(docSnap => {
      batch.delete(doc(db, 'match_performances', docSnap.id));
    });

    // Create new ones
    performances.forEach(perf => {
      const perfId = `${matchId}_${perf.playerId}`;
      const perfRef = doc(db, 'match_performances', perfId);
      batch.set(perfRef, {
        id: perfId,
        match_id: matchId,
        player_id: perf.playerId,
        team_side: perf.teamSide,
        goals: parseInt(String(perf.goals), 10) || 0,
        is_mvp: perf.isMvc ?? false,
        created_at: new Date().toISOString()
      });
    });
  }

  await batch.commit();
  
  // Return updated match document
  const updatedSnap = await getDoc(matchRef);
  return updatedSnap.data();
}

/**
 * Delete a match and its performances from Firestore
 */
export async function deleteMatch(matchId: string): Promise<boolean> {
  const batch = writeBatch(db);

  // 1. Delete match document
  const matchRef = doc(db, 'go_matches_prod', matchId);
  batch.delete(matchRef);

  // 2. Delete all related performances
  const q = query(collection(db, 'match_performances'), where('match_id', '==', matchId));
  const snapshot = await getDocs(q);
  snapshot.forEach(docSnap => {
    batch.delete(doc(db, 'match_performances', docSnap.id));
  });

  await batch.commit();
  return true;
}

/**
 * Migration & database seeding script for Firestore players
 */
export async function seedBaselineCanonicalData(): Promise<{ success: boolean; playersInserted: number }> {
  const baselinePlayers = [
    'Jerry',
    'Charles',
    'Tumishe',
    'John',
    'Tunde',
    'Ike',
    'Ike (New)',
    'Obinna',
    'Chidi'
  ];

  console.log('Starting seed execution for canonical players in Firestore...');
  let insertedCount = 0;

  for (const name of baselinePlayers) {
    // Check if player already exists in the 'go_players_prod' collection
    const q = query(collection(db, 'go_players_prod'), where('canonical_name', '==', name));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      const playerId = generateUUID();
      const playerRef = doc(db, 'go_players_prod', playerId);
      const playerObj = {
        id: playerId,
        canonical_name: name,
        name: name,
        status: 'Active',
        joinDate: '2026-02-14',
        created_at: new Date().toISOString()
      };
      
      await setDoc(playerRef, playerObj);
      insertedCount++;
      console.log(`Seeded Firestore player "${name}" with ID: ${playerId}`);

      // Seed aliases if appropriate
      if (name === 'Jerry') {
        const alias1Id = generateUUID();
        await setDoc(doc(db, 'player_aliases', alias1Id), {
          id: alias1Id,
          player_id: playerId,
          alias_name: 'Jerry (Captain)',
          created_at: new Date().toISOString()
        });

        const alias2Id = generateUUID();
        await setDoc(doc(db, 'player_aliases', alias2Id), {
          id: alias2Id,
          player_id: playerId,
          alias_name: 'Jerry (Onye Army)',
          created_at: new Date().toISOString()
        });
      } else if (name === 'Ike') {
        const aliasId = generateUUID();
        await setDoc(doc(db, 'player_aliases', aliasId), {
          id: aliasId,
          player_id: playerId,
          alias_name: 'Ike (Veteran)',
          created_at: new Date().toISOString()
        });
      }
    } else {
      console.log(`Player "${name}" already registered in Firestore.`);
    }
  }

  // Also defensively seed leagues if they do not exist
  const leaguesToSeed = [
    { name: "Player League", start_date: "2026-02-28", end_date: "2026-06-27" },
    { name: "Captain's League", start_date: "2026-03-14", end_date: "2026-06-27" }
  ];

  for (const l of leaguesToSeed) {
    const q = query(collection(db, 'leagues'), where('name', '==', l.name));
    const snap = await getDocs(q);
    if (snap.empty) {
      const leagueId = generateUUID();
      await setDoc(doc(db, 'leagues', leagueId), {
        id: leagueId,
        name: l.name,
        start_date: l.start_date,
        end_date: l.end_date,
        created_at: new Date().toISOString()
      });
      console.log(`Seeded Firestore league "${l.name}" with ID: ${leagueId}`);
    }
  }

  return { success: true, playersInserted: insertedCount };
}

import { safeJsonStringify } from '../utils/safeJson';

export interface MatchEntityPayload {
  id: string;
  tournament_id?: string;
  round_number?: number;
  round_name?: string;
  home_team_id?: string;
  away_team_id?: string;
  home_team?: string;
  away_team?: string;
  home_score?: number | null;
  away_score?: number | null;
  winner_id?: string | null;
  winner_team?: string | null;
  next_match_id?: string | null;
  next_match_slot?: 'home' | 'away';
  is_two_legged?: boolean;
  leg?: number;
  aggregate_home_score?: number | null;
  aggregate_away_score?: number | null;
  extra_time_home?: number | null;
  extra_time_away?: number | null;
  penalties_home?: number | null;
  penalties_away?: number | null;
  status?: 'scheduled' | 'in_progress' | 'completed';
  group_name?: string;
  match_type?: 'Friendly Match' | 'League Match' | 'Tournament';
  date?: string;
  title?: string;
  forfeit_team?: string;
}

/**
 * Evaluates the winner of a match entity and advances them to the linked next_match_id in Firestore
 */
export async function evaluateAndAdvanceMatch(
  match: MatchEntityPayload, 
  allMatches: MatchEntityPayload[] = []
): Promise<{ updatedMatch: MatchEntityPayload; nextMatch?: MatchEntityPayload }> {
  const homeScore = Number(match.home_score ?? 0);
  const awayScore = Number(match.away_score ?? 0);
  let winnerId: string | null = null;
  let winnerTeam: string | null = null;

  // Handle Aggregate Scores for Two-Legged Ties
  if (match.is_two_legged && match.leg === 2) {
    const leg1 = allMatches.find(m => 
      m.tournament_id === match.tournament_id && 
      m.round_number === match.round_number && 
      m.leg === 1 &&
      ((m.home_team_id === match.away_team_id && m.away_team_id === match.home_team_id) ||
       (m.home_team === match.away_team && m.away_team === match.home_team))
    );

    const leg1HomeScore = Number(leg1?.home_score ?? 0);
    const leg1AwayScore = Number(leg1?.away_score ?? 0);

    // In Leg 2, current home team was away team in Leg 1
    const totalCurrentHome = homeScore + leg1AwayScore;
    const totalCurrentAway = awayScore + leg1HomeScore;

    match.aggregate_home_score = totalCurrentHome;
    match.aggregate_away_score = totalCurrentAway;

    if (totalCurrentHome > totalCurrentAway) {
      winnerId = match.home_team_id || match.home_team || 'Home';
      winnerTeam = match.home_team || 'Home';
    } else if (totalCurrentAway > totalCurrentHome) {
      winnerId = match.away_team_id || match.away_team || 'Away';
      winnerTeam = match.away_team || 'Away';
    } else {
      // Aggregate tie: check extra time or penalties
      const etH = Number(match.extra_time_home ?? 0);
      const etA = Number(match.extra_time_away ?? 0);
      const penH = Number(match.penalties_home ?? 0);
      const penA = Number(match.penalties_away ?? 0);

      if (etH !== etA) {
        winnerId = etH > etA ? (match.home_team_id || match.home_team || 'Home') : (match.away_team_id || match.away_team || 'Away');
        winnerTeam = etH > etA ? match.home_team || 'Home' : match.away_team || 'Away';
      } else if (penH !== penA) {
        winnerId = penH > penA ? (match.home_team_id || match.home_team || 'Home') : (match.away_team_id || match.away_team || 'Away');
        winnerTeam = penH > penA ? match.home_team || 'Home' : match.away_team || 'Away';
      }
    }
  } else {
    // Standard Single Match Evaluation
    if (homeScore > awayScore) {
      winnerId = match.home_team_id || match.home_team || 'Home';
      winnerTeam = match.home_team || 'Home';
    } else if (awayScore > homeScore) {
      winnerId = match.away_team_id || match.away_team || 'Away';
      winnerTeam = match.away_team || 'Away';
    } else if (match.status === 'completed') {
      const penH = Number(match.penalties_home ?? 0);
      const penA = Number(match.penalties_away ?? 0);
      if (penH !== penA) {
        winnerId = penH > penA ? (match.home_team_id || match.home_team || 'Home') : (match.away_team_id || match.away_team || 'Away');
        winnerTeam = penH > penA ? match.home_team || 'Home' : match.away_team || 'Away';
      }
    }
  }

  match.winner_id = winnerId;
  match.winner_team = winnerTeam;

  const batch = writeBatch(db);
  const matchRef = doc(db, 'go_matches_prod', String(match.id));
  batch.set(matchRef, sanitizeForFirestore(match), { merge: true });

  let updatedNextMatch: MatchEntityPayload | undefined;

  // Advance winner to the next match if configured
  if (winnerId && match.next_match_id) {
    const nextMatchRef = doc(db, 'go_matches_prod', String(match.next_match_id));
    const nextMatchSnap = await getDoc(nextMatchRef);
    
    if (nextMatchSnap.exists()) {
      const nextMatchData = nextMatchSnap.data() as MatchEntityPayload;
      const targetSlot = match.next_match_slot || (!nextMatchData.home_team_id && !nextMatchData.home_team ? 'home' : 'away');

      if (targetSlot === 'home') {
        nextMatchData.home_team_id = winnerId;
        nextMatchData.home_team = winnerTeam || winnerId;
      } else {
        nextMatchData.away_team_id = winnerId;
        nextMatchData.away_team = winnerTeam || winnerId;
      }

      batch.set(nextMatchRef, sanitizeForFirestore(nextMatchData), { merge: true });
      updatedNextMatch = nextMatchData;
    }
  }

  await batch.commit();
  return { updatedMatch: match, nextMatch: updatedNextMatch };
}

function sanitizeForFirestore(val: any, visited = new WeakSet()): any {
  if (val === undefined || val === null) {
    return null;
  }
  if (typeof val === 'function' || typeof val === 'symbol') {
    return null;
  }
  if (typeof val === 'object') {
    if (visited.has(val)) {
      return null; // break circular references
    }
    visited.add(val);

    if ('nodeType' in val || (val.constructor && val.constructor.name === 'HTMLDocument') || val === window) {
      return null;
    }

    if (Array.isArray(val)) {
      return val
        .map(item => sanitizeForFirestore(item, visited))
        .filter(item => item !== undefined);
    }

    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(val)) {
      if (key.startsWith('_') || key.startsWith('$$')) continue;
      const cleanedVal = sanitizeForFirestore(val[key], visited);
      if (cleanedVal !== undefined) {
        cleaned[key] = cleanedVal;
      }
    }
    return cleaned;
  }
  return val;
}

export async function backupAppStateToCloudAndLocal(stateTree: AppStateTree): Promise<void> {
  const timestamp = Date.now();
  const backupObj = {
    timestamp,
    ...stateTree
  };

  // 1. Local rolling backup (retaining last 10 snapshots in gameon_emergency_backups)
  try {
    localStorage.setItem('gameon_backup_rolling', safeJsonStringify(backupObj));

    const existingStr = localStorage.getItem('gameon_emergency_backups');
    let snapshots: any[] = [];
    if (existingStr) {
      try {
        snapshots = JSON.parse(existingStr);
        if (!Array.isArray(snapshots)) snapshots = [];
      } catch (e) {
        snapshots = [];
      }
    }
    snapshots.push(backupObj);
    if (snapshots.length > 10) {
      snapshots = snapshots.slice(snapshots.length - 10);
    }
    localStorage.setItem('gameon_emergency_backups', safeJsonStringify(snapshots));
  } catch (err) {
    console.error('Failed writing rolling/emergency backups to localStorage:', err);
  }

  // 2. Silent Firestore backup (Write both timestamped and latest documents if connected)
  try {
    const sanitizedBackupObj = sanitizeForFirestore(backupObj);
    const backupRef = doc(db, 'backups', `backup_${timestamp}`);
    await setDoc(backupRef, sanitizedBackupObj);

    const latestRef = doc(db, 'backups', 'latest');
    await setDoc(latestRef, sanitizedBackupObj);
  } catch (err) {
    console.error('Failed uploading backups to Firestore:', err);
  }
}

export async function getLatestCloudBackup(): Promise<any | null> {
  try {
    const backupRef = doc(db, 'backups', 'latest');
    const snap = await getDoc(backupRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    console.error('Failed reading backup from Firestore:', err);
  }
  return null;
}
