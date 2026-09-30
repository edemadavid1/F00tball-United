import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, 
  Calendar as CalendarIcon, 
  Users, 
  FileText, 
  RefreshCw, 
  Clock, 
  LayoutDashboard,
  MapPin,
  Flame,
  Award,
  Sun,
  Moon,
  Trash2,
  Smartphone,
  Download,
  Share,
  PlusSquare,
  X
} from 'lucide-react';
import { Player, Session, AttendanceRecord, League, TeamStanding, LeagueStanding, LeagueMatch, ActivityLog, MatchGoal } from './types';
import { normalizePlayerName } from './utils/nameUtils';
import { db } from './utils/auth';
import { doc, getDocs, setDoc, collection, onSnapshot } from 'firebase/firestore';
import { backupAppStateToCloudAndLocal, getLatestCloudBackup } from './services/firebaseService';
import { safeJsonStringify } from './utils/safeJson';

const isCaptainsLeagueId = (id: string) => {
  if (!id) return false;
  const norm = String(id).toLowerCase().replace(/['’]/g, '').trim();
  return norm === 'l-3' || norm === 'l-captain' || norm === 'captains_league' || norm === "captain's league" || norm === "captains league" || norm.includes('captain') || norm === '1' || norm === 'l-1';
};

const alignMatchGoalsToScore = (match: LeagueMatch): MatchGoal[] => {
  const goals = [...(match.goals || [])];
  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;
  const isFriendlyMatch = match.type === 'Friendly Match';

  if (isFriendlyMatch) {
    const totalFriendlyScore = homeScore + awayScore;
    const assignedGoals = goals.filter(g => !g.playerId.startsWith('unassigned-'));
    const unassignedGoals = goals.filter(g => g.playerId.startsWith('unassigned-'));
    const combined = [...assignedGoals, ...unassignedGoals];

    if (combined.length > totalFriendlyScore) {
      return combined.slice(0, totalFriendlyScore);
    } else if (combined.length < totalFriendlyScore) {
      const diff = totalFriendlyScore - combined.length;
      for (let i = 0; i < diff; i++) {
        combined.push({
          id: `goal-unassigned-friendly-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
          playerId: `unassigned-friendly-${Date.now()}-${i}`,
          playerName: 'Unassigned Friendly Goal',
          team: null,
          type: 'Friendly'
        });
      }
    }
    return combined;
  }

  // League matches: separating 'League' goals and 'Friendly' goals
  const leagueGoals = goals.filter(g => g.type !== 'Friendly');
  const friendlyGoals = goals.filter(g => g.type === 'Friendly');

  // Align home team league goals
  let homeLeagueGoals = leagueGoals.filter(g => g.team === 'home');
  if (homeLeagueGoals.length > homeScore) {
    const unassignedHome = homeLeagueGoals.filter(g => g.playerId.startsWith('unassigned-'));
    const assignedHome = homeLeagueGoals.filter(g => !g.playerId.startsWith('unassigned-'));
    const combined = [...assignedHome, ...unassignedHome];
    homeLeagueGoals = combined.slice(0, homeScore);
  } else if (homeLeagueGoals.length < homeScore) {
    const diff = homeScore - homeLeagueGoals.length;
    for (let i = 0; i < diff; i++) {
      homeLeagueGoals.push({
        id: `goal-unassigned-home-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        playerId: `unassigned-home-${Date.now()}-${i}`,
        playerName: `Unassigned (${match.homeTeam})`,
        team: 'home',
        type: 'League'
      });
    }
  }

  // Align away team league goals
  let awayLeagueGoals = leagueGoals.filter(g => g.team === 'away');
  if (awayLeagueGoals.length > awayScore) {
    const unassignedAway = awayLeagueGoals.filter(g => g.playerId.startsWith('unassigned-'));
    const assignedAway = awayLeagueGoals.filter(g => !g.playerId.startsWith('unassigned-'));
    const combined = [...assignedAway, ...unassignedAway];
    awayLeagueGoals = combined.slice(0, awayScore);
  } else if (awayLeagueGoals.length < awayScore) {
    const diff = awayScore - awayLeagueGoals.length;
    for (let i = 0; i < diff; i++) {
      awayLeagueGoals.push({
        id: `goal-unassigned-away-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        playerId: `unassigned-away-${Date.now()}-${i}`,
        playerName: `Unassigned (${match.awayTeam})`,
        team: 'away',
        type: 'League'
      });
    }
  }

  return [...homeLeagueGoals, ...awayLeagueGoals, ...friendlyGoals];
};

const recoverMatchesFromAllKeys = (): LeagueMatch[] => {
  if (localStorage.getItem('gameon_matches_cleared') === 'true' || localStorage.getItem('gameon_reset_all_cards') === 'true') {
    return [];
  }
  const keys = ['gameon_matches', 'matches', 'game_on_matches', 'matchCards', 'matchDetails', 'savedMatches'];
  const allMatches: LeagueMatch[] = [];
  const seenIds = new Set<string>();
  const seenUniqueKeys = new Set<string>();

  keys.forEach(key => {
    try {
      const val = localStorage.getItem(key);
      if (!val) return;
      const parsed = JSON.parse(val);
      const matchesArray = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === 'object' ? [parsed] : []);
      matchesArray.forEach((m: any) => {
        if (!m || typeof m !== 'object') return;
        if (!m.id && (!m.date || !m.homeTeam || !m.awayTeam)) return;
        
        const id = m.id || `match-${m.date}-${m.homeTeam}-${m.awayTeam}`;
        const uniqueKey = `${m.date}_${m.homeTeam}_${m.awayTeam}`.toLowerCase().replace(/\s+/g, '');

        if (!seenIds.has(id) && !seenUniqueKeys.has(uniqueKey)) {
          seenIds.add(id);
          seenUniqueKeys.add(uniqueKey);
          allMatches.push({
            ...m,
            id
          });
        }
      });
    } catch (e) {
      console.warn(`Failed to parse key ${key}:`, e);
    }
  });

  return allMatches;
};
import { 
  INITIAL_PLAYERS, 
  INITIAL_LEAGUES, 
  INITIAL_STANDINGS, 
  INITIAL_MATCHES, 
  INITIAL_SESSIONS, 
  INITIAL_ATTENDANCE, 
  INITIAL_LOGS 
} from './data/mockData';

import Dashboard from './components/Dashboard';
import Sessions from './components/Sessions';
import Leagues from './components/Leagues';
import Players from './components/Players';
import Reporting from './components/Reporting';
import WeeklyReport from './components/WeeklyReport';
import GameOnLogo from './components/GameOnLogo';
import DownloadApp from './components/DownloadApp';
import { debouncedSyncSession } from './utils/backgroundSync';
import { GameOnAppStore } from './store/GameOnAppStore';
import { normalizeDateToISO } from './utils/dateUtils';
import { callBackendSyncValidator } from './utils/validation';

const validateAndHealData = (
  rawMatches: any[],
  rawStandings: Record<string, any[]>,
  rawSessions: any[]
) => {
  let corrupted = false;

  // 1. Heal Matches
  const healedMatches = (Array.isArray(rawMatches) ? rawMatches : []).map(m => {
    if (!m || typeof m !== 'object') return m;
    const copy = { ...m };

    // Goals array validation
    if (!Array.isArray(copy.goals)) {
      copy.goals = [];
      corrupted = true;
    } else {
      copy.goals = copy.goals.map((g: any) => {
        if (!g || typeof g !== 'object') return g;
        const healedGoal = { ...g };
        if (!healedGoal.playerId) {
          healedGoal.playerId = `p-auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          corrupted = true;
        }
        if (!healedGoal.playerName) {
          healedGoal.playerName = "Unknown Player";
          corrupted = true;
        }
        return healedGoal;
      });
    }

    // Score validation
    if (copy.homeScore !== undefined && copy.homeScore !== null) {
      const parsed = parseInt(copy.homeScore, 10);
      if (isNaN(parsed) || copy.homeScore !== parsed) {
        copy.homeScore = isNaN(parsed) ? 0 : parsed;
        corrupted = true;
      }
    }
    if (copy.awayScore !== undefined && copy.awayScore !== null) {
      const parsed = parseInt(copy.awayScore, 10);
      if (isNaN(parsed) || copy.awayScore !== parsed) {
        copy.awayScore = isNaN(parsed) ? 0 : parsed;
        corrupted = true;
      }
    }

    return copy;
  });

  // 2. Heal Standings
  const healedStandings: Record<string, TeamStanding[]> = {};
  if (rawStandings && typeof rawStandings === 'object') {
    Object.entries(rawStandings).forEach(([leagueId, teams]) => {
      if (!Array.isArray(teams)) {
        healedStandings[leagueId] = [];
        return;
      }
      healedStandings[leagueId] = teams.map((team: any) => {
        if (!team || typeof team !== 'object') return team;
        const copy = { ...team };
        
        const numericFields = ['played', 'won', 'drawn', 'lost', 'goalsFor', 'goalsAgainst', 'points'];
        numericFields.forEach(field => {
          const parsed = parseInt(copy[field], 10);
          if (isNaN(parsed) || copy[field] !== parsed) {
            copy[field] = isNaN(parsed) ? 0 : parsed;
            corrupted = true;
          }
        });

        return copy;
      });
    });
  }

  // 3. Heal Sessions
  const healedSessions = (Array.isArray(rawSessions) ? rawSessions : []).map(s => {
    if (!s || typeof s !== 'object') return s;
    const copy = { ...s };

    // Match goals array validation
    if (copy.matchId) {
      if (!Array.isArray(copy.matchGoals)) {
        copy.matchGoals = [];
        corrupted = true;
      } else {
        copy.matchGoals = copy.matchGoals.map((g: any) => {
          if (!g || typeof g !== 'object') return g;
          const healedGoal = { ...g };
          if (!healedGoal.playerId) {
            healedGoal.playerId = `p-auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            corrupted = true;
          }
          if (!healedGoal.playerName) {
            healedGoal.playerName = "Unknown Player";
            corrupted = true;
          }
          return healedGoal;
        });
      }
    }

    // Score validation
    if (copy.matchHomeScore !== undefined && copy.matchHomeScore !== null) {
      const parsed = parseInt(copy.matchHomeScore, 10);
      if (isNaN(parsed) || copy.matchHomeScore !== parsed) {
        copy.matchHomeScore = isNaN(parsed) ? 0 : parsed;
        corrupted = true;
      }
    }
    if (copy.matchAwayScore !== undefined && copy.matchAwayScore !== null) {
      const parsed = parseInt(copy.matchAwayScore, 10);
      if (isNaN(parsed) || copy.matchAwayScore !== parsed) {
        copy.matchAwayScore = isNaN(parsed) ? 0 : parsed;
        corrupted = true;
      }
    }

    return copy;
  });

  return {
    healedMatches,
    healedStandings,
    healedSessions,
    corrupted
  };
};

export default function App() {
  const [appMode, setAppMode] = useState<'landing' | 'authenticated'>('authenticated');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sessions' | 'leagues' | 'players' | 'reporting' | 'download' | 'weekly-report'>('dashboard');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionOrigin, setSessionOrigin] = useState<'sessions' | 'leagues'>('sessions');
  const [appSelectedLeagueId, setAppSelectedLeagueId] = useState<string | null>(null);
  const [appSelectedMatchId, setAppSelectedMatchId] = useState<string | null>(null);
  
  // App download / installation hide tab state
  const [isAppDownloaded, setIsAppDownloaded] = useState(false);

  useEffect(() => {
    document.title = 'Football United';
    (window as any).__setAppMode = (mode: 'landing' | 'authenticated') => {
      setAppMode(mode);
      setIsAuthenticated(mode === 'authenticated');
    };
    (window as any).__setIsAuthenticated = (auth: boolean) => {
      setIsAuthenticated(auth);
      if (auth) setAppMode('authenticated');
    };
    const handleModeEvent = (e: any) => {
      const mode = e.detail?.appMode;
      if (mode) {
        setAppMode(mode);
        setIsAuthenticated(mode === 'authenticated');
      }
    };
    window.addEventListener('app-mode-changed', handleModeEvent);
    return () => window.removeEventListener('app-mode-changed', handleModeEvent);
  }, []);


  // App initialization/splash loading states
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [splashFadeOut, setSplashFadeOut] = useState(false);

  // PWA Smart Installation Banner states
  const [deferredPwaPrompt, setDeferredPwaPrompt] = useState<any>(null);
  const [showPwaInstallBanner, setShowPwaInstallBanner] = useState(false);
  const [detectedPwaOS, setDetectedPwaOS] = useState<'iOS' | 'Android' | 'Other'>('Other');
  
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('gameon_theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return 'light';
  });

  // App Confirmation Modals
  const [showAppResetConfirm, setShowAppResetConfirm] = useState(false);
  const [showAppClearConfirm, setShowAppClearConfirm] = useState(false);

  // App States
  const [players, setPlayers] = useState<Player[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [standings, setStandings] = useState<Record<string, TeamStanding[]>>({});
  const [matches, setMatches] = useState<LeagueMatch[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  // Editing state trackers for real-time snapshot sync suspension
  const [isUserEditingState, setIsUserEditingState] = useState(false);
  const pendingMatchesRef = useRef<LeagueMatch[] | null>(null);

  // Expose isUserEditing setter and state to the window object to satisfy PWA requirements
  useEffect(() => {
    (window as any).isUserEditing = isUserEditingState;
  }, [isUserEditingState]);

  useEffect(() => {
    (window as any).setIsUserEditing = (val: boolean) => {
      console.log(`[EDITING GUARD] setting window.isUserEditing = ${val}`);
      (window as any).isUserEditing = val;
      setIsUserEditingState(val);
    };
  }, []);

  // Expose window.AppState and window.runScorchedEarthDeduplication for console/automated utilities
  useEffect(() => {
    let currentPlayers = players;
    let currentMatches = matches;

    const appObj = {
      get players() { return currentPlayers; },
      set players(val: any[]) {
        currentPlayers = val;
        setPlayers(val);
        localStorage.setItem('gameon_players', JSON.stringify(val));
      },
      get matches() { return currentMatches; },
      set matches(val: any[]) {
        currentMatches = val;
        setMatches(val);
        localStorage.setItem('gameon_matches', JSON.stringify(val));
      },
      recalculateStandings: () => {
        try {
          const updatedStandings: Record<string, TeamStanding[]> = {};
          (leagues || []).forEach(league => {
            updatedStandings[league.id] = recalculateLeagueStandings(league.id, currentMatches);
          });
          setStandings(updatedStandings);
          localStorage.setItem('gameon_standings', JSON.stringify(updatedStandings));
        } catch (e) {
          console.error("Error recalculating standings:", e);
        }
      },
      saveData: () => {
        GameOnAppStore.save({
          players: currentPlayers,
          matches: currentMatches
        });
        try {
          backupAppStateToCloudAndLocal({
            players: currentPlayers,
            matches: currentMatches,
            sessions,
            attendance,
            leagues
          });
        } catch (e) {}
      }
    };

    (window as any).AppState = appObj;
    (window as any).runScorchedEarthDeduplication = function() {
      const app = (window as any).AppState;
      if (!app || !app.players) {
        console.error("App State not found. Make sure you are on the app page.");
        return;
      }

      let playersList = app.players;
      let matchesList = app.matches || [];
      let grouped: Record<string, any[]> = {};
      let idMap: Record<string, string> = {};
      let newPlayersList: any[] = [];

      console.log(`Starting cleanup... Found ${playersList.length} total players.`);

      playersList.forEach((p: any) => {
        if (!p) return;
        let rawName = String(p.name || p.id || "");
        let cleanName = rawName.split(/[@\(\[\-]/)[0].trim().toLowerCase();
        
        if (!grouped[cleanName]) grouped[cleanName] = [];
        grouped[cleanName].push(p);
      });

      Object.keys(grouped).forEach(name => {
        let group = grouped[name];
        let master = group.find((p: any) => !String(p.name).startsWith('p_')) || group[0];
        newPlayersList.push(master);

        group.forEach((clone: any) => {
          if (clone.id !== master.id) {
            idMap[clone.id] = master.id;
            if (clone.name) idMap[clone.name] = master.id;
          }
        });
      });

      newPlayersList = newPlayersList.filter((p: any) => {
        let name = String(p.name).trim();
        return !(name.startsWith('p_') && name.length > 10);
      });

      matchesList.forEach((m: any) => {
        const replaceArr = (arr: any) => {
          if (!Array.isArray(arr)) return arr;
          return arr.map((item: any) => {
            let key = typeof item === 'object' && item !== null ? (item.id || item.name) : item;
            return idMap[key] ? idMap[key] : item;
          });
        };

        m.home_roster = replaceArr(m.home_roster);
        m.away_roster = replaceArr(m.away_roster);
        m.potd_winners = replaceArr(m.potd_winners);

        if (Array.isArray(m.scorers)) {
          m.scorers.forEach((sc: any) => {
            let key = sc.player_id || sc.id || sc.name;
            if (idMap[key]) {
              if (sc.player_id) sc.player_id = idMap[key];
              if (sc.id) sc.id = idMap[key];
              if (sc.name && idMap[sc.name]) sc.name = idMap[sc.name];
            }
          });
        }

        if (m.attendance) {
          let newAtt: Record<string, any> = {};
          Object.keys(m.attendance).forEach(k => {
            newAtt[idMap[k] || k] = m.attendance[k];
          });
          m.attendance = newAtt;
        }

        if (m.player_teams) {
          let newPt: Record<string, any> = {};
          Object.keys(m.player_teams).forEach(k => {
            newPt[idMap[k] || k] = m.player_teams[k];
          });
          m.player_teams = newPt;
        }
      });

      app.players = newPlayersList;
      app.matches = matchesList;

      if (typeof app.recalculateStandings === 'function') app.recalculateStandings();
      if (typeof app.saveData === 'function') app.saveData();

      console.log(`✅ MERGE COMPLETE! Player count reduced from ${playersList.length} down to ${newPlayersList.length}.`);
    };

    (window as any).factoryResetDatabase = async function() {
      const confirmReset = prompt("WARNING: This will permanently delete ALL players, matches, teams, and history from the cloud. Type 'DELETE' to confirm.");
      if (confirmReset !== 'DELETE') {
        console.log("Factory reset cancelled by user.");
        return;
      }

      console.log("Executing Factory Reset Database...");
      const fb = (window as any).fb;

      if (fb) {
        if (Array.isArray(players)) {
          for (const p of [...players]) {
            const pId = p.id || p.name;
            if (pId && typeof fb.deletePlayer === 'function') {
              try { await fb.deletePlayer(pId); } catch (e) { console.warn(e); }
            }
          }
        }
        if (Array.isArray(matches)) {
          for (const m of [...matches]) {
            if (m.id) {
              try {
                if (typeof fb.deleteMatch === 'function') await fb.deleteMatch(m.id);
                else if (typeof fb.deleteMatchDay === 'function') await fb.deleteMatchDay(m.id);
              } catch (e) { console.warn(e); }
            }
          }
        }
      }

      setPlayers([]);
      setMatches([]);
      setSessions([]);
      setAttendance({});
      setStandings({});
      localStorage.removeItem('gameon_adjustments');
      console.log("✅ Factory Reset Complete!");
      alert("Factory reset complete! All data deleted.");
    };
  }, [players, matches, leagues, sessions, attendance, standings, logs]);

  // Sync stashed updates when user finishes editing
  useEffect(() => {
    if (!isUserEditingState && pendingMatchesRef.current) {
      console.log("🔄 [FIRESTORE] User finished editing. Applying stashed matches updates.");
      // Recalculate & apply
      const deletedMatchIdsRaw = localStorage.getItem('gameon_deleted_matches');
      let deletedMatchIds = new Set<string>();
      if (deletedMatchIdsRaw) {
        try {
          const parsed = JSON.parse(deletedMatchIdsRaw);
          if (Array.isArray(parsed)) {
            parsed.forEach((id: string) => deletedMatchIds.add(String(id)));
          }
        } catch (e) {}
      }
      const mappedMatches = pendingMatchesRef.current.filter(m => m && !deletedMatchIds.has(String(m.id)));
      setMatches(mappedMatches);
      localStorage.setItem('gameon_matches', JSON.stringify(mappedMatches));

      const updatedStandings: Record<string, TeamStanding[]> = {};
      const targetLeagues = leagues && leagues.length > 0 ? leagues : (() => {
        try {
          return JSON.parse(localStorage.getItem('gameon_leagues') || '[]');
        } catch {
          return [];
        }
      })();

      targetLeagues.forEach((l: any) => {
        if (l && l.id) {
          updatedStandings[l.id] = recalculateLeagueStandings(l.id, mappedMatches);
        }
      });

      localStorage.setItem('gameon_standings', JSON.stringify(updatedStandings));
      setStandings(updatedStandings);

      GameOnAppStore.save({
        players,
        sessions,
        attendance,
        leagues: targetLeagues,
        standings: updatedStandings,
        matches: mappedMatches,
        logs
      });

      pendingMatchesRef.current = null;
    }
  }, [isUserEditingState, leagues, players, sessions, attendance, logs]);

  // Guard to prevent circular synchronization updates between matches and sessions
  const isSyncingRef = React.useRef(false);

  // Sheets background sync status
  const [sheetsSyncStatus, setSheetsSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

  // Dynamically calculate active/inactive roster status based on session attendance
  const computedPlayers = React.useMemo(() => {
    const completedSessions = sessions
      .filter(s => s.status === 'Completed')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return players.map(player => {
      // If no completed sessions exist, they are Active by default
      if (completedSessions.length === 0) {
        return { ...player, status: 'Active' as const };
      }

      // Check if player joined after the most recent completed session, or in the last 14 days
      const joinTime = new Date(player.joinDate).getTime();
      const lastSessionTime = new Date(completedSessions[0].date).getTime();
      const isNew = joinTime >= lastSessionTime || (Date.now() - joinTime) < 14 * 24 * 60 * 60 * 1000;

      if (isNew) {
        return { ...player, status: 'Active' as const };
      }

      // Check the last 3 completed sessions
      const last3Sessions = completedSessions.slice(0, 3);
      const attendedAny = last3Sessions.some(session => {
        const record = attendance.find(a => a.sessionId === session.id && a.playerId === player.id);
        return record && record.status === 'Present';
      });

      return {
        ...player,
        status: (attendedAny ? 'Active' : 'Inactive') as 'Active' | 'Inactive'
      };
    });
  }, [players, sessions, attendance]);

  // Time clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Unified Single Source of Truth (SSOT) & synchronization function
  const syncAndSaveState = (
    customMatches?: LeagueMatch[],
    customSessions?: Session[],
    customPlayers?: Player[]
  ) => {
    const deletedMatchIdsRaw = localStorage.getItem('gameon_deleted_matches');
    const deletedMatchIds = new Set<string>();
    if (deletedMatchIdsRaw) {
      try {
        const parsed = JSON.parse(deletedMatchIdsRaw);
        if (Array.isArray(parsed)) {
          parsed.forEach((id: string) => deletedMatchIds.add(String(id)));
        }
      } catch (e) {}
    }

    let activeMatches = (customMatches ? [...customMatches] : matches).filter(m => {
      if (!m) return false;
      const mId = String(m.id);
      const normId = mId.replace(/^session-/, '').replace(/^session_/, '');
      const isoDate = normalizeDateToISO(m.date);
      if (deletedMatchIds.has(mId) || deletedMatchIds.has(normId) || deletedMatchIds.has(`session-${normId}`)) return false;
      if (isoDate && (deletedMatchIds.has(isoDate) || deletedMatchIds.has(`session-card-${isoDate}`) || deletedMatchIds.has(`m-auto-${isoDate}`))) return false;
      return true;
    });

    let activeSessions = (customSessions ? [...customSessions] : sessions).filter(s => {
      if (!s) return false;
      const sId = String(s.id);
      const normId = sId.replace(/^session-/, '').replace(/^session_/, '');
      const isoDate = normalizeDateToISO(s.date);
      if (deletedMatchIds.has(sId) || deletedMatchIds.has(normId) || deletedMatchIds.has(`session-${normId}`)) return false;
      if (s.matchId && (deletedMatchIds.has(s.matchId) || deletedMatchIds.has(String(s.matchId).replace(/^session-/, '')))) return false;
      if (isoDate && (deletedMatchIds.has(isoDate) || deletedMatchIds.has(`session-card-${isoDate}`) || deletedMatchIds.has(`m-auto-${isoDate}`))) return false;
      return true;
    });
    const activePlayers = customPlayers || players;

    const playerNameToCanonical = new Map<string, Player>();
    const playerIdToCanonicalId = new Map<string, string>();
    const mergedPlayers: Player[] = [];

    // Canonical Jerry discovery & registration
    let canonicalJerry = activePlayers.find(p => p && p.name && p.name.toLowerCase() === 'jerry');
    if (!canonicalJerry) {
      const jerryPlayer = activePlayers.find(p => p && p.name && p.name.toLowerCase().includes('jerry'));
      if (jerryPlayer) {
        canonicalJerry = { ...jerryPlayer, name: 'Jerry' };
      } else {
        canonicalJerry = {
          id: 'p-jerry',
          name: 'Jerry',
          joinDate: '2026-02-14',
          status: 'Active',
          position: 'Midfielder',
          jerseyNumber: 10
        } as any;
      }
    }

    playerIdToCanonicalId.set('jerry', canonicalJerry!.id);
    playerIdToCanonicalId.set('Jerry', canonicalJerry!.id);
    playerIdToCanonicalId.set('Jerry (Onye Army)', canonicalJerry!.id);
    playerIdToCanonicalId.set('Jerry (Captain)', canonicalJerry!.id);
    playerIdToCanonicalId.set('Jerry (Onye Army) Charles', canonicalJerry!.id);
    playerIdToCanonicalId.set('Jerry Samson (Shola)', canonicalJerry!.id);
    playerIdToCanonicalId.set('Jerry Ojukwu', canonicalJerry!.id);
    playerIdToCanonicalId.set('Charles Jerry', canonicalJerry!.id);
    playerIdToCanonicalId.set('Osanga Jerry', canonicalJerry!.id);
    playerIdToCanonicalId.set('Deco Jerry', canonicalJerry!.id);
    playerIdToCanonicalId.set('Jerry John', canonicalJerry!.id);
    playerIdToCanonicalId.set('Tumishe Jerry', canonicalJerry!.id);
    playerIdToCanonicalId.set('Jerry (Onye Army) John T', canonicalJerry!.id);
    playerIdToCanonicalId.set('Obi Jerry', canonicalJerry!.id);
    playerIdToCanonicalId.set('Jerry (Onye Army) Success', canonicalJerry!.id);

    // Populate lookup maps for other players defensively
    activePlayers.forEach(p => {
      if (!p) return;
      const normalized = normalizePlayerName(p.name);
      const key = normalized.toLowerCase();

      if (key.includes('jerry')) {
        playerIdToCanonicalId.set(p.id, canonicalJerry!.id);
        playerIdToCanonicalId.set(p.name, canonicalJerry!.id);
        return;
      }

      if (playerNameToCanonical.has(key)) {
        const canonical = playerNameToCanonical.get(key)!;
        playerIdToCanonicalId.set(p.id, canonical.id);
        playerIdToCanonicalId.set(p.name, canonical.id);
        playerIdToCanonicalId.set(normalized, canonical.id);
      } else {
        const canonical = { ...p, name: normalized };
        playerNameToCanonical.set(key, canonical);
        playerIdToCanonicalId.set(p.id, canonical.id);
        playerIdToCanonicalId.set(p.name, canonical.id);
        playerIdToCanonicalId.set(normalized, canonical.id);
        mergedPlayers.push(canonical);
      }
    });

    if (!mergedPlayers.some(p => p.id === canonicalJerry!.id)) {
      mergedPlayers.push(canonicalJerry!);
    }

    const finalPlayers = mergedPlayers.filter((p, index, self) => {
      if (p.name.toLowerCase() === 'jerry' && p.id !== canonicalJerry!.id) {
        return false;
      }
      return self.findIndex(x => x.name.toLowerCase() === p.name.toLowerCase()) === index;
    });

    // Normalize Matches home/away squads, goals, and playerOfMatch
    let finalMatches = activeMatches.map(m => {
      if (!m) return m;
      const copy = { ...m };

      if (Array.isArray(copy.homeSquad)) {
        copy.homeSquad = copy.homeSquad.map(pId => {
          const sId = String(pId);
          if (playerIdToCanonicalId.has(sId)) return playerIdToCanonicalId.get(sId)!;
          const norm = normalizePlayerName(sId);
          if (norm.toLowerCase() === 'jerry') return canonicalJerry!.id;
          if (playerIdToCanonicalId.has(norm)) return playerIdToCanonicalId.get(norm)!;
          return pId;
        });
      }

      if (Array.isArray(copy.awaySquad)) {
        copy.awaySquad = copy.awaySquad.map(pId => {
          const sId = String(pId);
          if (playerIdToCanonicalId.has(sId)) return playerIdToCanonicalId.get(sId)!;
          const norm = normalizePlayerName(sId);
          if (norm.toLowerCase() === 'jerry') return canonicalJerry!.id;
          if (playerIdToCanonicalId.has(norm)) return playerIdToCanonicalId.get(norm)!;
          return pId;
        });
      }

      if (Array.isArray(copy.goals)) {
        copy.goals = copy.goals.map(g => {
          if (!g) return g;
          const gCopy = { ...g };
          if (gCopy.playerId && playerIdToCanonicalId.has(gCopy.playerId)) {
            gCopy.playerId = playerIdToCanonicalId.get(gCopy.playerId)!;
          } else if (gCopy.playerName && playerIdToCanonicalId.has(normalizePlayerName(gCopy.playerName))) {
            gCopy.playerId = playerIdToCanonicalId.get(normalizePlayerName(gCopy.playerName))!;
          }
          if (gCopy.playerName) {
            const norm = normalizePlayerName(gCopy.playerName);
            if (norm.toLowerCase() === 'jerry') {
              gCopy.playerName = 'Jerry';
              gCopy.playerId = canonicalJerry!.id;
            } else {
              gCopy.playerName = norm;
            }
          }
          return gCopy;
        });
      }

      if (copy.potdWinner && !copy.playerOfMatch) {
        copy.playerOfMatch = copy.potdWinner;
      } else if (copy.playerOfMatch && !copy.potdWinner) {
        copy.potdWinner = copy.playerOfMatch;
      }

      if (copy.playerOfMatch) {
        const parts = copy.playerOfMatch.split(/&|and|,|\//);
        const cleanedParts = parts.map(part => {
          const pom = part.trim();
          const norm = normalizePlayerName(pom);
          if (norm.toLowerCase() === 'jerry' || pom.toLowerCase().includes('jerry')) {
            return 'Jerry';
          }
          return norm;
        });
        copy.playerOfMatch = cleanedParts.join(' & ');
        copy.potdWinner = copy.playerOfMatch;
      }

      if (copy.status === 'Played' || (copy.homeScore !== undefined && copy.awayScore !== undefined)) {
        copy.goals = alignMatchGoalsToScore(copy);
      }

      return copy;
    });

    // Update corresponding sessions using matching dates
    const finalSessions = activeSessions.map(s => {
      if (!s) return s;
      const copy = { ...s };

      const matchingMatch = finalMatches.find(m => m.id === copy.matchId || `session-${m.id}` === copy.id);
      if (matchingMatch) {
        let dateStr = copy.date;
        let timeStr = copy.time;
        if (matchingMatch.date.includes(' • ')) {
          const parts = matchingMatch.date.split(' • ');
          const dateParts = parts[0].trim().split(' ');
          if (dateParts.length === 3) {
            const months: Record<string, string> = {
              Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
              Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
            };
            const day = dateParts[0].padStart(2, '0');
            const month = months[dateParts[1].substring(0, 3)] || '07';
            const year = dateParts[2];
            dateStr = `${year}-${month}-${day}`;
          } else {
            dateStr = parts[0].trim();
          }
          timeStr = parts[1].trim();
        } else {
          dateStr = matchingMatch.date;
        }

        copy.title = `${matchingMatch.type || 'League Match'}: ${matchingMatch.homeTeam} vs ${matchingMatch.awayTeam}`;
        copy.date = dateStr;
        copy.time = timeStr;
        copy.type = (matchingMatch.type === 'Friendly Match' ? 'Friendly Match' : 'League Match') as any;
        copy.status = (matchingMatch.status === 'Played' ? 'Completed' : 'Upcoming' as const);
        copy.matchGoals = matchingMatch.goals || [];
        copy.matchHomeScore = matchingMatch.homeScore !== undefined ? matchingMatch.homeScore : 0;
        copy.matchAwayScore = matchingMatch.awayScore !== undefined ? matchingMatch.awayScore : 0;
        copy.playerOfMatch = matchingMatch.playerOfMatch || undefined;
        copy.potdWinner = matchingMatch.potdWinner || undefined;
      }

      if (Array.isArray(copy.matchGoals)) {
        copy.matchGoals = copy.matchGoals.map(g => {
          if (!g) return g;
          const gCopy = { ...g };
          if (gCopy.playerId && playerIdToCanonicalId.has(gCopy.playerId)) {
            gCopy.playerId = playerIdToCanonicalId.get(gCopy.playerId)!;
          } else if (gCopy.playerName && playerIdToCanonicalId.has(normalizePlayerName(gCopy.playerName))) {
            gCopy.playerId = playerIdToCanonicalId.get(normalizePlayerName(gCopy.playerName))!;
          }
          if (gCopy.playerName) {
            const norm = normalizePlayerName(gCopy.playerName);
            if (norm.toLowerCase() === 'jerry') {
              gCopy.playerName = 'Jerry';
              gCopy.playerId = canonicalJerry!.id;
            } else {
              gCopy.playerName = norm;
            }
          }
          return gCopy;
        });
      }

      if (copy.potdWinner && !copy.playerOfMatch) {
        copy.playerOfMatch = copy.potdWinner;
      } else if (copy.playerOfMatch && !copy.potdWinner) {
        copy.potdWinner = copy.playerOfMatch;
      }

      if (copy.playerOfMatch) {
        const parts = copy.playerOfMatch.split(/&|and|,|\//);
        const cleanedParts = parts.map(part => {
          const pom = part.trim();
          const norm = normalizePlayerName(pom);
          if (norm.toLowerCase() === 'jerry' || pom.toLowerCase().includes('jerry')) {
            return 'Jerry';
          }
          return norm;
        });
        copy.playerOfMatch = cleanedParts.join(' & ');
        copy.potdWinner = copy.playerOfMatch;
      }

      return copy;
    });

    // Auto-create missing session cards for active matches that are NOT deleted
    finalMatches.forEach(m => {
      if (!m) return;
      if (deletedMatchIds.has(String(m.id)) || deletedMatchIds.has(`session-${m.id}`) || deletedMatchIds.has(String(m.id).replace('session-', ''))) return;
      const mIso = normalizeDateToISO(m.date);
      const existingSession = finalSessions.find(s => 
        s && (s.matchId === m.id || s.id === `session-${m.id}` || s.id === m.id || (s.date && normalizeDateToISO(s.date) === mIso && !!mIso))
      );
      if (existingSession) {
        if (!existingSession.matchId || existingSession.matchId !== m.id) {
          existingSession.matchId = m.id;
        }
      } else {
        let dateStr = mIso || '2026-02-28';
        let timeStr = '10:30';
        if (m.date && m.date.includes(' • ')) {
          timeStr = m.date.split(' • ')[1].trim();
        }

        const newSession: Session = {
          id: `session-${m.id}`,
          title: `Match Session: ${m.homeTeam} vs ${m.awayTeam}`,
          date: dateStr,
          time: timeStr,
          location: 'West Ham Park',
          leagueId: m.leagueId,
          matchId: m.id,
          type: (m.type === 'Friendly Match' ? 'Friendly Match' : 'League Match') as any,
          status: (m.status === 'Played' ? 'Completed' : 'Upcoming' as const),
          feePerPlayer: 5.0,
          matchGoals: m.goals || [],
          matchHomeScore: m.homeScore !== undefined ? m.homeScore : 0,
          matchAwayScore: m.awayScore !== undefined ? m.awayScore : 0,
          playerOfMatch: m.playerOfMatch || undefined,
          potdWinner: m.potdWinner || undefined
        };
        finalSessions.push(newSession);
      }
    });

    const appDb = {
      matches: finalMatches,
      sessions: finalSessions,
      players: finalPlayers
    };
    (window as any).AppDatabase = appDb;

    // Stringify and write AppDatabase state directly to localStorage
    localStorage.setItem('gameon_players', JSON.stringify(finalPlayers));
    localStorage.setItem('gameon_matches', JSON.stringify(finalMatches));
    localStorage.setItem('gameon_sessions', JSON.stringify(finalSessions));
    const tryParseJSON = (str: string | null, fallback: any) => {
      if (!str) return fallback;
      try { return JSON.parse(str); } catch (e) { return fallback; }
    };

    const updatedStandings: Record<string, TeamStanding[]> = {};
    const targetLeagues = leagues && leagues.length > 0 ? leagues : tryParseJSON(localStorage.getItem('gameon_leagues'), []);
    
    targetLeagues.forEach((l: any) => {
      if (l && l.id) {
        updatedStandings[l.id] = recalculateLeagueStandings(l.id, finalMatches);
      }
    });

    localStorage.setItem('gameon_standings', JSON.stringify(updatedStandings));

    setPlayers(finalPlayers);
    setMatches(finalMatches);
    setSessions(finalSessions);
    setStandings(updatedStandings);

    // Align local app store
    GameOnAppStore.save({
      players: finalPlayers,
      sessions: finalSessions,
      matches: finalMatches,
      standings: updatedStandings
    });

    return appDb;
  };

  const recalculateAllLeagues = (
    customMatches?: LeagueMatch[],
    customSessions?: Session[],
    customPlayers?: Player[]
  ) => {
    console.log("Triggering master synchronization chain: recalculateAllLeagues()");
    return syncAndSaveState(customMatches, customSessions, customPlayers);
  };

  const updateAppDatabaseAndRender = (
    customMatches?: LeagueMatch[],
    customSessions?: Session[],
    customPlayers?: Player[]
  ) => {
    return recalculateAllLeagues(customMatches, customSessions, customPlayers);
  };

  // Expose AppDatabase, syncAndSaveState, recalculateAllLeagues and updateAppDatabaseAndRender to window to satisfy PWA architect requirements
  useEffect(() => {
    (window as any).AppDatabase = {
      matches,
      sessions,
      players
    };
    (window as any).syncAndSaveState = (
      customMatches?: LeagueMatch[],
      customSessions?: Session[],
      customPlayers?: Player[]
    ) => {
      return syncAndSaveState(customMatches, customSessions, customPlayers);
    };
    (window as any).recalculateAllLeagues = (
      customMatches?: LeagueMatch[],
      customSessions?: Session[],
      customPlayers?: Player[]
    ) => {
      return recalculateAllLeagues(customMatches, customSessions, customPlayers);
    };
    (window as any).updateAppDatabaseAndRender = (
      customMatches?: LeagueMatch[],
      customSessions?: Session[],
      customPlayers?: Player[]
    ) => {
      return recalculateAllLeagues(customMatches, customSessions, customPlayers);
    };
    (window as any).recoverAllMatches = () => {
      const recovered = recoverMatchesFromAllKeys();
      console.log(`[DATA RECOVERY] Found ${recovered.length} unique raw match records across all legacy and current localStorage keys.`);
      localStorage.setItem('gameon_matches', JSON.stringify(recovered));
      recalculateAllLeagues(recovered);
      console.log(`[DATA RECOVERY] Recovered successfully and forced a UI re-render.`);
      return recovered;
    };
    (window as any).forceRebuildTable = () => {
      const recovered = recoverMatchesFromAllKeys();
      console.log(`[DATA RECOVERY] Scanning storage... Found ${recovered.length} unique raw match records across all legacy and current localStorage keys.`);
      localStorage.setItem('gameon_matches', JSON.stringify(recovered));
      recalculateAllLeagues(recovered);
      console.log(`[DATA RECOVERY] Table rebuild completed successfully! Both Player and Captains League tables repainted.`);
      return recovered;
    };
  }, [matches, sessions, players]);

  // Database auto-repair, force sync and normalization engine
  const [syncNotification, setSyncNotification] = useState<string | null>(null);

  const rebuildPlayerStatsFromScratch = (silent = false) => {
    // 1. Clear any cached player standings from localStorage
    localStorage.removeItem('gameon_standings');

    const tryParseJSON = (str: string | null, fallback: any) => {
      if (!str) return fallback;
      try { return JSON.parse(str); } catch (e) { return fallback; }
    };

    // 2. Load latest raw values from localStorage defensively
    const currentRawPlayers: Player[] = tryParseJSON(localStorage.getItem('gameon_players'), []);
    const currentRawMatches: LeagueMatch[] = tryParseJSON(localStorage.getItem('gameon_matches'), []);
    const currentRawSessions: Session[] = tryParseJSON(localStorage.getItem('gameon_sessions'), []);
    const currentRawAttendance: AttendanceRecord[] = tryParseJSON(localStorage.getItem('gameon_attendance'), []);

    // 3. Normalize & Merge Players to completely heal roster duplicates
    const mergedPlayers: Player[] = [];
    const playerNameToCanonical = new Map<string, Player>();
    const playerIdToCanonicalId = new Map<string, string>();

    // Pass 1: Build basic mapping by normalized name keys
    currentRawPlayers.forEach(p => {
      if (!p) return;
      const normalized = normalizePlayerName(p.name);
      const key = normalized.toLowerCase();

      if (playerNameToCanonical.has(key)) {
        const canonical = playerNameToCanonical.get(key)!;
        playerIdToCanonicalId.set(p.id, canonical.id);
        playerIdToCanonicalId.set(p.name, canonical.id);
        playerIdToCanonicalId.set(normalized, canonical.id);
      } else {
        const canonical: Player = {
          ...p,
          name: normalized
        };
        playerNameToCanonical.set(key, canonical);
        playerIdToCanonicalId.set(p.id, canonical.id);
        playerIdToCanonicalId.set(p.name, canonical.id);
        playerIdToCanonicalId.set(normalized, canonical.id);
        mergedPlayers.push(canonical);
      }
    });

    // Pass 2: Ensure any string or ID containing 'Jerry' is mapped to a single unified 'Jerry' player
    let canonicalJerry = mergedPlayers.find(p => p.name.toLowerCase() === 'jerry');
    if (!canonicalJerry) {
      const jerryPlayer = currentRawPlayers.find(p => p && p.name && p.name.toLowerCase().includes('jerry'));
      if (jerryPlayer) {
        canonicalJerry = {
          ...jerryPlayer,
          id: jerryPlayer.id,
          name: 'Jerry'
        };
        mergedPlayers.push(canonicalJerry);
        playerNameToCanonical.set('jerry', canonicalJerry);
      } else {
        canonicalJerry = {
          id: 'p-jerry',
          name: 'Jerry',
          joinDate: '2026-02-28',
          status: 'Active',
          position: 'Midfielder',
          jerseyNumber: 10,
          joinedSessionCount: 0,
          attendanceStatus: 'Active'
        } as any;
        mergedPlayers.push(canonicalJerry!);
        playerNameToCanonical.set('jerry', canonicalJerry!);
      }
    }

    currentRawPlayers.forEach(p => {
      if (p && p.name && p.name.toLowerCase().includes('jerry')) {
        playerIdToCanonicalId.set(p.id, canonicalJerry!.id);
        playerIdToCanonicalId.set(p.name, canonicalJerry!.id);
        playerIdToCanonicalId.set(normalizePlayerName(p.name), canonicalJerry!.id);
      }
    });

    // Map all raw historical naming variations of Jerry to his canonical ID
    playerIdToCanonicalId.set('Jerry', canonicalJerry.id);
    playerIdToCanonicalId.set('Jerry (Onye Army)', canonicalJerry.id);
    playerIdToCanonicalId.set('Jerry (Captain)', canonicalJerry.id);
    playerIdToCanonicalId.set('Jerry (Onye Army) Charles', canonicalJerry.id);
    playerIdToCanonicalId.set('Jerry Samson (Shola)', canonicalJerry.id);
    playerIdToCanonicalId.set('Jerry Ojukwu', canonicalJerry.id);
    playerIdToCanonicalId.set('Charles Jerry', canonicalJerry.id);
    playerIdToCanonicalId.set('Osanga Jerry', canonicalJerry.id);
    playerIdToCanonicalId.set('Deco Jerry', canonicalJerry.id);
    playerIdToCanonicalId.set('Jerry John', canonicalJerry.id);
    playerIdToCanonicalId.set('Tumishe Jerry', canonicalJerry.id);
    playerIdToCanonicalId.set('Jerry (Onye Army) John T', canonicalJerry.id);
    playerIdToCanonicalId.set('Obi Jerry', canonicalJerry.id);
    playerIdToCanonicalId.set('Jerry (Onye Army) Success', canonicalJerry.id);

    // Filter roster to prevent any duplicate rows of Jerry in UI
    const finalPlayers = mergedPlayers.filter((p, index, self) => {
      if (p.name.toLowerCase() === 'jerry' && p.id !== canonicalJerry!.id) {
        return false;
      }
      return self.findIndex(x => x.name.toLowerCase() === p.name.toLowerCase()) === index;
    });

    // 4. Update Matches (homeSquad, awaySquad, goals, playerOfMatch)
    const finalMatches = currentRawMatches.map(m => {
      if (!m) return m;
      const copy = { ...m };

      if (Array.isArray(copy.homeSquad)) {
        copy.homeSquad = copy.homeSquad.map(pId => {
          const sId = String(pId);
          if (playerIdToCanonicalId.has(sId)) return playerIdToCanonicalId.get(sId)!;
          const norm = normalizePlayerName(sId);
          if (norm.toLowerCase() === 'jerry') return canonicalJerry!.id;
          if (playerIdToCanonicalId.has(norm)) return playerIdToCanonicalId.get(norm)!;
          return pId;
        });
      }

      if (Array.isArray(copy.awaySquad)) {
        copy.awaySquad = copy.awaySquad.map(pId => {
          const sId = String(pId);
          if (playerIdToCanonicalId.has(sId)) return playerIdToCanonicalId.get(sId)!;
          const norm = normalizePlayerName(sId);
          if (norm.toLowerCase() === 'jerry') return canonicalJerry!.id;
          if (playerIdToCanonicalId.has(norm)) return playerIdToCanonicalId.get(norm)!;
          return pId;
        });
      }

      if (Array.isArray(copy.goals)) {
        copy.goals = copy.goals.map(g => {
          if (!g) return g;
          const gCopy = { ...g };
          if (gCopy.playerId && playerIdToCanonicalId.has(gCopy.playerId)) {
            gCopy.playerId = playerIdToCanonicalId.get(gCopy.playerId)!;
          } else if (gCopy.playerName && playerIdToCanonicalId.has(normalizePlayerName(gCopy.playerName))) {
            gCopy.playerId = playerIdToCanonicalId.get(normalizePlayerName(gCopy.playerName))!;
          }
          if (gCopy.playerName) {
            const norm = normalizePlayerName(gCopy.playerName);
            if (norm.toLowerCase() === 'jerry') {
              gCopy.playerName = 'Jerry';
              gCopy.playerId = canonicalJerry!.id;
            } else {
              gCopy.playerName = norm;
            }
          }
          return gCopy;
        });
      }

      if (copy.playerOfMatch) {
        const parts = copy.playerOfMatch.split(/&|and|,|\//);
        const cleanedParts = parts.map(part => {
          const pom = part.trim();
          const norm = normalizePlayerName(pom);
          if (norm.toLowerCase() === 'jerry' || pom.toLowerCase().includes('jerry')) {
            return 'Jerry';
          }
          return norm;
        });
        copy.playerOfMatch = cleanedParts.join(' & ');
      }

      return copy;
    });

    // 5. Update Sessions (matchGoals, playerOfMatch)
    const finalSessions = currentRawSessions.map(s => {
      if (!s) return s;
      const copy = { ...s };

      if (Array.isArray(copy.matchGoals)) {
        copy.matchGoals = copy.matchGoals.map(g => {
          if (!g) return g;
          const gCopy = { ...g };
          if (gCopy.playerId && playerIdToCanonicalId.has(gCopy.playerId)) {
            gCopy.playerId = playerIdToCanonicalId.get(gCopy.playerId)!;
          } else if (gCopy.playerName && playerIdToCanonicalId.has(normalizePlayerName(gCopy.playerName))) {
            gCopy.playerId = playerIdToCanonicalId.get(normalizePlayerName(gCopy.playerName))!;
          }
          if (gCopy.playerName) {
            const norm = normalizePlayerName(gCopy.playerName);
            if (norm.toLowerCase() === 'jerry') {
              gCopy.playerName = 'Jerry';
              gCopy.playerId = canonicalJerry!.id;
            } else {
              gCopy.playerName = norm;
            }
          }
          return gCopy;
        });
      }

      if (copy.playerOfMatch) {
        const parts = copy.playerOfMatch.split(/&|and|,|\//);
        const cleanedParts = parts.map(part => {
          const pom = part.trim();
          const norm = normalizePlayerName(pom);
          if (norm.toLowerCase() === 'jerry' || pom.toLowerCase().includes('jerry')) {
            return 'Jerry';
          }
          return norm;
        });
        copy.playerOfMatch = cleanedParts.join(' & ');
      }

      return copy;
    });

    // 6. Update Attendance
    const finalAttendance = currentRawAttendance.map(att => {
      if (!att) return att;
      const copy = { ...att };
      if (copy.playerId && playerIdToCanonicalId.has(copy.playerId)) {
        copy.playerId = playerIdToCanonicalId.get(copy.playerId)!;
      }
      return copy;
    });

    // 7. Persist completely sanitized structures back to local storage
    localStorage.setItem('gameon_players', JSON.stringify(finalPlayers));
    localStorage.setItem('gameon_matches', JSON.stringify(finalMatches));
    localStorage.setItem('gameon_sessions', JSON.stringify(finalSessions));
    localStorage.setItem('gameon_attendance', JSON.stringify(finalAttendance));

    // Force instant react re-rendering
    setPlayers(finalPlayers);
    setMatches(finalMatches);
    setSessions(finalSessions);
    setAttendance(finalAttendance);

    const updatedStandings: Record<string, TeamStanding[]> = {};
    const targetLeagues = leagues && leagues.length > 0 ? leagues : tryParseJSON(localStorage.getItem('gameon_leagues'), []);
    
    targetLeagues.forEach((l: any) => {
      if (l && l.id) {
        updatedStandings[l.id] = recalculateLeagueStandings(l.id, finalMatches);
      }
    });

    localStorage.setItem('gameon_standings', JSON.stringify(updatedStandings));
    setStandings(updatedStandings);

    // Synchronize global App Store
    GameOnAppStore.save({
      players: finalPlayers,
      sessions: finalSessions,
      attendance: finalAttendance,
      leagues: targetLeagues,
      standings: updatedStandings,
      matches: finalMatches,
      logs
    });

    if (!silent) {
      setSyncNotification("Database successfully rebuilt! All player matches synced.");
      setTimeout(() => {
        setSyncNotification(null);
      }, 4000);
    }
  };

  const autoSyncLocalDataToFirebase = async () => {
    try {
      if (localStorage.getItem('firebase_auto_synced') === 'true') {
        return;
      }
      
      const legacyMatches = recoverMatchesFromAllKeys();
      if (legacyMatches.length === 0) {
        localStorage.setItem('firebase_auto_synced', 'true');
        console.log("Auto-sync: No legacy matches found in localStorage.");
        return;
      }

      // Fetch existing matches from Firestore to deduplicate
      const matchesSnap = await getDocs(collection(db, 'go_matches_prod'));
      const existingIds = new Set(matchesSnap.docs.map(doc => doc.id));

      let migratedCount = 0;
      for (const m of legacyMatches) {
        if (!existingIds.has(m.id)) {
          const isCompleted = m.status === 'Played';
          const homeScore = isCompleted ? (parseInt(String(m.homeScore), 10) || 0) : null;
          const awayScore = isCompleted ? (parseInt(String(m.awayScore), 10) || 0) : null;

          await setDoc(doc(db, 'go_matches_prod', m.id), {
            id: m.id,
            league_id: m.leagueId || 'l-player',
            match_date: normalizeDateToISO(m.date),
            home_team_name: m.homeTeam || 'Home Team',
            away_team_name: m.awayTeam || 'Away Team',
            home_score: homeScore,
            away_score: awayScore,
            is_completed: isCompleted,
            created_at: (m as any).created_at || new Date().toISOString(),
            goals: m.goals || [],
            homeSquad: m.homeSquad || [],
            awaySquad: m.awaySquad || [],
            playerOfMatch: m.playerOfMatch || ''
          });
          migratedCount++;
        }
      }

      localStorage.setItem('firebase_auto_synced', 'true');
      console.log(`Auto-sync complete: ${migratedCount} match cards migrated to Cloud Firestore`);
    } catch (err) {
      console.error("Error running autoSyncLocalDataToFirebase:", err);
    }
  };

  // Run auto-heal and forced recalculation on initial app boot
  useEffect(() => {
    autoSyncLocalDataToFirebase();
    rebuildPlayerStatsFromScratch(true);
  }, []);

  // Stable state refs to prevent re-attaching Firestore listeners on every state update
  const leaguesRef = useRef(leagues);
  leaguesRef.current = leagues;
  const playersRef = useRef(players);
  playersRef.current = players;
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;
  const attendanceRef = useRef(attendance);
  attendanceRef.current = attendance;
  const logsRef = useRef(logs);
  logsRef.current = logs;

  // Real-time Firestore matches listener - initialized once and cleaned up on unmount
  useEffect(() => {
    if ((window as any).isFirestoreDisabled) {
      console.log("🔌 Firestore is offline or disabled. Live snapshot syncing bypassed.");
      return;
    }

    let isSubscribed = true;
    const unsubscribe = onSnapshot(collection(db, 'go_matches_prod'), (snapshot) => {
      if (!isSubscribed) return;

      // Ignore self-triggered snapshot echoes if we already have pending local writes
      if (snapshot.metadata.hasPendingWrites) {
        console.log('🤫 [onSnapshot matches] Ignoring self-triggered snapshot echoes (pending local writes).');
        return;
      }

      console.log('🔥 [FIRESTORE REAL-TIME LISTENER] matches snapshot emitted:', snapshot.size, 'documents');
      
      let mappedMatches: LeagueMatch[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: data.id || docSnap.id,
          leagueId: data.league_id || '',
          homeTeam: data.home_team_name || '',
          awayTeam: data.away_team_name || '',
          homeScore: data.home_score !== null && data.home_score !== undefined ? Number(data.home_score) : undefined,
          awayScore: data.away_score !== null && data.away_score !== undefined ? Number(data.away_score) : undefined,
          date: data.match_date || '',
          status: data.is_completed ? 'Played' : 'Scheduled',
          type: data.type || (data.league_id && data.league_id !== 'l-friendly' ? 'League Match' : 'Friendly Match'),
          format: data.format || '7v7',
          goals: data.goals || [],
          homeSquad: data.homeSquad || [],
          awaySquad: data.awaySquad || [],
          playerOfMatch: data.playerOfMatch || undefined
        };
      });

      const deletedMatchIdsRaw = localStorage.getItem('gameon_deleted_matches');
      let deletedMatchIds = new Set<string>();
      if (deletedMatchIdsRaw) {
        try {
          const parsed = JSON.parse(deletedMatchIdsRaw);
          if (Array.isArray(parsed)) {
            parsed.forEach((id: string) => deletedMatchIds.add(String(id)));
          }
        } catch (e) {}
      }
      mappedMatches = mappedMatches.filter(m => m && !deletedMatchIds.has(String(m.id)));

      const isEditing = document.activeElement && 
                        (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName) || 
                         document.querySelector('.modal.open') ||
                         (window as any).isUserEditing);
      if (isEditing) {
        console.log("⏳ [FIRESTORE] User is currently editing. Stashing snapshot updates to prevent DOM flicker.");
        pendingMatchesRef.current = mappedMatches;
        return;
      }

      setMatches(mappedMatches);
      localStorage.setItem('gameon_matches', JSON.stringify(mappedMatches));

      // Recalculate team standings using stable ref
      const currentLeagues = leaguesRef.current;
      const updatedStandings: Record<string, TeamStanding[]> = {};
      const targetLeagues = currentLeagues && currentLeagues.length > 0 ? currentLeagues : (() => {
        try {
          return JSON.parse(localStorage.getItem('gameon_leagues') || '[]');
        } catch {
          return [];
        }
      })();

      targetLeagues.forEach((l: any) => {
        if (l && l.id) {
          updatedStandings[l.id] = recalculateLeagueStandings(l.id, mappedMatches);
        }
      });

      localStorage.setItem('gameon_standings', JSON.stringify(updatedStandings));
      setStandings(updatedStandings);

      // Sync with our global app store state using stable refs
      GameOnAppStore.save({
        players: playersRef.current,
        sessions: sessionsRef.current,
        attendance: attendanceRef.current,
        leagues: targetLeagues,
        standings: updatedStandings,
        matches: mappedMatches,
        logs: logsRef.current
      });
    }, (err) => {
      console.warn('Real-time Firestore matches subscription error (pausing subscriptions):', err.message || err);
      if (err.message && (err.message.includes('permission-denied') || err.message.includes('PERMISSION_DENIED') || err.message.includes('API has not been used'))) {
        (window as any).isFirestoreDisabled = true;
      }
    });

    return () => {
      isSubscribed = false;
      if (typeof unsubscribe === 'function') {
        try { unsubscribe(); } catch (e) {}
      }
    };
  }, []);

  // Initialize and load from local storage
  useEffect(() => {
    // Perform full wipe of matches and sessions as requested by the user
    localStorage.setItem('gameon_matches_cleared', 'true');
    localStorage.setItem('gameon_reset_all_cards', 'true');
    localStorage.setItem('gameon_matches', JSON.stringify([]));
    localStorage.setItem('gameon_sessions', JSON.stringify([]));
    localStorage.setItem('gameon_attendance', JSON.stringify([]));
    ['matches', 'game_on_matches', 'matchCards', 'matchDetails', 'savedMatches', 'gameon_deleted_matches'].forEach(k => localStorage.removeItem(k));

    fetch('/api/match/clear_all', { method: 'POST' }).catch(() => {});

    const tryParseJSON = (str: string | null, fallback: any) => {
      if (!str) return fallback;
      try {
        return JSON.parse(str);
      } catch (e) {
        return fallback;
      }
    };

    const storedPlayers = localStorage.getItem('gameon_players');
    const storedSessions = localStorage.getItem('gameon_sessions');
    const storedAttendance = localStorage.getItem('gameon_attendance');
    const storedLeagues = localStorage.getItem('gameon_leagues');
    const storedStandings = localStorage.getItem('gameon_standings');
    const storedMatches = localStorage.getItem('gameon_matches');
    const storedLogs = localStorage.getItem('gameon_logs');

    const activePlayers = tryParseJSON(storedPlayers, INITIAL_PLAYERS || []);
    setPlayers(activePlayers);
    if (!storedPlayers) {
      localStorage.setItem('gameon_players', JSON.stringify(INITIAL_PLAYERS || []));
    }

    // Leagues and duplicate detection first, so we can use duplicateL3Id for mapping other lists
    let activeLeagues = tryParseJSON(storedLeagues, INITIAL_LEAGUES || []);
    let duplicateL3Id: string | undefined = undefined;

    // Identify if there is a duplicate Captain's League with a different ID
    if (Array.isArray(activeLeagues)) {
      const dup = activeLeagues.find(l => l && l.name && l.name.toLowerCase().replace(/['’]/g, '').trim() === "captains league" && l.id !== 'l-3');
      if (dup) {
        duplicateL3Id = dup.id;
      }

      const hasL3 = activeLeagues.some(l => l && l.id === 'l-3');
      if (!hasL3) {
        const l3League = (INITIAL_LEAGUES || []).find(l => l.id === 'l-3') || {
          id: 'l-3',
          name: "Captain's League",
          season: 'Season 2026',
          sport: 'Football',
          status: 'Active',
          format: 'once',
          startDate: '2026-02-28',
          endDate: '2026-06-27'
        };
        activeLeagues = [...activeLeagues, l3League];
      }
    }

    // Deduplicate leagues
    let uniqueLeagues: League[] = [];
    if (Array.isArray(activeLeagues)) {
      const seenNames = new Set<string>();
      const seenIds = new Set<string>();
      
      const sortedActiveLeagues = [...activeLeagues].sort((a, b) => {
        if (a && a.id === 'l-3') return -1;
        if (b && b.id === 'l-3') return 1;
        return 0;
      });

      sortedActiveLeagues.forEach(l => {
        if (l && l.id && l.name) {
          const normalizedName = l.name.toLowerCase().replace(/['’]/g, '').trim();
          if (!seenIds.has(l.id) && !seenNames.has(normalizedName)) {
            uniqueLeagues.push(l);
            seenIds.add(l.id);
            seenNames.add(normalizedName);
          }
        }
      });
    }
    activeLeagues = uniqueLeagues;
    localStorage.setItem('gameon_leagues', JSON.stringify(activeLeagues));
    setLeagues(activeLeagues);

    // Standings
    let activeStandings: Record<string, TeamStanding[]> = tryParseJSON(storedStandings, {});
    if (duplicateL3Id && activeStandings[duplicateL3Id]) {
      if (!activeStandings['l-3']) {
        activeStandings['l-3'] = activeStandings[duplicateL3Id];
      }
      delete activeStandings[duplicateL3Id];
    }
    if (!activeStandings['l-3'] || activeStandings['l-3'].length === 0 || activeStandings['l-3'].some(t => t.name === 'Game On FC' || t.name === 'Apex Athletics' || t.name === 'Ballers FC' || t.name === 'Tekkers United')) {
      const l3Standing = (INITIAL_STANDINGS || []).find(ls => ls.leagueId === 'l-3');
      if (l3Standing) {
        activeStandings['l-3'] = l3Standing.standings;
      } else {
        activeStandings['l-3'] = [
          { id: 't-3-1', name: 'JERRY', played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 },
          { id: 't-3-2', name: 'SHOLA', played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 },
          { id: 't-3-3', name: 'OJUKWU', played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 },
          { id: 't-3-4', name: 'JOHN T', played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 },
          { id: 't-3-5', name: 'DAVID', played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 },
          { id: 't-3-6', name: 'ND', played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 },
          { id: 't-3-7', name: 'IBRAHEEM', played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 },
          { id: 't-3-8', name: 'OSANGA', played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 }
        ];
      }
    }
    if (INITIAL_STANDINGS && INITIAL_STANDINGS.length > 0 && Object.keys(activeStandings).length === 1 && activeStandings['l-3']) {
      INITIAL_STANDINGS.forEach(ls => {
        if (ls.leagueId !== 'l-3') {
          activeStandings[ls.leagueId] = ls.standings;
        }
      });
    }
    localStorage.setItem('gameon_standings', JSON.stringify(activeStandings));
    setStandings(activeStandings);

    // Matches & Deleted Matches tracking
    const deletedMatchIdsRaw = localStorage.getItem('gameon_deleted_matches');
    const deletedMatchIds = new Set<string>();
    if (deletedMatchIdsRaw) {
      try {
        const parsed = JSON.parse(deletedMatchIdsRaw);
        if (Array.isArray(parsed)) {
          parsed.forEach((id: string) => deletedMatchIds.add(String(id)));
        }
      } catch (e) {}
    }

    const savedMatchesStr = localStorage.getItem('gameon_matches');
    let activeMatches: LeagueMatch[] = [];
    if (savedMatchesStr !== null) {
      try {
        activeMatches = JSON.parse(savedMatchesStr) || [];
      } catch (e) {
        activeMatches = INITIAL_MATCHES || [];
      }
    } else {
      activeMatches = INITIAL_MATCHES || [];
    }

    // Bugged cards explicit removal (14 Feb & 21 Feb cards)
    const buggedCardIds = ['m-auto-2026-02-14', 'm-auto-2026-02-21', 'session-m-auto-2026-02-14', 'session-m-auto-2026-02-21', 'session-card-2026-02-14', 'session-card-2026-02-21', '2026-02-14', '2026-02-21'];
    buggedCardIds.forEach(id => deletedMatchIds.add(id));

    // Ensure all seed matches are present in activeMatches (unless explicitly deleted)
    if (savedMatchesStr === null) {
      const existingMatchIdsMap = new Set(activeMatches.map(m => String(m.id)));
      (INITIAL_MATCHES || []).forEach(m => {
        if (!m) return;
        if (!existingMatchIdsMap.has(String(m.id)) && !deletedMatchIds.has(String(m.id)) && !deletedMatchIds.has(`session-${m.id}`)) {
          activeMatches.push({ ...m });
          existingMatchIdsMap.add(String(m.id));
        }
      });
    }

    // Remove any deleted or bugged matches from activeMatches
    activeMatches = activeMatches.filter(m => {
      if (!m) return false;
      const isoDate = normalizeDateToISO(m.date);
      if (deletedMatchIds.has(String(m.id))) return false;
      if (deletedMatchIds.has(`session-${m.id}`)) return false;
      if (deletedMatchIds.has(String(m.id).replace('session-', ''))) return false;
      if (isoDate === '2026-02-14' || isoDate === '2026-02-21') return false;
      return true;
    });

    // Sessions
    const savedSessionsStr = localStorage.getItem('gameon_sessions');
    let activeSessions: Session[] = [];
    if (savedSessionsStr !== null) {
      try {
        activeSessions = JSON.parse(savedSessionsStr) || [];
      } catch (e) {
        activeSessions = INITIAL_SESSIONS || [];
      }
    } else {
      activeSessions = INITIAL_SESSIONS || [];
    }

    // Ensure all seed sessions are present in activeSessions (unless explicitly deleted)
    if (savedSessionsStr === null) {
      const existingSessionIdsMap = new Set(activeSessions.map(s => String(s.id)));
      (INITIAL_SESSIONS || []).forEach(s => {
        if (!s) return;
        if (!existingSessionIdsMap.has(String(s.id)) && !deletedMatchIds.has(String(s.id)) && !deletedMatchIds.has(String(s.id).replace('session-', '')) && !deletedMatchIds.has(`session-${s.id}`)) {
          activeSessions.push({ ...s });
          existingSessionIdsMap.add(String(s.id));
        }
      });
    }

    // Comprehensive Orphan Cleanup PASS
    // 1. If a session is linked to a match but the match is deleted or bugged, remove the session!
    const activeMatchIds = new Set(activeMatches.map(m => m.id));
    activeSessions = activeSessions.filter(s => {
      if (!s) return false;
      const sDateISO = normalizeDateToISO(s.date);
      if (s.id && (deletedMatchIds.has(String(s.id)) || deletedMatchIds.has(String(s.id).replace('session-', '')) || deletedMatchIds.has(`session-${s.id}`))) {
        return false;
      }
      if (s.matchId && (deletedMatchIds.has(String(s.matchId)) || deletedMatchIds.has(`session-${s.matchId}`) || deletedMatchIds.has(String(s.matchId).replace('session-', '')))) {
        return false;
      }
      if (s.matchId && !activeMatchIds.has(s.matchId)) {
        const matchingMatch = activeMatches.find(m => m && normalizeDateToISO(m.date) === sDateISO);
        if (matchingMatch) {
          s.matchId = matchingMatch.id;
        } else if (!sDateISO) {
          return false;
        }
      }
      if (sDateISO === '2026-02-14' || sDateISO === '2026-02-21') {
        return false;
      }
      return true;
    });

    // 1b. Ensure every active match has a corresponding session card created & linked
    activeMatches.forEach(m => {
      if (!m) return;
      const mIso = normalizeDateToISO(m.date);
      let existingSession = activeSessions.find(s => 
        s.matchId === m.id || 
        s.id === `session-${m.id}` || 
        s.id === m.id || 
        (s.leagueId === m.leagueId && normalizeDateToISO(s.date) === mIso) ||
        (normalizeDateToISO(s.date) === mIso && (s.title.includes(m.homeTeam) || s.title.includes(m.awayTeam)))
      );
      if (existingSession) {
        if (!existingSession.matchId || existingSession.matchId !== m.id) {
          existingSession.matchId = m.id;
        }
      } else {
        let dateStr = mIso || '2026-02-28';
        let timeStr = '10:30';
        if (m.date && m.date.includes(' • ')) {
          const parts = m.date.split(' • ');
          if (parts[1]) timeStr = parts[1].trim();
        }
        const matchName = `${m.homeTeam} vs ${m.awayTeam}`;
        const newSessionCard: Session = {
          id: `session-${m.id}`,
          title: `Match Session: ${matchName}`,
          date: dateStr,
          time: timeStr,
          location: 'West Ham Park',
          leagueId: m.leagueId,
          matchId: m.id,
          type: (m.type === 'Friendly Match' ? 'Friendly Match' : 'League Match'),
          status: m.status === 'Played' ? 'Completed' : 'Upcoming',
          feePerPlayer: 5.0,
          matchGoals: m.goals || [],
          matchHomeScore: m.homeScore,
          matchAwayScore: m.awayScore,
          playerOfMatch: m.playerOfMatch
        };
        activeSessions.push(newSessionCard);
      }
    });

    // 2. If a session is linked to a league but the league is deleted, remove the session!
    const activeLeagueIds = new Set(activeLeagues.map(l => l.id));
    activeSessions = activeSessions.filter(s => {
      if (s && s.leagueId && !activeLeagueIds.has(s.leagueId)) {
        return false;
      }
      return true;
    });

    // 3. Clear any orphaned attendance records (records whose session or player no longer exists)
    let activeAttendance = tryParseJSON(storedAttendance, INITIAL_ATTENDANCE || []);
    const existingAttendanceMap = new Set(activeAttendance.map((a: any) => `${a.sessionId}_${a.playerId}`));
    (INITIAL_ATTENDANCE || []).forEach((a: any) => {
      if (a && !existingAttendanceMap.has(`${a.sessionId}_${a.playerId}`)) {
        activeAttendance.push({ ...a });
        existingAttendanceMap.add(`${a.sessionId}_${a.playerId}`);
      }
    });
    const activeSessionIds = new Set(activeSessions.map(s => s.id));
    const activePlayerIds = new Set(activePlayers.map(p => p.id));
    activeAttendance = activeAttendance.filter(a => a && activeSessionIds.has(a.sessionId) && activePlayerIds.has(a.playerId));

    // 4. Filter out any deleted/non-existent player IDs from match squads
    activeMatches = activeMatches.map(m => {
      if (!m) return m;
      let changed = false;
      let homeSquad = m.homeSquad || [];
      let awaySquad = m.awaySquad || [];
      
      const filteredHome = homeSquad.filter(pId => activePlayerIds.has(pId));
      if (filteredHome.length !== homeSquad.length) {
        homeSquad = filteredHome;
        changed = true;
      }
      const filteredAway = awaySquad.filter(pId => activePlayerIds.has(pId));
      if (filteredAway.length !== awaySquad.length) {
        awaySquad = filteredAway;
        changed = true;
      }
      
      return changed ? { ...m, homeSquad, awaySquad } : m;
    });

    // 5. Clean up any goals scored by players who no longer exist, and adjust scores if necessary
    activeMatches = activeMatches.map(m => {
      if (!m || !Array.isArray(m.goals)) return m;
      let changed = false;
      let goals = m.goals;
      let homeScore = m.homeScore;
      let awayScore = m.awayScore;
      
      const orphanedGoals = goals.filter(g => g && g.playerId && !activePlayerIds.has(g.playerId));
      if (orphanedGoals.length > 0) {
        goals = goals.filter(g => g && g.playerId && activePlayerIds.has(g.playerId));
        orphanedGoals.forEach(g => {
          if (g.type === 'League') {
            if (g.team === 'home' && homeScore !== undefined) {
              homeScore = Math.max(0, homeScore - 1);
            }
            if (g.team === 'away' && awayScore !== undefined) {
              awayScore = Math.max(0, awayScore - 1);
            }
          }
        });
        changed = true;
      }
      return changed ? { ...m, goals, homeScore, awayScore } : m;
    });

    // 6. Clean up session goals for players who no longer exist, and adjust scores if necessary
    activeSessions = activeSessions.map(s => {
      if (!s || !Array.isArray(s.matchGoals)) return s;
      let changed = false;
      let matchGoals = s.matchGoals;
      let matchHomeScore = s.matchHomeScore;
      let matchAwayScore = s.matchAwayScore;
      
      const orphanedGoals = matchGoals.filter(g => g && g.playerId && !activePlayerIds.has(g.playerId));
      if (orphanedGoals.length > 0) {
        matchGoals = matchGoals.filter(g => g && g.playerId && activePlayerIds.has(g.playerId));
        orphanedGoals.forEach(g => {
          if (g.type === 'League') {
            if (g.team === 'home' && matchHomeScore !== undefined) {
              matchHomeScore = Math.max(0, matchHomeScore - 1);
            }
            if (g.team === 'away' && matchAwayScore !== undefined) {
              matchAwayScore = Math.max(0, matchAwayScore - 1);
            }
          }
        });
        changed = true;
      }
      return changed ? { ...s, matchGoals, matchHomeScore, matchAwayScore } : s;
    });

    // 7. Clean up playerOfMatch fields for players who no longer exist
    const activePlayerNamesLower = new Set(activePlayers.map(p => p.name.toLowerCase()));
    activeMatches = activeMatches.map(m => {
      if (!m || !m.playerOfMatch) return m;
      const parts = m.playerOfMatch.split('&');
      const activeParts = parts
        .map(p => p.trim())
        .filter(name => activePlayerNamesLower.has(name.toLowerCase()));
      const playerOfMatch = activeParts.length > 0 ? activeParts.join(' & ') : undefined;
      return playerOfMatch !== m.playerOfMatch ? { ...m, playerOfMatch } : m;
    });

    activeSessions = activeSessions.map(s => {
      if (!s || !s.playerOfMatch) return s;
      const parts = s.playerOfMatch.split('&');
      const activeParts = parts
        .map(p => p.trim())
        .filter(name => activePlayerNamesLower.has(name.toLowerCase()));
      const playerOfMatch = activeParts.length > 0 ? activeParts.join(' & ') : undefined;
      return playerOfMatch !== s.playerOfMatch ? { ...s, playerOfMatch } : s;
    });

    setMatches(activeMatches);
    setSessions(activeSessions);
    setAttendance(activeAttendance);

    localStorage.setItem('gameon_matches', JSON.stringify(activeMatches));
    localStorage.setItem('gameon_sessions', JSON.stringify(activeSessions));
    localStorage.setItem('gameon_attendance', JSON.stringify(activeAttendance));

    // Logs
    const activeLogs = tryParseJSON(storedLogs, INITIAL_LOGS || []);
    setLogs(activeLogs);
    if (!storedLogs) {
      localStorage.setItem('gameon_logs', JSON.stringify(INITIAL_LOGS || []));
    }

    // Run data validation and healing
    const healResult = validateAndHealData(activeMatches, activeStandings, activeSessions);
    if (healResult.corrupted) {
      console.warn("Detected corrupted local storage values, auto-healing...");
      activeMatches = healResult.healedMatches;
      activeStandings = healResult.healedStandings;
      activeSessions = healResult.healedSessions;

      localStorage.setItem('gameon_matches', JSON.stringify(activeMatches));
      localStorage.setItem('gameon_standings', JSON.stringify(activeStandings));
      localStorage.setItem('gameon_sessions', JSON.stringify(activeSessions));

      setMatches(activeMatches);
      setStandings(activeStandings);
      setSessions(activeSessions);
    }

    // Seed the unified GameOnAppStore singleton
    GameOnAppStore.save({
      players: activePlayers,
      sessions: activeSessions,
      attendance: activeAttendance,
      leagues: activeLeagues,
      standings: activeStandings,
      matches: activeMatches,
      logs: activeLogs
    });

    // Execute backend match-session validator on boot
    callBackendSyncValidator().then(res => {
      if (res && res.created_sessions > 0) {
        console.log(`[Backend Sync Validator] Auto-created ${res.created_sessions} missing session cards.`);
      }
    });

    // Tick the clock every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Immediate operating system and launcher detection on load
  useEffect(() => {
    // Check if URL has launcher/app query parameters or if standalone display-mode / WebView is active
    const urlParams = new URLSearchParams(window.location.search);
    const hasLauncherParam = urlParams.get('launcher') === 'true';
    const hasAndroidParam = urlParams.get('android') === 'true' || urlParams.get('android_app') === 'true' || urlParams.get('app') === 'true';

    if (hasLauncherParam) {
      sessionStorage.setItem('gameon_launcher_active', 'true');
    }
    if (hasAndroidParam) {
      sessionStorage.setItem('gameon_android_app_active', 'true');
    }

    const ua = navigator.userAgent.toLowerCase();
    const isAndroid = /android/.test(ua);
    const isAndroidWebView = isAndroid && (ua.includes('wv') || ua.includes('webview'));
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;

    const isRunningAsInstalledApp = 
      hasLauncherParam || 
      hasAndroidParam || 
      isStandalone || 
      isAndroidWebView ||
      sessionStorage.getItem('gameon_launcher_active') === 'true' ||
      sessionStorage.getItem('gameon_android_app_active') === 'true';

    // Set isAppDownloaded to true ONLY if we are actively running within the downloaded HTML launcher or native Android app
    if (isRunningAsInstalledApp) {
      setIsAppDownloaded(true);
    }

    const isAlreadyInstalled = isRunningAsInstalledApp || localStorage.getItem('gameon_downloaded') === 'true';

    // Dynamic storage event listener to hide tab if they open/reload in standalone mode
    const handleStorageUpdate = () => {
      const standaloneActive = window.matchMedia('(display-mode: standalone)').matches || 
                               (navigator as any).standalone || 
                               sessionStorage.getItem('gameon_launcher_active') === 'true' ||
                               sessionStorage.getItem('gameon_android_app_active') === 'true';
      if (standaloneActive) {
        setIsAppDownloaded(true);
      }
    };
    window.addEventListener('storage', handleStorageUpdate);
    window.addEventListener('gameon_downloaded_event', handleStorageUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageUpdate);
      window.removeEventListener('gameon_downloaded_event', handleStorageUpdate);
    };
  }, []);

  // Prevent activeTab from remaining 'download' if app is downloaded
  useEffect(() => {
    if (isAppDownloaded && activeTab === 'download') {
      setActiveTab('dashboard');
    }
  }, [isAppDownloaded, activeTab]);

  // Splash screen loader fade-out sequence
  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setSplashFadeOut(true);
      const closeTimer = setTimeout(() => {
        setIsAppLoading(false);
      }, 500); // Wait for fade transition to finish
      return () => clearTimeout(closeTimer);
    }, 1200); // Display splash screen for 1.2 seconds

    return () => clearTimeout(fadeTimer);
  }, []);

  // Automated background backup synchronization
  useEffect(() => {
    if (isAppLoading) return;

    const stateTree = {
      leagues,
      matches,
      sessions,
      players,
      attendance
    };

    const timer = setTimeout(() => {
      backupAppStateToCloudAndLocal(stateTree)
        .then(() => {
          console.log('[Backup System] Automated background backup completed successfully.');
        })
        .catch(err => {
          console.error('[Backup System] Automated background backup failed:', err);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [leagues, matches, sessions, players, attendance, isAppLoading]);

  // Developer command to restore from latest backup
  useEffect(() => {
    (window as any).restoreFromLatestBackup = async () => {
      console.log('[Backup System] Initiating check of backup stores...');
      
      // 1. Get localStorage rolling backup
      let localBackup: any = null;
      try {
        const emergencyStr = localStorage.getItem('gameon_emergency_backups');
        if (emergencyStr) {
          const snapshots = JSON.parse(emergencyStr);
          if (Array.isArray(snapshots) && snapshots.length > 0) {
            localBackup = snapshots[snapshots.length - 1];
          }
        }
      } catch (err) {
        console.error('[Backup System] Error parsing local emergency backups:', err);
      }

      if (!localBackup) {
        try {
          const localStr = localStorage.getItem('gameon_backup_rolling');
          if (localStr) {
            localBackup = JSON.parse(localStr);
          }
        } catch (err) {
          console.error('[Backup System] Error parsing local backup:', err);
        }
      }

      // 2. Get Firestore latest backup
      let cloudBackup: any = null;
      try {
        cloudBackup = await getLatestCloudBackup();
      } catch (err) {
        console.error('[Backup System] Error retrieving cloud backup:', err);
      }

      if (!localBackup && !cloudBackup) {
        alert('No backup found in either local storage or cloud Firestore.');
        return 'No backups found.';
      }

      // 3. Timestamp comparison
      const localTime = localBackup?.timestamp || 0;
      const cloudTime = cloudBackup?.timestamp || 0;

      console.log(`[Backup System] Local backup timestamp: ${localTime} (${new Date(localTime).toLocaleString()})`);
      console.log(`[Backup System] Cloud backup timestamp: ${cloudTime} (${new Date(cloudTime).toLocaleString()})`);

      const targetBackup = localTime >= cloudTime ? localBackup : cloudBackup;
      const source = localTime >= cloudTime ? 'Local rolling cache' : 'Cloud Firestore';

      if (!targetBackup || !Array.isArray(targetBackup.leagues)) {
        alert('Latest backup structure is invalid or corrupt.');
        return 'Invalid backup structure.';
      }

      console.log(`[Backup System] Restoring database state from ${source}...`);

      // 4. Update memory state (React setters)
      setLeagues(targetBackup.leagues || []);
      setMatches(targetBackup.matches || []);
      setSessions(targetBackup.sessions || []);
      setPlayers(targetBackup.players || []);
      setAttendance(targetBackup.attendance || []);

      // 5. Update localStorage individual keys for persistence
      localStorage.setItem('gameon_leagues', JSON.stringify(targetBackup.leagues || []));
      localStorage.setItem('gameon_matches', JSON.stringify(targetBackup.matches || []));
      localStorage.setItem('gameon_sessions', JSON.stringify(targetBackup.sessions || []));
      localStorage.setItem('gameon_players', JSON.stringify(targetBackup.players || []));
      localStorage.setItem('gameon_attendance', JSON.stringify(targetBackup.attendance || []));

      // 6. Trigger a visual UI toast / confirmation
      const toastEl = document.createElement('div');
      toastEl.id = 'backup-toast';
      toastEl.className = 'fixed bottom-5 right-5 z-50 bg-emerald-600 text-white font-black text-xs px-5 py-3 rounded-2xl shadow-xl border border-emerald-500 animate-bounce flex items-center gap-2';
      toastEl.innerHTML = `<span>🛡️ System Restored from ${source}! (${new Date(targetBackup.timestamp).toLocaleTimeString()})</span>`;
      document.body.appendChild(toastEl);
      setTimeout(() => {
        toastEl.remove();
      }, 5000);

      alert(`🛡️ Database successfully restored from ${source}!`);
      return `Restore completed from ${source}.`;
    };

    return () => {
      delete (window as any).restoreFromLatestBackup;
    };
  }, [leagues, matches, sessions, players, attendance]);

  // PWA beforeinstallprompt listener and iOS Safari PWA installation banner prompt
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /ipad|iphone|ipod/.test(ua) && !(window as any).MSStream;
    const isAndroid = /android/.test(ua);
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    const isDismissed = sessionStorage.getItem('gameon_pwa_dismissed') === 'true';

    if (isIOS) {
      setDetectedPwaOS('iOS');
      if (!isStandaloneMode && !isDismissed) {
        // Wait slightly after load to show the banner with animation
        const timer = setTimeout(() => {
          setShowPwaInstallBanner(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    } else if (isAndroid) {
      setDetectedPwaOS('Android');
    } else {
      setDetectedPwaOS('Other');
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPwaPrompt(e);
      if (!isStandaloneMode && !isDismissed) {
        setShowPwaInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handlePwaInstallClick = async () => {
    if (deferredPwaPrompt) {
      deferredPwaPrompt.prompt();
      const { outcome } = await deferredPwaPrompt.userChoice;
      console.log(`User response to the PWA install prompt: ${outcome}`);
      setDeferredPwaPrompt(null);
      setShowPwaInstallBanner(false);
    }
  };

  const handleDismissPwaBanner = () => {
    sessionStorage.setItem('gameon_pwa_dismissed', 'true');
    setShowPwaInstallBanner(false);
  };

  // App download redirect and launcher handlers are replaced by native inline PWA installation support in index.html and DownloadApp.tsx.

  // Sync theme with system and localStorage
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('gameon_theme', theme);
  }, [theme]);

  // Requirement 3 & 4: AUTOMATIC SESSION CREATION & TWO-WAY MULTI-DIRECTIONAL SYNC
  useEffect(() => {
    // Guard against circular synchronization updates across renders
    if (isSyncingRef.current) {
      isSyncingRef.current = false;
      return;
    }

    let sessionsChanged = false;
    let matchesChanged = false;

    const updatedSessions = [...sessions];
    const updatedMatches = [...matches];

    // Direction A: Match details -> Session details
    matches.forEach(match => {
      if (!match) return;
      const matchPlainDate = match.date ? match.date.split(' • ')[0].trim() : '';
      const matchTime = match.date && match.date.includes(' • ') ? match.date.split(' • ')[1].trim() : '10:30';
      const sessionPlainDate = normalizeDateToISO(matchPlainDate);

      const existingSessionIndex = updatedSessions.findIndex(s => {
        if (!s) return false;
        if (s.matchId === match.id || s.id === `session-${match.id}` || `session-${match.id}` === s.id) {
          return true;
        }
        const sPlainDate = s.date ? normalizeDateToISO(s.date) : '';
        const isSameDate = sPlainDate === sessionPlainDate && !!sPlainDate;
        if (isSameDate) return true;
        const titleLower = s.title ? s.title.toLowerCase() : '';
        const hasHomeTeam = titleLower.includes(match.homeTeam.toLowerCase());
        const hasAwayTeam = titleLower.includes(match.awayTeam.toLowerCase());
        return hasHomeTeam && hasAwayTeam;
      });

      const matchName = `${match.homeTeam} vs ${match.awayTeam}`;
      const sessionTitle = `Match Session: ${matchName}`;

      const normTitle = sessionTitle;
      const normDate = sessionPlainDate;
      const normTime = matchTime;
      const normStatus: 'Completed' | 'Upcoming' = match.status === 'Played' ? 'Completed' : 'Upcoming';
      const normHomeScore = match.homeScore !== undefined ? match.homeScore : undefined;
      const normAwayScore = match.awayScore !== undefined ? match.awayScore : undefined;
      const normPOM = match.playerOfMatch || undefined;
      const normPOTD = match.potdWinner || match.playerOfMatch || undefined;
      const normGoalsJSON = JSON.stringify((match.goals || []).map(g => ({ id: g.id, playerId: g.playerId, playerName: g.playerName, team: g.team, type: g.type })));

      if (existingSessionIndex === -1) {
        // Create corresponding Session Detail card if it doesn't exist (Requirement 3)
        const newSession: Session = {
          id: `session-${match.id}`,
          title: normTitle,
          date: normDate || '2026-07-14',
          time: normTime,
          location: 'West Ham Park',
          leagueId: match.leagueId,
          matchId: match.id,
          type: (match.type === 'Friendly Match' ? 'Friendly Match' : 'League Match'),
          status: normStatus,
          feePerPlayer: 5.0,
          matchGoals: match.goals || [],
          matchHomeScore: normHomeScore,
          matchAwayScore: normAwayScore,
          playerOfMatch: normPOM,
          potdWinner: normPOTD
        };
        updatedSessions.push(newSession);
        sessionsChanged = true;
      } else {
        // Two-way synchronization: If Match Detail is updated, sync to Session (Requirement 4)
        const existingSession = updatedSessions[existingSessionIndex];
        
        const existingGoalsJSON = JSON.stringify((existingSession.matchGoals || []).map(g => ({ id: g.id, playerId: g.playerId, playerName: g.playerName, team: g.team, type: g.type })));

        // Check if anything is out of sync (normalizing both dates defensively to standard ISO formats)
        const isOutOfSync = 
          existingSession.matchId !== match.id ||
          existingSession.title !== normTitle ||
          (existingSession.date ? normalizeDateToISO(existingSession.date) : '') !== normDate ||
          existingSession.time !== normTime ||
          existingSession.status !== normStatus ||
          existingSession.matchHomeScore !== normHomeScore ||
          existingSession.matchAwayScore !== normAwayScore ||
          (existingSession.playerOfMatch || undefined) !== normPOM ||
          (existingSession.potdWinner || undefined) !== normPOTD ||
          existingGoalsJSON !== normGoalsJSON;

        if (isOutOfSync) {
          updatedSessions[existingSessionIndex] = {
            ...existingSession,
            matchId: match.id,
            title: normTitle,
            date: normDate || existingSession.date,
            time: normTime,
            status: normStatus,
            matchGoals: match.goals || [],
            matchHomeScore: normHomeScore,
            matchAwayScore: normAwayScore,
            playerOfMatch: normPOM,
            potdWinner: normPOTD
          };
          sessionsChanged = true;
        }
      }
    });

    // Direction B: Session details -> Match details
    sessions.forEach(session => {
      if (!session) return;
      const sessionPlainDate = normalizeDateToISO(session.date);
      
      const existingMatchIndex = updatedMatches.findIndex(m => {
        if (!m) return false;
        if (m.id === session.matchId || m.id === `m-${session.id}` || `session-${m.id}` === session.id) {
          return true;
        }
        const mPlainDate = m.date ? m.date.split(' • ')[0].trim() : '';
        const mPlainDateISO = normalizeDateToISO(mPlainDate);
        const mTime = m.date && m.date.includes(' • ') ? m.date.split(' • ')[1].trim() : '10:30';
        
        const isSameDate = mPlainDateISO === sessionPlainDate && !!mPlainDateISO;
        if (isSameDate) return true;
        
        let titleToParse = session.title;
        if (titleToParse.includes(':')) {
          titleToParse = titleToParse.split(':').slice(1).join(':').trim();
        }
        const titleLower = titleToParse.toLowerCase();
        const hasHomeTeam = titleLower.includes(m.homeTeam.toLowerCase());
        const hasAwayTeam = titleLower.includes(m.awayTeam.toLowerCase());
        
        return hasHomeTeam && hasAwayTeam;
      });

      if (existingMatchIndex !== -1) {
        // Sync session details back to match
        const m = updatedMatches[existingMatchIndex];

        const normMatchStatus: 'Scheduled' | 'Played' | 'Live' = session.status === 'Completed' ? 'Played' : m.status;
        const normMatchHomeScore = session.matchHomeScore !== undefined ? session.matchHomeScore : undefined;
        const normMatchAwayScore = session.matchAwayScore !== undefined ? session.matchAwayScore : undefined;
        const normMatchPOM = session.playerOfMatch || undefined;
        const normMatchPOTD = session.potdWinner || session.playerOfMatch || undefined;
        const normMatchGoals = session.matchGoals !== undefined ? session.matchGoals : m.goals;
        const normMatchGoalsJSON = JSON.stringify((normMatchGoals || []).map(g => ({ id: g.id, playerId: g.playerId, playerName: g.playerName, team: g.team, type: g.type })));

        const existingGoalsJSON = JSON.stringify((m.goals || []).map(g => ({ id: g.id, playerId: g.playerId, playerName: g.playerName, team: g.team, type: g.type })));

        const isOutOfSync = 
          m.status !== normMatchStatus ||
          m.homeScore !== normMatchHomeScore ||
          m.awayScore !== normMatchAwayScore ||
          (m.playerOfMatch || undefined) !== normMatchPOM ||
          (m.potdWinner || undefined) !== normMatchPOTD ||
          existingGoalsJSON !== normMatchGoalsJSON;

        if (isOutOfSync) {
          updatedMatches[existingMatchIndex] = {
            ...m,
            status: normMatchStatus,
            homeScore: normMatchHomeScore,
            awayScore: normMatchAwayScore,
            goals: normMatchGoals,
            playerOfMatch: normMatchPOM,
            potdWinner: normMatchPOTD
          };
          matchesChanged = true;
        }
      } else {
        // If there's a session but no match card, let's create a match card!
        let homeTeam = 'Game On FC';
        let awayTeam = 'Apex Athletics';
        
        let titleToParse = session.title;
        if (titleToParse.includes(':')) {
          titleToParse = titleToParse.split(':').slice(1).join(':').trim();
        }
        
        const vsIndex = titleToParse.toLowerCase().indexOf(' vs ');
        if (vsIndex !== -1) {
          homeTeam = titleToParse.substring(0, vsIndex).trim();
          awayTeam = titleToParse.substring(vsIndex + 4).trim();
        } else {
          const vIndex = titleToParse.toLowerCase().indexOf(' v ');
          const dashIndex = titleToParse.indexOf(' - ');
          const emDashIndex = titleToParse.indexOf(' — ');
          
          if (vIndex !== -1) {
             homeTeam = titleToParse.substring(0, vIndex).trim();
             awayTeam = titleToParse.substring(vIndex + 3).trim();
          } else if (dashIndex !== -1) {
             homeTeam = titleToParse.substring(0, dashIndex).trim();
             awayTeam = titleToParse.substring(dashIndex + 3).trim();
          } else if (emDashIndex !== -1) {
             homeTeam = titleToParse.substring(0, emDashIndex).trim();
             awayTeam = titleToParse.substring(emDashIndex + 3).trim();
          }
        }

        const lId = session.leagueId || (leagues.length > 0 ? leagues[0].id : 'l-3');
        const leagueTeams = standings[lId]?.map(t => t.name) || [];
        if (leagueTeams && leagueTeams.length >= 2) {
          if (!homeTeam || homeTeam === 'Game On FC') {
            homeTeam = leagueTeams[0];
          }
          if (!awayTeam || awayTeam === 'Apex Athletics') {
            awayTeam = leagueTeams[1];
          }
        }

        const formatParts = (session.time || '10:30').split(':');
        const formattedTime = formatParts.length === 2 ? `${formatParts[0]}:${formatParts[1]}` : '10:30';

        let displayDate = session.date;
        try {
          const d = new Date(session.date + 'T00:00:00');
          const day = d.getDate();
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const month = monthNames[d.getMonth()];
          const year = d.getFullYear();
          displayDate = `${day} ${month} ${year}`;
        } catch (e) {
          displayDate = session.date;
        }

        const dateFormatted = `${displayDate} • ${formattedTime}`;

        const newMatch: LeagueMatch = {
          id: `m-${session.id}`,
          leagueId: lId,
          homeTeam,
          awayTeam,
          date: dateFormatted,
          status: session.status === 'Completed' ? 'Played' : 'Scheduled',
          type: session.type === 'Friendly Match' ? 'Friendly Match' : 'League Match',
          homeScore: session.matchHomeScore !== undefined ? session.matchHomeScore : undefined,
          awayScore: session.matchAwayScore !== undefined ? session.matchAwayScore : undefined,
          goals: session.matchGoals || [],
          playerOfMatch: session.playerOfMatch || undefined,
          potdWinner: session.potdWinner || session.playerOfMatch || undefined
        };

        updatedMatches.push(newMatch);
        matchesChanged = true;
      }
    });

    if (sessionsChanged || matchesChanged) {
      isSyncingRef.current = true;
      if (sessionsChanged) {
        setSessions(updatedSessions);
        updateStorage('gameon_sessions', updatedSessions);
      }
      if (matchesChanged) {
        setMatches(updatedMatches);
        updateStorage('gameon_matches', updatedMatches);
      }
    }
  }, [matches, sessions, leagues, standings]);

  // Save changes helper
  const updateStorage = (key: string, data: any) => {
    localStorage.setItem(key, safeJsonStringify(data));
    
    // Propagate changes directly to our centralized GameOnAppStore local backend
    const fieldMap: Record<string, keyof typeof GameOnAppStore['state']> = {
      'gameon_players': 'players',
      'gameon_sessions': 'sessions',
      'gameon_attendance': 'attendance',
      'gameon_leagues': 'leagues',
      'gameon_standings': 'standings',
      'gameon_matches': 'matches',
      'gameon_logs': 'logs'
    };
    const field = fieldMap[key];
    if (field) {
      GameOnAppStore.save({ [field]: data });
    }
  };

  // State update handlers
  const handleAddSession = (newSessions: Omit<Session, 'id'> | Omit<Session, 'id'>[]) => {
    const sessionsArray = Array.isArray(newSessions) ? newSessions : [newSessions];
    const sessionsWithIds: Session[] = sessionsArray.map((s, index) => ({
      ...s,
      id: `session-${Date.now()}-${index}`
    }));
    
    const updated = [...sessionsWithIds, ...sessions];
    setSessions(updated);
    updateStorage('gameon_sessions', updated);

    // Add activity log
    const firstSession = sessionsArray[0];
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'Session',
      message: sessionsArray.length > 1
        ? `Scheduled recurring session series (${sessionsArray.length} weeks): ${firstSession.title}`
        : `Scheduled new session: ${firstSession.title}`,
      detail: `${firstSession.type} at ${firstSession.location} starting on ${firstSession.date}`
    };
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    updateStorage('gameon_logs', updatedLogs);
  };

  const handleUpdateSession = (updatedSession: Session) => {
    const updated = sessions.map(s => s.id === updatedSession.id ? { ...s, ...updatedSession } : s);
    setSessions(updated);
    updateStorage('gameon_sessions', updated);

    // Add activity log
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'Session',
      message: `Updated session: ${updatedSession.title}`,
      detail: `${updatedSession.type} at ${updatedSession.location} on ${updatedSession.date}`
    };
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    updateStorage('gameon_logs', updatedLogs);
  };

  const handleUpdateAttendance = (sessionId: string, records: AttendanceRecord[]) => {
    // 1. Remove any existing records for this sessionId
    const filteredRecords = attendance.filter(r => r.sessionId !== sessionId && r.sessionId !== `session-${sessionId}`);
    
    // 2. Append new ones
    const updatedAttendance = [...filteredRecords, ...records];
    setAttendance(updatedAttendance);
    updateStorage('gameon_attendance', updatedAttendance);

    // 3. Set the session status to 'Completed'
    const targetSession = sessions.find(s => s.id === sessionId || s.id === `session-${sessionId}` || s.matchId === sessionId);
    const updatedSessions = sessions.map(s => {
      if (s.id === sessionId || s.id === `session-${sessionId}` || s.matchId === sessionId || (targetSession?.date && s.date === targetSession.date)) {
        return { ...s, status: 'Completed' as const };
      }
      return s;
    });
    setSessions(updatedSessions);
    updateStorage('gameon_sessions', updatedSessions);

    // 4. Log the action
    const presentCount = records.filter(r => r.status === 'Present').length;
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'Attendance',
      message: `Attendance submitted for "${targetSession?.title || 'Session'}"`,
      detail: `${presentCount} players marked Present out of ${records.length} active players`
    };
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    updateStorage('gameon_logs', updatedLogs);

    // 5. Silent, Automatic Debounced Background Sync to Google Sheets
    debouncedSyncSession(
      sessionId,
      computedPlayers,
      updatedSessions,
      updatedAttendance,
      leagues,
      setSheetsSyncStatus
    );

    // 6. Persist session attendance directly to backend database (/api/session/save)
    const attDict: Record<string, string> = {};
    records.forEach(r => {
      attDict[r.playerId] = r.status;
      const pObj = computedPlayers.find(p => p.id === r.playerId);
      if (pObj?.name) {
        attDict[pObj.name] = r.status;
      }
    });

    fetch('/api/session/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: targetSession?.id || sessionId,
        date: targetSession?.date || new Date().toISOString().split('T')[0],
        title: targetSession?.title || 'Training Session',
        attendance: attDict
      })
    }).catch(err => console.error('Error persisting session attendance to server:', err));

    // 7. Clean up squads on linked match card if players were marked absent
    if (records.length > 0) {
      const presentPlayerIds = new Set(records.filter(r => r.status === 'Present').map(r => r.playerId));
      const presentPlayerNames = new Set(
        records.filter(r => r.status === 'Present').map(r => {
          const p = computedPlayers.find(cp => cp.id === r.playerId);
          return p?.name;
        }).filter(Boolean) as string[]
      );

      const linkedMatch = matches.find(m => 
        m.id === sessionId || 
        m.id === targetSession?.matchId || 
        (targetSession?.date && m.date === targetSession.date)
      );

      if (linkedMatch) {
        const filterPresent = (squad: string[]) => squad.filter(idOrName => 
          presentPlayerIds.has(idOrName) || presentPlayerNames.has(idOrName)
        );
        const updatedHome = filterPresent(linkedMatch.homeSquad || linkedMatch.homeRoster || []);
        const updatedAway = filterPresent(linkedMatch.awaySquad || linkedMatch.awayRoster || []);

        if (updatedHome.length !== (linkedMatch.homeSquad?.length || 0) || updatedAway.length !== (linkedMatch.awaySquad?.length || 0)) {
          handleUpdateMatch({
            ...linkedMatch,
            homeSquad: updatedHome,
            awaySquad: updatedAway,
            homeRoster: updatedHome,
            awayRoster: updatedAway
          });
        }
      }
    }
  };

  const executeCascadingDelete = (
    idOrDate: string,
    isSession: boolean,
    deleteAllInSeries?: boolean
  ) => {
    console.log("Delete button clicked", idOrDate);
    try {
      const cleanInput = String(idOrDate || '').trim();
      if (!cleanInput) return;

      const normId = cleanInput.replace(/^session-/, '').replace(/^session_/, '');

      // 1. Locate primary target session and/or match
      const primarySessions = sessions.filter(s => 
        s && (s.id === cleanInput || s.id === normId || s.id === `session-${normId}` || s.matchId === cleanInput || s.matchId === normId)
      );
      const primaryMatches = matches.filter(m => 
        m && (m.id === cleanInput || m.id === normId || m.id === `session-${normId}` || primarySessions.some(ps => ps.matchId === m.id))
      );

      // Collect all associated dates
      const targetDates = new Set<string>();
      primarySessions.forEach(s => {
        if (s.date) {
          targetDates.add(s.date);
          const iso = normalizeDateToISO(s.date);
          if (iso) targetDates.add(iso);
        }
      });
      primaryMatches.forEach(m => {
        if (m.date) {
          targetDates.add(m.date);
          const iso = normalizeDateToISO(m.date);
          if (iso) targetDates.add(iso);
        }
      });

      const directIsoDate = normalizeDateToISO(cleanInput);
      if (directIsoDate) {
        targetDates.add(cleanInput);
        targetDates.add(directIsoDate);
      }

      // 2. Find ALL sessions to delete (by ID, matchId, date match, or recurring group)
      const sessionsToDelete = sessions.filter(s => {
        if (!s) return false;
        const sNorm = s.id.replace(/^session-/, '').replace(/^session_/, '');
        if (s.id === cleanInput || sNorm === normId || s.id === `session-${normId}`) return true;
        if (s.matchId === cleanInput || s.matchId === normId) return true;
        if (primarySessions.some(ps => ps.matchId && s.matchId === ps.matchId)) return true;
        if (deleteAllInSeries && primarySessions.some(ps => ps.recurringGroupId && s.recurringGroupId === ps.recurringGroupId)) return true;
        if (s.date && (targetDates.has(s.date) || (normalizeDateToISO(s.date) && targetDates.has(normalizeDateToISO(s.date)!)))) return true;
        return false;
      });

      // 3. Find ALL matches to delete (by ID, session matchId, or date match)
      const matchesToDelete = matches.filter(m => {
        if (!m) return false;
        const mNorm = m.id.replace(/^session-/, '').replace(/^session_/, '');
        if (m.id === cleanInput || mNorm === normId || m.id === `session-${normId}`) return true;
        if (primarySessions.some(ps => ps.matchId === m.id)) return true;
        if (sessionsToDelete.some(s => s.matchId === m.id)) return true;
        if (m.date && (targetDates.has(m.date) || (normalizeDateToISO(m.date) && targetDates.has(normalizeDateToISO(m.date)!)))) return true;
        return false;
      });

      // 4. Construct set of ALL deleted IDs and keys
      const allDeletedIds = new Set<string>();
      allDeletedIds.add(cleanInput);
      allDeletedIds.add(normId);
      allDeletedIds.add(`session-${normId}`);
      allDeletedIds.add(`session_${normId}`);

      targetDates.forEach(d => {
        allDeletedIds.add(d);
        allDeletedIds.add(`session-${d}`);
        allDeletedIds.add(`session_${d}`);
        allDeletedIds.add(`session-card-${d}`);
        allDeletedIds.add(`m-auto-${d}`);
      });

      sessionsToDelete.forEach(s => {
        allDeletedIds.add(s.id);
        const sNorm = s.id.replace(/^session-/, '');
        allDeletedIds.add(sNorm);
        allDeletedIds.add(`session-${sNorm}`);
        if (s.matchId) {
          allDeletedIds.add(s.matchId);
          allDeletedIds.add(`session-${s.matchId}`);
        }
        if (s.date) {
          allDeletedIds.add(s.date);
          const iso = normalizeDateToISO(s.date);
          if (iso) {
            allDeletedIds.add(iso);
            allDeletedIds.add(`session-card-${iso}`);
            allDeletedIds.add(`m-auto-${iso}`);
          }
        }
      });

      matchesToDelete.forEach(m => {
        allDeletedIds.add(m.id);
        const mNorm = m.id.replace(/^session-/, '');
        allDeletedIds.add(mNorm);
        allDeletedIds.add(`session-${mNorm}`);
        if (m.date) {
          allDeletedIds.add(m.date);
          const iso = normalizeDateToISO(m.date);
          if (iso) {
            allDeletedIds.add(iso);
            allDeletedIds.add(`session-card-${iso}`);
            allDeletedIds.add(`m-auto-${iso}`);
          }
        }
      });

      // 5. Update tombstone list in localStorage
      try {
        const existingDeleted = JSON.parse(localStorage.getItem('gameon_deleted_matches') || '[]');
        const updatedDeleted = Array.from(new Set([
          ...existingDeleted,
          ...Array.from(allDeletedIds)
        ]));
        localStorage.setItem('gameon_deleted_matches', JSON.stringify(updatedDeleted));
      } catch (e) {
        localStorage.setItem('gameon_deleted_matches', JSON.stringify(Array.from(allDeletedIds)));
      }

      // 6. Filter out sessions, matches, and attendance
      const updatedSessions = sessions.filter(s => {
        if (!s) return false;
        const sNorm = s.id.replace(/^session-/, '').replace(/^session_/, '');
        const sIso = s.date ? normalizeDateToISO(s.date) : null;
        if (allDeletedIds.has(s.id) || allDeletedIds.has(sNorm) || allDeletedIds.has(`session-${sNorm}`)) return false;
        if (s.matchId && (allDeletedIds.has(s.matchId) || allDeletedIds.has(s.matchId.replace(/^session-/, '')))) return false;
        if (sIso && (allDeletedIds.has(sIso) || allDeletedIds.has(`session-card-${sIso}`) || allDeletedIds.has(`m-auto-${sIso}`))) return false;
        return true;
      });

      const updatedMatches = matches.filter(m => {
        if (!m) return false;
        const mNorm = m.id.replace(/^session-/, '').replace(/^session_/, '');
        const mIso = m.date ? normalizeDateToISO(m.date) : null;
        if (allDeletedIds.has(m.id) || allDeletedIds.has(mNorm) || allDeletedIds.has(`session-${mNorm}`)) return false;
        if (mIso && (allDeletedIds.has(mIso) || allDeletedIds.has(`session-card-${mIso}`) || allDeletedIds.has(`m-auto-${mIso}`))) return false;
        return true;
      });

      const updatedAttendance = attendance.filter(a => {
        if (!a || !a.sessionId) return false;
        const aNorm = a.sessionId.replace(/^session-/, '').replace(/^session_/, '');
        if (allDeletedIds.has(a.sessionId) || allDeletedIds.has(aNorm) || allDeletedIds.has(`session-${aNorm}`)) return false;
        return true;
      });

      // 7. Clear activeSessionId if matching
      if (activeSessionId && (allDeletedIds.has(activeSessionId) || allDeletedIds.has(activeSessionId.replace(/^session-/, '')))) {
        setActiveSessionId(null);
      }

      // 8. Update state and localStorage
      setSessions(updatedSessions);
      updateStorage('gameon_sessions', updatedSessions);

      setMatches(updatedMatches);
      updateStorage('gameon_matches', updatedMatches);
      if (updatedMatches.length === 0) {
        localStorage.setItem('gameon_matches_cleared', 'true');
      }

      setAttendance(updatedAttendance);
      updateStorage('gameon_attendance', updatedAttendance);

      // 9. API background deletion calls
      allDeletedIds.forEach(delId => {
        fetch('/api/match/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: delId })
        }).catch(() => {});

        fetch('/api/session/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: delId })
        }).catch(() => {});
      });

      targetDates.forEach(tDate => {
        fetch('/api/match/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: tDate })
        }).catch(() => {});

        fetch('/api/session/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: tDate })
        }).catch(() => {});
      });

      // 10. Log deletion
      const newLog: ActivityLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: isSession ? 'Session' : 'League',
        message: `Deleted ${isSession ? 'session' : 'match'} & all linked child data for ID ${cleanInput}`,
        detail: `Cascading delete cleared session cards, match card fixtures, attendance records, team rosters, and stats.`
      };
      const updatedLogs = [newLog, ...logs];
      setLogs(updatedLogs);
      updateStorage('gameon_logs', updatedLogs);

      // 11. Recalculate standings and stats
      updateAppDatabaseAndRender(updatedMatches, updatedSessions);
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const handleDeleteSession = (sessionId: string, deleteAllInSeries?: boolean) => {
    console.log("Delete button clicked", sessionId);
    try {
      executeCascadingDelete(sessionId, true, deleteAllInSeries);
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const handleDeleteAllSessions = () => {
    // 1. Reset all matches back to Scheduled and remove recorded scores/goals/player of matches
    const updatedMatches = matches.map(m => ({
      ...m,
      status: 'Scheduled' as const,
      homeScore: undefined,
      awayScore: undefined,
      goals: [],
      playerOfMatch: undefined
    }));
    setMatches(updatedMatches);
    updateStorage('gameon_matches', updatedMatches);

    // 2. Recalculate standings for all leagues (since all matches are Scheduled now)
    const updatedStandings = { ...standings };
    leagues.forEach(league => {
      updatedStandings[league.id] = recalculateLeagueStandings(league.id, updatedMatches);
    });
    setStandings(updatedStandings);
    updateStorage('gameon_standings', updatedStandings);

    // 3. Clear sessions and attendance
    setSessions([]);
    updateStorage('gameon_sessions', []);
    setAttendance([]);
    updateStorage('gameon_attendance', []);

    // 4. Log the action
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'Session',
      message: 'All sessions deleted',
      detail: 'The sessions registry and all attendance tables were completely cleared. All league matches were reset to Scheduled.'
    };
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    updateStorage('gameon_logs', updatedLogs);
  };

  const handleAddPlayer = (newPlayer: Omit<Player, 'id'>): Player => {
    const playerWithId: Player = {
      ...newPlayer,
      id: `p-${Date.now()}`
    };
    const updated = [playerWithId, ...players];
    setPlayers(updated);
    updateStorage('gameon_players', updated);

    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'Player',
      message: `Registered new club player: ${newPlayer.name}`,
      detail: `Jersey #${newPlayer.jerseyNumber} playing as ${newPlayer.position}`
    };
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    updateStorage('gameon_logs', updatedLogs);

    return playerWithId;
  };

  const handleUpdatePlayer = (updatedPlayer: Player) => {
    const updated = players.map(p => p.id === updatedPlayer.id ? updatedPlayer : p);
    setPlayers(updated);
    updateStorage('gameon_players', updated);

    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'Player',
      message: `Updated profile details for: ${updatedPlayer.name}`,
      detail: `Roster status changed to: ${updatedPlayer.status}`
    };
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    updateStorage('gameon_logs', updatedLogs);
  };

  const handleDeletePlayer = (playerId: string) => {
    console.log("Delete button clicked", playerId);
    try {
      const targetPlayer = players.find(p => p.id === playerId);
      const updatedPlayers = players.filter(p => p.id !== playerId);
      setPlayers(updatedPlayers);
      updateStorage('gameon_players', updatedPlayers);

      const updatedAttendance = attendance.filter(a => a.playerId !== playerId);
      setAttendance(updatedAttendance);
      updateStorage('gameon_attendance', updatedAttendance);

      // Clean up matches:
      // - Remove player from homeSquad and awaySquad
      // - Remove goals scored by this player, adjusting scores if goals were 'League' type
      const affectedLeagueIds = new Set<string>();
      const updatedMatches = matches.map(m => {
        let isChanged = false;
        let homeSquad = m.homeSquad || [];
        let awaySquad = m.awaySquad || [];
        let goals = m.goals || [];
        let homeScore = m.homeScore;
        let awayScore = m.awayScore;

        if (homeSquad.includes(playerId)) {
          homeSquad = homeSquad.filter(id => id !== playerId);
          isChanged = true;
        }
        if (awaySquad.includes(playerId)) {
          awaySquad = awaySquad.filter(id => id !== playerId);
          isChanged = true;
        }

        const playerGoals = goals.filter(g => g.playerId === playerId);
        if (playerGoals.length > 0) {
          goals = goals.filter(g => g.playerId !== playerId);
          isChanged = true;

          playerGoals.forEach(g => {
            if (g.type === 'League') {
              if (g.team === 'home' && homeScore !== undefined) {
                homeScore = Math.max(0, homeScore - 1);
              }
              if (g.team === 'away' && awayScore !== undefined) {
                awayScore = Math.max(0, awayScore - 1);
              }
            }
          });
        }

        if (isChanged) {
          affectedLeagueIds.add(m.leagueId);
          return {
            ...m,
            homeSquad,
            awaySquad,
            goals,
            homeScore,
            awayScore
          };
        }
        return m;
      });

      if (affectedLeagueIds.size > 0 || updatedMatches !== matches) {
        setMatches(updatedMatches);
        updateStorage('gameon_matches', updatedMatches);

        // Recalculate standings for affected leagues
        const updatedStandings = { ...standings };
        affectedLeagueIds.forEach(lId => {
          updatedStandings[lId] = recalculateLeagueStandings(lId, updatedMatches);
        });
        setStandings(updatedStandings);
        updateStorage('gameon_standings', updatedStandings);
      }

      // Clean up sessions:
      // - Remove goals scored by this player from session.matchGoals
      // - Adjust session scores
      const updatedSessions = sessions.map(s => {
        let isChanged = false;
        let matchGoals = s.matchGoals || [];
        let matchHomeScore = s.matchHomeScore;
        let matchAwayScore = s.matchAwayScore;

        const playerGoals = matchGoals.filter(g => g.playerId === playerId);
        if (playerGoals.length > 0) {
          matchGoals = matchGoals.filter(g => g.playerId !== playerId);
          isChanged = true;

          playerGoals.forEach(g => {
            if (g.type === 'League') {
              if (g.team === 'home' && matchHomeScore !== undefined) {
                matchHomeScore = Math.max(0, matchHomeScore - 1);
              }
              if (g.team === 'away' && matchAwayScore !== undefined) {
                matchAwayScore = Math.max(0, matchAwayScore - 1);
              }
            }
          });
        }

        // If session corresponds directly to one of the updated matches, use that updated match's scores/goals
        const matchingUpdatedMatch = updatedMatches.find(m => m.id === s.matchId || `session-${m.id}` === s.id);
        if (matchingUpdatedMatch) {
          return {
            ...s,
            matchGoals: matchingUpdatedMatch.goals || [],
            matchHomeScore: matchingUpdatedMatch.homeScore !== undefined ? matchingUpdatedMatch.homeScore : 0,
            matchAwayScore: matchingUpdatedMatch.awayScore !== undefined ? matchingUpdatedMatch.awayScore : 0,
          };
        }

        if (isChanged) {
          return {
            ...s,
            matchGoals,
            matchHomeScore,
            matchAwayScore
          };
        }
        return s;
      });

      setSessions(updatedSessions);
      updateStorage('gameon_sessions', updatedSessions);

      const newLog: ActivityLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'Player',
        message: `Deregistered player: ${targetPlayer?.name || 'Player ID ' + playerId}`,
        detail: 'Removed from core roster, cleared historical registration cards, and cleaned up squad listings and goalscorers.'
      };
      const updatedLogs = [newLog, ...logs];
      setLogs(updatedLogs);
      updateStorage('gameon_logs', updatedLogs);

      // Call backend API to delete player record
      fetch('/api/player/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: playerId, name: targetPlayer?.name })
      }).catch(() => {});
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const handleAddLeague = (newLeague: Omit<League, 'id'>, initialTeams: string[]) => {
    const leagueId = `l-${Date.now()}`;
    const leagueWithId: League = {
      ...newLeague,
      id: leagueId
    };
    const updatedLeagues = [...leagues, leagueWithId];
    setLeagues(updatedLeagues);
    updateStorage('gameon_leagues', updatedLeagues);

    // Initialize team standings
    const initialStandings: TeamStanding[] = initialTeams.map((teamName, index) => ({
      id: `t-${leagueId}-${index}`,
      name: teamName,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0
    }));
    const updatedStandings = {
      ...standings,
      [leagueId]: initialStandings
    };
    setStandings(updatedStandings);
    updateStorage('gameon_standings', updatedStandings);

    // Generate mock round-robin matches
    const newMatches: LeagueMatch[] = [];
    const leagueFormat = newLeague.format || 'once';
    
    // First round (i plays j)
    for (let i = 0; i < initialTeams.length; i++) {
      for (let j = i + 1; j < initialTeams.length; j++) {
        const gameDate = new Date(Date.now() + (newMatches.length + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        newMatches.push({
          id: `m-${leagueId}-${i}-${j}-r1`,
          leagueId,
          homeTeam: initialTeams[i],
          awayTeam: initialTeams[j],
          date: `${gameDate} • 10:30`,
          status: 'Scheduled'
        });
      }
    }

    // Second round (j plays i) if format is 'twice'
    if (leagueFormat === 'twice') {
      for (let i = 0; i < initialTeams.length; i++) {
        for (let j = i + 1; j < initialTeams.length; j++) {
          const gameDate = new Date(Date.now() + (newMatches.length + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          newMatches.push({
            id: `m-${leagueId}-${i}-${j}-r2`,
            leagueId,
            homeTeam: initialTeams[j],
            awayTeam: initialTeams[i],
            date: `${gameDate} • 10:30`,
            status: 'Scheduled'
          });
        }
      }
    }
    const updatedMatches = [...matches, ...newMatches];
    setMatches(updatedMatches);
    updateStorage('gameon_matches', updatedMatches);

    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'League',
      message: `Provisioned new tournament: ${newLeague.name}`,
      detail: `Created roster standing boards for ${initialTeams.length} registered clubs`
    };
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    updateStorage('gameon_logs', updatedLogs);
    setActiveTab('leagues');
  };

  const handleDeleteLeague = (leagueId: string) => {
    console.log("Delete button clicked", leagueId);
    try {
      const updatedLeagues = leagues.filter(l => l.id !== leagueId);
      setLeagues(updatedLeagues);
      updateStorage('gameon_leagues', updatedLeagues);

      const updatedStandings = { ...standings };
      delete updatedStandings[leagueId];
      setStandings(updatedStandings);
      updateStorage('gameon_standings', updatedStandings);

      const updatedMatches = matches.filter(m => m.leagueId !== leagueId);
      setMatches(updatedMatches);
      updateStorage('gameon_matches', updatedMatches);

      // Delete associated sessions and attendance records
      const sessionsToDelete = sessions.filter(s => s.leagueId === leagueId);
      const sessionIdsToDelete = sessionsToDelete.map(s => s.id);
      const updatedSessions = sessions.filter(s => s.leagueId !== leagueId);
      setSessions(updatedSessions);
      updateStorage('gameon_sessions', updatedSessions);

      const updatedAttendance = attendance.filter(a => !sessionIdsToDelete.includes(a.sessionId));
      setAttendance(updatedAttendance);
      updateStorage('gameon_attendance', updatedAttendance);

      const targetLeague = leagues.find(l => l.id === leagueId);
      const newLog: ActivityLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'League',
        message: `Deleted tournament: ${targetLeague?.name || 'League ID ' + leagueId}`,
        detail: 'League bracket, standings table, matches, sessions, and associated attendance registers were cleared.'
      };
      const updatedLogs = [newLog, ...logs];
      setLogs(updatedLogs);
      updateStorage('gameon_logs', updatedLogs);

      fetch('/api/league/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leagueId })
      }).catch(() => {});
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const handleAddTeamToLeague = (leagueId: string, teamName: string) => {
    const currentStandings = standings[leagueId] || [];
    if (currentStandings.some(t => t.name.toLowerCase() === teamName.trim().toLowerCase())) {
      alert(`Team "${teamName}" already exists in this league.`);
      return;
    }
    const newTeamStanding: TeamStanding = {
      id: `t-${leagueId}-${Date.now()}`,
      name: teamName.trim(),
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0
    };
    const updatedStandings = {
      ...standings,
      [leagueId]: [...currentStandings, newTeamStanding]
    };
    setStandings(updatedStandings);
    updateStorage('gameon_standings', updatedStandings);

    // Add activity log
    const league = leagues.find(l => l.id === leagueId);
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'League',
      message: `Added team "${teamName.trim()}" to "${league?.name || 'League'}"`,
      detail: 'Added team to standing board with zeroed initial stats.'
    };
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    updateStorage('gameon_logs', updatedLogs);
  };

  const handleDeleteTeamFromLeague = (leagueId: string, teamId: string) => {
    console.log("Delete button clicked", teamId);
    try {
      const currentStandings = standings[leagueId] || [];
      const teamToDelete = currentStandings.find(t => t.id === teamId);
      if (!teamToDelete) return;

      // Filter out the team from standings
      const updatedStandingsList = currentStandings.filter(t => t.id !== teamId);
      const updatedStandings = {
        ...standings,
        [leagueId]: updatedStandingsList
      };
      setStandings(updatedStandings);
      updateStorage('gameon_standings', updatedStandings);

      // Filter out matches involving this team
      const matchesToDelete = matches.filter(m => 
        m.leagueId === leagueId && (m.homeTeam === teamToDelete.name || m.awayTeam === teamToDelete.name)
      );
      const deletedMatchIds = new Set(matchesToDelete.map(m => m.id));
      const updatedMatches = matches.filter(m => !deletedMatchIds.has(m.id));
      setMatches(updatedMatches);
      updateStorage('gameon_matches', updatedMatches);

      // Filter out sessions associated with deleted matches
      const sessionsToDelete = sessions.filter(s => s.matchId && deletedMatchIds.has(s.matchId));
      const deletedSessionIds = new Set(sessionsToDelete.map(s => s.id));
      const updatedSessions = sessions.filter(s => !s.matchId || !deletedMatchIds.has(s.matchId));
      setSessions(updatedSessions);
      updateStorage('gameon_sessions', updatedSessions);

      // Filter out attendance records for deleted sessions
      const updatedAttendance = attendance.filter(a => !deletedSessionIds.has(a.sessionId));
      setAttendance(updatedAttendance);
      updateStorage('gameon_attendance', updatedAttendance);

      // Add activity log
      const league = leagues.find(l => l.id === leagueId);
      const newLog: ActivityLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'League',
        message: `Removed team "${teamToDelete.name}" from "${league?.name || 'League'}"`,
        detail: 'The team standing card, all associated matches, schedules, sessions, and attendance rosters were cleared.'
      };
      const updatedLogs = [newLog, ...logs];
      setLogs(updatedLogs);
      updateStorage('gameon_logs', updatedLogs);

      fetch('/api/team/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: teamId, name: teamToDelete.name })
      }).catch(() => {});
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const recalculateLeagueStandings = (leagueId: string, currentMatches: LeagueMatch[]) => {
    const isCaptains = isCaptainsLeagueId(leagueId);

    const isExcludedTeamName = (name: string) => {
      if (!name) return false;
      const lower = name.toLowerCase().trim();
      if (lower === 'team red' || lower === 'team yellow' || lower === 'red' || lower === 'yellow') {
        return true;
      }
      if (isCaptains) {
        return (
          lower === 'game on fc' ||
          lower === 'apex athletics' ||
          lower === 'ballers fc' ||
          lower === 'tekkers united'
        );
      }
      return false;
    };

    let leagueMatches = currentMatches.filter(m => {
      const matchBelongs = m.leagueId === leagueId || 
        (isCaptains && (isCaptainsLeagueId(m.leagueId) || !m.leagueId)) ||
        m.type === 'Friendly Match' ||
        !m.leagueId;
      
      return matchBelongs && m.status === 'Played';
    });
    
    const leagueStartDate = '2026-02-14';
    const leagueEndDate = '2026-12-31';

    leagueMatches = leagueMatches.filter(m => {
      const isoDate = normalizeDateToISO(m.date);
      return isoDate >= leagueStartDate && isoDate <= leagueEndDate;
    });

    const tryParseJSON = (str: string | null, fallback: any) => {
      if (!str) return fallback;
      try { return JSON.parse(str); } catch (e) { return fallback; }
    };
    const storedStandings = tryParseJSON(localStorage.getItem('gameon_standings'), {});
    const standingsSource = standings[leagueId] || storedStandings[leagueId] || [];
    let currentLeagueTeams = standingsSource.filter((t: any) => t && t.name && !isExcludedTeamName(t.name));

    if (currentLeagueTeams.length === 0) {
      const l3Standing = (INITIAL_STANDINGS || []).find(ls => ls.leagueId === leagueId);
      if (l3Standing) {
        currentLeagueTeams = l3Standing.standings.filter(t => t && t.name && !isExcludedTeamName(t.name));
      } else if (leagueId === 'l-3' || isCaptains) {
        currentLeagueTeams = [
          { id: 't-3-1', name: 'JERRY', played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0, ppg: 0 },
          { id: 't-3-2', name: 'SHOLA', played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0, ppg: 0 },
          { id: 't-3-3', name: 'OJUKWU', played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0, ppg: 0 },
          { id: 't-3-4', name: 'JOHN T', played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0, ppg: 0 },
          { id: 't-3-5', name: 'DAVID', played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0, ppg: 0 },
          { id: 't-3-6', name: 'ND', played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0, ppg: 0 },
          { id: 't-3-7', name: 'IBRAHEEM', played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0, ppg: 0 },
          { id: 't-3-8', name: 'OSANGA', played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0, ppg: 0 }
        ];
      }
    }

    // Initialize clean unique set of team names dynamically to completely eliminate ghost/stale entries
    let defaultTeams: string[] = [];
    if (isCaptains) {
      defaultTeams = ['JERRY', 'SHOLA', 'OJUKWU', 'JOHN T', 'DAVID', 'ND', 'IBRAHEEM', 'OSANGA'];
    }
    const uniqueTeamNames = new Set<string>(defaultTeams);

    // Dynamic discovery of teams in matches (normalizing case)
    leagueMatches.forEach(m => {
      if (m.homeTeam && !isExcludedTeamName(m.homeTeam)) {
        uniqueTeamNames.add(isCaptains ? m.homeTeam.trim().toUpperCase() : m.homeTeam.trim());
      }
      if (m.awayTeam && !isExcludedTeamName(m.awayTeam)) {
        uniqueTeamNames.add(isCaptains ? m.awayTeam.trim().toUpperCase() : m.awayTeam.trim());
      }
    });

    const freshStandings: TeamStanding[] = Array.from(uniqueTeamNames).map((teamName, idx) => {
      const existing = currentLeagueTeams.find(t => (isCaptains ? t.name.trim().toUpperCase() : t.name.trim()) === teamName);
      if (existing) {
        return {
          ...existing,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          points: 0,
          ppg: 0.0
        };
      }
      return {
        id: `t-${leagueId}-${idx}`,
        name: teamName,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
        ppg: 0.0
      };
    });

    leagueMatches.forEach(m => {
      const hScore = m.homeScore ?? 0;
      const aScore = m.awayScore ?? 0;

      const homeName = isCaptains ? m.homeTeam?.trim().toUpperCase() : m.homeTeam?.trim();
      const awayName = isCaptains ? m.awayTeam?.trim().toUpperCase() : m.awayTeam?.trim();

      const homeTeamNode = freshStandings.find(t => t.name === homeName);
      const awayTeamNode = freshStandings.find(t => t.name === awayName);

      if (homeTeamNode && awayTeamNode) {
        homeTeamNode.played += 1;
        awayTeamNode.played += 1;
        homeTeamNode.goalsFor += hScore;
        homeTeamNode.goalsAgainst += aScore;
        awayTeamNode.goalsFor += aScore;
        awayTeamNode.goalsAgainst += hScore;

        if (hScore > aScore) {
          homeTeamNode.won += 1;
          homeTeamNode.points += 3;
          awayTeamNode.lost += 1;
        } else if (hScore < aScore) {
          awayTeamNode.won += 1;
          awayTeamNode.points += 3;
          homeTeamNode.lost += 1;
        } else {
          homeTeamNode.drawn += 1;
          homeTeamNode.points += 1;
          awayTeamNode.drawn += 1;
          awayTeamNode.points += 1;
        }
      }
    });

    // Calculate PPG for each team standing
    freshStandings.forEach(t => {
      t.ppg = t.played > 0 ? Number((t.points / t.played).toFixed(1)) : 0.0;
    });

    // Sort standings by points DESC, GD DESC, GF DESC to keep leaderboard perfectly in sync
    return freshStandings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const aGD = a.goalsFor - a.goalsAgainst;
      const bGD = b.goalsFor - b.goalsAgainst;
      if (bGD !== aGD) return bGD - aGD;
      return b.goalsFor - a.goalsFor;
    });
  };

  const handleRecordMatchResult = (matchId: string, homeScore: number, awayScore: number) => {
    const targetMatch = matches.find(m => m.id === matchId);
    if (!targetMatch) return;

    const updatedMatches = matches.map(m => {
      if (m.id === matchId) {
        return {
          ...m,
          homeScore,
          awayScore,
          status: 'Played' as const
        };
      }
      return m;
    });
    setMatches(updatedMatches);
    updateStorage('gameon_matches', updatedMatches);

    const leagueId = targetMatch.leagueId;
    const freshStandings = recalculateLeagueStandings(leagueId, updatedMatches);
    const updatedStandings = {
      ...standings,
      [leagueId]: freshStandings
    };
    setStandings(updatedStandings);
    updateStorage('gameon_standings', updatedStandings);

    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'League',
      message: `Match recorded: ${targetMatch.homeTeam} ${homeScore} - ${awayScore} ${targetMatch.awayTeam}`,
      detail: `Standings ladder for league recompiled automatically.`
    };
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    updateStorage('gameon_logs', updatedLogs);

    // Call updateAppDatabaseAndRender() pipeline to auto-save, sync stats, and refresh the UI state
    updateAppDatabaseAndRender(updatedMatches);
  };

  const crossTriggerSessionFromMatch = (matchData: LeagueMatch): Session => {
    let dateStr = '2026-07-09';
    let timeStr = '10:30';
    
    if (matchData.date && matchData.date.includes(' • ')) {
      const parts = matchData.date.split(' • ');
      const dateParts = parts[0].trim().split(' ');
      if (dateParts.length === 3) {
        const months: Record<string, string> = {
          Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
          Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
        };
        const day = dateParts[0].padStart(2, '0');
        const month = months[dateParts[1].substring(0, 3)] || '07';
        const year = dateParts[2];
        dateStr = `${year}-${month}-${day}`;
      } else {
        dateStr = parts[0].trim();
      }
      timeStr = parts[1].trim();
    } else {
      dateStr = matchData.date || dateStr;
    }

    const matchName = `${matchData.homeTeam} vs ${matchData.awayTeam}`;
    
    // Automatically format as "Match Session: [Home Team] vs [Away Team]"
    const newSession: Session = {
      id: `session-${matchData.id}`,
      title: `Match Session: ${matchName}`,
      date: dateStr,
      time: timeStr,
      location: 'West Ham Park',
      leagueId: matchData.leagueId,
      matchId: matchData.id,
      type: (matchData.type === 'Friendly Match' ? 'Friendly Match' : 'League Match'),
      status: matchData.status === 'Played' ? 'Completed' : 'Upcoming',
      feePerPlayer: 5.0
    };

    return newSession;
  };

  const handleAddMatch = (newMatch: LeagueMatch) => {
    const updatedMatches = [...matches, newMatch];
    setMatches(updatedMatches);
    updateStorage('gameon_matches', updatedMatches);

    // Automation function intercepting the match payload
    const newSession = crossTriggerSessionFromMatch(newMatch);

    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);
    updateStorage('gameon_sessions', updatedSessions);

    // Default all players in this newly linked session to "Out" (Absent status in attendance)
    // by ensuring no conflicting positive records exist in the attendance array
    const filteredAttendance = attendance.filter(a => a && a.sessionId !== newSession.id);
    setAttendance(filteredAttendance);
    updateStorage('gameon_attendance', filteredAttendance);

    // Run the updateAppDatabaseAndRender pipeline immediately to auto-save and sync stats
    updateAppDatabaseAndRender(updatedMatches, updatedSessions);

    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'League',
      message: `Match scheduled: ${newMatch.homeTeam} vs ${newMatch.awayTeam}`,
      detail: `New fixture added to league schedule, and a matching attendance session was automatically created.`
    };
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    updateStorage('gameon_logs', updatedLogs);
  };

  const handleSyncSessionWithMatch = async (sessionId: string, matchId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    const match = matches.find(m => m.id === matchId);
    if (!session || !match) return;

    try {
      const res = await fetch("/api/sync-match-to-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match, session })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.syncedSession) {
          const updated = sessions.map(s => s.id === sessionId ? data.syncedSession : s);
          setSessions(updated);
          updateStorage('gameon_sessions', updated);
          return data.syncedSession;
        }
      }
    } catch (e) {
      console.error("Backend sync failed, falling back to local sync:", e);
    }

    // Local fallback sync
    const syncedSession: Session = {
      ...session,
      matchGoals: match.goals || [],
      matchHomeScore: match.homeScore !== undefined ? match.homeScore : 0,
      matchAwayScore: match.awayScore !== undefined ? match.awayScore : 0,
      playerOfMatch: match.playerOfMatch || undefined,
      status: match.status === 'Played' ? 'Completed' : session.status
    };
    const updated = sessions.map(s => s.id === sessionId ? syncedSession : s);
    setSessions(updated);
    updateStorage('gameon_sessions', updated);
    return syncedSession;
  };

  const handleUpdateMatch = async (updatedMatch: LeagueMatch) => {
    const updatedMatches = matches.map(m => m.id === updatedMatch.id ? { ...m, ...updatedMatch } : m);

    // Update corresponding session if it exists
    let dateStr = '2026-07-09';
    let timeStr = '10:30';
    
    if (updatedMatch.date.includes(' • ')) {
      const parts = updatedMatch.date.split(' • ');
      const dateParts = parts[0].trim().split(' ');
      if (dateParts.length === 3) {
        const months: Record<string, string> = {
          Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
          Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
        };
        const day = dateParts[0].padStart(2, '0');
        const month = months[dateParts[1].substring(0, 3)] || '07';
        const year = dateParts[2];
        dateStr = `${year}-${month}-${day}`;
      } else {
        dateStr = parts[0].trim();
      }
      timeStr = parts[1].trim();
    } else {
      dateStr = updatedMatch.date;
    }

    const matchName = `${updatedMatch.homeTeam} vs ${updatedMatch.awayTeam}`;
    
    // Sync match details to corresponding session using backend endpoint or fallback
    let updatedSessions = [...sessions];
    let linkedSessions = sessions.filter(s => s.matchId === updatedMatch.id || s.id === `session-${updatedMatch.id}`);

    if (linkedSessions.length === 0) {
      const newSession: Session = {
        id: `session-${updatedMatch.id}`,
        title: `Match Session: ${matchName}`,
        date: dateStr,
        time: timeStr,
        location: 'West Ham Park',
        leagueId: updatedMatch.leagueId,
        matchId: updatedMatch.id,
        type: (updatedMatch.type === 'Friendly Match' ? 'Friendly Match' : 'League Match') as any,
        status: (updatedMatch.status === 'Played' ? 'Completed' : 'Upcoming' as const),
        feePerPlayer: 5.0,
        matchGoals: updatedMatch.goals || [],
        matchHomeScore: updatedMatch.homeScore !== undefined ? updatedMatch.homeScore : 0,
        matchAwayScore: updatedMatch.awayScore !== undefined ? updatedMatch.awayScore : 0,
        playerOfMatch: updatedMatch.playerOfMatch || undefined,
        potdWinner: updatedMatch.potdWinner || undefined
      };
      updatedSessions.push(newSession);
      linkedSessions = [newSession];
    }

    for (const s of linkedSessions) {
      try {
        const res = await fetch("/api/sync-match-to-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ match: updatedMatch, session: s })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.syncedSession) {
            updatedSessions = updatedSessions.map(os => os.id === s.id ? data.syncedSession : os);
            continue;
          }
        }
      } catch (e) {
        console.error("Backend sync failed, doing local fallback:", e);
      }

      // Local fallback sync
      const fallbackSyncedSession: Session = {
        ...s,
        title: `Match Session: ${matchName}`,
        date: dateStr,
        time: timeStr,
        type: (updatedMatch.type === 'Friendly Match' ? 'Friendly Match' : 'League Match') as any,
        status: (updatedMatch.status === 'Played' ? 'Completed' : 'Upcoming' as const),
        matchGoals: updatedMatch.goals || [],
        matchHomeScore: updatedMatch.homeScore !== undefined ? updatedMatch.homeScore : 0,
        matchAwayScore: updatedMatch.awayScore !== undefined ? updatedMatch.awayScore : 0,
        playerOfMatch: updatedMatch.playerOfMatch || undefined,
        potdWinner: updatedMatch.potdWinner || undefined
      };
      updatedSessions = updatedSessions.map(os => os.id === s.id ? fallbackSyncedSession : os);
    }

    // Call our centralized SSOT updateAppDatabaseAndRender function to auto-save, sync, and refresh state
    const syncedData = updateAppDatabaseAndRender(updatedMatches, updatedSessions);

    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'League',
      message: `Match details synced to session for ${updatedMatch.homeTeam} vs ${updatedMatch.awayTeam}`,
      detail: `Result: ${updatedMatch.homeScore ?? 0}-${updatedMatch.awayScore ?? 0}, Goals synced: ${updatedMatch.goals?.length || 0}`
    };
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    updateStorage('gameon_logs', updatedLogs);
  };

  const deleteMatch = (matchId: string) => {
    console.log("Delete button clicked", matchId);
    try {
      executeCascadingDelete(matchId, false);
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const handleDeleteMatch = (matchId: string) => {
    console.log("Delete button clicked", matchId);
    try {
      deleteMatch(matchId);
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const handleNavigateToSession = (match: LeagueMatch) => {
    const normIsoDate = normalizeDateToISO(match.date) || '2026-02-28';
    let timeStr = '10:30';
    if (match.date && match.date.includes(' • ')) {
      const parts = match.date.split(' • ');
      if (parts[1]) timeStr = parts[1].trim();
    }

    // Clean up from deletedMatchIds if it was previously marked deleted
    if (typeof window !== 'undefined') {
      const deletedRaw = localStorage.getItem('gameon_deleted_matches');
      if (deletedRaw) {
        try {
          const arr = JSON.parse(deletedRaw);
          if (Array.isArray(arr)) {
            const cleanArr = arr.filter((id: string) => 
              id !== String(match.id) && 
              id !== `session-${match.id}` && 
              id !== `session-card-${normIsoDate}` &&
              id !== normIsoDate
            );
            localStorage.setItem('gameon_deleted_matches', JSON.stringify(cleanArr));
          }
        } catch (e) {}
      }
    }

    // Find the session with strict matchId OR same league & normalized date & matching teams/title
    let session = sessions.find(s => 
      s.matchId === match.id || 
      s.id === `session-${match.id}` ||
      s.id === match.id ||
      (normalizeDateToISO(s.date) === normIsoDate && (s.leagueId === match.leagueId || !s.leagueId || !match.leagueId)) ||
      (normalizeDateToISO(s.date) === normIsoDate && (s.title.includes(match.homeTeam) || s.title.includes(match.awayTeam)))
    );
    
    if (!session) {
      const matchName = `${match.homeTeam} vs ${match.awayTeam}`;
      const newSession: Session = {
        id: `session-${match.id || Date.now()}`,
        title: `Match Session: ${matchName}`,
        date: normIsoDate,
        time: timeStr,
        location: 'West Ham Park',
        leagueId: match.leagueId,
        matchId: match.id,
        type: (match.type === 'Friendly Match' ? 'Friendly Match' : 'League Match'),
        status: match.status === 'Played' ? 'Completed' : 'Upcoming',
        feePerPlayer: 5.0,
        matchGoals: match.goals || [],
        matchHomeScore: match.homeScore,
        matchAwayScore: match.awayScore,
        playerOfMatch: match.playerOfMatch
      };

      const updatedSessions = [newSession, ...sessions.filter(s => s.id !== newSession.id)];
      setSessions(updatedSessions);
      updateStorage('gameon_sessions', updatedSessions);

      fetch('/api/session/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSession)
      }).catch(e => console.warn('Backend save session API warning:', e));

      session = newSession;
    }

    setActiveSessionId(session.id);
    setSessionOrigin('leagues');
    setActiveTab('sessions');
  };

  const handleNavigateToLeagueMatch = (leagueId: string, matchId?: string | null) => {
    setAppSelectedLeagueId(leagueId);
    setAppSelectedMatchId(matchId || null);
    setActiveTab('leagues');
  };

  const executeResetData = () => {
    localStorage.clear();
    localStorage.setItem('gameon_matches_cleared', 'true');
    localStorage.setItem('gameon_reset_all_cards', 'true');
    
    setPlayers(INITIAL_PLAYERS);
    setSessions([]);
    setAttendance([]);
    setLeagues(INITIAL_LEAGUES);
    
    const standRecord: Record<string, TeamStanding[]> = {};
    INITIAL_STANDINGS.forEach(ls => {
      standRecord[ls.leagueId] = recalculateLeagueStandings(ls.leagueId, []);
    });
    setStandings(standRecord);
    setMatches([]);
    setLogs(INITIAL_LOGS);

    localStorage.setItem('gameon_players', JSON.stringify(INITIAL_PLAYERS));
    localStorage.setItem('gameon_sessions', JSON.stringify([]));
    localStorage.setItem('gameon_attendance', JSON.stringify([]));
    localStorage.setItem('gameon_leagues', JSON.stringify(INITIAL_LEAGUES));
    localStorage.setItem('gameon_standings', JSON.stringify(standRecord));
    localStorage.setItem('gameon_matches', JSON.stringify([]));
    localStorage.setItem('gameon_logs', JSON.stringify(INITIAL_LOGS));

    fetch('/api/match/clear_all', { method: 'POST' }).catch(() => {});
  };

  const handleResetData = () => {
    setShowAppResetConfirm(true);
  };

  const executeClearAllData = () => {
    setPlayers([]);
    setSessions([]);
    setAttendance([]);
    setLeagues([]);
    setStandings({});
    setMatches([]);
    setLogs([]);

    localStorage.setItem('gameon_players', JSON.stringify([]));
    localStorage.setItem('gameon_sessions', JSON.stringify([]));
    localStorage.setItem('gameon_attendance', JSON.stringify([]));
    localStorage.setItem('gameon_leagues', JSON.stringify([]));
    localStorage.setItem('gameon_standings', JSON.stringify({}));
    localStorage.setItem('gameon_matches', JSON.stringify([]));
    localStorage.setItem('gameon_logs', JSON.stringify([]));
    localStorage.setItem('gameon_matches_cleared', 'true');
    localStorage.setItem('gameon_reset_all_cards', 'true');

    fetch('/api/match/clear_all', { method: 'POST' }).catch(() => {});

    // Clear sync status too
    setSheetsSyncStatus('idle');
  };

  const handleClearAllData = () => {
    setShowAppClearConfirm(true);
  };

  const handleClearSchedules = () => {
    // 1. Empty matches
    setMatches([]);
    updateStorage('gameon_matches', []);
    localStorage.setItem('gameon_matches_cleared', 'true');
    localStorage.setItem('gameon_reset_all_cards', 'true');

    // 2. Empty sessions
    setSessions([]);
    updateStorage('gameon_sessions', []);

    // 3. Empty attendance
    setAttendance([]);
    updateStorage('gameon_attendance', []);

    fetch('/api/match/clear_all', { method: 'POST' }).catch(() => {});

    // 4. Reset standings to empty (all 0s) for all leagues
    const updatedStandings = { ...standings };
    leagues.forEach(league => {
      updatedStandings[league.id] = recalculateLeagueStandings(league.id, []);
    });
    setStandings(updatedStandings);
    updateStorage('gameon_standings', updatedStandings);

    // 5. Empty logs
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'Session',
      message: 'Schedules and Match Records Cleared',
      detail: 'All active matches, sessions, goals, and attendance lists were cleared so you can enter the data manually.'
    };
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    updateStorage('gameon_logs', updatedLogs);
  };

  const handleRestoreSeeds = () => {
    localStorage.removeItem('gameon_matches_cleared');
    setMatches(INITIAL_MATCHES);
    updateStorage('gameon_matches', INITIAL_MATCHES);

    setSessions(INITIAL_SESSIONS);
    updateStorage('gameon_sessions', INITIAL_SESSIONS);

    setAttendance(INITIAL_ATTENDANCE);
    updateStorage('gameon_attendance', INITIAL_ATTENDANCE);

    const standRecord: Record<string, TeamStanding[]> = {};
    INITIAL_STANDINGS.forEach(ls => {
      standRecord[ls.leagueId] = ls.standings;
    });
    setStandings(standRecord);
    updateStorage('gameon_standings', standRecord);

    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'Session',
      message: 'Template Seeds Restored',
      detail: 'Original sessions, matches, and attendance registers were successfully restored.'
    };
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    updateStorage('gameon_logs', updatedLogs);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 selection:bg-emerald-500 selection:text-white flex flex-col transition-colors duration-300">
      
      {/* App Launch Splash Screen */}
      {isAppLoading && (
        <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 transition-opacity duration-500 ease-out ${splashFadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <div className={`flex flex-col items-center justify-center transform transition-transform duration-500 ease-out ${splashFadeOut ? 'scale-95' : 'scale-100'}`}>
            <div className="hover:scale-105 transition-transform duration-300">
              <GameOnLogo variant="app-icon" size={130} className="shadow-2xl border-2 border-emerald-500/20 shadow-emerald-500/10" />
            </div>
            
            <h1 className="mt-6 text-2xl font-black text-white tracking-tight">
              Football United
            </h1>
            <p className="text-xs text-emerald-400 font-extrabold tracking-widest uppercase mt-4 bg-emerald-950/40 border border-emerald-500/15 px-4 py-2 rounded-full flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Loading App...
            </p>
          </div>
        </div>
      )}



      {/* Fixed Header & Navigation Wrapper */}
      <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 shadow-md transition-colors duration-300 shrink-0">
        {/* Dynamic Header */}
        <header className="bg-transparent text-slate-900 dark:text-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex flex-row justify-between items-center gap-3">
            
            {/* Logo Brand - Left Aligned */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="hover:scale-105 transition-transform duration-200">
                <GameOnLogo variant="icon" size={38} className="sm:w-[44px] sm:h-[44px]" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Football United</h1>
              </div>
            </div>

            {/* Time & Reset Actions - Right Aligned */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              <button
                id="header-weekly-report-btn"
                onClick={() => setActiveTab('weekly-report')}
                title="Weekly League Report (PDF)"
                className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-[10px] sm:text-xs font-black tracking-wider uppercase rounded-xl transition-all cursor-pointer active:scale-95 border ${
                  activeTab === 'weekly-report'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md ring-2 ring-emerald-500/30'
                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                }`}
              >
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Weekly Report</span>
                <span className="px-1.5 py-0.2 text-[9px] font-mono font-black rounded-full bg-emerald-600 text-white">PDF</span>
              </button>

              <button
                id="sync-all-data-btn"
                onClick={() => rebuildPlayerStatsFromScratch(false)}
                title="Force Synchronize & Recalculate All Data"
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-[10px] sm:text-xs font-black tracking-wider uppercase bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl hover:shadow-md transition-all cursor-pointer active:scale-95 border border-emerald-400/20 shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-950" />
                <span className="hidden xs:inline">Sync Data</span>
              </button>

              <button
                id="theme-toggle-btn"
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 hover:border-slate-200 dark:hover:border-slate-800 rounded-xl transition cursor-pointer flex items-center justify-center"
              >
                {theme === 'light' ? <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" /> : <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />}
              </button>

              {!isAppDownloaded && (
                <>
                  <button
                    id="reset-workspace-btn"
                    onClick={handleResetData}
                    title="Reset Workspace"
                    className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 hover:border-slate-200 dark:hover:border-slate-800 rounded-xl transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  <button
                    id="clear-workspace-btn"
                    onClick={handleClearAllData}
                    title="Clear All (Clean Slate)"
                    className="p-1.5 sm:p-2 text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 hover:border-slate-200 dark:hover:border-slate-800 rounded-xl transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Roster & Desk Navigation tabs bar */}
        <nav className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/60 overflow-x-auto scrollbar-none shadow-xs">
          <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 flex items-center gap-1.5 py-1.5 sm:py-2 min-w-max">
            <button
              id="tab-btn-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 text-[10px] sm:text-xs md:text-sm font-extrabold px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-xl transition cursor-pointer flex-1 sm:flex-initial text-center shrink-0 ${
                activeTab === 'dashboard' 
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>Home</span>
            </button>

            <button
              id="tab-btn-sessions"
              onClick={() => {
                setActiveTab('sessions');
                setSessionOrigin('sessions');
              }}
              className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 text-[10px] sm:text-xs md:text-sm font-extrabold px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-xl transition cursor-pointer flex-1 sm:flex-initial text-center shrink-0 ${
                activeTab === 'sessions' 
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>Sessions</span>
              <span className="px-1.5 py-0.2 text-[10px] font-mono font-black rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                {sessions.length}
              </span>
            </button>

            <button
              id="tab-btn-leagues"
              onClick={() => setActiveTab('leagues')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 text-[10px] sm:text-xs md:text-sm font-extrabold px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-xl transition cursor-pointer flex-1 sm:flex-initial text-center shrink-0 ${
                activeTab === 'leagues' 
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>Matches</span>
              <span className="px-1.5 py-0.2 text-[10px] font-mono font-black rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {matches.length}
              </span>
            </button>

            <button
              id="tab-btn-players"
              onClick={() => setActiveTab('players')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 text-[10px] sm:text-xs md:text-sm font-extrabold px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-xl transition cursor-pointer flex-1 sm:flex-initial text-center shrink-0 ${
                activeTab === 'players' 
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>Players</span>
              <span className="px-1.5 py-0.2 text-[10px] font-mono font-black rounded-full bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                {computedPlayers.length}
              </span>
            </button>

            <button
              id="tab-btn-reporting"
              onClick={() => setActiveTab('reporting')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 text-[10px] sm:text-xs md:text-sm font-extrabold px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-xl transition cursor-pointer flex-1 sm:flex-initial text-center shrink-0 ${
                activeTab === 'reporting' 
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>Reports</span>
            </button>

            <button
              id="tab-btn-weekly-report"
              onClick={() => setActiveTab('weekly-report')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 text-[10px] sm:text-xs md:text-sm font-extrabold px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-xl transition cursor-pointer flex-1 sm:flex-initial text-center shrink-0 ${
                activeTab === 'weekly-report' 
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Weekly Report</span>
              <span className="px-1.5 py-0.2 text-[9px] font-mono font-black rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 uppercase">
                PDF
              </span>
            </button>

            {!isAppDownloaded && (
              <button
                id="tab-btn-download"
                onClick={() => setActiveTab('download')}
                className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 text-[10px] sm:text-xs md:text-sm font-extrabold px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-xl transition cursor-pointer flex-1 sm:flex-initial text-center shrink-0 ${
                  activeTab === 'download' 
                    ? 'bg-emerald-550/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-emerald-550" />
                <span>Get App</span>
              </button>
            )}
          </div>
        </nav>
      </div>

      {/* Main Container Content */}
      <main className="flex-1 max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-28 sm:pt-32 pb-5 sm:pb-8 w-full transition-all duration-200 text-xs sm:text-sm md:text-base leading-relaxed overflow-x-hidden max-w-full">
        {activeTab === 'dashboard' && (
          <Dashboard 
            players={computedPlayers} 
            sessions={sessions} 
            attendance={attendance} 
            logs={logs}
            leagues={leagues}
            standings={standings}
            matches={matches}
            onNavigate={setActiveTab}
            onUpdateAttendance={handleUpdateAttendance}
            onAddPlayer={handleAddPlayer}
            onQuickAddPlayer={() => {
              setActiveTab('players');
              // Give user hint or open add form triggers if needed (handled inside component or state)
            }}
            onQuickCreateSession={() => {
              setActiveTab('sessions');
            }}
            onClearAllData={handleClearAllData}
          />
        )}

        {activeTab === 'sessions' && (
          <Sessions 
            sessions={sessions}
            players={computedPlayers}
            attendance={attendance}
            leagues={leagues}
            matches={matches}
            activeSessionId={activeSessionId}
            setActiveSessionId={setActiveSessionId}
            onAddSession={handleAddSession}
            onAddPlayer={handleAddPlayer}
            onUpdateAttendance={handleUpdateAttendance}
            onDeleteSession={handleDeleteSession}
            onDeleteAllSessions={handleDeleteAllSessions}
            onDeleteMatch={handleDeleteMatch}
            sessionOrigin={sessionOrigin}
            onBackToOrigin={() => {
              setActiveSessionId(null);
              setActiveTab('leagues');
            }}
            onNavigateToLeagueMatch={handleNavigateToLeagueMatch}
            sheetsSyncStatus={sheetsSyncStatus}
            onUpdateMatch={handleUpdateMatch}
            onAddMatch={handleAddMatch}
            onRecordMatchResult={handleRecordMatchResult}
            onSyncSessionWithMatch={handleSyncSessionWithMatch}
            onUpdateSession={handleUpdateSession}
          />
        )}

        {activeTab === 'leagues' && (
          <Leagues 
            leagues={leagues}
            standings={standings}
            matches={matches}
            players={computedPlayers}
            attendance={attendance}
            sessions={sessions}
            selectedLeagueId={appSelectedLeagueId}
            setSelectedLeagueId={setAppSelectedLeagueId}
            selectedMatchId={appSelectedMatchId}
            setSelectedMatchId={setAppSelectedMatchId}
            onAddLeague={handleAddLeague}
            onRecordMatchResult={handleRecordMatchResult}
            onDeleteLeague={handleDeleteLeague}
            onAddMatch={handleAddMatch}
            onUpdateMatch={handleUpdateMatch}
            onDeleteMatch={handleDeleteMatch}
            onNavigateToSession={handleNavigateToSession}
            onAddTeamToLeague={handleAddTeamToLeague}
            onDeleteTeamFromLeague={handleDeleteTeamFromLeague}
            onRebuildPlayerStats={rebuildPlayerStatsFromScratch}
          />
        )}

        {activeTab === 'players' && (
          <Players 
            players={computedPlayers}
            sessions={sessions}
            attendance={attendance}
            matches={matches}
            onAddPlayer={handleAddPlayer}
            onUpdatePlayer={handleUpdatePlayer}
            onDeletePlayer={handleDeletePlayer}
          />
        )}

        {activeTab === 'reporting' && (
          <Reporting 
            players={computedPlayers}
            sessions={sessions}
            attendance={attendance}
            logs={logs}
            leagues={leagues}
            standings={standings}
            matches={matches}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'weekly-report' && (
          <WeeklyReport
            players={computedPlayers}
            sessions={sessions}
            attendance={attendance}
            leagues={leagues}
            standings={standings}
            matches={matches}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'download' && (
          <DownloadApp onNavigate={setActiveTab} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 text-center text-slate-400 dark:text-slate-500 text-xs transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 Football United.</p>
        </div>
      </footer>

      {/* Floating PWA Smart Installation Banner */}
      {showPwaInstallBanner && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-[80] bg-slate-900/95 dark:bg-slate-950/95 text-white p-4 rounded-2xl shadow-2xl border border-slate-850/80 backdrop-blur-md animate-in slide-in-from-bottom duration-500 flex flex-col gap-3">
          
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* App Brand Badge */}
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-base shadow-md shrink-0">
                FU
              </div>
              <div className="text-left">
                <h4 className="text-xs font-black tracking-tight text-white flex items-center gap-1">
                  Install Football United App
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold uppercase tracking-wide">PWA</span>
                </h4>
                <p className="text-[11px] text-slate-300 leading-normal mt-0.5 font-medium">
                  Add to your home screen for instant offline access and native-like performance.
                </p>
              </div>
            </div>
            
            <button 
              type="button"
              onClick={handleDismissPwaBanner}
              className="p-1 rounded-full text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="border-t border-slate-850/60 my-0.5"></div>

          {/* Conditional Instructions by OS */}
          {detectedPwaOS === 'iOS' ? (
            <div className="text-left space-y-2 bg-slate-950/40 p-3 rounded-xl border border-slate-850">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                iOS Apple Installation:
              </span>
              <div className="text-[11px] text-slate-300 leading-relaxed font-medium space-y-1.5">
                <p className="flex items-center gap-1.5">
                  1. Tap the <strong className="text-white flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded text-[10px]"><Share className="w-3 h-3 text-emerald-400" /> Share</strong> button in Safari's bottom panel.
                </p>
                <p className="flex items-center gap-1.5">
                  2. Scroll down and choose <strong className="text-emerald-400 flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded text-[10px]"><PlusSquare className="w-3 h-3 text-emerald-400" /> Add to Home Screen</strong>.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handlePwaInstallClick}
                disabled={!deferredPwaPrompt}
                className={`flex-1 py-2.5 px-4 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  deferredPwaPrompt 
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black shadow-lg shadow-emerald-500/10 active:scale-95' 
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>{deferredPwaPrompt ? 'Install App Now' : 'Browser Prompting...'}</span>
              </button>
              
              <button
                type="button"
                onClick={handleDismissPwaBanner}
                className="py-2.5 px-4 text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer bg-slate-800/40 hover:bg-slate-800 rounded-xl"
              >
                Not Now
              </button>
            </div>
          )}
          
          {/* Troubleshooting Option */}
          <div className="text-center pt-0.5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('download');
                setShowPwaInstallBanner(false);
              }}
              className="text-[10px] font-bold text-emerald-400 hover:underline tracking-wide bg-transparent border-none cursor-pointer"
            >
              Other Download Options (APK & Launcher)
            </button>
          </div>

        </div>
      )}
      {/* App Reset Confirmation Modal */}
      {showAppResetConfirm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-amber-100 dark:bg-amber-950/30 text-amber-600 rounded-full shrink-0">
                <RefreshCw className="w-6 h-6 animate-spin duration-1000" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="text-lg font-black text-slate-950 dark:text-slate-50 leading-tight">
                  Reset App to Defaults?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                  Are you sure you want to reset all records to the default Game On datasets? Any changes, additions, custom sessions, and rosters you made will be completely replaced by the sample data.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                id="confirm-app-reset-btn"
                onClick={() => {
                  executeResetData();
                  setShowAppResetConfirm(false);
                }}
                className="w-full sm:flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl transition cursor-pointer shadow-sm active:scale-95"
              >
                Confirm Reset
              </button>
              <button
                id="cancel-app-reset-btn"
                onClick={() => setShowAppResetConfirm(false)}
                className="w-full sm:flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-xs font-black rounded-xl transition cursor-pointer active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* App Clear Confirmation Modal */}
      {showAppClearConfirm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-red-100 dark:bg-red-950/30 text-red-600 rounded-full shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="text-lg font-black text-slate-950 dark:text-slate-50 leading-tight">
                  Clear All Data?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                  Are you sure you want to wipe ALL registered players, leagues, sessions, and histories? This will give you an empty clean slate to configure your own league parameters and cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                id="confirm-app-clear-btn"
                onClick={() => {
                  executeClearAllData();
                  setShowAppClearConfirm(false);
                }}
                className="w-full sm:flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl transition cursor-pointer shadow-sm active:scale-95"
              >
                Confirm Delete
              </button>
              <button
                id="cancel-app-clear-btn"
                onClick={() => setShowAppClearConfirm(false)}
                className="w-full sm:flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-xs font-black rounded-xl transition cursor-pointer active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification for Database Rebuild */}
      {syncNotification && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-emerald-600 dark:bg-emerald-500 text-white font-extrabold text-xs px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-500/10">
            <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
            <span>{syncNotification}</span>
            <button 
              onClick={() => setSyncNotification(null)}
              className="ml-2 hover:bg-white/15 p-1 rounded-lg transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
