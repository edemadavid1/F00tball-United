import { Player, Session, AttendanceRecord, League, TeamStanding, LeagueMatch, ActivityLog } from '../types';
import { normalizeDateToISO } from '../utils/dateUtils';
import { safeJsonStringify } from '../utils/safeJson';

export interface GameOnAppState {
  players: Player[];
  sessions: Session[];
  attendance: AttendanceRecord[];
  leagues: League[];
  standings: Record<string, TeamStanding[]>;
  matches: LeagueMatch[];
  logs: ActivityLog[];
}

class GameOnAppStoreClass {
  private state: GameOnAppState = {
    players: [],
    sessions: [],
    attendance: [],
    leagues: [],
    standings: {},
    matches: [],
    logs: [],
  };

  private listeners: Set<() => void> = new Set();

  constructor() {
    this.load();
  }

  public getState(): GameOnAppState {
    return { ...this.state };
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  public load(): GameOnAppState {
    try {
      const p = localStorage.getItem('gameon_players');
      const s = localStorage.getItem('gameon_sessions');
      const a = localStorage.getItem('gameon_attendance');
      const l = localStorage.getItem('gameon_leagues');
      const st = localStorage.getItem('gameon_standings');
      const m = localStorage.getItem('gameon_matches');
      const lo = localStorage.getItem('gameon_logs');

      this.state.players = p ? JSON.parse(p) : [];
      this.state.sessions = s ? JSON.parse(s) : [];
      this.state.attendance = a ? JSON.parse(a) : [];
      this.state.leagues = l ? JSON.parse(l) : [];
      this.state.standings = st ? JSON.parse(st) : {};
      this.state.matches = m ? JSON.parse(m) : [];
      this.state.logs = lo ? JSON.parse(lo) : [];
    } catch (e) {
      console.error('Failed to load GameOnAppStore from localStorage', e);
    }
    return this.state;
  }

  public save(updates: Partial<GameOnAppState>) {
    this.state = {
      ...this.state,
      ...updates,
    };

    if (updates.players !== undefined) localStorage.setItem('gameon_players', safeJsonStringify(this.state.players));
    if (updates.sessions !== undefined) localStorage.setItem('gameon_sessions', safeJsonStringify(this.state.sessions));
    if (updates.attendance !== undefined) localStorage.setItem('gameon_attendance', safeJsonStringify(this.state.attendance));
    if (updates.leagues !== undefined) localStorage.setItem('gameon_leagues', safeJsonStringify(this.state.leagues));
    if (updates.standings !== undefined) localStorage.setItem('gameon_standings', safeJsonStringify(this.state.standings));
    if (updates.matches !== undefined) localStorage.setItem('gameon_matches', safeJsonStringify(this.state.matches));
    if (updates.logs !== undefined) localStorage.setItem('gameon_logs', safeJsonStringify(this.state.logs));

    this.notify();
  }

  /**
   * Automatic synchronization function that recalculates standings for a given league
   * whenever a match result is entered/updated.
   */
  public syncMatchToLeague(updatedMatch: LeagueMatch): {
    updatedMatches: LeagueMatch[];
    freshStandings: TeamStanding[];
  } {
    const updatedMatches = this.state.matches.map(m => m.id === updatedMatch.id ? updatedMatch : m);
    const leagueId = updatedMatch.leagueId;
    let leagueMatches = updatedMatches.filter(m => (m.leagueId === leagueId || !m.leagueId || m.type === 'Friendly Match') && m.status === 'Played');
    
    const startBoundStr = '2026-02-14';
    
    leagueMatches = leagueMatches.filter(m => {
      const isoDate = normalizeDateToISO(m.date);
      return isoDate >= startBoundStr;
    });

    const currentLeagueTeams = this.state.standings[leagueId] || [];

    // Reset stats to recalculate cleanly
    const freshStandings: TeamStanding[] = currentLeagueTeams.map(team => ({
      ...team,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0
    }));

    leagueMatches.forEach(m => {
      const hScore = parseInt(m.homeScore as any, 10) || 0;
      const aScore = parseInt(m.awayScore as any, 10) || 0;

      const homeTeamNode = freshStandings.find(t => t.name === m.homeTeam);
      const awayTeamNode = freshStandings.find(t => t.name === m.awayTeam);

      if (homeTeamNode && awayTeamNode) {
        homeTeamNode.played = (parseInt(homeTeamNode.played as any, 10) || 0) + 1;
        awayTeamNode.played = (parseInt(awayTeamNode.played as any, 10) || 0) + 1;
        homeTeamNode.goalsFor = (parseInt(homeTeamNode.goalsFor as any, 10) || 0) + hScore;
        homeTeamNode.goalsAgainst = (parseInt(homeTeamNode.goalsAgainst as any, 10) || 0) + aScore;
        awayTeamNode.goalsFor = (parseInt(awayTeamNode.goalsFor as any, 10) || 0) + aScore;
        awayTeamNode.goalsAgainst = (parseInt(awayTeamNode.goalsAgainst as any, 10) || 0) + hScore;

        if (hScore > aScore) {
          homeTeamNode.won = (parseInt(homeTeamNode.won as any, 10) || 0) + 1;
          homeTeamNode.points = (parseInt(homeTeamNode.points as any, 10) || 0) + 3;
          awayTeamNode.lost = (parseInt(awayTeamNode.lost as any, 10) || 0) + 1;
        } else if (hScore < aScore) {
          awayTeamNode.won = (parseInt(awayTeamNode.won as any, 10) || 0) + 1;
          awayTeamNode.points = (parseInt(awayTeamNode.points as any, 10) || 0) + 3;
          homeTeamNode.lost = (parseInt(homeTeamNode.lost as any, 10) || 0) + 1;
        } else {
          homeTeamNode.drawn = (parseInt(homeTeamNode.drawn as any, 10) || 0) + 1;
          homeTeamNode.points = (parseInt(homeTeamNode.points as any, 10) || 0) + 1;
          awayTeamNode.drawn = (parseInt(awayTeamNode.drawn as any, 10) || 0) + 1;
          awayTeamNode.points = (parseInt(awayTeamNode.points as any, 10) || 0) + 1;
        }
      }
    });

    // Sort the standings dynamically to ensure the table displays correctly: Points DESC -> GD DESC -> GF DESC
    freshStandings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdA = a.goalsFor - a.goalsAgainst;
      const gdB = b.goalsFor - b.goalsAgainst;
      if (gdB !== gdA) return gdB - gdA;
      return b.goalsFor - a.goalsFor;
    });

    return {
      updatedMatches,
      freshStandings
    };
  }
}

export const GameOnAppStore = new GameOnAppStoreClass();
if (typeof window !== 'undefined') {
  (window as any).GameOnAppStore = GameOnAppStore;
}

