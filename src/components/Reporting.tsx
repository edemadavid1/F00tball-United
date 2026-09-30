import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { Player, Session, AttendanceRecord, ActivityLog, League, TeamStanding, LeagueMatch } from '../types';
import { 
  FileText, 
  Download, 
  UserCheck, 
  Calendar, 
  ArrowLeft,
  Home,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  LogOut,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { initAuth, googleSignIn, getAccessToken, logout } from '../utils/auth';
import { 
  findOrCreateSpreadsheet, 
  ensureSheetExists, 
  clearSheetRange, 
  writeSheetValues, 
  formatSafeSheetTitle,
  GoogleSpreadsheetInfo
} from '../utils/googleSheets';
import Analytics from './Analytics';
import { normalizeDateToISO } from '../utils/dateUtils';
import { normalizePlayerName } from '../utils/nameUtils';

const formatSessionDate = (dateStr: string) => {
  if (!dateStr) return '';
  const iso = normalizeDateToISO(dateStr); // returns "YYYY-MM-DD"
  const parts = iso.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[monthIndex] || 'Jan';
    return `${day} ${month} ${year}`;
  }
  return dateStr;
};

interface ReportingProps {
  players: Player[];
  sessions: Session[];
  attendance: AttendanceRecord[];
  logs?: ActivityLog[];
  leagues?: League[];
  standings?: Record<string, TeamStanding[]>;
  matches?: LeagueMatch[];
  onNavigate?: (tab: 'dashboard' | 'sessions' | 'leagues' | 'players' | 'reporting') => void;
}

export default function Reporting({ 
  players: rawPlayers, 
  sessions: rawSessions, 
  attendance: rawAttendance, 
  logs: rawLogs = [], 
  leagues: rawLeagues = [], 
  standings = {}, 
  matches: rawMatches = [], 
  onNavigate 
}: ReportingProps) {
  
  // Clean all raw arrays to remove null, undefined, or malformed entries defensively
  const players = React.useMemo(() => (rawPlayers || []).filter(p => p && p.id), [rawPlayers]);
  const sessions = React.useMemo(() => (rawSessions || []).filter(s => s && s.id), [rawSessions]);
  const attendance = React.useMemo(() => (rawAttendance || []).filter(a => a && a.playerId && a.sessionId), [rawAttendance]);
  const logs = React.useMemo(() => (rawLogs || []).filter(l => l && l.id), [rawLogs]);
  const leagues = React.useMemo(() => (rawLeagues || []).filter(l => l && l.id), [rawLeagues]);
  const matches = React.useMemo(() => (rawMatches || []).filter(m => m && m.id), [rawMatches]);

  // Interactive tooltip hover on trend line
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // Sub-Tab State (Analytics Dashboard vs Reports Sync Catalog)
  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'sync'>('analytics');

  // Google Sheets Integration States
  const [isOpenMasterSessions, setIsOpenMasterSessions] = useState(false);
  const [isOpenWeeklyReports, setIsOpenWeeklyReports] = useState(false);
  const [isSyncingMaster, setIsSyncingMaster] = useState(false);
  const [syncMasterMessage, setSyncMasterMessage] = useState<string | null>(null);
  
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [spreadsheets, setSpreadsheets] = useState<Record<string, GoogleSpreadsheetInfo>>({});
  const [isConnectingSheet, setIsConnectingSheet] = useState(false);
  const [sessionSyncStates, setSessionSyncStates] = useState<Record<string, 'idle' | 'syncing' | 'success' | 'error'>>({});
  const [syncedSessionIds, setSyncedSessionIds] = useState<string[]>([]);

  // Initialize Auth listener and load saved sheets metadata
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, currentToken) => {
        setUser(currentUser);
        setToken(currentToken);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );

    const savedSheets = localStorage.getItem('gameon_reporting_spreadsheets_by_category');
    if (savedSheets) {
      try {
        setSpreadsheets(JSON.parse(savedSheets));
      } catch (e) {
        console.error('Error loading saved spreadsheets info:', e);
      }
    }

    const savedSynced = localStorage.getItem('gameon_synced_sessions');
    if (savedSynced) {
      try {
        setSyncedSessionIds(JSON.parse(savedSynced));
      } catch (e) {
        console.error('Error loading synced sessions list:', e);
      }
    }

    return () => {
      if (typeof unsubscribe === 'function') {
        try {
          unsubscribe();
        } catch (e) {
          console.warn('Error during auth listener cleanup:', e);
        }
      }
    };
  }, []);

  // Helper to fetch or create a spreadsheet for a given category/league name
  const getSpreadsheetForCategory = async (currentToken: string, categoryName: string): Promise<GoogleSpreadsheetInfo> => {
    if (spreadsheets[categoryName]) {
      return spreadsheets[categoryName];
    }
    setIsConnectingSheet(true);
    try {
      const sheetInfo = await findOrCreateSpreadsheet(currentToken, categoryName);
      setSpreadsheets(prev => {
        const updated = { ...prev, [categoryName]: sheetInfo };
        localStorage.setItem('gameon_reporting_spreadsheets_by_category', JSON.stringify(updated));
        return updated;
      });
      return sheetInfo;
    } finally {
      setIsConnectingSheet(false);
    }
  };

  const handleConnectSheets = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setNeedsAuth(false);
      }
    } catch (err) {
      console.error('Failed to sign in and authorize Google Sheets:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDisconnectSheets = async () => {
    try {
      await logout();
      setUser(null);
      setToken(null);
      setNeedsAuth(true);
      setSpreadsheets({});
      localStorage.removeItem('gameon_reporting_spreadsheets_by_category');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const handleSyncIndividualSession = async (session: Session) => {
    const currentToken = token || (await getAccessToken());
    if (!currentToken) {
      setNeedsAuth(true);
      return;
    }

    setSessionSyncStates(prev => ({ ...prev, [session.id]: 'syncing' }));

    try {
      const categoryName = getSessionCategory(session);
      const activeSheet = await getSpreadsheetForCategory(currentToken, categoryName);

      const sheetTitle = formatSafeSheetTitle(session.date, session.title);
      await ensureSheetExists(currentToken, activeSheet.id, sheetTitle);
      await clearSheetRange(currentToken, activeSheet.id, `${sheetTitle}!A1:G100`);

      const headers = [
        ['Session Title:', session.title, '', 'Date:', session.date, 'Time:', session.time],
        ['Location:', session.location, '', 'Type:', session.type, 'Fee per Player:', session.feePerPlayer],
        [''],
        ['Player Name', 'Email', 'Phone', 'Attendance Status', 'Fee Paid', 'Arrival Time', 'Notes']
      ];

      const sessionAttendance = attendance.filter(a => a.sessionId === session.id);
      const rows = players
        .filter(p => p.status === 'Active')
        .map(player => {
          const record = sessionAttendance.find(a => a.playerId === player.id);
          return [
            player.name,
            player.email || 'N/A',
            player.phone || 'N/A',
            record?.status || 'Absent',
            record?.feePaid ? 'Yes' : 'No',
            record?.arrivalTime || 'N/A',
            record?.notes || ''
          ];
        });

      await writeSheetValues(currentToken, activeSheet.id, `${sheetTitle}!A1`, [...headers, ...rows]);

      setSessionSyncStates(prev => ({ ...prev, [session.id]: 'success' }));
      setSyncedSessionIds(prev => {
        const updated = prev.includes(session.id) ? prev : [...prev, session.id];
        localStorage.setItem('gameon_synced_sessions', JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      console.error(`Failed to sync session "${session.title}":`, err);
      setSessionSyncStates(prev => ({ ...prev, [session.id]: 'error' }));
    }
  };

  const handleSyncAllMasterSessions = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentToken = token || (await getAccessToken());
    if (!currentToken) {
      setNeedsAuth(true);
      return;
    }

    setIsSyncingMaster(true);
    setSyncMasterMessage(null);

    try {
      // Group completed sessions by category so we can write a Master Overview sheet in EACH spreadsheet!
      const sessionsByCategory: Record<string, Session[]> = {};
      completedSessions.forEach(session => {
        const cat = getSessionCategory(session);
        if (!sessionsByCategory[cat]) {
          sessionsByCategory[cat] = [];
        }
        sessionsByCategory[cat].push(session);
      });

      for (const [categoryName, categorySessions] of Object.entries(sessionsByCategory)) {
        const activeSheet = await getSpreadsheetForCategory(currentToken, categoryName);

        // Write a category-specific master overview index sheet
        const summaryTab = "Master Overview";
        await ensureSheetExists(currentToken, activeSheet.id, summaryTab);
        await clearSheetRange(currentToken, activeSheet.id, `${summaryTab}!A1:G100`);

        const summaryHeaders = [
          [`Football United - ${categoryName} Attendance Summary`],
          ['Generated Date:', new Date().toLocaleString()],
          ['Total Completed Sessions:', categorySessions.length],
          [''],
          ['Session ID', 'Session Title', 'Date', 'Time', 'Location', 'Type', 'Present Count']
        ];

        const summaryRows = categorySessions.map(session => {
          const pCount = attendance.filter(a => a.sessionId === session.id && a.status === 'Present').length;
          return [
            session.id,
            session.title,
            session.date,
            session.time,
            session.location,
            session.type,
            pCount
          ];
        });

        await writeSheetValues(currentToken, activeSheet.id, `${summaryTab}!A1`, [...summaryHeaders, ...summaryRows]);

        // Sync individual sessions for this category
        for (const session of categorySessions) {
          await handleSyncIndividualSession(session);
        }
      }

      setSyncMasterMessage('All Synced!');
      setTimeout(() => setSyncMasterMessage(null), 3500);
    } catch (err) {
      console.error('Failed bulk sync:', err);
      setSyncMasterMessage('Sync failed');
      setTimeout(() => setSyncMasterMessage(null), 3500);
    } finally {
      setIsSyncingMaster(false);
    }
  };

  // Get category name (league title or "Friendly Matches")
  const getSessionCategory = (session: Session): string => {
    if (session.type === 'League Match' && session.leagueId) {
      const lg = leagues.find(l => l.id === session.leagueId);
      if (lg && lg.name) {
        return lg.name;
      }
    }
    return 'Friendly Matches';
  };

  const completedSessions = sessions
    .filter(s => s.status === 'Completed')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const weeklyReportSessions = sessions
    .filter(s => {
      const isoDate = normalizeDateToISO(s.date);
      return isoDate >= '2026-02-14';
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // PDF Generator for Weekly League and Friendly Match Reports
  const downloadWeeklyReportPDF = (session: Session) => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const leagueId = session.leagueId || leagues[0]?.id || '';
    const activeLeague = leagues.find(l => l.id === leagueId);
    
    // Calculate Date Range accumulatively
    const isL3 = leagueId === 'l-3';
    const startDStr = isL3 ? "14 Mar 2026" : "14 Feb 2026";
    let endDStr = "";
    if (session.date) {
      const d = new Date(normalizeDateToISO(session.date));
      const formatOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
      endDStr = d.toLocaleDateString('en-GB', formatOptions);
    } else {
      endDStr = "14 Mar 2026";
    }
    const dateRangeStr = `${startDStr} to ${endDStr}`;

    const marginX = 12;
    const marginY = 12;
    const pageWidth = 297;
    const pageHeight = 210;
    const contentWidth = pageWidth - (marginX * 2); // 273mm

    // Header Band Background (Vibrant Sports Emerald Green)
    doc.setFillColor(16, 185, 129); // Emerald-500
    doc.rect(marginX, marginY, contentWidth, 14, 'F');

    // Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    // Vertical centering in 14mm bar: y = marginY + 9.5
    doc.text("Football United - Weekly League Report", marginX + 4, marginY + 9.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    // Align to the right of the header
    doc.text(dateRangeStr, marginX + contentWidth - 4, marginY + 9.5, { align: 'right' });

    // Columns Layout
    // Column 1: CAPTAIN'S LEAGUE (Left) & MVP (Below it)
    // Column 2: PLAYER LEAGUE (Middle)
    // Column 3: TOP SCORER (Right)
    const colGap = 4;
    const col1Width = 85;
    const col2Width = 95;
    const col3Width = 85;

    const col1X = marginX;
    const col2X = col1X + col1Width + colGap; // 12 + 85 + 4 = 101
    const col3X = col2X + col2Width + colGap; // 101 + 95 + 4 = 200

    let tableY = marginY + 14 + 6; // 12 + 14 + 6 = 32mm

    // Define beautiful helper for section headers
    const drawSectionHeader = (x: number, y: number, width: number, title: string) => {
      doc.setFillColor(16, 185, 129); // Same emerald green
      doc.rect(x, y, width, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      // Center the title in the header rect
      doc.text(title, x + (width / 2), y + 4.8, { align: 'center' });
    };

    const targetSessionDateISO = normalizeDateToISO(session.date);

    // Filter sessions accumulatively up to target date
    const minDate = '2026-02-14';
    const cumulativeSessions = sessions.filter(s => {
      const sDateISO = normalizeDateToISO(s.date || '');
      const dateInRange = sDateISO >= minDate && sDateISO <= targetSessionDateISO;
      const belongsToLeague = s.leagueId === leagueId || s.type === 'Friendly Match';
      const isCompleted = s.status === 'Completed' || s.matchHomeScore !== undefined;
      return dateInRange && belongsToLeague && isCompleted;
    });

    // 1. Captain's League Standings
    const currentLeagueTeams = standings[leagueId] || [];
    const dynamicStandings: TeamStanding[] = currentLeagueTeams.map(team => ({
      ...team,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0
    }));

    // Defensive fallback if no standings were found
    if (dynamicStandings.length === 0) {
      const teamsSet = new Set<string>();
      matches.filter(m => m.leagueId === leagueId).forEach(m => {
        teamsSet.add(m.homeTeam);
        teamsSet.add(m.awayTeam);
      });
      teamsSet.forEach(tName => {
        dynamicStandings.push({
          id: `team-${tName.toLowerCase().replace(/\s+/g, '-')}`,
          name: tName,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          points: 0
        });
      });
    }

    cumulativeSessions.forEach(s => {
      if (s.type !== 'League Match') return;

      const hScore = s.matchHomeScore ?? 0;
      const aScore = s.matchAwayScore ?? 0;

      const match = matches.find(m => m.id === s.matchId) || matches.find(m => {
        const sDate = s.date ? normalizeDateToISO(s.date) : '';
        const mDate = m.date ? normalizeDateToISO(m.date) : '';
        return sDate === mDate;
      });

      if (!match) return;

      const homeTeamNode = dynamicStandings.find(t => t.name === match.homeTeam);
      const awayTeamNode = dynamicStandings.find(t => t.name === match.awayTeam);

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

    const sortedStandings = [...dynamicStandings].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdA = a.goalsFor - a.goalsAgainst;
      const gdB = b.goalsFor - b.goalsAgainst;
      if (gdB !== gdA) return gdB - gdA;
      return b.goalsFor - a.goalsFor;
    });

    // 2. Player League calculations (Global across all leagues/friendlies up to targetSessionDateISO)
    // 2.1 Build a robust player map dynamically scanning goals and squads defensively, grouping by normalized name to merge duplicates
    const playerMapForPDF = new Map<string, any>();
    if (Array.isArray(players)) {
      players.forEach(p => {
        if (p) {
          const normName = normalizePlayerName(p.name || "Unknown Player");
          const key = normName.toLowerCase();
          if (!playerMapForPDF.has(key)) {
            playerMapForPDF.set(key, {
              id: p.id || `p-${key}`,
              name: normName,
              pld: 0,
              w: 0,
              d: 0,
              l: 0,
              pts: 0,
              goals: 0,
              potd: 0
            });
          }
        }
      });
    }

    const cleanStr = (s: string) => {
      return normalizePlayerName(s).toLowerCase();
    };

    const findPlayer = (identifier: string) => {
      if (!identifier) return null;
      const cleanId = cleanStr(identifier);
      if (playerMapForPDF.has(cleanId)) return playerMapForPDF.get(cleanId);
      const rawKey = String(identifier).trim();
      if (playerMapForPDF.has(rawKey)) return playerMapForPDF.get(rawKey);
      for (const p of playerMapForPDF.values()) {
        if (p.id === rawKey) return p;
        if (cleanStr(p.name) === cleanId) return p;
      }
      for (const p of playerMapForPDF.values()) {
        const pCleanName = cleanStr(p.name);
        if (pCleanName.includes(cleanId) || cleanId.includes(pCleanName)) {
          return p;
        }
      }
      return null;
    };

    const getOrCreatePlayer = (identifier: string, defaultName?: string) => {
      let found = findPlayer(identifier);
      if (found) return found;
      const cleanName = normalizePlayerName(defaultName || identifier || "Unknown Player");
      const key = cleanName.toLowerCase();
      const newId = identifier || `p-pdf-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      const newPlayer = {
        id: newId,
        name: cleanName,
        pld: 0,
        w: 0,
        d: 0,
        l: 0,
        pts: 0,
        goals: 0,
        potd: 0
      };
      playerMapForPDF.set(key, newPlayer);
      return newPlayer;
    };

    const isCaptains = leagueId && (
      leagueId.toLowerCase().includes('captain') ||
      leagueId === 'l-3' ||
      leagueId === 'l-captain' ||
      leagueId === 'captains_league'
    );
    const officialStartDate = '2026-02-14';
    const playerTableEndDate = '2026-12-31';

    // Calculate goals and POTDs for all matches belonging to the league (no pre-season date cutoff for goals/POTDs)
    const filteredMatchesForPDF = matches.filter(match => {
      if (!match) return false;
      const mDateISO = normalizeDateToISO(match.date || '');
      const matchesBelong = match.leagueId === leagueId || 
        (!isCaptains && (!match.leagueId || match.type === 'Friendly Match'));
      return matchesBelong && mDateISO <= playerTableEndDate && mDateISO <= targetSessionDateISO;
    });

    // 2.2 Goals
    filteredMatchesForPDF.forEach(match => {
      const goals = match.goals || [];
      goals.forEach(g => {
        if (g) {
          const pStat = findPlayer(g.playerId) || findPlayer(g.playerName) || getOrCreatePlayer(g.playerId || g.playerName, g.playerName);
          pStat.goals += 1;
        }
      });
    });

    // 2.3 MVPs (Player of the Day)
    filteredMatchesForPDF.forEach(match => {
      if (match.status !== 'Played' || !match.playerOfMatch) return;
      const rawMvp = match.playerOfMatch.trim();
      if (rawMvp && rawMvp !== 'N/A' && rawMvp !== 'N/A (Forfeit)') {
        const parts = rawMvp.split(/&|and|,|\//);
        parts.forEach(part => {
          const pom = part.trim();
          if (pom) {
            const pStat = findPlayer(pom) || getOrCreatePlayer(pom);
            pStat.potd += 1;
          }
        });
      }
    });

    // 2.4 Matches Played and points (only for matches starting on officialStartDate onwards)
    filteredMatchesForPDF.forEach(match => {
      const isMatchPlayed = match.status === 'Played' || (match.homeScore !== undefined && match.awayScore !== undefined);
      if (!isMatchPlayed) return;

      const isoDate = normalizeDateToISO(match.date || '');
      if (isoDate < officialStartDate) return;

      const hScore = parseInt(match.homeScore as any, 10) || 0;
      const aScore = parseInt(match.awayScore as any, 10) || 0;

      let homeResult: 'w' | 'd' | 'l' = 'd';
      let awayResult: 'w' | 'd' | 'l' = 'd';
      if (hScore > aScore) {
        homeResult = 'w';
        awayResult = 'l';
      } else if (hScore < aScore) {
        homeResult = 'l';
        awayResult = 'w';
      }

      const homeSquad = match.homeSquad || [];
      const awaySquad = match.awaySquad || [];

      const uniqueHome = Array.from(new Set(homeSquad.map(id => String(id))));
      const uniqueAway = Array.from(new Set(awaySquad.map(id => String(id))));

      uniqueHome.forEach(pId => {
        const pStat = findPlayer(pId as string) || getOrCreatePlayer(pId as string);
        pStat.pld += 1;
        if (homeResult === 'w') {
          pStat.w += 1;
          pStat.pts += 3;
        } else if (homeResult === 'd') {
          pStat.d += 1;
          pStat.pts += 1;
        } else {
          pStat.l += 1;
        }
      });

      uniqueAway.forEach(pId => {
        const pStat = findPlayer(pId as string) || getOrCreatePlayer(pId as string);
        pStat.pld += 1;
        if (awayResult === 'w') {
          pStat.w += 1;
          pStat.pts += 3;
        } else if (awayResult === 'd') {
          pStat.d += 1;
          pStat.pts += 1;
        } else {
          pStat.l += 1;
        }
      });
    });

    // We also need sortedTopScorers and sortedMvps formatted correctly for columns
    const goalScorersArray = Array.from(playerMapForPDF.values())
      .filter(p => p.goals > 0)
      .map(p => ({ id: p.id, name: p.name, count: p.goals }));
    const sortedTopScorers = goalScorersArray.sort((a, b) => b.count - a.count);

    const mvpAwardsArray = Array.from(playerMapForPDF.values())
      .filter(p => p.potd > 0)
      .map(p => ({ name: p.name, count: p.potd }));
    const sortedMvps = mvpAwardsArray.sort((a, b) => b.count - a.count);

    // Filter dynamicPlayerMap to map to the new instances for PDF header purposes or general clean rendering
    const dynamicPlayerMap = new Map<string, { id: string, name: string }>();
    Array.from(playerMapForPDF.values()).forEach(p => {
      dynamicPlayerMap.set(p.id, { id: p.id, name: p.name });
    });

    // Filter to only players with PTS >= 1
    const sortedPlayerStandings = Array.from(playerMapForPDF.values())
      .filter(p => p.pts >= 1)
      .sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.goals !== a.goals) return b.goals - a.goals;
        if (b.potd !== a.potd) return b.potd - a.potd;

        const ppgB = b.pts / (b.pld || 1);
        const ppgA = a.pts / (a.pld || 1);
        if (ppgB !== ppgA) return ppgB - ppgA;

        if (b.pld !== a.pld) return b.pld - a.pld;
        if (b.w !== a.w) return b.w - a.w;

        return a.name.localeCompare(b.name);
      });

    const formatNameForPDF = (name: string, maxLength: number = 24) => {
      if (!name) return "";
      const trimmed = name.trim();
      if (trimmed.length <= maxLength) return trimmed;
      return trimmed.substring(0, maxLength);
    };

    const rowHeight = 5.2;

    // --- COLUMN 1: CAPTAIN'S LEAGUE ---
    drawSectionHeader(col1X, tableY, col1Width, "CAPTAIN'S LEAGUE");
    
    // Column 1 Table headers background
    let currY = tableY + 7;
    doc.setFillColor(230, 244, 234); // Soft pastel green
    doc.rect(col1X, currY, col1Width, 5.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(col1X, currY + 5.5, col1X + col1Width, currY + 5.5);

    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text("#", col1X + 2, currY + 4);
    doc.text("Team", col1X + 7, currY + 4);
    doc.text("P", col1X + 40, currY + 4, { align: 'center' });
    doc.text("W", col1X + 47, currY + 4, { align: 'center' });
    doc.text("D", col1X + 54, currY + 4, { align: 'center' });
    doc.text("L", col1X + 61, currY + 4, { align: 'center' });
    doc.text("GD", col1X + 68, currY + 4, { align: 'center' });
    doc.text("PTS", col1X + 76, currY + 4, { align: 'center' });
    doc.text("PPG", col1X + 82, currY + 4, { align: 'center' });

    currY += 5.5;

    // Draw Captain's League Rows
    const capLeagueCount = 8; // ND, SHOLA, OJUKWU, etc.
    for (let i = 0; i < capLeagueCount; i++) {
      const team = sortedStandings[i];
      const rY = currY + (i * rowHeight) + 3.8;

      // Alternating row backgrounds
      if (i % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(col1X, currY + (i * rowHeight), col1Width, rowHeight, 'F');
      }

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text((i + 1).toString(), col1X + 2, rY);

      if (team) {
        doc.setFont('helvetica', 'bold');
        doc.text(formatNameForPDF(team.name, 16), col1X + 7, rY);
        doc.setFont('helvetica', 'normal');
        doc.text(team.played.toString(), col1X + 40, rY, { align: 'center' });
        doc.text(team.won.toString(), col1X + 47, rY, { align: 'center' });
        doc.text(team.drawn.toString(), col1X + 54, rY, { align: 'center' });
        doc.text(team.lost.toString(), col1X + 61, rY, { align: 'center' });
        
        const gd = team.goalsFor - team.goalsAgainst;
        const gdStr = gd > 0 ? `+${gd}` : gd.toString();
        doc.text(gdStr, col1X + 68, rY, { align: 'center' });
        
        doc.setFont('helvetica', 'bold');
        doc.text(team.points.toString(), col1X + 76, rY, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        const ppg = team.played > 0 ? (team.points / team.played).toFixed(1) : "0.0";
        doc.text(ppg, col1X + 82, rY, { align: 'center' });
      } else {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(148, 163, 184);
        doc.text("-", col1X + 7, rY);
      }

      // Border line below row
      doc.setDrawColor(241, 245, 249);
      doc.line(col1X, currY + ((i + 1) * rowHeight), col1X + col1Width, currY + ((i + 1) * rowHeight));
    }

    // --- COLUMN 1: MVP (AWARDS) ---
    // Start MVP below Captain's League
    let mvpY = currY + (capLeagueCount * rowHeight) + 8; // 32 + 12.5 + 41.6 + 8 = ~94mm
    drawSectionHeader(col1X, mvpY, col1Width, "MVP");

    let mvpCurrY = mvpY + 7;
    doc.setFillColor(230, 244, 234);
    doc.rect(col1X, mvpCurrY, col1Width, 5.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(col1X, mvpCurrY + 5.5, col1X + col1Width, mvpCurrY + 5.5);

    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text("#", col1X + 2, mvpCurrY + 4);
    doc.text("Player", col1X + 7, mvpCurrY + 4);
    doc.text("Awards", col1X + 78, mvpCurrY + 4, { align: 'center' });

    mvpCurrY += 5.5;

    // Draw MVP rows (we list up to 10 MVPs to stay clean and balanced on page height)
    const mvpRowCount = 10;
    for (let i = 0; i < mvpRowCount; i++) {
      const mvp = sortedMvps[i];
      const rY = mvpCurrY + (i * rowHeight) + 3.8;

      if (i % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(col1X, mvpCurrY + (i * rowHeight), col1Width, rowHeight, 'F');
      }

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text((i + 1).toString(), col1X + 2, rY);

      if (mvp) {
        doc.setFont('helvetica', 'bold');
        doc.text(formatNameForPDF(mvp.name, 22), col1X + 7, rY);
        doc.setFont('helvetica', 'bold');
        doc.text(mvp.count.toString(), col1X + 78, rY, { align: 'center' });
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text("-", col1X + 7, rY);
        doc.text("-", col1X + 78, rY, { align: 'center' });
      }

      doc.setDrawColor(241, 245, 249);
      doc.line(col1X, mvpCurrY + ((i + 1) * rowHeight), col1X + col1Width, mvpCurrY + ((i + 1) * rowHeight));
    }


    // --- COLUMN 2: PLAYER LEAGUE ---
    drawSectionHeader(col2X, tableY, col2Width, "PLAYER LEAGUE");

    let pLeagueCurrY = tableY + 7;
    doc.setFillColor(230, 244, 234);
    doc.rect(col2X, pLeagueCurrY, col2Width, 5.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(col2X, pLeagueCurrY + 5.5, col2X + col2Width, pLeagueCurrY + 5.5);

    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text("#", col2X + 2, pLeagueCurrY + 4);
    doc.text("Player", col2X + 7, pLeagueCurrY + 4);
    doc.text("PLD", col2X + 50, pLeagueCurrY + 4, { align: 'center' });
    doc.text("W", col2X + 58, pLeagueCurrY + 4, { align: 'center' });
    doc.text("D", col2X + 66, pLeagueCurrY + 4, { align: 'center' });
    doc.text("L", col2X + 74, pLeagueCurrY + 4, { align: 'center' });
    doc.text("PTS", col2X + 83, pLeagueCurrY + 4, { align: 'center' });
    doc.text("PPG", col2X + 90, pLeagueCurrY + 4, { align: 'center' });

    pLeagueCurrY += 5.5;

    // Dynamically calculate row height and text size based on the number of players with PTS >= 1
    const pLeagueRowsCount = sortedPlayerStandings.length;
    // We want to fit all of them, but draw at least 27 slots for visual completeness/spacing if there are fewer players
    const playerLeagueRowCount = Math.max(27, pLeagueRowsCount);
    const pLeagueRowHeight = Math.min(5.2, Math.max(2.8, 140.0 / playerLeagueRowCount));
    const pLeagueFontSize = Math.min(7, Math.max(4.2, (pLeagueRowHeight / 5.2) * 7));

    // Draw player league rows
    for (let i = 0; i < playerLeagueRowCount; i++) {
      const pStand = sortedPlayerStandings[i];
      const rY = pLeagueCurrY + (i * pLeagueRowHeight) + (pLeagueRowHeight * 0.73);

      if (i % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(col2X, pLeagueCurrY + (i * pLeagueRowHeight), col2Width, pLeagueRowHeight, 'F');
      }

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(pLeagueFontSize);
      doc.text((i + 1).toString(), col2X + 2, rY);

      if (pStand) {
        doc.setFont('helvetica', 'bold');
        doc.text(formatNameForPDF(pStand.name, 22), col2X + 7, rY);
        doc.setFont('helvetica', 'normal');
        doc.text(pStand.pld.toString(), col2X + 50, rY, { align: 'center' });
        doc.text(pStand.w.toString(), col2X + 58, rY, { align: 'center' });
        doc.text(pStand.d.toString(), col2X + 66, rY, { align: 'center' });
        doc.text(pStand.l.toString(), col2X + 74, rY, { align: 'center' });
        
        doc.setFont('helvetica', 'bold');
        doc.text(pStand.pts.toString(), col2X + 83, rY, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        const ppg = pStand.pld > 0 ? (pStand.pts / pStand.pld).toFixed(1) : "0.0";
        doc.text(ppg, col2X + 90, rY, { align: 'center' });
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text("-", col2X + 7, rY);
      }

      doc.setDrawColor(241, 245, 249);
      doc.line(col2X, pLeagueCurrY + ((i + 1) * pLeagueRowHeight), col2X + col2Width, pLeagueCurrY + ((i + 1) * pLeagueRowHeight));
    }


    // --- COLUMN 3: TOP SCORER ---
    drawSectionHeader(col3X, tableY, col3Width, "TOP SCORER");

    let scorerCurrY = tableY + 7;
    doc.setFillColor(230, 244, 234);
    doc.rect(col3X, scorerCurrY, col3Width, 5.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(col3X, scorerCurrY + 5.5, col3X + col3Width, scorerCurrY + 5.5);

    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text("#", col3X + 2, scorerCurrY + 4);
    doc.text("Player", col3X + 7, scorerCurrY + 4);
    doc.text("Goals", col3X + 78, scorerCurrY + 4, { align: 'center' });

    scorerCurrY += 5.5;

    // Draw up to 27 scorer rows (perfectly matching player league height)
    const scorerRowCount = 27;
    for (let i = 0; i < scorerRowCount; i++) {
      const scorer = sortedTopScorers[i];
      const rY = scorerCurrY + (i * rowHeight) + 3.8;

      if (i % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(col3X, scorerCurrY + (i * rowHeight), col3Width, rowHeight, 'F');
      }

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text((i + 1).toString(), col3X + 2, rY);

      if (scorer) {
        doc.setFont('helvetica', 'bold');
        doc.text(formatNameForPDF(scorer.name, 22), col3X + 7, rY);
        doc.setFont('helvetica', 'bold');
        doc.text(scorer.count.toString(), col3X + 78, rY, { align: 'center' });
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text("-", col3X + 7, rY);
        doc.text("-", col3X + 78, rY, { align: 'center' });
      }

      doc.setDrawColor(241, 245, 249);
      doc.line(col3X, scorerCurrY + ((i + 1) * rowHeight), col3X + col3Width, scorerCurrY + ((i + 1) * rowHeight));
    }


    // --- FOOTER BRANDING ---
    const footerY = 200;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // light gray
    doc.text("© Football United - Weekly League Report", marginX, footerY);

    const footerOptions: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const footerDateStr = "Generated: " + new Date().toLocaleDateString('en-GB', footerOptions);
    doc.text(footerDateStr, marginX + contentWidth, footerY, { align: 'right' });

    // Save PDF
    const matchDateOnly = session.date ? session.date.split(/[•·-]/)[0].trim() : '';
    const filename = matchDateOnly ? `Weekly Report (${matchDateOnly}).pdf` : 'Weekly Report.pdf';
    doc.save(filename);
  };

  // ==================== ATTENDANCE TREND CHART DATA GENERATION ====================
  // Pre-populated default values to match screenshot if actual completed sessions are low
  const defaultPoints = [
    { date: 'Apr 25', present: 28, location: 'West Ham Park' },
    { date: 'May 2', present: 24, location: 'West Ham Park' },
    { date: 'May 9', present: 20, location: 'West Ham Park' },
    { date: 'May 16', present: 21, location: 'West Ham Park' },
    { date: 'May 23', present: 26, location: 'West Ham Park' },
    { date: 'May 30', present: 19, location: 'West Ham Park' },
    { date: 'Jun 6', present: 24, location: 'West Ham Park' },
    { date: 'Jun 20', present: 17, location: 'West Ham Park' },
    { date: 'Jun 27', present: 17, location: 'West Ham Park' },
    { date: 'Jul 4', present: 11, location: 'West Ham Park' },
  ];

  // Dynamic values calculated from live completed sessions
  const liveCompletedSessionsData = sessions
    .filter(s => s.status === 'Completed')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(s => {
      const presentCount = attendance.filter(a => a.sessionId === s.id && a.status === 'Present').length;
      const d = new Date(s.date);
      const formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return {
        date: formattedDate,
        present: presentCount,
        location: s.location || 'West Ham Park'
      };
    });

  // Construct final trend points (exactly 10 points)
  let trendPoints = [...defaultPoints];
  if (liveCompletedSessionsData.length > 0) {
    const actualCount = liveCompletedSessionsData.length;
    if (actualCount >= 10) {
      trendPoints = liveCompletedSessionsData.slice(-10);
    } else {
      trendPoints = [...defaultPoints.slice(0, 10 - actualCount), ...liveCompletedSessionsData];
    }
  }

  // Calculate coordinates for viewBox="0 0 800 300"
  // width = 800, height = 300
  // plot area margins: left=50, right=30, top=30, bottom=40
  // plot width = 720, plot height = 230
  // X range: 50 to 770
  // Y range: 30 to 260
  // max value on Y axis is 28
  const svgPoints = trendPoints.map((p, i) => {
    const x = 50 + i * (720 / 9);
    const y = 260 - (p.present / 28) * 230;
    return { x, y, ...p };
  });

  // Smooth bezier curve path string
  const getBezierPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 3;
      const cpY1 = p0.y;
      const cpX2 = p0.x + 2 * (p1.x - p0.x) / 3;
      const cpY2 = p1.y;
      path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    return path;
  };

  const trendLinePath = getBezierPath(svgPoints);

  const uniqueLocations = Array.from(new Set(trendPoints.map(p => p.location)));

  // Group completed sessions by category (League name or Friendly Matches)
  const groupedSessions = React.useMemo(() => {
    const groups: Record<string, Session[]> = {};
    completedSessions.forEach(session => {
      const cat = getSessionCategory(session);
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(session);
    });
    return groups;
  }, [completedSessions, leagues]);

  return (
    <div className="space-y-6" id="reporting-tab">
      
      {/* Breadcrumbs Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-6 font-semibold select-none">
        <button
          onClick={() => onNavigate?.('dashboard')}
          className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold uppercase tracking-tight text-[10px] cursor-pointer shadow-xs active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        
        <span className="text-slate-300 dark:text-slate-700">|</span>

        <button 
          onClick={() => onNavigate?.('dashboard')}
          className="hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
          title="Home"
        >
          <Home className="w-4 h-4" />
        </button>
        
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700" />
        
        <span className="text-slate-400 dark:text-slate-500">Dashboard</span>
        
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700" />
        
        <span className="text-slate-950 dark:text-slate-100 font-black">Reports</span>
      </div>

      {/* Reports Header and Logged Count Badge */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-150/60 dark:bg-slate-800 flex items-center justify-center border border-slate-200/50 dark:border-slate-700 shadow-2xs">
            <FileText className="w-5.5 h-5.5 text-slate-650 dark:text-slate-300" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">Reports</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 mt-1 border border-slate-200/30 dark:border-slate-700">
              {sessions.filter(s => s.status === 'Completed').length} sessions logged
            </span>
          </div>
        </div>

        {/* Sub-Tabs Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-850 rounded-xl select-none font-sans border border-slate-200/50 dark:border-slate-800 shrink-0">
          <button
            onClick={() => setActiveSubTab('analytics')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer ${
              activeSubTab === 'analytics'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-455 hover:text-slate-850 dark:hover:text-slate-200'
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveSubTab('sync')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer ${
              activeSubTab === 'sync'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-455 hover:text-slate-850 dark:hover:text-slate-200'
            }`}
          >
            Sheets & PDFs
          </button>
        </div>
      </div>

      {activeSubTab === 'analytics' ? (
        <Analytics 
          players={players}
          sessions={sessions}
          attendance={attendance}
          leagues={leagues}
          matches={matches}
        />
      ) : (
        <>
          {/* Featured Weekly League Report PDF Banner */}
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <FileText className="w-3 h-3" /> Official Weekly Report PDF Format
              </div>
              <h3 className="text-xl font-black tracking-tight">Football United - Weekly League Report</h3>
              <p className="text-xs text-slate-300 font-medium max-w-xl">
                Capture true data across Captain's League, Player League, MVP awards, and Top Scorers formatted in landscape PDF layout.
              </p>
            </div>
            <button
              onClick={() => onNavigate && onNavigate('weekly-report' as any)}
              className="px-5 py-3 bg-white text-slate-900 font-black text-xs rounded-2xl hover:bg-slate-100 transition shadow-md active:scale-95 cursor-pointer shrink-0 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-slate-900" />
              <span>Open & Download Report</span>
            </button>
          </div>

          {/* ==================== ATTENDANCE TREND CARD ==================== */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800/80 p-6 shadow-sm relative space-y-4">
        
        {/* Card Header Info */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-4.5 h-4.5 text-emerald-550" />
            Attendance Trend
          </h3>

          <div className="flex items-center gap-1.5 select-none font-sans">
            <span className="text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg">
              {trendPoints.length} sessions
            </span>
            <span className="text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg">
              {uniqueLocations.length} location{uniqueLocations.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Dynamic Interactive SVG Chart */}
        <div className="relative pt-2 overflow-x-auto scrollbar-thin">
          <div className="relative min-w-[700px] md:min-w-0">
            <svg 
              viewBox="0 0 800 300" 
              className="w-full h-auto overflow-visible select-none"
            >
              {/* Horizontal Grid lines */}
              <line x1="50" y1="40" x2="770" y2="40" className="stroke-slate-150 dark:stroke-slate-800" strokeDasharray="3,3" />
              <line x1="50" y1="97.5" x2="770" y2="97.5" className="stroke-slate-150 dark:stroke-slate-800" strokeDasharray="3,3" />
              <line x1="50" y1="155" x2="770" y2="155" className="stroke-slate-150 dark:stroke-slate-800" strokeDasharray="3,3" />
              <line x1="50" y1="212.5" x2="770" y2="212.5" className="stroke-slate-150 dark:stroke-slate-800" strokeDasharray="3,3" />
              
              {/* Bottom X-Axis Solid line */}
              <line x1="50" y1="260" x2="770" y2="260" className="stroke-slate-300 dark:stroke-slate-700" strokeWidth="1" />

              {/* Vertical Grid lines */}
              {svgPoints.map((pt, i) => (
                <line 
                  key={`vgrid-${i}`} 
                  x1={pt.x} 
                  y1="40" 
                  x2={pt.x} 
                  y2="260" 
                  className="stroke-slate-100 dark:stroke-slate-800" 
                  strokeDasharray="2,2" 
                />
              ))}

              {/* Y-Axis Label Ticks */}
              <text x="38" y="44" fill="#94a3b8" className="text-[10px] font-bold font-mono text-right" textAnchor="end">28</text>
              <text x="38" y="101.5" fill="#94a3b8" className="text-[10px] font-bold font-mono text-right" textAnchor="end">21</text>
              <text x="38" y="159" fill="#94a3b8" className="text-[10px] font-bold font-mono text-right" textAnchor="end">14</text>
              <text x="38" y="216.5" fill="#94a3b8" className="text-[10px] font-bold font-mono text-right" textAnchor="end">7</text>
              <text x="38" y="264" fill="#94a3b8" className="text-[10px] font-bold font-mono text-right" textAnchor="end">0</text>

              {/* Vertically oriented 'Present' Axis title */}
              <text 
                x="-145" 
                y="16" 
                transform="rotate(-90)" 
                className="text-[9px] font-bold fill-slate-400 dark:fill-slate-500 uppercase tracking-widest text-center" 
                textAnchor="middle"
              >
                Present
              </text>

              {/* X-Axis Labels (Dates) */}
              {svgPoints.map((pt, i) => (
                <text 
                  key={`xlabel-${i}`} 
                  x={pt.x} 
                  y="278" 
                  fill="#64748b" 
                  className="text-[10px] font-black font-sans text-center" 
                  textAnchor="middle"
                >
                  {pt.date}
                </text>
              ))}

              {/* Curved Path */}
              <path 
                d={trendLinePath} 
                fill="none" 
                className="stroke-emerald-500 dark:stroke-emerald-400" 
                strokeWidth="2.5" 
                strokeLinecap="round"
              />

              {/* Interactive Data Point Dots */}
              {svgPoints.map((pt, i) => {
                const isHovered = hoveredPointIndex === i;
                return (
                  <g key={`dot-group-${i}`}>
                    {/* Invisible Hover Zone */}
                    <circle 
                      cx={pt.x} 
                      cy={pt.y} 
                      r="15" 
                      fill="transparent" 
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPointIndex(i)}
                      onMouseLeave={() => setHoveredPointIndex(null)}
                    />
                    {/* Visible outer hover halo */}
                    {isHovered && (
                      <circle 
                        cx={pt.x} 
                        cy={pt.y} 
                        r="9" 
                        className="fill-emerald-500/20 stroke-none"
                      />
                    )}
                    {/* Main core dot */}
                    <circle 
                      cx={pt.x} 
                      cy={pt.y} 
                      r={isHovered ? 5.5 : 4.5} 
                      className="fill-emerald-500 dark:fill-emerald-400 stroke-white dark:stroke-slate-900 cursor-pointer transition-all duration-150"
                      strokeWidth={isHovered ? 2 : 1.5}
                      onMouseEnter={() => setHoveredPointIndex(i)}
                      onMouseLeave={() => setHoveredPointIndex(null)}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Absolute Tooltip Overlay on point hover */}
            {hoveredPointIndex !== null && (
              <div 
                className="absolute z-10 bg-slate-900 text-white p-2.5 rounded-xl shadow-lg border border-slate-700 text-xs pointer-events-none transition-all duration-150 animate-in fade-in zoom-in-95"
                style={{
                  left: `${(svgPoints[hoveredPointIndex].x / 800) * 100}%`,
                  top: `${(svgPoints[hoveredPointIndex].y / 300) * 100 - 15}%`,
                  transform: 'translate(-50%, -100%)',
                }}
              >
                <p className="font-bold">{trendPoints[hoveredPointIndex].date}</p>
                <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                  Present: {trendPoints[hoveredPointIndex].present} players
                </p>
                <p className="text-[9px] text-slate-400 italic mt-0.5">
                  {trendPoints[hoveredPointIndex].location}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Legend Element Centered */}
        <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-slate-50 dark:border-slate-800/50">
          {uniqueLocations.map((loc, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px] font-black text-emerald-600 dark:text-emerald-400 font-sans tracking-wider uppercase select-none">
              <span className="flex items-center">
                <span className="w-4.5 h-0.5 bg-emerald-500" />
                <span className="w-2 h-2 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 -mx-1.5" />
                <span className="w-4.5 h-0.5 bg-emerald-500" />
              </span>
              <span>{loc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ==================== MASTER SESSIONS WITH GOOGLE SHEETS INTEGRATION ==================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-3xs overflow-hidden">
        <div 
          onClick={() => setIsOpenMasterSessions(!isOpenMasterSessions)}
          className="p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-center shrink-0">
              <FileText className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-450" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">Master Sessions (Google Sheets)</h4>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold hidden sm:block">Sync attendance records automatically to Google Sheets</p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
            {!needsAuth && (
              <button
                onClick={handleSyncAllMasterSessions}
                disabled={isSyncingMaster}
                className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-450 text-[10px] font-black uppercase px-3 py-1.5 rounded-xl cursor-pointer transition shadow-xs active:scale-95 animate-in fade-in"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingMaster ? 'animate-spin' : ''}`} />
                <span>{isSyncingMaster ? 'Syncing...' : syncMasterMessage || 'Sync All'}</span>
              </button>
            )}

            {needsAuth && (
              <button
                onClick={handleConnectSheets}
                disabled={isLoggingIn}
                className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/45 dark:hover:bg-blue-900/35 border border-blue-100 dark:border-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase px-3 py-1.5 rounded-xl cursor-pointer transition shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoggingIn ? 'animate-spin' : ''}`} />
                <span>Connect Sheets</span>
              </button>
            )}

            <div 
              className="p-1 cursor-pointer"
              onClick={() => setIsOpenMasterSessions(!isOpenMasterSessions)}
            >
              {isOpenMasterSessions ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        {isOpenMasterSessions && (
          <div className="p-5 border-t border-slate-100 dark:border-slate-800 space-y-4 bg-slate-50/50 dark:bg-slate-950/25">
            
            {needsAuth ? (
              /* 1. Unauthorized / Connect Sheets State UI */
              <div className="py-8 px-4 text-center max-w-lg mx-auto space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-center mx-auto shadow-2xs">
                  <FileText className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="space-y-1.5">
                  <h5 className="text-sm font-black text-slate-900 dark:text-slate-100">Document Sessions in Google Sheets</h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Connect your Google Workspace account to document and sync attendance rosters automatically. Each master session will have its own dedicated sheet tab detailing player presence, fee payments, and custom session notes.
                  </p>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={handleConnectSheets}
                    disabled={isLoggingIn}
                    className="inline-flex items-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer shadow-md active:scale-98"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoggingIn ? 'animate-spin' : ''}`} />
                    <span>{isLoggingIn ? 'Connecting to Google...' : 'Sign in with Google'}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* 2. Connected state: Sheets and Individual Session synchronizers grouped by category */
              <div className="space-y-6">
                {/* Connected Account & Sheet Banner Info */}
                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-4 shadow-3xs flex flex-col justify-between gap-4 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                        <span>Connected to Google Sheets</span>
                      </div>
                      <p className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold truncate">
                        Account: {user?.email || 'Authenticated User'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleDisconnectSheets}
                        className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/30 border border-red-100 dark:border-red-900/40 text-red-600 dark:text-red-400 font-black text-[10px] px-3.5 py-2 rounded-xl transition cursor-pointer"
                        title="Disconnect Account"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Disconnect
                      </button>
                    </div>
                  </div>

                  {/* Active Spreadsheets List by Category/League */}
                  {Object.keys(spreadsheets).length > 0 && (
                    <div className="mt-2 space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                      <p className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">Active Spreadsheets by Category</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {Object.entries(spreadsheets).map(([category, rawSheet]) => {
                          const sheet = rawSheet as GoogleSpreadsheetInfo;
                          return (
                            <div key={category} className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/45 p-2 px-3 rounded-xl border border-slate-150/60 dark:border-slate-850 text-[11px]">
                              <div className="min-w-0">
                                <span className="font-extrabold text-slate-800 dark:text-slate-200 block truncate">{category}</span>
                                <span className="text-[9px] text-slate-400 dark:text-slate-500 block truncate font-mono">File: {sheet.name}</span>
                              </div>
                              <a
                                href={sheet.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                referrerPolicy="no-referrer"
                                className="flex items-center gap-1 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-[10px] px-2.5 py-1 rounded-lg transition"
                              >
                                <span>Open</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sync status alert for document creation */}
                {isConnectingSheet && (
                  <div className="bg-blue-50/50 dark:bg-blue-950/25 border border-blue-100 dark:border-blue-900/40 p-3 rounded-xl text-[10px] text-blue-600 dark:text-blue-400 font-bold flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Locating or creating your attendance spreadsheet in Google Drive...</span>
                  </div>
                )}

                {/* Categories subsections */}
                <div className="space-y-6">
                  {Object.entries(groupedSessions).map(([categoryName, rawCategorySessions]) => {
                    const categorySessions = rawCategorySessions as Session[];
                    const sheet = spreadsheets[categoryName];
                    
                    return (
                      <div key={categoryName} className="space-y-3">
                        {/* Category Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-150/65 dark:border-slate-850">
                          <div>
                            <h5 className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span>{categoryName}</span>
                            </h5>
                            <p className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold mt-0.5">{categorySessions.length} completed sessions</p>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            {sheet?.webViewLink && (
                              <a
                                href={sheet.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                referrerPolicy="no-referrer"
                                className="flex items-center gap-1 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg transition"
                              >
                                <span>Open Spreadsheet</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            
                            <button
                              onClick={async () => {
                                const currentToken = token || (await getAccessToken());
                                if (!currentToken) {
                                  setNeedsAuth(true);
                                  return;
                                }
                                for (const s of categorySessions) {
                                  await handleSyncIndividualSession(s);
                                }
                              }}
                              className="bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 border border-emerald-100 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-450 text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                            >
                              Sync Category
                            </button>
                          </div>
                        </div>

                        {/* Grid of sessions for this category */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {categorySessions.map(session => {
                            const pCount = attendance.filter(a => a.sessionId === session.id && a.status === 'Present').length;
                            const syncStatus = sessionSyncStates[session.id] || (syncedSessionIds.includes(session.id) ? 'success' : 'idle');

                            return (
                              <div key={session.id} className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-4 shadow-3xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-2xs transition-all duration-200">
                                <div className="space-y-1 min-w-0">
                                  <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">{session.title}</h4>
                                  <p className="text-[10px] text-slate-450 dark:text-slate-500 font-bold font-mono">{session.date} • {session.time}</p>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-455 font-semibold truncate flex items-center gap-1 mt-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 inline-block" /> {session.location}
                                  </p>
                                  
                                  {/* Sync Status Badge indicator */}
                                  <div className="pt-1.5 flex items-center gap-1.5">
                                    {syncStatus === 'syncing' ? (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight">
                                        <RefreshCw className="w-3 h-3 animate-spin" /> Syncing...
                                      </span>
                                    ) : syncStatus === 'success' ? (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-600 dark:text-emerald-450 uppercase tracking-tight">
                                        <Check className="w-3 h-3 stroke-3" /> Synced to Sheet
                                      </span>
                                    ) : syncStatus === 'error' ? (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-black text-red-500 dark:text-red-400 uppercase tracking-tight">
                                        <X className="w-3 h-3 stroke-3" /> Sync Failed
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-tight">
                                        Not Synced
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="shrink-0 flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 w-full sm:w-auto pt-3 sm:pt-0 border-t border-slate-100 dark:border-slate-800/40 sm:border-0">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-450 border border-emerald-500/10">
                                    <UserCheck className="w-3.5 h-3.5" /> {pCount} present
                                  </span>

                                  <button
                                    onClick={() => handleSyncIndividualSession(session)}
                                    disabled={syncStatus === 'syncing'}
                                    className="bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg transition cursor-pointer active:scale-95 flex items-center gap-1 shrink-0"
                                  >
                                    <RefreshCw className={`w-3 h-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                                    <span>{syncStatus === 'success' ? 'Re-sync Tab' : 'Sync Tab'}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {completedSessions.length === 0 && (
                    <p className="text-xs text-slate-400 dark:text-slate-555 italic p-4 text-center">No completed master sessions logged.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ==================== WEEKLY REPORTS CATALOG SECTION ==================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-3xs overflow-hidden">
        <div 
          onClick={() => setIsOpenWeeklyReports(!isOpenWeeklyReports)}
          className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-center shrink-0">
              <FileText className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">Session Weekly PDF Reports</h4>
              <p className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold mt-0.5">
                Download match-day reports matching the official league template format.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350 shrink-0">
              {weeklyReportSessions.length} Reports
            </span>
            <div>
              {isOpenWeeklyReports ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </div>
        </div>

        {isOpenWeeklyReports && (
          <div className="p-5 bg-slate-50/50 dark:bg-slate-950/25 border-t border-slate-100 dark:border-slate-800">
            {weeklyReportSessions.length === 0 ? (
              <div className="bg-white dark:bg-slate-950 py-12 px-4 rounded-2xl border border-slate-150 dark:border-slate-850 text-center text-slate-400">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700 stroke-1" />
                <h5 className="font-bold text-xs text-slate-700 dark:text-slate-300">No completed sessions found</h5>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Complete a match or friendly session on the sessions tab to generate reports.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {weeklyReportSessions.map(session => {
                  const isLeague = session.type === 'League Match';
                  const category = getSessionCategory(session);
                  const presentCount = attendance.filter(a => a.sessionId === session.id && a.status === 'Present').length;
                  
                  return (
                    <div 
                      key={session.id}
                      className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-150 dark:border-slate-850 shadow-3xs hover:shadow-2xs hover:border-emerald-500/30 transition flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-2">
                        {/* Type and Category badge */}
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                            isLeague 
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-500/10' 
                              : 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border border-orange-500/10'
                          }`}>
                            {session.type}
                          </span>
                          <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-550 truncate max-w-[130px]" title={category}>
                            {category}
                          </span>
                        </div>

                        {/* Session title and date */}
                        <div>
                          <h6 className="text-xs font-black text-slate-800 dark:text-slate-100 line-clamp-1" title={session.title}>
                            {session.title}
                          </h6>
                          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{formatSessionDate(session.date)} {session.time}</span>
                          </p>
                          <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-1 truncate">
                            Venue: {session.location}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-850">
                        {/* Present stat */}
                        <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 font-extrabold flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{presentCount} Check-ins</span>
                        </span>

                        {/* Download button */}
                        <button
                          onClick={() => downloadWeeklyReportPDF(session)}
                          className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-black text-[9px] px-2.5 py-1.5 rounded-xl transition cursor-pointer shadow-xs uppercase tracking-wider"
                          title="Download Report PDF"
                        >
                          <Download className="w-3 h-3 shrink-0" />
                          <span>Download PDF</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
        </>
      )}

    </div>
  );
}
