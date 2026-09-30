import { Player, Session, AttendanceRecord, League, LeagueStanding, LeagueMatch, ActivityLog, MatchGoal } from '../types';

export const INITIAL_PLAYERS: Player[] = [
  { id: 'p-jerry', name: 'Jerry', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 10, position: 'Midfielder', annualDuePaid: true, volunteeredToCook: true, cookDate: '2026-04-25', endOfYearPartyAttendee: true },
  { id: 'p-charles', name: 'Charles', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 4, position: 'Defender', annualDuePaid: true, volunteeredToCook: false, endOfYearPartyAttendee: true },
  { id: 'p-tumishe', name: 'Tumishe', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 9, position: 'Forward', annualDuePaid: true, volunteeredToCook: false, endOfYearPartyAttendee: true },
  { id: 'p-john', name: 'John', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 8, position: 'Midfielder', annualDuePaid: true, volunteeredToCook: false, endOfYearPartyAttendee: true },
  { id: 'p-tunde', name: 'Tunde', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 1, position: 'Goalkeeper', annualDuePaid: true, volunteeredToCook: false, endOfYearPartyAttendee: true },
  { id: 'p-david', name: 'David', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 5, position: 'Defender' },
  { id: 'p-nd', name: 'ND', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 7, position: 'Midfielder' },
  { id: 'p-kennedy', name: 'Kennedy (Cana)', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 11, position: 'Forward' },
  { id: 'p-ibraheem', name: 'Ibraheem', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 14, position: 'Midfielder' },
  { id: 'p-samson', name: 'Samson (Shola)', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 6, position: 'Defender' },
  { id: 'p-ojukwu', name: 'Ojukwu', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 3, position: 'Defender' },
  { id: 'p-dodo', name: 'Dodo', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 17, position: 'Forward' },
  { id: 'p-alive', name: 'Alive', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 12, position: 'Midfielder' },
  { id: 'p-osanga', name: 'Osanga', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 2, position: 'Defender' },
  { id: 'p-mayor', name: 'Mayor', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 15, position: 'Forward' },
  { id: 'p-solomon', name: 'Solomon', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 18, position: 'Midfielder' },
  { id: 'p-tomi', name: 'Tomi', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 20, position: 'Forward' },
  { id: 'p-nnamdi', name: 'Nnamdi', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 21, position: 'Defender' },
  { id: 'p-ike-new', name: 'Ike (New)', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 22, position: 'Midfielder' },
  { id: 'p-john-t', name: 'John T', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 23, position: 'Midfielder' },
  { id: 'p-skipo', name: 'Skipo', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 24, position: 'Forward' },
  { id: 'p-odum', name: 'Odum', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 25, position: 'Defender' },
  { id: 'p-success', name: 'Success', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 26, position: 'Forward' },
  { id: 'p-tj', name: 'TJ', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 27, position: 'Midfielder' },
  { id: 'p-diki', name: 'Diki', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 28, position: 'Defender' },
  { id: 'p-vincent', name: 'Vincent', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 29, position: 'Forward' },
  { id: 'p-juwal', name: 'Juwal', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 30, position: 'Midfielder' },
  { id: 'p-tosin', name: 'Tosin', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 31, position: 'Defender' },
  { id: 'p-kester', name: 'Kester', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 32, position: 'Forward' },
  { id: 'p-kosi', name: 'Kosi', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 33, position: 'Midfielder' },
  { id: 'p-deco', name: 'Deco', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 34, position: 'Midfielder' },
  { id: 'p-alex', name: 'Alex', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 35, position: 'Defender' },
  { id: 'p-destiny', name: 'Destiny', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 36, position: 'Forward' },
  { id: 'p-stafoo', name: 'Stafoo', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 37, position: 'Midfielder' },
  { id: 'p-george', name: 'George', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 38, position: 'Defender' },
  { id: 'p-philip', name: 'Philip', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 39, position: 'Forward' },
  { id: 'p-emeka', name: 'Emeka', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 40, position: 'Midfielder' },
  { id: 'p-frank', name: 'Frank', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 41, position: 'Defender' },
  { id: 'p-chinedu', name: 'Chinedu', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 42, position: 'Forward' },
  { id: 'p-dennis', name: 'Dennis', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 43, position: 'Midfielder' },
  { id: 'p-pablo', name: 'Pablo', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 44, position: 'Defender' },
  { id: 'p-obi', name: 'Obi', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 45, position: 'Forward' },
  { id: 'p-igwe', name: 'Igwe', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 46, position: 'Midfielder' },
  { id: 'p-geoffrey', name: 'Geoffrey', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 47, position: 'Defender' },
  { id: 'p-sheriff', name: 'Sheriff', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 48, position: 'Forward' },
  { id: 'p-jeff', name: 'Jeff', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 49, position: 'Midfielder' },
  { id: 'p-uche', name: 'Uche', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 50, position: 'Defender' },
  { id: 'p-ugo', name: 'Ugo', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 51, position: 'Forward' },
  { id: 'p-ike', name: 'Ike', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 52, position: 'Midfielder' },
  { id: 'p-joseph', name: 'Joseph', status: 'Active', joinDate: '2026-02-14', jerseyNumber: 53, position: 'Defender' }
];

export const INITIAL_LEAGUES: League[] = [
  {
    id: 'l-3',
    name: "League",
    season: 'Season 2026',
    sport: 'Football',
    status: 'Active',
    format: 'once',
    startDate: '2026-02-28',
    endDate: '2026-06-27'
  }
];

export const INITIAL_STANDINGS: LeagueStanding[] = [
  {
    leagueId: 'l-3',
    standings: [
      { id: 't-3-1', name: 'JERRY', played: 4, won: 2, drawn: 2, lost: 0, goalsFor: 6, goalsAgainst: 3, points: 8 },
      { id: 't-3-2', name: 'SHOLA', played: 4, won: 1, drawn: 3, lost: 0, goalsFor: 4, goalsAgainst: 3, points: 6 },
      { id: 't-3-3', name: 'OJUKWU', played: 4, won: 1, drawn: 3, lost: 0, goalsFor: 4, goalsAgainst: 3, points: 6 },
      { id: 't-3-4', name: 'JOHN T', played: 3, won: 1, drawn: 2, lost: 0, goalsFor: 3, goalsAgainst: 2, points: 5 },
      { id: 't-3-5', name: 'DAVID', played: 4, won: 1, drawn: 2, lost: 1, goalsFor: 4, goalsAgainst: 4, points: 5 },
      { id: 't-3-6', name: 'ND', played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 3, goalsAgainst: 3, points: 4 },
      { id: 't-3-7', name: 'IBRAHEEM', played: 4, won: 0, drawn: 2, lost: 2, goalsFor: 2, goalsAgainst: 4, points: 2 },
      { id: 't-3-8', name: 'OSANGA', played: 4, won: 0, drawn: 1, lost: 3, goalsFor: 1, goalsAgainst: 5, points: 1 }
    ]
  }
];

// 20 match days, Saturdays from 14 Feb 2026 to 27 Jun 2026
const DEFAULT_HOME_7 = ['p-jerry', 'p-charles', 'p-tumishe', 'p-john', 'p-tunde', 'p-david', 'p-nd'];
const DEFAULT_AWAY_7 = ['p-kennedy', 'p-ibraheem', 'p-samson', 'p-ojukwu', 'p-dodo', 'p-alive', 'p-osanga'];

export const INITIAL_MATCHES: LeagueMatch[] = [];

export const INITIAL_SESSIONS: Session[] = [];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];

export const INITIAL_LOGS: ActivityLog[] = [
  {
    id: 'log-1',
    timestamp: '2026-02-28T12:00:00Z',
    type: 'League',
    message: 'Season initialized',
    detail: "Captain's League 2026 records activated successfully."
  }
];
