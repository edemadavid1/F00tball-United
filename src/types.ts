export interface Player {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: 'Active' | 'Inactive';
  joinDate: string;
  avatar?: string;
  jerseyNumber?: number;
  position?: string;
  annualDuePaid?: boolean;
  volunteeredToCook?: boolean;
  cookDate?: string;
  endOfYearPartyAttendee?: boolean;
}

export interface Session {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  leagueId?: string;
  matchId?: string;
  type: 'League Match' | 'Friendly Match';
  status: 'Completed' | 'Upcoming';
  feePerPlayer: number;
  recurringGroupId?: string;
  isRecurring?: boolean;
  matchGoals?: MatchGoal[];
  matchHomeScore?: number;
  matchAwayScore?: number;
  playerOfMatch?: string;
  potdWinner?: string;
  homeTeam?: string;
  awayTeam?: string;
  homeRoster?: string[];
  awayRoster?: string[];
  sessionTeams?: string[];
}

export interface AttendanceRecord {
  sessionId: string;
  playerId: string;
  status: 'Present' | 'Absent' | 'Excused';
  feePaid: boolean;
  notes?: string;
  arrivalTime?: string;
}

export interface League {
  id: string;
  name: string;
  season: string;
  sport: string;
  status: 'Active' | 'Completed';
  format?: 'once' | 'twice' | 'unlimited';
  startDate?: string;
  endDate?: string;
}

export interface TeamStanding {
  id: string;
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  ppg?: number;
}

export interface LeagueStanding {
  leagueId: string;
  standings: TeamStanding[];
}

export interface MatchGoal {
  id: string;
  playerId: string;
  playerName: string;
  team: 'home' | 'away' | null;
  type: 'League' | 'Friendly';
}

export interface Match {
  id: string;
  tournament_id?: string;
  round_number?: number | string;
  round_name?: string;
  home_team_id?: string;
  away_team_id?: string;
  home_team?: string;
  away_team?: string;
  home_score?: number;
  away_score?: number;
  winner_id?: string;
  winner_team?: string;
  next_match_id?: string;
  next_match_slot?: 'home' | 'away';
  is_two_legged?: boolean;
  two_legged?: boolean;
  leg?: number; // 1 or 2
  paired_match_id?: string; // Leg 1 or Leg 2 partner
  aggregate_home_score?: number;
  aggregate_away_score?: number;
  extra_time_home?: number;
  extra_time_away?: number;
  penalties_home?: number;
  penalties_away?: number;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'Played' | 'Scheduled' | 'Live' | string;
  group_name?: string; // e.g. "Group A"
  date?: string;
  title?: string;
  match_type?: 'Friendly Match' | 'League Match' | 'Tournament';
  forfeit_team?: string;
  home_roster?: string[];
  away_roster?: string[];
  homeRoster?: string[];
  awayRoster?: string[];
  attendance?: Record<string, any>;
  player_teams?: Record<string, 'home' | 'away'>;
  scorers?: Array<{ player_id?: string; name?: string; player?: string; goals: number }>;
  potd_winners?: string[];
}

export interface TournamentConfig {
  id?: string;
  name: string;
  type: 'Group Stage + Knockout' | 'Single Elimination Knockout';
  two_legged: boolean;
  number_of_teams?: number;
  advance_per_group?: number;
  status: 'draft' | 'active' | 'completed';
  start_date?: string;
}

export interface LeagueMatch extends Match {
  leagueId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  type?: 'League Match' | 'Friendly Match' | 'Tournament';
  matchNumber?: number;
  playerOfMatch?: string;
  potdWinner?: string;
  format?: string;
  homeSquad?: string[];
  awaySquad?: string[];
  homeRoster?: string[];
  awayRoster?: string[];
  goals?: MatchGoal[];
}

export type AppStateTree = any;

export interface ActivityLog {
  id: string;
  timestamp: string;
  type: 'Session' | 'Player' | 'League' | 'Attendance';
  message: string;
  detail: string;
}
