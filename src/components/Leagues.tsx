import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { League, TeamStanding, LeagueMatch, Player, AttendanceRecord, Session, MatchGoal } from '../types';
import { getTeamColorStyles } from '../utils/teamColors';
import { 
  Award, 
  Plus, 
  Trophy, 
  Calendar, 
  Check, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  HelpCircle,
  Trash2,
  Users,
  ArrowLeft,
  Home,
  Swords,
  Table,
  Shield,
  Edit2,
  Star,
  Target,
  CheckCircle2,
  PlayCircle,
  AlertCircle,
  Search,
  RotateCw,
  Sparkles,
  Grid
} from 'lucide-react';
import { normalizeDateToISO } from '../utils/dateUtils';
import { normalizePlayerName } from '../utils/nameUtils';
import { generatePlayerStandingsFromMatches, verifyMatchToTableSync, parseTolerantDate } from '../utils/playerAggregation';
import { useLeagueStandings } from '../hooks/useLeagueStandings';
import { db } from '../utils/auth';
import { collection, doc, setDoc, getDocs, writeBatch } from 'firebase/firestore';

const formatMatchDateDisplay = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split(' • ');
  const datePart = parts[0].trim();
  const timePart = parts[1] ? parts[1].trim() : '';

  // Check if datePart is in YYYY-MM-DD format
  const ymdMatch = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const monthIndex = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[monthIndex] || 'Jan';
    const formattedDate = `${day} ${monthName} ${year}`;
    return timePart ? `${formattedDate} • ${timePart}` : formattedDate;
  }

  // Check if datePart already matches DD MMM YYYY (e.g. 14 Feb 2026)
  const dmyMatch = datePart.match(/^(\d{1,2})\s+([A-Za-z]{3,10})\s+(\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const monthStr = dmyMatch[2];
    const year = parseInt(dmyMatch[3], 10);
    const shortMonth = monthStr.substring(0, 3);
    const capitalizedMonth = shortMonth.charAt(0).toUpperCase() + shortMonth.slice(1).toLowerCase();
    const formattedDate = `${day} ${capitalizedMonth} ${year}`;
    return timePart ? `${formattedDate} • ${timePart}` : formattedDate;
  }

  // Try standard parsing
  const parsed = parseTolerantDate(datePart);
  if (parsed) {
    const day = parsed.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[parsed.getMonth()];
    const year = parsed.getFullYear();
    const formattedDate = `${day} ${monthName} ${year}`;
    return timePart ? `${formattedDate} • ${timePart}` : formattedDate;
  }

  return dateStr;
};

interface LeaguesProps {
  leagues: League[];
  standings: Record<string, TeamStanding[]>; // key: leagueId
  matches: LeagueMatch[];
  players?: Player[];
  attendance?: AttendanceRecord[];
  sessions?: Session[];
  selectedLeagueId?: string | null;
  setSelectedLeagueId?: (id: string | null) => void;
  selectedMatchId?: string | null;
  setSelectedMatchId?: (id: string | null) => void;
  onAddLeague: (league: Omit<League, 'id'>, initialTeams: string[]) => void;
  onRecordMatchResult: (matchId: string, homeScore: number, awayScore: number) => void;
  onDeleteLeague?: (leagueId: string) => void;
  onAddMatch?: (match: LeagueMatch) => void;
  onUpdateMatch?: (match: LeagueMatch) => void;
  onDeleteMatch?: (matchId: string) => void;
  onNavigateToSession?: (match: LeagueMatch) => void;
  onAddTeamToLeague?: (leagueId: string, teamName: string) => void;
  onDeleteTeamFromLeague?: (leagueId: string, teamId: string) => void;
  onRebuildPlayerStats?: () => void;
  onUpdateAttendance?: (sessionId: string, records: AttendanceRecord[]) => void;
}

interface CustomDatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (val: string) => void;
  label: string;
  id?: string;
}

function CustomDatePicker({ value, onChange, label, id }: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Parse current value or default to today
  const parsedDate = useMemo(() => {
    if (!value) return new Date();
    const [y, m, d] = value.split('-').map(Number);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m - 1, d);
    }
    return new Date();
  }, [value]);

  const [currentYear, setCurrentYear] = useState(() => parsedDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => parsedDate.getMonth()); // 0-indexed

  // Sync state if value changes from outside
  useEffect(() => {
    if (value) {
      const [y, m, d] = value.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        setCurrentYear(y);
        setCurrentMonth(m - 1);
      }
    }
  }, [value]);

  const monthsList = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysGrid = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const days: (number | null)[] = [];
    // empty slots before first day
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    // actual days
    for (let i = 1; i <= totalDays; i++) {
      days.push(i);
    }
    return days;
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const formattedMonth = String(currentMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const dateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const formattedDisplay = useMemo(() => {
    if (!value) return "Select date";
    const [y, m, d] = value.split('-').map(Number);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return value;
  }, [value]);

  // Click outside to close helper
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
        {label}
      </label>
      
      {/* Visual input field button */}
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left text-xs p-3 border border-slate-200 dark:border-slate-850 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-hidden transition flex items-center justify-between bg-white cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/20"
      >
        <span className="font-semibold text-slate-700 dark:text-slate-200">{formattedDisplay}</span>
        <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
      </button>

      {/* Floating Popover */}
      {isOpen && (
        <div className="absolute z-[100] mt-1.5 left-0 right-0 md:w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl p-4 animate-in fade-in zoom-in-95 duration-100">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {monthsList[currentMonth]} {currentYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
              <span key={d} className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {daysGrid.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} />;
              }
              const isSelected = 
                parsedDate.getFullYear() === currentYear &&
                parsedDate.getMonth() === currentMonth &&
                parsedDate.getDate() === day;
                
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`text-xs p-1 rounded-lg font-medium transition cursor-pointer select-none ${
                    isSelected
                      ? 'bg-emerald-500 text-white font-extrabold shadow-xs'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick Year Jumps */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex justify-between gap-1">
            <button
              type="button"
              onClick={() => setCurrentYear(prev => prev - 1)}
              className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 px-1.5 py-0.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/40"
            >
              « Year
            </button>
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                setCurrentMonth(today.getMonth());
                setCurrentYear(today.getFullYear());
              }}
              className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 px-2 py-0.5 rounded-md"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setCurrentYear(prev => prev + 1)}
              className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 px-1.5 py-0.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/40"
            >
              Year »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const getInitials = (name: string) => {
  if (!name) return '';
  const clean = name.replace(/\(.*?\)/g, '').replace(/[^a-zA-Z0-9\s]/g, ' ');
  const parts = clean.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return '';
};

const isCaptainsLeagueId = (id: string) => {
  if (!id) return false;
  const norm = String(id).toLowerCase().replace(/['’]/g, '').trim();
  return norm === 'l-3' || norm === 'l-captain' || norm === 'captains_league' || norm === "captain's league" || norm === "captains league" || norm.includes('captain') || norm === '1' || norm === 'l-1';
};

export default function Leagues({ 
  leagues, 
  standings, 
  matches, 
  players = [],
  attendance = [],
  sessions = [],
  selectedLeagueId,
  setSelectedLeagueId,
  selectedMatchId,
  setSelectedMatchId,
  onAddLeague, 
  onRecordMatchResult,
  onDeleteLeague,
  onAddMatch,
  onUpdateMatch,
  onDeleteMatch,
  onNavigateToSession,
  onAddTeamToLeague,
  onDeleteTeamFromLeague,
  onRebuildPlayerStats,
  onUpdateAttendance
}: LeaguesProps) {
  const getPlayerDisplayName = (player: { id?: string; name: string }) => {
    if (!player || !player.name) return '';
    const trimmedName = player.name.trim();
    const firstName = trimmedName.split(' ')[0].toLowerCase();

    const hasConflict = (players || []).some(p => {
      if (!p.name) return false;
      const otherTrimmed = p.name.trim();
      const isDifferentPlayer = p.id !== player.id;
      if (!isDifferentPlayer) return false;

      const otherFirstName = otherTrimmed.split(' ')[0].toLowerCase();
      return otherFirstName === firstName;
    });

    if (hasConflict || firstName === 'john') {
      return trimmedName;
    }
    return trimmedName.split(' ')[0];
  };
  
  const [localSelectedLeagueId, setLocalSelectedLeagueId] = useState<string | null>(null);
  const currentSelectedLeagueId = selectedLeagueId !== undefined && setSelectedLeagueId !== undefined ? selectedLeagueId : localSelectedLeagueId;
  const currentSetSelectedLeagueId = selectedLeagueId !== undefined && setSelectedLeagueId !== undefined ? setSelectedLeagueId : setLocalSelectedLeagueId;

  const [localSelectedMatchId, setLocalSelectedMatchId] = useState<string | null>(null);
  const activeSelectedMatchId = selectedMatchId !== undefined && setSelectedMatchId !== undefined ? selectedMatchId : localSelectedMatchId;
  const activeSetSelectedMatchId = selectedMatchId !== undefined && setSelectedMatchId !== undefined ? setSelectedMatchId : setLocalSelectedMatchId;

  const [showAddLeague, setShowAddLeague] = useState(false);
  const [activeMatchRecordId, setActiveMatchRecordId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Upcoming' | 'In Progress' | 'Completed'>('All');

  // Developer Debugger Panel States
  const [debuggerLogs, setDebuggerLogs] = useState<string[]>([]);
  const [showDebuggerPanel, setShowDebuggerPanel] = useState(false);

  // Expose automated state inspection window.auditPlayerState()


  // Custom delete confirmation states
  const [leagueToDelete, setLeagueToDelete] = useState<{ id: string; name: string } | null>(null);
  const [matchIdToDelete, setMatchIdToDelete] = useState<string | null>(null);

  // Form states for adding a league
  const [newLeagueName, setNewLeagueName] = useState('');
  const [newSeason, setNewSeason] = useState('');
  const [newSport, setNewSport] = useState('7V7');
  const [newLeagueFormat, setNewLeagueFormat] = useState<'once' | 'twice' | 'unlimited'>('once');
  const [teamNamesInput, setTeamNamesInput] = useState('Football United FC, Apex Athletics, Vanguard United, Titan Knights, Rovers FC');
  const [newLeagueStartDate, setNewLeagueStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newLeagueEndDate, setNewLeagueEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 2); // default 2 months duration
    return d.toISOString().split('T')[0];
  });

  // Score states
  const [homeScoreInput, setHomeScoreInput] = useState<string>('');
  const [awayScoreInput, setAwayScoreInput] = useState<string>('');

  // Team addition states
  const [newTeamNameInput, setNewTeamNameInput] = useState('');
  const [showAddTeamForm, setShowAddTeamForm] = useState(false);

  // League detail sub-tabs
  const [activeDetailTab, setActiveDetailTab] = useState<'matches' | 'player-league' | 'table' | 'teams'>('matches');

  // Player Table search/filter query
  const [playerTableSearchQuery, setPlayerTableSearchQuery] = useState('');
  const [playerSortField, setPlayerSortField] = useState<'PTS' | 'PPG' | 'G' | 'POTD'>('PTS');

  // Player & Team stats adjustments
  const [playerAdjustments, setPlayerAdjustments] = useState<Record<string, { played: number, won: number, drawn: number, lost: number, points: number, goals: number, potd: number }>>(() => {
    try {
      const saved = localStorage.getItem('app_player_adjustments');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [teamAdjustments, setTeamAdjustments] = useState<Record<string, { played: number, won: number, drawn: number, lost: number, goalsFor: number, goalsAgainst: number, points: number }>>(() => {
    try {
      const saved = localStorage.getItem('app_team_adjustments');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [adjustingPlayer, setAdjustingPlayer] = useState<Player | null>(null);
  const [adjustPlayed, setAdjustPlayed] = useState(0);
  const [adjustWon, setAdjustWon] = useState(0);
  const [adjustDrawn, setAdjustDrawn] = useState(0);
  const [adjustLost, setAdjustLost] = useState(0);
  const [adjustGoals, setAdjustGoals] = useState(0);
  const [adjustPOTD, setAdjustPOTD] = useState(0);
  const [adjustPoints, setAdjustPoints] = useState(0);

  const [adjustingTeam, setAdjustingTeam] = useState<any | null>(null);
  const [adjustTeamPlayed, setAdjustTeamPlayed] = useState(0);
  const [adjustTeamWon, setAdjustTeamWon] = useState(0);
  const [adjustTeamDrawn, setAdjustTeamDrawn] = useState(0);
  const [adjustTeamLost, setAdjustTeamLost] = useState(0);
  const [adjustTeamGF, setAdjustTeamGF] = useState(0);
  const [adjustTeamGA, setAdjustTeamGA] = useState(0);
  const [adjustTeamPoints, setAdjustTeamPoints] = useState(0);

  const handleStartAdjusting = (player: Player) => {
    setAdjustingPlayer(player);
    const existing = playerAdjustments[player.name.toLowerCase()] || {};
    const pAny = player as any;
    setAdjustPlayed(existing.played ?? pAny.matchesPlayed ?? pAny.played ?? 0);
    setAdjustWon(existing.won ?? pAny.matchesWon ?? pAny.won ?? 0);
    setAdjustDrawn(existing.drawn ?? pAny.matchesDrawn ?? pAny.drawn ?? 0);
    setAdjustLost(existing.lost ?? pAny.matchesLost ?? pAny.lost ?? 0);
    setAdjustGoals(existing.goals ?? pAny.goals ?? 0);
    setAdjustPOTD(existing.potd ?? pAny.potd ?? pAny.mvpAwards ?? 0);
    setAdjustPoints(existing.points ?? pAny.totalPoints ?? pAny.points ?? 0);
  };

  const handleSaveAdjustment = async () => {
    if (!adjustingPlayer) return;
    const nameKey = adjustingPlayer.name.toLowerCase();
    const updated = {
      ...playerAdjustments,
      [nameKey]: {
        played: adjustPlayed,
        won: adjustWon,
        drawn: adjustDrawn,
        lost: adjustLost,
        points: adjustPoints,
        goals: adjustGoals,
        potd: adjustPOTD
      }
    };
    setPlayerAdjustments(updated);
    localStorage.setItem('app_player_adjustments', JSON.stringify(updated));
    localStorage.setItem('gameon_player_adjustments', JSON.stringify(updated));
    setAdjustingPlayer(null);

    try {
      await fetch('/api/standings/save_player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: adjustingPlayer.name,
          pld: adjustPlayed,
          w: adjustWon,
          d: adjustDrawn,
          l: adjustLost,
          pts: adjustPoints,
          goals: adjustGoals
        })
      });
      if (onRebuildPlayerStats) onRebuildPlayerStats();
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartAdjustingTeam = (team: any) => {
    setAdjustingTeam(team);
    const nameKey = team.name.toLowerCase();
    const existing = teamAdjustments[nameKey] || {};
    setAdjustTeamPlayed(existing.played ?? team.played ?? 0);
    setAdjustTeamWon(existing.won ?? team.won ?? 0);
    setAdjustTeamDrawn(existing.drawn ?? team.drawn ?? 0);
    setAdjustTeamLost(existing.lost ?? team.lost ?? 0);
    setAdjustTeamGF(existing.goalsFor ?? team.goalsFor ?? 0);
    setAdjustTeamGA(existing.goalsAgainst ?? team.goalsAgainst ?? 0);
    setAdjustTeamPoints(existing.points ?? team.points ?? 0);
  };

  const handleSaveTeamAdjustment = async () => {
    if (!adjustingTeam) return;
    const nameKey = adjustingTeam.name.toLowerCase();
    const updated = {
      ...teamAdjustments,
      [nameKey]: {
        played: adjustTeamPlayed,
        won: adjustTeamWon,
        drawn: adjustTeamDrawn,
        lost: adjustTeamLost,
        goalsFor: adjustTeamGF,
        goalsAgainst: adjustTeamGA,
        points: adjustTeamPoints
      }
    };
    setTeamAdjustments(updated);
    localStorage.setItem('app_team_adjustments', JSON.stringify(updated));
    localStorage.setItem('gameon_team_adjustments', JSON.stringify(updated));
    setAdjustingTeam(null);

    try {
      await fetch('/api/standings/save_team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: adjustingTeam.name,
          pld: adjustTeamPlayed,
          w: adjustTeamWon,
          d: adjustTeamDrawn,
          l: adjustTeamLost,
          gf: adjustTeamGF,
          ga: adjustTeamGA,
          pts: adjustTeamPoints
        })
      });
      if (onRebuildPlayerStats) onRebuildPlayerStats();
    } catch (e) {
      console.error(e);
    }
  };

  // Create match modal states
  const [showCreateMatchModal, setShowCreateMatchModal] = useState(false);
  const [newMatchHome, setNewMatchHome] = useState('');
  const [newMatchAway, setNewMatchAway] = useState('');
  const [newMatchDate, setNewMatchDate] = useState('2026-07-09');
  const [newMatchTime, setNewMatchTime] = useState('10:00');
  const [newMatchNumber, setNewMatchNumber] = useState('');
  const [newMatchType, setNewMatchType] = useState<'League Match' | 'Friendly Match'>('League Match');
  const [newMatchFormat, setNewMatchFormat] = useState<string>('7v7');

  // Edit match score/status modal states
  const [editingMatch, setEditingMatch] = useState<LeagueMatch | null>(null);
  const [editHomeTeam, setEditHomeTeam] = useState<string>('');
  const [editAwayTeam, setEditAwayTeam] = useState<string>('');
  const [editHomeScore, setEditHomeScore] = useState<string>('');
  const [editAwayScore, setEditAwayScore] = useState<string>('');
  const [editPlayerOfMatch, setEditPlayerOfMatch] = useState<string>('');
  const [editMatchStatus, setEditMatchStatus] = useState<'Scheduled' | 'Live' | 'Played'>('Scheduled');
  const [editMatchDate, setEditMatchDate] = useState<string>('');
  const [editMatchTime, setEditMatchTime] = useState<string>('');
  const [editMatchFormat, setEditMatchFormat] = useState<string>('7v7');
  const [editMatchType, setEditMatchType] = useState<'League Match' | 'Friendly Match'>('League Match');

  const [backendStandings, setBackendStandings] = useState<any[] | null>(null);
  const [playerStandingsLoading, setPlayerStandingsLoading] = useState(false);
  const [playerStandingsError, setPlayerStandingsError] = useState<string | null>(null);

  const { standings: realTimeStandings } = useLeagueStandings(currentSelectedLeagueId);

  useEffect(() => {
    if (realTimeStandings) {
      setBackendStandings(realTimeStandings);
    }
  }, [realTimeStandings]);

  // Fetch computed standings from the database view
  const fetchPlayerStandings = async (leagueId: string, startDate: string) => {
    if ((window as any).isFirestoreDisabled) {
      setBackendStandings([]);
      return;
    }
    setPlayerStandingsLoading(true);
    setPlayerStandingsError(null);
    try {
      const url = `/api/computed-standings?leagueId=${encodeURIComponent(leagueId)}&startDate=${encodeURIComponent(startDate)}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load computed standings (HTTP ${response.status})`);
      }
      const data = await response.json();
      if (data.isFirestoreDisabled) {
        (window as any).isFirestoreDisabled = true;
        setBackendStandings([]);
        return;
      }
      if (data.success && Array.isArray(data.standings)) {
        if (data.standings.length > 0) {
          setBackendStandings(data.standings);
        } else {
          console.warn("Backend standings returned 0 rows. Falling back to local standings computation.");
          setBackendStandings([]);
        }
      } else {
        throw new Error(data.error || "Failed to retrieve standings from backend.");
      }
    } catch (err: any) {
      console.error("Error in fetchPlayerStandings:", err);
      setPlayerStandingsError(err.message || "An error occurred while loading standings.");
      const hasLocal = (matches && matches.length > 0) || (() => {
        try { return JSON.parse(localStorage.getItem('gameon_matches') || '[]').length > 0; } catch { return false; }
      })();
      if (!hasLocal && !(window as any).isFirestoreDisabled) {
        alert(`Network error: Failed to fetch computed standings from database. Click "Sync Stats" or refresh to retry.\nDetail: ${err.message || 'Connection lost'}`);
      }
    } finally {
      setPlayerStandingsLoading(false);
    }
  };

  // Connect "SYNC STATS" button to client-side Firestore seeding
  const seedLocalDataToFirebase = async () => {
    setPlayerStandingsError(null);
    try {
      // 1. Gather matches from ALL active runtime state sources:
      // - Primary: window.appState?.matches, (window as any).state?.matches, matches prop
      // - Secondary: All matches rendered under 'Matches' tab DOM list
      // - Tertiary: Fallback scan across all localStorage keys
      const activeStateMatches = [
        ...(Array.isArray((window as any).appState?.matches) ? (window as any).appState.matches : []),
        ...(Array.isArray((window as any).state?.matches) ? (window as any).state.matches : []),
        ...(Array.isArray(matches) ? matches : [])
      ];

      // Secondary: Try to collect any rendered matches on DOM
      const domMatches: any[] = [];
      try {
        const matchElements = document.querySelectorAll('[id^="match-card-"], [data-match-id], .match-card');
        matchElements.forEach(el => {
          const matchId = el.getAttribute('id')?.replace('match-card-', '') || el.getAttribute('data-match-id');
          if (matchId) {
            const found = activeStateMatches.find(m => m.id === matchId);
            if (found) {
              domMatches.push(found);
            }
          }
        });
      } catch (domErr) {
        console.warn("DOM match collection warning:", domErr);
      }

      // Tertiary: Fallback scan across legacy/other localStorage keys
      const keys = ['gameon_matches', 'matches', 'game_on_matches', 'matchCards', 'matchDetails', 'savedMatches'];
      const localStorageMatches: any[] = [];
      keys.forEach(key => {
        try {
          const val = localStorage.getItem(key);
          if (!val) return;
          const parsed = JSON.parse(val);
          const matchesArray = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === 'object' ? [parsed] : []);
          matchesArray.forEach((m: any) => {
            if (m && typeof m === 'object') {
              localStorageMatches.push(m);
            }
          });
        } catch (e) {
          console.warn(`Failed to parse key ${key}:`, e);
        }
      });

      // Combine and deduplicate
      const allMatches: any[] = [];
      const seenIds = new Set<string>();
      const seenUniqueKeys = new Set<string>();

      const addCandidateMatch = (m: any) => {
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
      };

      activeStateMatches.forEach(addCandidateMatch);
      domMatches.forEach(addCandidateMatch);
      localStorageMatches.forEach(addCandidateMatch);

      if (allMatches.length === 0) {
        alert("No match cards found in state, DOM, or localStorage to sync!");
        return;
      }

      // 1. INSTANT LOCAL RE-CALCULATION & POPULATION (Executed FIRST for instant UI feedback)
      if (currentSelectedLeagueId) {
        const localComputed = generatePlayerStandingsFromMatches(allMatches, players, currentSelectedLeagueId, sessions, attendance);
        const mappedForBackend = localComputed.map((item, idx) => ({
          player_id: item.player.id || `local-p-${idx}`,
          canonical_name: item.player.name,
          league_id: currentSelectedLeagueId,
          played: item.played || 0,
          wins: item.won || 0,
          draws: item.drawn || 0,
          losses: item.lost || 0,
          total_goals: item.goals || 0,
          total_mvps: item.potd || 0,
          points: item.points || 0,
          ppg: item.ppg || 0
        }));
        setBackendStandings(mappedForBackend);
      }

      // Immediately set loading to false so the local standings show instantly
      setPlayerStandingsLoading(false);

      // 2. ASYNCHRONOUSLY push match cards up to the backend database in the background without blocking the UI
      console.log("Starting background Firestore push for local matches...");
      (async () => {
        try {
          // Fetch leagues & players from Firestore dynamically to map correctly
          const [leaguesSnap, playersSnap] = await Promise.all([
            getDocs(collection(db, 'leagues')),
            getDocs(collection(db, 'go_players_prod'))
          ]);

          const dbLeagues = leaguesSnap.docs.map(docSnap => docSnap.data());
          const dbPlayers = playersSnap.docs.map(docSnap => docSnap.data());

          const playerLeague = dbLeagues.find(l => l.name?.toLowerCase().includes("player")) || { id: 'l-player' };
          const captainsLeague = dbLeagues.find(l => l.name?.toLowerCase().includes("captain")) || { id: 'l-captain' };

          const isCaptainsLeagueIdLocal = (id: string) => {
            if (!id) return false;
            const norm = id.toLowerCase().replace(/['’]/g, '').trim();
            return norm === 'l-3' || norm === 'l-captain' || norm === 'captains_league' || norm === "captain's league" || norm === "captains league" || norm.includes('captain');
          };

          const playerMap = new Map<string, string>();
          dbPlayers.forEach(p => {
            playerMap.set(p.canonical_name.toLowerCase(), p.id);
            if (p.name) {
              playerMap.set(p.name.toLowerCase(), p.id);
            }
          });

          const getPlayerUuid = (name: string): string => {
            if (!name) return '';
            const cleaned = normalizePlayerName(name).toLowerCase();
            if (playerMap.has(cleaned)) return playerMap.get(cleaned)!;
            for (const [canonical, uuid] of playerMap.entries()) {
              if (cleaned.includes(canonical) || canonical.includes(cleaned)) {
                return uuid;
              }
            }
            return 'p-' + Math.random().toString(36).substring(2, 10);
          };

          // Write each match and its performance records to Firestore using writeBatch (grouped by 100 for safety)
          const batchSize = 100;
          let batch = writeBatch(db);
          let opCount = 0;

          for (const m of allMatches) {
            const matchLeagueUuid = isCaptainsLeagueIdLocal(m.leagueId) ? captainsLeague.id : playerLeague.id;
            const isCompleted = m.status === 'Played';
            const homeScore = isCompleted ? (parseInt(String(m.homeScore), 10) || 0) : null;
            const awayScore = isCompleted ? (parseInt(String(m.awayScore), 10) || 0) : null;

            const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
            const matchId = isUUID(m.id) ? m.id : "m-" + Math.random().toString(36).substring(2, 10);

            // A. Set match in 'go_matches_prod' collection using doc() write
            const matchRef = doc(db, 'go_matches_prod', matchId);
            batch.set(matchRef, {
              id: matchId,
              league_id: matchLeagueUuid,
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
              playerOfMatch: m.playerOfMatch || '',
              potdWinner: m.potdWinner || m.playerOfMatch || ''
            });
            opCount++;

            // B. Generate and Set performance records in 'match_performances'
            const goalsList = Array.isArray(m.goals) ? m.goals : [];
            const playerGoalsMap = new Map<string, number>();
            goalsList.forEach(g => {
              if (g) {
                const identifier = g.playerId || g.playerName;
                const key = normalizePlayerName(identifier).toLowerCase();
                playerGoalsMap.set(key, (playerGoalsMap.get(key) || 0) + 1);
              }
            });

            const mvpNames = new Set<string>();
            if (m.playerOfMatch) {
              const parts = m.playerOfMatch.split(/&|and|,|\//);
              parts.forEach((part: string) => {
                const pom = part.trim();
                if (pom) {
                  mvpNames.add(normalizePlayerName(pom).toLowerCase());
                }
              });
            }

            const homeSquad = Array.isArray(m.homeSquad) ? m.homeSquad : [];
            const awaySquad = Array.isArray(m.awaySquad) ? m.awaySquad : [];
            const uniqueHomeSquad = Array.from(new Set(homeSquad as string[]));
            const uniqueAwaySquad = Array.from(new Set(awaySquad as string[]));

            for (const pName of uniqueHomeSquad) {
              const playerUuid = getPlayerUuid(pName);
              if (playerUuid) {
                const pKey = normalizePlayerName(pName).toLowerCase();
                const goals = playerGoalsMap.get(pKey) || 0;
                const isMvp = mvpNames.has(pKey) || (pKey.includes('jerry') && mvpNames.has('jerry'));
                const perfId = `${matchId}_${playerUuid}`;
                batch.set(doc(db, 'match_performances', perfId), {
                  id: perfId,
                  match_id: matchId,
                  player_id: playerUuid,
                  team_side: 'home',
                  goals: goals,
                  is_mvp: isMvp,
                  created_at: new Date().toISOString()
                });
                opCount++;
              }
            }

            for (const pName of uniqueAwaySquad) {
              const playerUuid = getPlayerUuid(pName);
              if (playerUuid) {
                const pKey = normalizePlayerName(pName).toLowerCase();
                const goals = playerGoalsMap.get(pKey) || 0;
                const isMvp = mvpNames.has(pKey) || (pKey.includes('jerry') && mvpNames.has('jerry'));
                const perfId = `${matchId}_${playerUuid}`;
                batch.set(doc(db, 'match_performances', perfId), {
                  id: perfId,
                  match_id: matchId,
                  player_id: playerUuid,
                  team_side: 'away',
                  goals: goals,
                  is_mvp: isMvp,
                  created_at: new Date().toISOString()
                });
                opCount++;
              }
            }

            if (opCount >= batchSize) {
              await batch.commit();
              batch = writeBatch(db);
              opCount = 0;
            }
          }

          if (opCount > 0) {
            await batch.commit();
          }

          console.log(`Successfully completed background sync of ${allMatches.length} match cards to Firebase.`);
        } catch (err: any) {
          console.error("Error during background Firebase sync:", err);
        }
      })();

      // Alert that the UI was instantly populated and database sync is starting in background
      alert(`Instantly computed player standings from ${allMatches.length} local matches. Synchronizing records to remote database in the background...`);
    } catch (err: any) {
      console.error("Error in seedLocalDataToFirebase:", err);
      setPlayerStandingsError(err.message || "Failed to seed local data.");
      alert(`Failed to sync local data: ${err.message}`);
    }
  };

  // Automatically trigger fetch when selected league changes
  useEffect(() => {
    if (currentSelectedLeagueId) {
      const isCaptains = isCaptainsLeagueId(currentSelectedLeagueId);
      const startD = '2026-02-14';
      fetchPlayerStandings(currentSelectedLeagueId, startD);
    }
  }, [currentSelectedLeagueId]);

  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationReport, setVerificationReport] = useState<string[] | null>(null);
  const [verificationDiscrepancies, setVerificationDiscrepancies] = useState<number | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');

  // Automated background synchronization & match details validation loop
  useEffect(() => {
    if (!currentSelectedLeagueId || !matches || matches.length === 0) return;

    let active = true;
    const runAutoSyncAndVerify = async () => {
      try {
        const res = await fetch("/api/verify-match-details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matches,
            players,
            leagueId: currentSelectedLeagueId,
            playerAdjustments
          })
        });
        if (res.ok && active) {
          const data = await res.json();
          if (data.success && Array.isArray(data.verifiedStandings)) {
            setBackendStandings(data.verifiedStandings);

            // Auto-heal mismatches silently in the background
            const matchesDiff = JSON.stringify(data.verifiedMatches) !== JSON.stringify(matches);
            if (matchesDiff && onUpdateMatch) {
              data.verifiedMatches.forEach((updatedMatch: LeagueMatch) => {
                const originalMatch = matches.find(m => m.id === updatedMatch.id);
                if (originalMatch && JSON.stringify(originalMatch) !== JSON.stringify(updatedMatch)) {
                  onUpdateMatch(updatedMatch);
                }
              });
            }
          }
        }
      } catch (e) {
        console.error("Background auto-sync and validation error:", e);
      }
    };

    // Debounce slightly to prevent overloading during fast squad or goal edits
    const timer = setTimeout(() => {
      runAutoSyncAndVerify();
    }, 1500);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [matches, players, playerAdjustments, currentSelectedLeagueId]);

  const handleManualVerifyAndSync = async () => {
    if (!currentSelectedLeagueId) return;
    setIsVerifying(true);
    setVerificationStatus('checking');
    try {
      const res = await fetch("/api/verify-match-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matches,
          players,
          leagueId: currentSelectedLeagueId,
          playerAdjustments
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setVerificationReport(data.report);
          setVerificationDiscrepancies(data.discrepancyCount);
          setBackendStandings(data.verifiedStandings);
          setVerificationStatus('success');
          setShowVerificationModal(true);

          // Auto update any healed matches in application state
          const matchesDiff = JSON.stringify(data.verifiedMatches) !== JSON.stringify(matches);
          if (matchesDiff && onUpdateMatch) {
            data.verifiedMatches.forEach((updatedMatch: LeagueMatch) => {
              const originalMatch = matches.find(m => m.id === updatedMatch.id);
              if (originalMatch && JSON.stringify(originalMatch) !== JSON.stringify(updatedMatch)) {
                onUpdateMatch(updatedMatch);
              }
            });
          }
        } else {
          setVerificationStatus('error');
        }
      } else {
        setVerificationStatus('error');
      }
    } catch (e) {
      console.error("Manual verification failed:", e);
      setVerificationStatus('error');
    } finally {
      setIsVerifying(false);
    }
  };

  const activeLeague = currentSelectedLeagueId ? leagues.find(l => l.id === currentSelectedLeagueId) : null;
  const activeStandingsRaw = currentSelectedLeagueId ? (standings[currentSelectedLeagueId] || []) : [];
  const activeStandings = useMemo(() => {
    return activeStandingsRaw.map(st => {
      const adj = teamAdjustments[st.name.toLowerCase()];
      if (!adj) return st;
      return {
        ...st,
        played: adj.played ?? st.played,
        won: adj.won ?? st.won,
        drawn: adj.drawn ?? st.drawn,
        lost: adj.lost ?? st.lost,
        goalsFor: adj.goalsFor ?? st.goalsFor,
        goalsAgainst: adj.goalsAgainst ?? st.goalsAgainst,
        points: adj.points ?? st.points
      };
    });
  }, [activeStandingsRaw, teamAdjustments]);

  const sortedStandings = [...activeStandings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    return b.goalsFor - a.goalsFor;
  });
  const alphabeticalTeams = [...activeStandings].sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    if (editingMatch) {
      if (editMatchType === 'Friendly Match') {
        if (editHomeTeam !== 'Team Red' && editHomeTeam !== 'Team Yellow' && editAwayTeam !== 'Team Red' && editAwayTeam !== 'Team Yellow') {
          setEditHomeTeam('Team Red');
          setEditAwayTeam('Team Yellow');
        }
      } else {
        if ((editHomeTeam === 'Team Red' || editHomeTeam === 'Team Yellow' || editAwayTeam === 'Team Red' || editAwayTeam === 'Team Yellow') && sortedStandings.length >= 2) {
          setEditHomeTeam(sortedStandings[0]?.name || '');
          setEditAwayTeam(sortedStandings[1]?.name || '');
        }
      }
    }
  }, [editMatchType, editingMatch]);
  const deletedMatchIdsRaw = typeof window !== 'undefined' ? localStorage.getItem('gameon_deleted_matches') : null;
  let deletedMatchIds = new Set<string>();
  if (deletedMatchIdsRaw) {
    try {
      const parsed = JSON.parse(deletedMatchIdsRaw);
      if (Array.isArray(parsed)) {
        parsed.forEach((id: string) => deletedMatchIds.add(String(id)));
      }
    } catch (e) {}
  }

  const activeMatches = currentSelectedLeagueId
    ? matches.filter(m => m && !deletedMatchIds.has(String(m.id)) && (
        m.leagueId === currentSelectedLeagueId || 
        (isCaptainsLeagueId(currentSelectedLeagueId) && (isCaptainsLeagueId(m.leagueId) || !m.leagueId)) ||
        m.type === 'Friendly Match' ||
        !m.leagueId
      ))
    : matches.filter(m => m && !deletedMatchIds.has(String(m.id)));
  const hasAnyPlayedMatches = activeMatches.some(m => m.status === 'Played');

  // Match Detail Card States
  const [detailHomeTeam, setDetailHomeTeam] = useState('');
  const [detailAwayTeam, setDetailAwayTeam] = useState('');
  const [detailDate, setDetailDate] = useState('');
  const [detailTime, setDetailTime] = useState('');
  const [detailFormat, setDetailFormat] = useState('7v7');
  const [detailMatchNum, setDetailMatchNum] = useState<number | undefined>(undefined);
  const [detailType, setDetailType] = useState<'League Match' | 'Friendly Match'>('League Match');
  const [detailStatus, setDetailStatus] = useState<'Scheduled' | 'Live' | 'Played'>('Scheduled');
  const [detailHomeScore, setDetailHomeScore] = useState<string>('');
  const [detailAwayScore, setDetailAwayScore] = useState<string>('');
  const [detailPlayerOfMatch, setDetailPlayerOfMatch] = useState('');

  // Helper interactive states for the redesigned Match Detail Card
  const [activeGoalSelector, setActiveGoalSelector] = useState<{ team: 'home' | 'away' | null; type: 'League' | 'Friendly' } | null>(null);
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [checkedInSearchQuery, setCheckedInSearchQuery] = useState('');
  const [scorerSearchQuery, setScorerSearchQuery] = useState('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPOMDropdown, setShowPOMDropdown] = useState(false);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
  const [isSquadExpanded, setIsSquadExpanded] = useState(false);
  const [showForfeitPanel, setShowForfeitPanel] = useState(false);
  const [forfeitConfirmTeam, setForfeitConfirmTeam] = useState<'home' | 'away' | null>(null);

  // Sync Match Detail Card States when activeSelectedMatchId changes
  useEffect(() => {
    const activeMatch = matches.find(m => m.id === activeSelectedMatchId);
    if (activeMatch) {
      setActiveDetailTab('matches');
      setDetailHomeTeam(activeMatch.homeTeam);
      setDetailAwayTeam(activeMatch.awayTeam);
      const parts = activeMatch.date.split(' • ');
      setDetailDate(parts[0] || activeMatch.date);
      setDetailTime(parts[1] || '10:00');
      setDetailFormat(activeMatch.format || (activeLeague ? getLeagueFormat(activeLeague) : '7v7'));
      setDetailMatchNum(activeMatch.matchNumber);
      setDetailType(activeMatch.type || 'League Match');
      setDetailStatus(activeMatch.status);
      setDetailHomeScore(activeMatch.homeScore !== undefined && activeMatch.homeScore !== null ? activeMatch.homeScore.toString() : '');
      setDetailAwayScore(activeMatch.awayScore !== undefined && activeMatch.awayScore !== null ? activeMatch.awayScore.toString() : '');
      setDetailPlayerOfMatch(activeMatch.playerOfMatch || '');
      setShowForfeitPanel(false);
      setForfeitConfirmTeam(null);
    }
  }, [activeSelectedMatchId]);

  // Sync isUserEditing state to window object for snapshot locking
  useEffect(() => {
    const isEditing = !!activeSelectedMatchId || !!editingMatch;
    if (typeof (window as any).setIsUserEditing === 'function') {
      (window as any).setIsUserEditing(isEditing);
    } else {
      (window as any).isUserEditing = isEditing;
    }
    // Clean up on unmount
    return () => {
      if (typeof (window as any).setIsUserEditing === 'function') {
        (window as any).setIsUserEditing(false);
      } else {
        (window as any).isUserEditing = false;
      }
    };
  }, [activeSelectedMatchId, editingMatch]);

  // --- BULLETPROOF REAL-TIME AUTO-SAVE ENGINE (Matches) ---
  // Expose debouncedAutoSave on window as requested
  const debouncedAutoSaveRef = useRef<NodeJS.Timeout | null>(null);
  
  const debouncedAutoSave = useCallback((updated: LeagueMatch) => {
    if (debouncedAutoSaveRef.current) {
      clearTimeout(debouncedAutoSaveRef.current);
    }
    
    debouncedAutoSaveRef.current = setTimeout(async () => {
      if ((window as any).isFirestoreDisabled) return;
      console.log("⚡ [debouncedAutoSave] Asynchronously writing to Cloud Firestore in the background:", updated.id);
      try {
        await setDoc(doc(db, 'go_matches_prod', updated.id), {
          id: updated.id,
          league_id: updated.leagueId || currentSelectedLeagueId || '',
          match_date: normalizeDateToISO(updated.date),
          home_team_name: updated.homeTeam,
          away_team_name: updated.awayTeam,
          home_score: updated.homeScore !== undefined ? updated.homeScore : null,
          away_score: updated.awayScore !== undefined ? updated.awayScore : null,
          is_completed: updated.status === 'Played',
          created_at: (updated as any).created_at || new Date().toISOString(),
          goals: updated.goals || [],
          homeSquad: updated.homeSquad || [],
          awaySquad: updated.awaySquad || [],
          playerOfMatch: updated.playerOfMatch || '',
          potdWinner: updated.potdWinner || updated.playerOfMatch || '',
          potd_winner: updated.potdWinner || updated.playerOfMatch || ''
        });
        
        if (onUpdateMatch) {
          onUpdateMatch(updated);
        }
      } catch (err) {
        console.error("❌ Asynchronous Firestore write in debouncedAutoSave failed:", err);
      }
    }, 500); // Exact 500ms debounce specified!
  }, [currentSelectedLeagueId, onUpdateMatch]);

  useEffect(() => {
    (window as any).debouncedAutoSave = debouncedAutoSave;
  }, [debouncedAutoSave]);

  // --- INSTANT ZERO-LATENCY LOCAL UPDATE (appState & localStorage) ---
  useEffect(() => {
    if (activeSelectedMatchId) {
      const activeMatch = matches.find(m => m.id === activeSelectedMatchId);
      if (!activeMatch) return;

      const hScore = detailStatus !== 'Scheduled' ? parseInt(detailHomeScore) : undefined;
      const aScore = detailStatus !== 'Scheduled' ? parseInt(detailAwayScore) : undefined;

      const updated: LeagueMatch = {
        ...activeMatch,
        homeTeam: detailHomeTeam || activeMatch.homeTeam,
        awayTeam: detailAwayTeam || activeMatch.awayTeam,
        date: detailTime ? `${detailDate} • ${detailTime}` : (detailDate || activeMatch.date),
        format: detailFormat || activeMatch.format || '7v7',
        matchNumber: detailMatchNum || activeMatch.matchNumber,
        type: detailType || activeMatch.type || 'League Match',
        status: detailStatus || activeMatch.status || 'Scheduled',
        homeScore: isNaN(hScore as any) ? undefined : hScore,
        awayScore: isNaN(aScore as any) ? undefined : aScore,
        playerOfMatch: detailStatus === 'Played' ? (detailPlayerOfMatch || activeMatch.playerOfMatch) : undefined,
        potdWinner: detailStatus === 'Played' ? (detailPlayerOfMatch || activeMatch.potdWinner || activeMatch.playerOfMatch) : undefined,
        goals: activeMatch.goals || [],
        homeSquad: activeMatch.homeSquad || [],
        awaySquad: activeMatch.awaySquad || [],
        homeRoster: activeMatch.homeRoster || activeMatch.homeSquad || [],
        awayRoster: activeMatch.awayRoster || activeMatch.awaySquad || []
      };

      // 1. Instantly update window.appState
      const currentAppState = (window as any).appState || {};
      const nextMatches = (currentAppState.matches || matches).map((m: any) => m.id === updated.id ? updated : m);
      const nextState = {
        ...currentAppState,
        matches: nextMatches
      };
      (window as any).appState = nextState;
      (window as any).AppDatabase = nextState;

      // 2. Instantly update localStorage
      localStorage.setItem('gameon_matches', JSON.stringify(nextMatches));

      // 3. Trigger debounced Firestore save asynchronously in the background
      debouncedAutoSave(updated);
    }
  }, [
    activeSelectedMatchId,
    detailHomeTeam,
    detailAwayTeam,
    detailDate,
    detailTime,
    detailFormat,
    detailMatchNum,
    detailType,
    detailStatus,
    detailHomeScore,
    detailAwayScore,
    detailPlayerOfMatch,
    debouncedAutoSave
  ]);

  useEffect(() => {
    if (editingMatch) {
      const hScore = parseInt(editHomeScore);
      const aScore = parseInt(editAwayScore);

      const validatedHScore = editMatchStatus !== 'Scheduled' ? (isNaN(hScore) ? 0 : hScore) : undefined;
      const validatedAScore = editMatchStatus !== 'Scheduled' ? (isNaN(aScore) ? 0 : aScore) : undefined;

      const updated: LeagueMatch = {
        ...editingMatch,
        homeTeam: editHomeTeam || editingMatch.homeTeam,
        awayTeam: editAwayTeam || editingMatch.awayTeam,
        homeScore: validatedHScore,
        awayScore: validatedAScore,
        playerOfMatch: editMatchStatus === 'Played' ? (editPlayerOfMatch || editingMatch.playerOfMatch) : undefined,
        potdWinner: editMatchStatus === 'Played' ? (editPlayerOfMatch || editingMatch.potdWinner || editingMatch.playerOfMatch) : undefined,
        status: editMatchStatus,
        date: `${editMatchDate} • ${editMatchTime}`,
        format: editMatchFormat,
        type: editMatchType,
        goals: editingMatch.goals || [],
        homeSquad: editingMatch.homeSquad || [],
        awaySquad: editingMatch.awaySquad || [],
        homeRoster: editingMatch.homeRoster || editingMatch.homeSquad || [],
        awayRoster: editingMatch.awayRoster || editingMatch.awaySquad || []
      };

      // 1. Instantly update window.appState
      const currentAppState = (window as any).appState || {};
      const nextMatches = (currentAppState.matches || matches).map((m: any) => m.id === updated.id ? updated : m);
      const nextState = {
        ...currentAppState,
        matches: nextMatches
      };
      (window as any).appState = nextState;
      (window as any).AppDatabase = nextState;

      // 2. Instantly update localStorage
      localStorage.setItem('gameon_matches', JSON.stringify(nextMatches));

      // 3. Trigger debounced Firestore save asynchronously in the background
      debouncedAutoSave(updated);
    }
  }, [
    editingMatch,
    editHomeTeam,
    editAwayTeam,
    editHomeScore,
    editAwayScore,
    editPlayerOfMatch,
    editMatchStatus,
    editMatchDate,
    editMatchTime,
    editMatchFormat,
    editMatchType,
    debouncedAutoSave
  ]);

  // Attach debouncedAutoSave() to input and change events across all form fields dynamically as requested
  useEffect(() => {
    const handleFormEvent = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) {
        // Skip search fields, filters, and dynamic popups that don't belong to persistent match metadata
        const isSearchField = (target as any).placeholder?.toLowerCase().includes('search') || 
                              target.getAttribute('type') === 'search' ||
                              target.classList.contains('search-input') ||
                              target.id === 'potd-select' ||
                              target.id === 'checked-in-search';
        if (isSearchField) {
          return;
        }

        // Only handle form events that originate from the specific match settings card or edit match form
        const isMatchEditorField = target.closest('#match-settings-card') || target.closest('#edit-match-form');
        if (!isMatchEditorField) {
          return;
        }

        console.log(`[debouncedAutoSave] Detected ${e.type} event on form field:`, target.id || (target as any).name);
        
        if (activeSelectedMatchId) {
          const activeMatch = matches.find(m => m.id === activeSelectedMatchId);
          if (activeMatch) {
            const hScore = detailStatus !== 'Scheduled' ? parseInt(detailHomeScore) : undefined;
            const aScore = detailStatus !== 'Scheduled' ? parseInt(detailAwayScore) : undefined;
            const updated: LeagueMatch = {
              ...activeMatch,
              homeTeam: detailHomeTeam || activeMatch.homeTeam,
              awayTeam: detailAwayTeam || activeMatch.awayTeam,
              date: detailTime ? `${detailDate} • ${detailTime}` : (detailDate || activeMatch.date),
              format: detailFormat || activeMatch.format || '7v7',
              matchNumber: detailMatchNum || activeMatch.matchNumber,
              type: detailType || activeMatch.type || 'League Match',
              status: detailStatus || activeMatch.status || 'Scheduled',
              homeScore: isNaN(hScore as any) ? undefined : hScore,
              awayScore: isNaN(aScore as any) ? undefined : aScore,
              playerOfMatch: detailStatus === 'Played' ? (detailPlayerOfMatch || activeMatch.playerOfMatch) : undefined,
              potdWinner: detailStatus === 'Played' ? (detailPlayerOfMatch || activeMatch.potdWinner || activeMatch.playerOfMatch) : undefined,
              goals: activeMatch.goals || [],
              homeSquad: activeMatch.homeSquad || [],
              awaySquad: activeMatch.awaySquad || [],
              homeRoster: activeMatch.homeRoster || activeMatch.homeSquad || [],
              awayRoster: activeMatch.awayRoster || activeMatch.awaySquad || []
            };
            debouncedAutoSave(updated);
          }
        } else if (editingMatch) {
          const hScore = parseInt(editHomeScore);
          const aScore = parseInt(editAwayScore);
          const validatedHScore = editMatchStatus !== 'Scheduled' ? (isNaN(hScore) ? 0 : hScore) : undefined;
          const validatedAScore = editMatchStatus !== 'Scheduled' ? (isNaN(aScore) ? 0 : aScore) : undefined;
          const updated: LeagueMatch = {
            ...editingMatch,
            homeTeam: editHomeTeam || editingMatch.homeTeam,
            awayTeam: editAwayTeam || editingMatch.awayTeam,
            homeScore: validatedHScore,
            awayScore: validatedAScore,
            playerOfMatch: editMatchStatus === 'Played' ? (editPlayerOfMatch || editingMatch.playerOfMatch) : undefined,
            potdWinner: editMatchStatus === 'Played' ? (editPlayerOfMatch || editingMatch.potdWinner || editingMatch.playerOfMatch) : undefined,
            status: editMatchStatus,
            date: `${editMatchDate} • ${editMatchTime}`,
            format: editMatchFormat,
            type: editMatchType,
            goals: editingMatch.goals || [],
            homeSquad: editingMatch.homeSquad || [],
            awaySquad: editingMatch.awaySquad || [],
            homeRoster: editingMatch.homeRoster || editingMatch.homeSquad || [],
            awayRoster: editingMatch.awayRoster || editingMatch.awaySquad || []
          };
          debouncedAutoSave(updated);
        }
      }
    };

    document.addEventListener('input', handleFormEvent);
    document.addEventListener('change', handleFormEvent);

    return () => {
      document.removeEventListener('input', handleFormEvent);
      document.removeEventListener('change', handleFormEvent);
    };
  }, [
    activeSelectedMatchId,
    detailHomeTeam,
    detailAwayTeam,
    detailDate,
    detailTime,
    detailFormat,
    detailMatchNum,
    detailType,
    detailStatus,
    detailHomeScore,
    detailAwayScore,
    detailPlayerOfMatch,
    editingMatch,
    editHomeTeam,
    editAwayTeam,
    editHomeScore,
    editAwayScore,
    editPlayerOfMatch,
    editMatchStatus,
    editMatchDate,
    editMatchTime,
    editMatchFormat,
    editMatchType,
    debouncedAutoSave,
    matches
  ]);

  const handleMatchesGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    
    // Check if a button action was clicked
    const actionBtn = target.closest('[data-action]');
    if (actionBtn) {
      e.stopPropagation();
      e.preventDefault();
      const action = actionBtn.getAttribute('data-action');
      const matchId = actionBtn.getAttribute('data-match-id');
      const matchJson = actionBtn.getAttribute('data-match-json');
      if (!matchId) return;

      if (action === 'edit' && matchJson) {
        try {
          const m = JSON.parse(matchJson);
          handleOpenEditMatch(m);
        } catch (err) {
          console.error("Failed parsing match json for edit", err);
        }
      } else if (action === 'delete') {
        handleDeleteMatchClick(matchId);
      } else if (action === 'attendance' && matchJson) {
        try {
          const m = JSON.parse(matchJson);
          onNavigateToSession?.(m);
        } catch (err) {
          console.error("Failed parsing match json for attendance", err);
        }
      }
      return;
    }

    // Check if a match card itself was clicked
    const card = target.closest('[data-match-card-id]');
    if (card) {
      const matchId = card.getAttribute('data-match-card-id');
      if (matchId && activeSetSelectedMatchId) {
        activeSetSelectedMatchId(matchId);
      }
    }
  };

  const handleSaveDetailChanges = () => {
    const activeMatch = matches.find(m => m.id === activeSelectedMatchId);
    if (!activeMatch) return;
    
    if (!detailHomeTeam || !detailAwayTeam) {
      alert('Please select both home and away teams.');
      return;
    }
    if (detailHomeTeam === detailAwayTeam) {
      alert('Home and away teams cannot be the same.');
      return;
    }

    const hScore = detailStatus !== 'Scheduled' ? parseInt(detailHomeScore) || 0 : undefined;
    const aScore = detailStatus !== 'Scheduled' ? parseInt(detailAwayScore) || 0 : undefined;
    
    const updated: LeagueMatch = {
      ...activeMatch,
      homeTeam: detailHomeTeam,
      awayTeam: detailAwayTeam,
      date: detailTime ? `${detailDate} • ${detailTime}` : detailDate,
      format: detailFormat,
      matchNumber: detailMatchNum,
      type: detailType,
      status: detailStatus,
      homeScore: hScore,
      awayScore: aScore,
      playerOfMatch: detailStatus === 'Played' ? detailPlayerOfMatch : undefined
    };

    if (onUpdateMatch) {
      onUpdateMatch(updated);
    }
    
    alert('Match details and standings updated successfully!');
  };

  // Sync / Reset selected league if it gets deleted
  useEffect(() => {
    if (currentSelectedLeagueId && !leagues.some(l => l.id === currentSelectedLeagueId)) {
      currentSetSelectedLeagueId(null);
    }
  }, [leagues, currentSelectedLeagueId]);

  const getLeagueStatus = (league: League) => {
    if (league.status === 'Completed') return 'Completed';
    if (league.id === 'l-3') return 'Upcoming'; // match screenshot exactly
    const leagueMatches = matches.filter(m => m.leagueId === league.id);
    if (leagueMatches.length === 0 || leagueMatches.every(m => m.status === 'Scheduled')) {
      return 'Upcoming';
    }
    return 'In Progress';
  };

  const getLeagueDateRange = (league: League) => {
    if (league.id === 'l-3') return 'Mar 14 – Dec 26, 2026';
    if (league.id === 'l-1') return 'Jun 03 – Jul 16, 2026';
    if (league.id === 'l-2') return 'Jun 05 – Jul 10, 2026';
    return 'Jun 01 – Aug 30, 2026';
  };

  const getLeagueFormat = (league: League) => {
    if (league.id === 'l-3') return '7v7';
    if (!league.sport) return '7v7';
    const sportLower = league.sport.toLowerCase();
    if (sportLower.includes('5-a-side') || sportLower === '5v5') return '5v5';
    if (sportLower.includes('6v6') || sportLower === '6v6') return '6v6';
    if (sportLower.includes('7-a-side') || sportLower === '7v7') return '7v7';
    if (sportLower.includes('8v8') || sportLower === '8v8') return '8v8';
    if (sportLower.includes('9v9') || sportLower === '9v9') return '9v9';
    if (sportLower.includes('10v10') || sportLower === '10v10') return '10v10';
    if (sportLower.includes('11-a-side') || sportLower === '11v11') return '11v11';
    return league.sport; // default return the format string directly
  };

  const allCount = leagues.length;
  const upcomingCount = leagues.filter(l => getLeagueStatus(l) === 'Upcoming').length;
  const inProgressCount = leagues.filter(l => getLeagueStatus(l) === 'In Progress').length;
  const completedCount = leagues.filter(l => getLeagueStatus(l) === 'Completed').length;

  const filteredLeagues = leagues.filter(l => {
    if (statusFilter === 'All') return true;
    return getLeagueStatus(l) === statusFilter;
  });

  // Sorting standings by points DESC, GD DESC, GF DESC
  // already declared above: sortedStandings

  const mappedBackendStandings = useMemo(() => {
    if (!backendStandings) return [];
    return backendStandings.map((item, idx) => {
      const pName = item.canonical_name || "Unknown Player";
      const dbPlayerInfo = players?.find(p => p.name.toLowerCase() === pName.toLowerCase());
      
      return {
        player: {
          id: item.player_id || `backend-p-${idx}`,
          name: pName,
          position: dbPlayerInfo?.position || 'Player'
        },
        played: item.played || 0,
        won: item.wins || 0,
        drawn: item.draws || 0,
        lost: item.losses || 0,
        points: item.points || 0,
        ppg: parseFloat(item.ppg) || 0,
        goals: item.total_goals || 0,
        potd: item.total_mvps || 0,
        adjustment: { played: 0, won: 0, drawn: 0, lost: 0, points: 0 },
        calculated: {
          played: item.played || 0,
          won: item.wins || 0,
          drawn: item.draws || 0,
          lost: item.losses || 0,
          points: item.points || 0
        }
      };
    });
  }, [backendStandings, players]);

  // Calculate Player Standings for Player League Table using dynamic aggregation engine
  const playerStandings = useMemo(() => {
    if (matches && matches.length > 0) {
      if (currentSelectedLeagueId) {
        return generatePlayerStandingsFromMatches(matches, players, currentSelectedLeagueId, sessions, attendance);
      }
    }
    if (backendStandings !== null && backendStandings.length > 0) {
      return mappedBackendStandings;
    }
    if (!currentSelectedLeagueId) return [];
    return generatePlayerStandingsFromMatches(matches, players, currentSelectedLeagueId, sessions, attendance);
  }, [backendStandings, mappedBackendStandings, currentSelectedLeagueId, players, matches, sessions, attendance]);

  const localMatchesExist = useMemo(() => {
    if (matches && matches.length > 0) return true;
    try {
      const lsMatches = JSON.parse(localStorage.getItem('gameon_matches') || '[]');
      return Array.isArray(lsMatches) && lsMatches.length > 0;
    } catch {
      return false;
    }
  }, [matches]);

  const sortedPlayerStandings = useMemo(() => {
    return [...playerStandings]
      .filter(item => {
        // Enforce visibility filter (hiding inactive players with 0 played matches and 0 points)
        if (item.played <= 0 && item.points <= 0) return false;
        if (!playerTableSearchQuery) return true;
        return item.player.name.toLowerCase().includes(playerTableSearchQuery.toLowerCase());
      })
      .sort((a, b) => {
        // Handle sorting depending on active playerSortField selection
        if (playerSortField === 'G') {
          if (b.goals !== a.goals) return b.goals - a.goals;
        } else if (playerSortField === 'POTD') {
          if (b.potd !== a.potd) return b.potd - a.potd;
        } else if (playerSortField === 'PPG') {
          if (b.ppg !== a.ppg) return b.ppg - a.ppg;
        }

        // Primary: Points DESC
        if (b.points !== a.points) return b.points - a.points;
        // Secondary: PPG DESC
        if (b.ppg !== a.ppg) return b.ppg - a.ppg;
        // Tertiary: Goals / Goal Difference proxy DESC
        if (b.goals !== a.goals) return b.goals - a.goals;
        // Quaternary: Played DESC
        if (b.played !== a.played) return b.played - a.played;
        // Quintenary: Won DESC
        if (b.won !== a.won) return b.won - a.won;

        // Alphabetical Name ASC
        return a.player.name.localeCompare(b.player.name);
      });
  }, [playerStandings, playerTableSearchQuery, playerSortField]);

  // Expose automated state inspection window.auditPlayerState()
  useEffect(() => {
    (window as any).auditPlayerState = () => {
      const logs: string[] = [];
      const log = (msg: string) => {
        logs.push(msg);
        console.log(`[STATE AUDIT] ${msg}`);
      };

      log(`=== AUTOMATED STATE INSPECTION (window.auditPlayerState) ===`);
      log(`Run Date: ${new Date().toLocaleString()}`);
      log(`Selected League ID: ${currentSelectedLeagueId || 'None'}`);

      const isCaptains = isCaptainsLeagueId(currentSelectedLeagueId);
      const startBound = '2026-02-14';
      const playerTableEndDate = '2026-12-31';

      // 1. Filter matches in active league that fall inside our date boundaries
      const activeMatches = matches.filter(match => {
        if (!match) return false;
        const isoDate = normalizeDateToISO(match.date || '');

        if (isoDate < startBound || isoDate > playerTableEndDate) return false;

        const matchesBelong = isCaptains
          ? isCaptainsLeagueId(match.leagueId)
          : (match.leagueId === currentSelectedLeagueId || match.type === 'Friendly Match' || !match.leagueId);
        return matchesBelong;
      });

      log(`Total active matches in date range (${startBound} to ${playerTableEndDate}) for this league: ${activeMatches.length}`);

      // 2. Map players grouped by normalized name (Jerry deduplication)
      const playerMap = new Map<string, Player>();
      let canonicalJerry = players.find(p => p && p.name && p.name.toLowerCase() === 'jerry') || null;
      if (!canonicalJerry) {
        canonicalJerry = players.find(p => p && p.name && p.name.toLowerCase().includes('jerry')) || null;
      }
      const cleanJerry: Player = canonicalJerry ? { ...canonicalJerry, name: 'Jerry' } : {
        id: 'p-jerry',
        name: 'Jerry',
        position: 'Player',
        status: 'Active',
        joinDate: '2026-02-14'
      };

      playerMap.set('jerry', cleanJerry);
      playerMap.set(cleanJerry.id.toLowerCase(), cleanJerry);

      players.forEach(p => {
        if (!p) return;
        const normName = normalizePlayerName(p.name || "Unknown Player");
        const key = normName.toLowerCase();
        if (key.includes('jerry') || p.id.toLowerCase().includes('jerry')) {
          playerMap.set(p.id.toLowerCase(), cleanJerry);
          playerMap.set(key, cleanJerry);
        } else {
          const cleanPlayer = { ...p, name: normName };
          playerMap.set(p.id.toLowerCase(), cleanPlayer);
          playerMap.set(key, cleanPlayer);
        }
      });

      const findPlayer = (identifier: string): Player | null => {
        if (!identifier) return null;
        const cleanId = String(identifier).trim().toLowerCase();
        if (cleanId.includes('jerry')) return cleanJerry;
        if (playerMap.has(cleanId)) return playerMap.get(cleanId)!;
        const norm = normalizePlayerName(identifier).toLowerCase();
        if (norm.includes('jerry')) return cleanJerry;
        if (playerMap.has(norm)) return playerMap.get(norm)!;
        for (const p of playerMap.values()) {
          if (p.id.toLowerCase() === cleanId) return p;
          if (normalizePlayerName(p.name).toLowerCase() === norm) return p;
        }
        return null;
      };

      // Ensure any discovered players in activeMatches are pre-registered
      activeMatches.forEach(match => {
        if (match.goals) {
          match.goals.forEach(g => {
            if (g && g.playerId && !findPlayer(g.playerId)) {
              const name = normalizePlayerName(g.playerName || g.playerId);
              const np: Player = { id: g.playerId, name, position: 'Player', status: 'Active', joinDate: '2026-02-14' };
              playerMap.set(g.playerId.toLowerCase(), np);
              playerMap.set(name.toLowerCase(), np);
            }
          });
        }
        const rosters = [...(match.homeSquad || []), ...(match.awaySquad || [])];
        rosters.forEach(pId => {
          if (pId && !findPlayer(pId)) {
            const np: Player = { id: pId, name: normalizePlayerName(pId), position: 'Player', status: 'Active', joinDate: '2026-02-14' };
            playerMap.set(pId.toLowerCase(), np);
          }
        });
      });

      // 3. For each player in playerStandings, do the detailed state check
      let discrepancies = 0;
      log(`Auditing stats for ${playerStandings.length} tracked players in standings...`);

      playerStandings.forEach(item => {
        const pId = item.player.id;
        const name = item.player.name;

        // Perform raw aggregation directly from activeMatches for this player
        let rawPlayed = 0;
        let rawWon = 0;
        let rawDrawn = 0;
        let rawLost = 0;
        let rawPoints = 0;
        let rawGoals = 0;

        activeMatches.forEach(match => {
          // Check goals
          const goalsList = match.goals || [];
          goalsList.forEach(g => {
            if (g) {
              const gp = findPlayer(g.playerId) || findPlayer(g.playerName);
              if (gp && gp.id === pId) {
                rawGoals += 1;
              }
            }
          });

          // Check squads
          const homeSquad = match.homeSquad || [];
          const awaySquad = match.awaySquad || [];
          const isHome = homeSquad.some(id => {
            const gp = findPlayer(id);
            return gp && gp.id === pId;
          });
          const isAway = awaySquad.some(id => {
            const gp = findPlayer(id);
            return gp && gp.id === pId;
          });

          if (isHome || isAway) {
            const hScore = match.homeScore !== undefined && match.homeScore !== null ? (parseInt(match.homeScore as any, 10) || 0) : 0;
            const aScore = match.awayScore !== undefined && match.awayScore !== null ? (parseInt(match.awayScore as any, 10) || 0) : 0;

            let homeResult: 'w' | 'd' | 'l' = 'd';
            let awayResult: 'w' | 'd' | 'l' = 'd';
            if (hScore > aScore) {
              homeResult = 'w';
              awayResult = 'l';
            } else if (hScore < aScore) {
              homeResult = 'l';
              awayResult = 'w';
            }

            rawPlayed += 1;
            if (isHome) {
              if (homeResult === 'w') {
                rawWon += 1;
                rawPoints += 3;
              } else if (homeResult === 'd') {
                rawDrawn += 1;
                rawPoints += 1;
              } else {
                rawLost += 1;
              }
            } else {
              if (awayResult === 'w') {
                rawWon += 1;
                rawPoints += 3;
              } else if (awayResult === 'd') {
                rawDrawn += 1;
                rawPoints += 1;
              } else {
                rawLost += 1;
              }
            }
          }
        });

        // Computed stats in standings (before display filter)
        const computedPlayed = Number(item.played) || 0;
        const computedWon = Number(item.won) || 0;
        const computedDrawn = Number(item.drawn) || 0;
        const computedLost = Number(item.lost) || 0;
        const computedPoints = Number(item.points) || 0;
        const computedGoals = Number(item.goals) || 0;

        const calcPlayed = Number(item.calculated.played) || 0;
        const calcWon = Number(item.calculated.won) || 0;
        const calcDrawn = Number(item.calculated.drawn) || 0;
        const calcLost = Number(item.calculated.lost) || 0;
        const calcPoints = Number(item.calculated.points) || 0;
        const calcGoals = Number(item.calculated.goals) || 0;

        const rPlayed = Number(rawPlayed) || 0;
        const rWon = Number(rawWon) || 0;
        const rDrawn = Number(rawDrawn) || 0;
        const rLost = Number(rawLost) || 0;
        const rPoints = Number(rawPoints) || 0;
        const rGoals = Number(rawGoals) || 0;

        // Perform cross-verification checks
        const pointsExpected = (computedWon * 3) + (computedDrawn * 1);
        const playExpected = computedWon + computedDrawn + computedLost;

        const hasPointsMismatch = Number(computedPoints) !== Number(pointsExpected);
        const hasPlayedMismatch = Number(computedPlayed) !== Number(playExpected);
        const hasCalculationMismatch = 
          Number(calcPlayed) !== Number(rPlayed) ||
          Number(calcWon) !== Number(rWon) ||
          Number(calcDrawn) !== Number(rDrawn) ||
          Number(calcLost) !== Number(rLost) ||
          Number(calcPoints) !== Number(rPoints) ||
          Number(calcGoals) !== Number(rGoals);

        // ZERO-STAT IGNORE RULE
        const isZeroStat = 
          computedPlayed === 0 && computedWon === 0 && computedDrawn === 0 && computedLost === 0 && computedGoals === 0 &&
          rPlayed === 0 && rWon === 0 && rDrawn === 0 && rLost === 0 && rGoals === 0;

        if (isZeroStat) {
          log(`ℹ️ Inactive Record Verified ${name}: Clean zero stats.`);
        } else if (hasPointsMismatch || hasPlayedMismatch || hasCalculationMismatch) {
          discrepancies += 1;
          log(`⚠️ DISCREPANCY WARNING: Player '${name}' (ID: ${pId}) has state anomalies!`);
          if (hasPointsMismatch) {
            log(`   - Points math error: Standing points = ${computedPoints} vs Expected (W*3+D) = ${pointsExpected}`);
          }
          if (hasPlayedMismatch) {
            log(`   - Played math error: Standing played = ${computedPlayed} vs Expected (W+D+L) = ${playExpected}`);
          }
          if (hasCalculationMismatch) {
            log(`   - Raw stats mismatch:`);
            log(`     * Played: Standing calculated = ${calcPlayed} vs Direct Raw count = ${rPlayed}`);
            log(`     * Won: Standing calculated = ${calcWon} vs Direct Raw count = ${rWon}`);
            log(`     * Drawn: Standing calculated = ${calcDrawn} vs Direct Raw count = ${rDrawn}`);
            log(`     * Lost: Standing calculated = ${calcLost} vs Direct Raw count = ${rLost}`);
            log(`     * Goals: Standing goals = ${computedGoals} vs Direct Raw count = ${rGoals}`);
          }
        } else {
          log(`✅ Verified ${name}: Played=${computedPlayed}, Won=${computedWon}, Drawn=${computedDrawn}, Lost=${computedLost}, Points=${computedPoints}, Goals=${computedGoals}`);
        }
      });

      if (discrepancies === 0) {
        log(`✅ AUDIT PASSED: All player standings match raw localStorage match records perfectly.`);
      } else {
        log(`❌ AUDIT FAILED: Detected ${discrepancies} players with data state anomalies.`);
      }
      log(`=== END OF AUDIT ===`);

      setDebuggerLogs(logs);
      return { success: discrepancies === 0, logs };
    };

    (window as any).verifyMatchToTableSync = (leagueId?: string) => {
      return verifyMatchToTableSync(matches, players, leagueId || currentSelectedLeagueId);
    };

    (window as any).auditPlayerParticipationDates = () => {
      const rawMatches = JSON.parse(localStorage.getItem('gameon_matches') || '[]');
      const rawPlayers = JSON.parse(localStorage.getItem('gameon_players') || '[]');
      const playerMap = new Map<string, string>();
      rawPlayers.forEach((p: any) => {
        if (p && p.id && p.name) {
          playerMap.set(p.id, p.name);
        }
      });

      const playerDateMap: Record<string, { pld: number; dates: string[] }> = {};

      // Filter matches starting from the Player League start date
      const activeMatches = rawMatches.filter((m: any) => {
        if (!m || !m.date) return false;
        const parsedDate = parseTolerantDate(m.date);
        return parsedDate && parsedDate.getTime() >= new Date(2026, 1, 28).getTime();
      });

      activeMatches.forEach((match: any) => {
        // Combine roster lists from home and away teams
        const homeRoster = match.homeRoster || match.homePlayers || match.homeSquad || [];
        const awayRoster = match.awayRoster || match.awayPlayers || match.awaySquad || [];
        const allParticipants = [...homeRoster, ...awayRoster];

        allParticipants.forEach((player: any) => {
          let pName = typeof player === 'string' ? player : (player.name || player.canonicalName || player.id || '');
          if (pName && playerMap.has(pName)) {
            pName = playerMap.get(pName)!;
          }
          if (!pName) return;

          if (!playerDateMap[pName]) {
            playerDateMap[pName] = {
              pld: 0,
              dates: []
            };
          }

          playerDateMap[pName].pld += 1;
          if (match.date && !playerDateMap[pName].dates.includes(match.date)) {
            playerDateMap[pName].dates.push(match.date);
          }
        });
      });

      console.log("=== 🗓️ PLAYER PARTICIPATION DATE AUDIT ===");
      console.table(
        Object.keys(playerDateMap).map(pName => ({
          "Player Name": pName,
          "Total Games (PLD)": playerDateMap[pName].pld,
          "Match Dates Participated": playerDateMap[pName].dates.sort().join(", ")
        }))
      );
    };

    return () => {
      delete (window as any).auditPlayerState;
      delete (window as any).verifyMatchToTableSync;
      delete (window as any).auditPlayerParticipationDates;
    };
  }, [playerStandings, matches, players, playerAdjustments, currentSelectedLeagueId]);



  // Clean, isolated repaint flash indicator for player table
  const prevStandingsJSON = useRef('');
  useEffect(() => {
    const currentJSON = JSON.stringify(sortedPlayerStandings.map(s => ({ id: s.player.id, g: s.goals })));
    if (prevStandingsJSON.current && prevStandingsJSON.current !== currentJSON) {
      const card = document.getElementById('player-standings-card');
      if (card) {
        card.classList.add('ring-4', 'ring-emerald-500/30', 'transition-all', 'duration-500');
        setTimeout(() => {
          card.classList.remove('ring-4', 'ring-emerald-500/30');
        }, 1000);
      }
    }
    prevStandingsJSON.current = currentJSON;
  }, [sortedPlayerStandings]);

  // Clean, isolated repaint flash indicator for active match detail card (scoreboard)
  const prevMatchGoalsJSON = useRef('');
  useEffect(() => {
    const activeMatch = matches.find(m => m.id === activeSelectedMatchId);
    if (activeMatch) {
      const currentJSON = JSON.stringify({ h: activeMatch.homeScore, a: activeMatch.awayScore, g: activeMatch.goals });
      if (prevMatchGoalsJSON.current && prevMatchGoalsJSON.current !== currentJSON) {
        const scoreboardElement = document.getElementById('active-match-scoreboard');
        if (scoreboardElement) {
          scoreboardElement.classList.add('scale-[1.01]', 'ring-4', 'ring-emerald-550/30', 'transition-all', 'duration-300');
          setTimeout(() => {
            scoreboardElement.classList.remove('scale-[1.01]', 'ring-4', 'ring-emerald-550/30');
          }, 500);
        }
      }
      prevMatchGoalsJSON.current = currentJSON;
    }
  }, [matches, activeSelectedMatchId]);

  const handleCreateLeague = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeagueName || !newSeason) {
      alert('Please fill out league name and season');
      return;
    }

    const initialTeams = teamNamesInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    if (initialTeams.length < 2) {
      alert('Please enter at least 2 team names for the league standing board');
      return;
    }

    onAddLeague({
      name: newLeagueName,
      season: newSeason,
      sport: newSport,
      status: 'Active',
      format: newLeagueFormat,
      startDate: newLeagueStartDate,
      endDate: newLeagueEndDate
    }, initialTeams);

    // Reset Form
    setNewLeagueName('');
    setNewSeason('');
    setNewSport('7V7');
    setNewLeagueFormat('once');
    setTeamNamesInput('Football United FC, Apex Athletics, Vanguard United, Titan Knights, Rovers FC');
    setShowAddLeague(false);
  };

  const handleDeleteClick = (e: React.MouseEvent, leagueId: string, name: string) => {
    e.stopPropagation(); // prevent opening details
    setLeagueToDelete({ id: leagueId, name });
  };

  const handleRecordResultClick = (match: LeagueMatch) => {
    setActiveMatchRecordId(match.id);
    setHomeScoreInput('');
    setAwayScoreInput('');
  };

  const handleSaveResult = (matchId: string) => {
    const hScore = parseInt(homeScoreInput);
    const aScore = parseInt(awayScoreInput);

    if (isNaN(hScore) || isNaN(aScore) || hScore < 0 || aScore < 0) {
      alert('Please enter valid, non-negative scores');
      return;
    }

    onRecordMatchResult(matchId, hScore, aScore);
    setActiveMatchRecordId(null);
  };

  const getExistingMatchesCount = (teamA: string, teamB: string) => {
    if (!teamA || !teamB || !currentSelectedLeagueId) return 0;
    return activeMatches.filter(m => 
      (m.homeTeam === teamA && m.awayTeam === teamB) || 
      (m.homeTeam === teamB && m.awayTeam === teamA)
    ).length;
  };

  const getFormatLimit = () => {
    if (!activeLeague) return Infinity;
    const fmt = activeLeague.format || 'once';
    if (fmt === 'once') return 1;
    if (fmt === 'twice') return 2;
    return Infinity;
  };

  const isMatchLimitReached = (teamA: string, teamB: string) => {
    if (!teamA || !teamB) return false;
    const limit = getFormatLimit();
    if (limit === Infinity) return false;
    
    // In double round robin, if it is strictly home/away directed limit, we check:
    // Have they already played/scheduled with teamA as home and teamB as away?
    const fmt = activeLeague?.format || 'once';
    if (fmt === 'twice') {
      const matchExists = activeMatches.some(m => m.homeTeam === teamA && m.awayTeam === teamB);
      return matchExists;
    }
    
    // Otherwise check undirected limit
    return getExistingMatchesCount(teamA, teamB) >= limit;
  };

  const getTeamForm = (teamName: string) => {
    const playedMatches = activeMatches
      .filter(m => m.status === 'Played' && (m.homeTeam === teamName || m.awayTeam === teamName))
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);

    return playedMatches.map(m => {
      const isHome = m.homeTeam === teamName;
      const hScore = m.homeScore ?? 0;
      const aScore = m.awayScore ?? 0;

      if (hScore === aScore) return 'D';
      if (isHome) {
        return hScore > aScore ? 'W' : 'L';
      } else {
        return aScore > hScore ? 'W' : 'L';
      }
    }).reverse();
  };

  const handleOpenCreateMatch = () => {
    const teams = sortedStandings.map(t => t.name);
    if (teams.length >= 2) {
      setNewMatchHome(teams[0]);
      setNewMatchAway(teams[1]);
    } else {
      setNewMatchHome('');
      setNewMatchAway('');
    }
    const maxNum = activeMatches.reduce((max, m) => {
      if (m.type === 'League Match' && m.matchNumber && m.matchNumber > max) {
        return m.matchNumber;
      }
      return max;
    }, 0);
    setNewMatchNumber(String(maxNum + 1));
    setNewMatchType('League Match');
    setNewMatchDate('2026-07-09');
    setNewMatchTime('10:30');
    setNewMatchFormat(activeLeague ? getLeagueFormat(activeLeague) : '7v7');
    setShowCreateMatchModal(true);

    // Reset helper interactive states to prevent leakages
    setActiveGoalSelector(null);
    setPlayerSearchQuery('');
    setCheckedInSearchQuery('');
    setScorerSearchQuery('');
    setShowStatusDropdown(false);
    setShowPOMDropdown(false);
    setIsSettingsExpanded(false);
    setShowForfeitPanel(false);
    setForfeitConfirmTeam(null);
  };

  const handleCreateMatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatchHome || !newMatchAway) {
      alert('Please select both home and away teams.');
      return;
    }
    if (newMatchHome === newMatchAway) {
      alert('Home and away teams cannot be the same.');
      return;
    }

    if (newMatchType !== 'Friendly Match' && isMatchLimitReached(newMatchHome, newMatchAway)) {
      alert(`Fixture Limit Reached! Under the ${activeLeague?.format === 'twice' ? 'Double Round-Robin' : 'Single Round-Robin'} format, these teams cannot schedule any more matches together.`);
      return;
    }

    const matchNo = parseInt(newMatchNumber) || undefined;
    const dateFormatted = `${newMatchDate} • ${newMatchTime}`;

    const newMatch: LeagueMatch = {
      id: `m-custom-${Date.now()}`,
      leagueId: currentSelectedLeagueId!,
      homeTeam: newMatchHome,
      awayTeam: newMatchAway,
      date: dateFormatted,
      status: 'Scheduled',
      type: newMatchType,
      matchNumber: matchNo,
      format: newMatchFormat,
    };

    try {
      await setDoc(doc(db, 'go_matches_prod', newMatch.id), {
        id: newMatch.id,
        league_id: newMatch.leagueId,
        match_date: normalizeDateToISO(newMatch.date),
        home_team_name: newMatch.homeTeam,
        away_team_name: newMatch.awayTeam,
        home_score: null,
        away_score: null,
        is_completed: false,
        created_at: new Date().toISOString(),
        goals: [],
        homeSquad: [],
        awaySquad: [],
        playerOfMatch: ''
      });

      if (onAddMatch) {
        onAddMatch(newMatch);
      }
      setShowCreateMatchModal(false);
    } catch (err: any) {
      console.error("Error creating match in Firestore:", err);
      alert(`Failed to save match to Firebase: ${err.message}`);
    }
  };

  const handleOpenEditMatch = (match: LeagueMatch) => {
    setEditingMatch(match);
    setEditHomeTeam(match.homeTeam);
    setEditAwayTeam(match.awayTeam);
    setEditHomeScore(String(match.homeScore ?? 0));
    setEditAwayScore(String(match.awayScore ?? 0));
    setEditPlayerOfMatch(match.potdWinner || match.playerOfMatch || '');
    setEditMatchStatus(match.status);
    setEditMatchFormat(match.format || (activeLeague ? getLeagueFormat(activeLeague) : '7v7'));
    setEditMatchType(match.type || 'League Match');
    
    const dateParts = match.date.split(' • ');
    if (dateParts.length === 2) {
      setEditMatchDate(dateParts[0]);
      setEditMatchTime(dateParts[1]);
    } else {
      setEditMatchDate('2026-07-09');
      setEditMatchTime('10:30');
    }

    // Reset helper interactive states to prevent leakages
    setActiveGoalSelector(null);
    setPlayerSearchQuery('');
    setCheckedInSearchQuery('');
    setScorerSearchQuery('');
    setShowStatusDropdown(false);
    setShowPOMDropdown(false);
    setIsSettingsExpanded(false);
    setShowForfeitPanel(false);
    setForfeitConfirmTeam(null);
  };

  const handleEditMatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatch) return;

    const hScore = parseInt(editHomeScore);
    const aScore = parseInt(editAwayScore);

    const validatedHScore = editMatchStatus !== 'Scheduled' ? (isNaN(hScore) ? 0 : hScore) : 0;
    const validatedAScore = editMatchStatus !== 'Scheduled' ? (isNaN(aScore) ? 0 : aScore) : 0;

    // Enforce goal validation: Check that team score equals the sum of individual player goals before allowing the Firestore write.
    if (editMatchStatus !== 'Scheduled') {
      const goalsList = editingMatch.goals || [];
      const isFriendly = editMatchType === 'Friendly Match';

      if (isFriendly) {
        const totalGoals = goalsList.length;
        const totalScore = validatedHScore + validatedAScore;
        if (totalScore !== totalGoals) {
          alert(`Goal validation failed! The combined team score (${totalScore}) does not equal the sum of individual player goals (${totalGoals}). Please adjust individual goals in the match details card first.`);
          return;
        }
      } else {
        const homeGoalsCount = goalsList.filter(g => g.team === 'home').length;
        const awayGoalsCount = goalsList.filter(g => g.team === 'away').length;

        if (validatedHScore !== homeGoalsCount) {
          alert(`Goal validation failed! The Home Team score (${validatedHScore}) does not equal the sum of home player goals (${homeGoalsCount}). Please adjust individual goals in the match details card first.`);
          return;
        }
        if (validatedAScore !== awayGoalsCount) {
          alert(`Goal validation failed! The Away Team score (${validatedAScore}) does not equal the sum of away player goals (${awayGoalsCount}). Please adjust individual goals in the match details card first.`);
          return;
        }
      }
    }

    const updated: LeagueMatch = {
      ...editingMatch,
      homeTeam: editHomeTeam || editingMatch.homeTeam,
      awayTeam: editAwayTeam || editingMatch.awayTeam,
      homeScore: editMatchStatus !== 'Scheduled' ? (isNaN(hScore) ? 0 : hScore) : undefined,
      awayScore: editMatchStatus !== 'Scheduled' ? (isNaN(aScore) ? 0 : aScore) : undefined,
      playerOfMatch: editPlayerOfMatch || editingMatch.playerOfMatch || undefined,
      status: editMatchStatus,
      date: `${editMatchDate} • ${editMatchTime}`,
      format: editMatchFormat,
      type: editMatchType,
      homeSquad: editingMatch.homeSquad || [],
      awaySquad: editingMatch.awaySquad || [],
      homeRoster: editingMatch.homeRoster || [],
      awayRoster: editingMatch.awayRoster || []
    };

    try {
      await setDoc(doc(db, 'go_matches_prod', updated.id), {
        id: updated.id,
        league_id: updated.leagueId || currentSelectedLeagueId || '',
        match_date: normalizeDateToISO(updated.date),
        home_team_name: updated.homeTeam,
        away_team_name: updated.awayTeam,
        home_score: updated.homeScore !== undefined ? updated.homeScore : null,
        away_score: updated.awayScore !== undefined ? updated.awayScore : null,
        is_completed: updated.status === 'Played',
        created_at: (updated as any).created_at || new Date().toISOString(),
        goals: updated.goals || [],
        homeSquad: updated.homeSquad || [],
        awaySquad: updated.awaySquad || [],
        playerOfMatch: updated.playerOfMatch || ''
      });

      if (onUpdateMatch) {
        onUpdateMatch(updated);
      }
      setEditingMatch(null);
    } catch (err: any) {
      console.error("Error saving match in Firestore:", err);
      alert(`Failed to save match to Firebase: ${err.message}`);
    }
  };

  const handleDeleteMatchClick = (matchId: string) => {
    console.log("Delete button clicked", matchId);
    try {
      if (onDeleteMatch) {
        onDeleteMatch(matchId);
      }
    } catch (error) {
      console.error("Delete failed:", error);
    }
    setMatchIdToDelete(null);
  };

  const handleLiveGoal = (match: LeagueMatch, team: 'home' | 'away') => {
    const isFriendlyMatch = match.type === 'Friendly Match';
    const newGoalId = 'goal-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    // Create a corresponding MatchGoal so that it gets added to match.goals list and the session
    const newGoal: MatchGoal = {
      id: newGoalId,
      playerId: 'unassigned-' + team + '-' + Date.now(),
      playerName: team === 'home' ? 'Unassigned (' + match.homeTeam + ')' : 'Unassigned (' + match.awayTeam + ')',
      team: isFriendlyMatch ? null : team,
      type: isFriendlyMatch ? 'Friendly' : 'League'
    };

    const updated: LeagueMatch = {
      ...match,
      homeScore: team === 'home' ? (match.homeScore ?? 0) + 1 : (match.homeScore ?? 0),
      awayScore: team === 'away' ? (match.awayScore ?? 0) + 1 : (match.awayScore ?? 0),
      goals: [...(match.goals || []), newGoal],
      status: match.status === 'Scheduled' ? 'Live' : match.status
    };

    if (onUpdateMatch) {
      onUpdateMatch(updated);
    }
  };

  const handleLiveFullTime = (match: LeagueMatch) => {
    const updated: LeagueMatch = {
      ...match,
      status: 'Played',
    };
    if (onUpdateMatch) {
      onUpdateMatch(updated);
    }
  };

  // Leagues List View
  if (!currentSelectedLeagueId) {
    return (
      <div className="space-y-6" id="leagues-tab">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 shadow-xs">
              <Trophy className="w-5 h-5 text-slate-800 dark:text-slate-200 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-950 dark:text-white tracking-tight leading-none">Leagues & Matches</h1>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="inline-flex items-center text-[10px] font-black text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {leagues.length} {leagues.length === 1 ? 'competition' : 'competitions'}
                </span>
                <span className="inline-flex items-center text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {matches.length} {matches.length === 1 ? 'match' : 'matches'}
                </span>
              </div>
            </div>
          </div>
          
          <button
            id="create-tournament-btn"
            onClick={() => setShowAddLeague(!showAddLeague)}
            className="flex items-center justify-center gap-1.5 bg-slate-950 hover:bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer shadow-xs active:scale-95"
          >
            {showAddLeague ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4 stroke-[3]" />}
            {showAddLeague ? 'Cancel Configuration' : 'Create Tournament'}
          </button>
        </div>

        {/* Add League Form */}
        {showAddLeague && (
          <form 
            onSubmit={handleCreateLeague} 
            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-md space-y-5 animate-in fade-in duration-200" 
            id="add-league-form"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-50 leading-none">Configure New Tournament</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Set up custom formats, dates, and team rosters instantly</p>
                </div>
              </div>
              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-650 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-lg">
                Tournament Creator
              </div>
            </div>

            {/* Form Fields & Preview Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              
              {/* Left & Middle columns: Inputs */}
              <div className="lg:col-span-2 space-y-4">
                
                {/* Row 1: Name and Season */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">League / Cup Name *</label>
                    <div className="relative">
                      <input 
                        id="league-name-input"
                        type="text" 
                        placeholder="e.g. Wednesday Night Cup"
                        value={newLeagueName}
                        onChange={e => setNewLeagueName(e.target.value)}
                        className="w-full text-xs p-3 pl-3 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-hidden transition"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Season / Year *</label>
                    <input 
                      id="league-season-input"
                      type="text" 
                      placeholder="e.g. Summer 2026"
                      value={newSeason}
                      onChange={e => setNewSeason(e.target.value)}
                      className="w-full text-xs p-3 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-hidden transition"
                      required
                    />
                  </div>
                </div>

                {/* Row 2: Format and Fixture Format */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Format</label>
                    <select 
                      id="league-sport-input"
                      value={newSport} 
                      onChange={e => setNewSport(e.target.value)}
                      className="w-full text-xs p-3 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-hidden transition bg-white"
                    >
                      <option value="5V5">5V5</option>
                      <option value="6V6">6V6</option>
                      <option value="7V7">7V7</option>
                      <option value="8V8">8V8</option>
                      <option value="9V9">9V9</option>
                      <option value="10V10">10V10</option>
                      <option value="11v11">11v11</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Fixture Schedule Format</label>
                    <select 
                      id="league-format-input"
                      value={newLeagueFormat} 
                      onChange={e => setNewLeagueFormat(e.target.value as 'once' | 'twice' | 'unlimited')}
                      className="w-full text-xs p-3 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-hidden transition bg-white"
                    >
                      <option value="once">Play each other once (Single Round Robin)</option>
                      <option value="twice">Play each other twice (Double Round Robin)</option>
                      <option value="unlimited">Custom / Unlimited Friendly</option>
                    </select>
                  </div>
                </div>

                {/* Row 3: Start and End Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CustomDatePicker
                    id="league-start-date-input"
                    value={newLeagueStartDate}
                    onChange={setNewLeagueStartDate}
                    label="League Start Date *"
                  />

                  <CustomDatePicker
                    id="league-end-date-input"
                    value={newLeagueEndDate}
                    onChange={setNewLeagueEndDate}
                    label="League End Date *"
                  />
                </div>

              </div>

              {/* Right column: Teams Registration & Live Preview Card */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Roster Registration *</label>
                  <textarea 
                    id="league-teams-input"
                    placeholder="Game On FC, Apex Athletics, Vanguard United..."
                    value={teamNamesInput}
                    onChange={e => setTeamNamesInput(e.target.value)}
                    className="w-full text-xs p-3 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-hidden h-[90px] transition bg-white"
                    required
                  />
                </div>

                {/* Live Preview card */}
                {(() => {
                  const parsedTeams = teamNamesInput
                    .split(',')
                    .map(t => t.trim())
                    .filter(Boolean);
                  
                  return (
                    <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-3.5 rounded-2xl flex flex-col justify-between h-[155px]">
                      <div className="min-h-0 flex flex-col">
                        <div className="flex items-center justify-between mb-1.5 shrink-0">
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-emerald-550" /> Live Registry
                          </span>
                          <span className="text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                            {parsedTeams.length} Teams
                          </span>
                        </div>
                        {parsedTeams.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center">
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 italic text-center">
                              Roster is empty. Enter team names...
                            </p>
                          </div>
                        ) : (
                          <div className="flex-1 overflow-y-auto space-y-1 pr-1 pb-1 min-h-0 scrollbar-thin">
                            {parsedTeams.map((team, idx) => (
                              <div 
                                key={idx} 
                                className="flex items-center gap-2 text-xs bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-800 px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300 shadow-2xs hover:border-slate-300 transition"
                              >
                                <span className="w-3.5 h-3.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-extrabold text-[9px] flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="font-semibold truncate text-[11px]">{team}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="pt-2 border-t border-slate-150/50 dark:border-slate-800/60 shrink-0">
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-tight">
                          💡 Separate team names with commas. Standard round-robin fixtures are automatically scheduled.
                        </p>
                      </div>
                    </div>
                  );
                })()}

              </div>

            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <button
                id="cancel-league-form-btn"
                type="button"
                onClick={() => setShowAddLeague(false)}
                className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition active:scale-95"
              >
                Cancel
              </button>
              <button
                id="save-league-btn"
                type="submit"
                className="text-xs font-extrabold bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl cursor-pointer shadow-sm hover:shadow-md transition active:scale-95"
              >
                Create League & Standings
              </button>
            </div>
          </form>
        )}

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-1.5 py-1" id="status-filters">
          <button
            onClick={() => setStatusFilter('All')}
            className={`flex items-center gap-1.5 text-xs font-extrabold px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
              statusFilter === 'All'
                ? 'bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span>All</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md font-mono ${
              statusFilter === 'All' ? 'bg-slate-800 text-slate-300 dark:bg-slate-200 dark:text-slate-700' : 'bg-slate-100 text-slate-500 dark:bg-slate-850 dark:text-slate-400'
            }`}>
              {allCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('Upcoming')}
            className={`flex items-center gap-1.5 text-xs font-extrabold px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
              statusFilter === 'Upcoming'
                ? 'bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span>Upcoming</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md font-mono ${
              statusFilter === 'Upcoming' ? 'bg-slate-800 text-slate-300 dark:bg-slate-200 dark:text-slate-700' : 'bg-slate-100 text-slate-500 dark:bg-slate-850 dark:text-slate-400'
            }`}>
              {upcomingCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('In Progress')}
            className={`flex items-center gap-1.5 text-xs font-extrabold px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
              statusFilter === 'In Progress'
                ? 'bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span>In Progress</span>
            {inProgressCount > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md font-mono ${
                statusFilter === 'In Progress' ? 'bg-slate-800 text-slate-300 dark:bg-slate-200 dark:text-slate-700' : 'bg-slate-100 text-slate-500 dark:bg-slate-850 dark:text-slate-400'
              }`}>
                {inProgressCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setStatusFilter('Completed')}
            className={`flex items-center gap-1.5 text-xs font-extrabold px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
              statusFilter === 'Completed'
                ? 'bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span>Completed</span>
            {completedCount > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md font-mono ${
                statusFilter === 'Completed' ? 'bg-slate-800 text-slate-300 dark:bg-slate-200 dark:text-slate-700' : 'bg-slate-100 text-slate-500 dark:bg-slate-850 dark:text-slate-400'
              }`}>
                {completedCount}
              </span>
            )}
          </button>
        </div>

        {/* League Cards Grid */}
        {filteredLeagues.length === 0 ? (
          <div 
            id="leagues-empty-state"
            className="bg-white dark:bg-slate-900 p-12 text-center rounded-3xl border border-slate-200/60 dark:border-slate-800 text-slate-400 dark:text-slate-500 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300"
          >
            <Trophy className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
            <p className="text-sm">No leagues found matching the status filter.</p>
          </div>
        ) : (
          <div 
            id="leagues-cards-grid"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300"
          >
            {filteredLeagues.map(l => {
              const status = getLeagueStatus(l);
              const dateRange = getLeagueDateRange(l);
              const format = getLeagueFormat(l);
              const teamCount = standings[l.id]?.length || 5;
              const matchCount = matches.filter(m => m.leagueId === l.id).length || 21;

              return (
                <div
                  id={`league-card-${l.id}`}
                  key={l.id}
                  onClick={() => setSelectedLeagueId(l.id)}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 p-5 hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5 hover:border-emerald-500/30 transition-all duration-300 cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    {/* Badge / Actions Line */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg ${
                          status === 'Upcoming' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' :
                          status === 'In Progress' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400' :
                          'bg-slate-100 text-slate-600 dark:bg-slate-850 dark:text-slate-400'
                        }`}>
                          {status}
                        </span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          League
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 transition">
                        <button
                          id={`delete-league-btn-${l.id}`}
                          onClick={(e) => handleDeleteClick(e, l.id, l.name)}
                          className="p-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 rounded-xl text-red-500 hover:text-red-600 transition cursor-pointer border border-red-100/50 dark:border-red-900/20 active:scale-95"
                          title="Delete League"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
                      </div>
                    </div>

                    {/* Middle Section: Title, Date, Format */}
                    <div className="mt-4">
                      <h3 className="text-base font-black text-slate-950 dark:text-white tracking-tight leading-tight group-hover:text-emerald-550 transition">
                        {l.name}
                      </h3>

                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-400 dark:text-slate-500 font-bold">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{dateRange}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Stats Section */}
                  <div>
                    <div className="border-t border-slate-100 dark:border-slate-800/60 my-3.5" />
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>{teamCount} teams</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-slate-400" />
                        <span>{matchCount} matches</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Helper to parse match date for chronological sorting
  const parseMatchDate = (dateStr: string): number => {
    if (!dateStr) return 0;
    const cleaned = dateStr.split(' • ')[0].trim();
    
    // Format "YYYY-MM-DD" e.g., "2026-06-03"
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
      return new Date(cleaned).getTime();
    }
    
    // Format "DD MMM YYYY" e.g., "14 Feb 2026"
    const parts = cleaned.split(' ');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const monthStr = parts[1].toLowerCase();
      const year = parseInt(parts[2], 10);
      
      const months: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
      };
      
      const month = months[monthStr.substring(0, 3)] ?? 0;
      return new Date(year, month, day).getTime();
    }
    
    const parsed = Date.parse(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Leagues Detail View - sorted chronologically (newest at the top, oldest at the bottom)
  const sortedMatches = [...activeMatches].sort((a, b) => {
    const dateA = parseMatchDate(a.date);
    const dateB = parseMatchDate(b.date);
    if (dateA !== dateB) {
      return dateB - dateA; // Newest first (descending timestamp)
    }
    // Fallback: sort by match number descending (highest number first)
    const numA = a.matchNumber || 0;
    const numB = b.matchNumber || 0;
    if (numA !== numB) {
      return numB - numA;
    }
    // Ultimate stable fallback: ID alphabetical compare
    return b.id.localeCompare(a.id);
  });
  const liveCount = activeMatches.filter(m => m.status === 'Live').length;
  const completedMatchesCount = activeMatches.filter(m => m.status === 'Played').length;
  const matchCount = activeMatches.length;
  const teamCount = sortedStandings.length;

  const currentActiveMatch = activeSelectedMatchId ? matches.find(m => m.id === activeSelectedMatchId) : null;

  return (
    <div className="space-y-6" id="league-detail-tab">
      
      {/* Breadcrumbs & Navigation Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-2 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button 
            onClick={() => {
              if (activeSelectedMatchId) {
                activeSetSelectedMatchId(null);
              } else {
                currentSetSelectedLeagueId(null);
              }
            }}
            className="flex items-center gap-1 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition cursor-pointer animate-in fade-in duration-150"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 dark:text-slate-500 font-bold">
            <Home className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <span>/</span>
            <button 
              onClick={() => {
                currentSetSelectedLeagueId(null);
                activeSetSelectedMatchId(null);
              }} 
              className="hover:text-slate-800 dark:hover:text-slate-300 transition cursor-pointer"
            >
              Leagues
            </button>
            <span>/</span>
            <button 
              onClick={() => {
                activeSetSelectedMatchId(null);
              }}
              className={`transition cursor-pointer ${
                activeSelectedMatchId 
                  ? 'hover:text-slate-800 dark:hover:text-slate-300 font-bold' 
                  : 'text-slate-800 dark:text-slate-200 font-black'
              }`}
            >
              {activeLeague?.name}
            </button>
            {activeSelectedMatchId && currentActiveMatch && (
              <>
                <span>/</span>
                <span className="text-slate-800 dark:text-slate-200 font-black">Match Details</span>
              </>
            )}
          </div>
        </div>
      </div>

      {activeLeague ? (
        <div className="space-y-6">
          
          {/* League Banner Info Block */}
          {!activeSelectedMatchId && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                    {getLeagueDateRange(activeLeague)}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-950 dark:text-white tracking-tight mt-1">
                  {activeLeague.name}
                </h2>
              </div>
            </div>
          )}

          {/* Centered Tab Navigation Row */}
          {!activeSelectedMatchId && (
            <div className="border-b border-slate-200 dark:border-slate-800 flex justify-center mt-6">
              <div className="flex gap-12">
                <button 
                  onClick={() => setActiveDetailTab('matches')}
                  className={`flex items-center gap-2 pb-3.5 text-xs font-black border-b-2 transition cursor-pointer ${
                    activeDetailTab === 'matches' 
                      ? 'border-slate-950 text-slate-950 dark:border-white dark:text-white' 
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <Swords className="w-4 h-4 shrink-0" />
                  <span>Matches</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                    activeDetailTab === 'matches' ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}>{matchCount}</span>
                </button>

                <button 
                  onClick={() => setActiveDetailTab('player-league')}
                  className={`flex items-center gap-2 pb-3.5 text-xs font-black border-b-2 transition cursor-pointer ${
                    activeDetailTab === 'player-league' 
                      ? 'border-slate-950 text-slate-950 dark:border-white dark:text-white' 
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <Users className="w-4 h-4 shrink-0" />
                  <span>Player League Table</span>
                </button>
                
                <button 
                  onClick={() => setActiveDetailTab('table')}
                  className={`flex items-center gap-2 pb-3.5 text-xs font-black border-b-2 transition cursor-pointer ${
                    activeDetailTab === 'table' 
                      ? 'border-slate-950 text-slate-950 dark:border-white dark:text-white' 
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <Table className="w-4 h-4 shrink-0" />
                  <span>League Table</span>
                </button>
                
                <button 
                  onClick={() => setActiveDetailTab('teams')}
                  className={`flex items-center gap-2 pb-3.5 text-xs font-black border-b-2 transition cursor-pointer ${
                    activeDetailTab === 'teams' 
                      ? 'border-slate-950 text-slate-950 dark:border-white dark:text-white' 
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <Shield className="w-4 h-4 shrink-0" />
                  <span>Teams</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                    activeDetailTab === 'teams' ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}>{teamCount}</span>
                </button>
              </div>
            </div>
          )}

          {/* Sub-tab views content */}
          {activeDetailTab === 'matches' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {activeSelectedMatchId ? (
                (() => {
                  const match = matches.find(m => m.id === activeSelectedMatchId);
                  if (!match) return null;
                  const leagueTeams = activeStandings.map(s => s.name);
                  
                  // Find associated session
                  const session = (sessions || []).find(s => 
                    s && (
                      s.matchId === match.id || 
                      s.id === match.id || 
                      s.id === `session-${match.id}` || 
                      s.id === `session_${match.id}` || 
                      match.id === `session-${s.id}` || 
                      match.id === `session_${s.id}` || 
                      (match.date && s.date && match.date === s.date)
                    )
                  );

                  const sessionAttendance = session 
                    ? (attendance || []).filter(a => a.sessionId === session.id || a.sessionId === match.id || (session.matchId && a.sessionId === session.matchId))
                    : (attendance || []).filter(a => a.sessionId === match.id);

                  const hasAttendanceData = sessionAttendance.length > 0 || (session && (session as any).attendance && Object.keys((session as any).attendance).length > 0);

                  const isPlayerPresent = (p: Player) => {
                    const rec = sessionAttendance.find(sa => 
                      sa.playerId === p.id || 
                      sa.playerId === p.name || 
                      (p.name && sa.playerId.toLowerCase() === p.name.toLowerCase())
                    );
                    if (rec) return rec.status === 'Present';

                    if (session && (session as any).attendance && typeof (session as any).attendance === 'object') {
                      const dict = (session as any).attendance;
                      const val = dict[p.id] ?? dict[p.name] ?? (p.name ? dict[p.name.toLowerCase()] : undefined);
                      if (val !== undefined && val !== null) {
                        if (typeof val === 'string') return val.toLowerCase() === 'present';
                        if (typeof val === 'object' && val.status) return String(val.status).toLowerCase() === 'present';
                      }
                    }

                    if (hasAttendanceData) {
                      return false;
                    }
                    return true;
                  };

                  const isPlayerAbsent = (p: Player) => {
                    const rec = sessionAttendance.find(sa => 
                      sa.playerId === p.id || 
                      sa.playerId === p.name || 
                      (p.name && sa.playerId.toLowerCase() === p.name.toLowerCase())
                    );
                    if (rec) return rec.status === 'Absent';

                    if (session && (session as any).attendance && typeof (session as any).attendance === 'object') {
                      const dict = (session as any).attendance;
                      const val = dict[p.id] || dict[p.name] || (p.name && dict[p.name.toLowerCase()]);
                      if (val !== undefined && val !== null) {
                        return String(val).toLowerCase() === 'absent';
                      }
                    }
                    return false;
                  };

                  const presentPlayers = (players || []).filter(p => 
                    p.status === 'Active' && isPlayerPresent(p)
                  ).sort((a, b) => a.name.localeCompare(b.name));

                  const activeRegisteredPlayers = (players || []).filter(p => p.status === 'Active');
                  const registeredCount = activeRegisteredPlayers.length;
                  const presentCount = presentPlayers.length;

                  // Squad state
                  const rawHomeSquad = match.homeSquad || match.homeRoster || [];
                  const rawAwaySquad = match.awaySquad || match.awayRoster || [];
                  const activePlayerIds = new Set(activeRegisteredPlayers.map(p => p.id));
                  const presentPlayerIds = new Set(presentPlayers.map(p => p.id));
                  const presentPlayerNames = new Set(presentPlayers.map(p => p.name));

                  const isPlayerAllowedInSquad = (idOrName: string) => {
                    const pObj = (players || []).find(p => p.id === idOrName || p.name === idOrName);
                    if (pObj && isPlayerAbsent(pObj)) return false;
                    return presentPlayerIds.has(idOrName) || presentPlayerNames.has(idOrName) || (pObj ? isPlayerPresent(pObj) : false);
                  };

                  const homeSquad = rawHomeSquad.filter(isPlayerAllowedInSquad);
                  const awaySquad = rawAwaySquad.filter(isPlayerAllowedInSquad);
                  const squadLimit = match.format 
                    ? (parseInt(match.format.toLowerCase().split('v')[0]) || 7)
                    : 7;
                  const goalsList = match.goals || [];

                  const unassignedPlayers = presentPlayers.filter(p => !homeSquad.includes(p.id) && !awaySquad.includes(p.id));
                  const filteredCheckedIn = unassignedPlayers.filter(p => 
                    p.name.toLowerCase().includes(checkedInSearchQuery.toLowerCase())
                  );

                  // Goals categorization
                  const homeLeagueGoals = goalsList.filter(g => g.team === 'home' && g.type === 'League');
                  const awayLeagueGoals = goalsList.filter(g => g.team === 'away' && g.type === 'League');
                  const homeGoalsFriendlyMatch = goalsList.filter(g => g.team === 'home');
                  const awayGoalsFriendlyMatch = goalsList.filter(g => g.team === 'away');
                  const friendlyGoalsList = goalsList.filter(g => g.type === 'Friendly');

                  const isFriendlyMatch = match.type === 'Friendly Match';

                  // --- UNIFIED POTD CAPTURE, SYNC AND MERGE ENGINE ---
                  const saveMatchCard = (selectedPlayerIdOrName: string) => {
                    const existingRecord = match;
                    const updated = { 
                      ...existingRecord, 
                      potdWinner: selectedPlayerIdOrName, 
                      playerOfMatch: selectedPlayerIdOrName 
                    };
                    onUpdateMatch?.(updated);
                    return updated;
                  };

                  const saveSessionCard = (selectedPlayerIdOrName: string) => {
                    const matchSession = sessions.find(s => s.matchId === match.id || s.id === `session-${match.id}`);
                    if (matchSession) {
                      const existingRecord = matchSession;
                      const updated = { 
                        ...existingRecord, 
                        potdWinner: selectedPlayerIdOrName, 
                        playerOfMatch: selectedPlayerIdOrName 
                      };
                      
                      // We also update the session list defensively
                      const allSessions = sessions.map(s => s.id === matchSession.id ? updated : s);
                      localStorage.setItem('gameon_sessions', JSON.stringify(allSessions));
                      return updated;
                    }
                  };

                  const autoSaveRecord = (selectedPlayerIdOrName: string) => {
                    const selectElem = document.getElementById('potd-select') as HTMLSelectElement | null;
                    const capturedValue = selectElem ? selectElem.value : selectedPlayerIdOrName;
                    
                    saveMatchCard(capturedValue);
                    saveSessionCard(capturedValue);
                  };

                  const homeColors = getTeamColorStyles(match.homeTeam);
                  const awayColors = getTeamColorStyles(match.awayTeam);

                  const groupGoalsByPlayer = (goals: typeof goalsList) => {
                    const groups: Record<string, { playerId: string; playerName: string; goalIds: string[] }> = {};
                    goals.forEach(g => {
                      const key = g.playerId || g.playerName;
                      if (!groups[key]) {
                        groups[key] = {
                          playerId: g.playerId || '',
                          playerName: g.playerName,
                          goalIds: []
                        };
                      }
                      groups[key].goalIds.push(g.id);
                    });
                    return Object.values(groups);
                  };

                  const homeGoalsGrouped = groupGoalsByPlayer(isFriendlyMatch ? homeGoalsFriendlyMatch : homeLeagueGoals);
                  const awayGoalsGrouped = groupGoalsByPlayer(isFriendlyMatch ? awayGoalsFriendlyMatch : awayLeagueGoals);
                  const friendlyGoalsGrouped = groupGoalsByPlayer(friendlyGoalsList);

                  const getStepperPlayers = (team: 'home' | 'away') => {
                    const squadIds = team === 'home' ? homeSquad : awaySquad;
                    const hasExplicitSquadConfig = match.homeSquad !== undefined || match.homeRoster !== undefined || match.awaySquad !== undefined || match.awayRoster !== undefined;
                    if (hasExplicitSquadConfig || squadIds.length > 0) {
                      return players.filter(p => squadIds.includes(p.id)).sort((a, b) => a.name.localeCompare(b.name));
                    }
                    return presentPlayers;
                  };

                  // Dynamic Team Colors
                  const getTeamColorClass = (teamName: string) => {
                    return getTeamColorStyles(teamName).dotBg;
                  };

                  const getInitials = (name: string) => {
                    if (!name) return '';
                    const clean = name.replace(/\(.*?\)/g, '').replace(/[^a-zA-Z0-9\s]/g, ' ');
                    const parts = clean.trim().split(/\s+/).filter(Boolean);
                    if (parts.length >= 2) {
                      return (parts[0][0] + parts[1][0]).toUpperCase();
                    }
                    if (parts.length === 1) {
                      return parts[0].substring(0, 2).toUpperCase();
                    }
                    return '';
                  };

                  // Squad Handlers
                  const handleTogglePlayerSquad = (playerId: string, targetTeam: 'home' | 'away' | null) => {
                    let updatedHome = [...homeSquad];
                    let updatedAway = [...awaySquad];

                    updatedHome = updatedHome.filter(id => id !== playerId);
                    updatedAway = updatedAway.filter(id => id !== playerId);

                    if (targetTeam === 'home') {
                      updatedHome.push(playerId);
                    } else if (targetTeam === 'away') {
                      updatedAway.push(playerId);
                    }

                    onUpdateMatch?.({
                      ...match,
                      homeSquad: updatedHome,
                      awaySquad: updatedAway,
                      homeRoster: updatedHome,
                      awayRoster: updatedAway
                    });
                  };

                  const handleAutoFillSquads = () => {
                    const updatedHome = [...homeSquad];
                    const updatedAway = [...awaySquad];
                    const unassigned = presentPlayers.filter(p => !updatedHome.includes(p.id) && !updatedAway.includes(p.id));

                    unassigned.forEach((player, idx) => {
                      if (updatedHome.length < squadLimit && updatedAway.length < squadLimit) {
                        if (idx % 2 === 0) {
                          updatedHome.push(player.id);
                        } else {
                          updatedAway.push(player.id);
                        }
                      } else if (updatedHome.length < squadLimit) {
                        updatedHome.push(player.id);
                      } else if (updatedAway.length < squadLimit) {
                        updatedAway.push(player.id);
                      }
                    });

                    onUpdateMatch?.({
                      ...match,
                      homeSquad: updatedHome,
                      awaySquad: updatedAway,
                      homeRoster: updatedHome,
                      awayRoster: updatedAway
                    });
                  };

                  const handleClearSquads = () => {
                    onUpdateMatch?.({
                      ...match,
                      homeSquad: [],
                      awaySquad: [],
                      homeRoster: [],
                      awayRoster: []
                    });
                  };

                  const handleSquadContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
                    const target = e.target as HTMLElement;
                    const btn = target.closest('[data-action]');
                    if (!btn) return;
                    e.stopPropagation();
                    e.preventDefault();

                    const action = btn.getAttribute('data-action');
                    const playerId = btn.getAttribute('data-player-id');
                    const team = btn.getAttribute('data-team');

                    if (action === 'toggle-squad' && playerId) {
                      const targetTeam = team === 'home' ? 'home' : team === 'away' ? 'away' : null;
                      handleTogglePlayerSquad(playerId, targetTeam);
                    } else if (action === 'clear-squads') {
                      handleClearSquads();
                    } else if (action === 'autofill-squads') {
                      handleAutoFillSquads();
                    }
                  };

                  // Goals Handlers
                  const handleAddGoalScorer = (playerId: string, team: 'home' | 'away' | null, type: 'League' | 'Friendly') => {
                    const player = players.find(p => p.id === playerId);
                    if (!player) return;

                    let hScore = parseInt(match.homeScore as any, 10);
                    if (isNaN(hScore)) hScore = 0;
                    let aScore = parseInt(match.awayScore as any, 10);
                    if (isNaN(aScore)) aScore = 0;

                    // Determine team side if not explicitly provided
                    let goalTeam = team;
                    if (goalTeam === null) {
                      if (homeSquad.includes(playerId)) {
                        goalTeam = 'home';
                      } else if (awaySquad.includes(playerId)) {
                        goalTeam = 'away';
                      }
                    }

                    let updatedGoals = [...goalsList];
                    let replacedAnUnassigned = false;

                    // Check if there is an unassigned goal of this team/type to associate with
                    if (type === 'League') {
                      const unassignedIdx = updatedGoals.findIndex(
                        g => g.type === 'League' && g.team === goalTeam && g.playerId.startsWith('unassigned-')
                      );
                      if (unassignedIdx !== -1) {
                        updatedGoals[unassignedIdx] = {
                          ...updatedGoals[unassignedIdx],
                          playerId,
                          playerName: player.name || "Unknown Player"
                        };
                        replacedAnUnassigned = true;
                      }
                    } else {
                      // type === 'Friendly'
                      const unassignedIdx = updatedGoals.findIndex(
                        g => g.type === 'Friendly' && g.playerId.startsWith('unassigned-')
                      );
                      if (unassignedIdx !== -1) {
                        updatedGoals[unassignedIdx] = {
                          ...updatedGoals[unassignedIdx],
                          playerId,
                          playerName: player.name || "Unknown Player",
                          team: goalTeam
                        };
                        replacedAnUnassigned = true;
                      }
                    }

                    // If no unassigned goal was replaced, we add a brand new goal and increment the score
                    if (!replacedAnUnassigned) {
                      const newGoal = {
                        id: 'goal-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                        playerId,
                        playerName: player.name || "Unknown Player",
                        team: goalTeam,
                        type
                      };
                      updatedGoals.push(newGoal);

                      if (type === 'League') {
                        if (goalTeam === 'home') hScore += 1;
                        if (goalTeam === 'away') aScore += 1;
                      } else if (type === 'Friendly') {
                        if (isFriendlyMatch) {
                          if (goalTeam === 'home') {
                            hScore += 1;
                          } else if (goalTeam === 'away') {
                            aScore += 1;
                          }
                        }
                      }
                    }

                    onUpdateMatch?.({
                      ...match,
                      homeScore: hScore,
                      awayScore: aScore,
                      goals: updatedGoals
                    });
                  };

                  const handleRemoveGoal = (goalId: string) => {
                    const goalToRemove = goalsList.find(g => g.id === goalId);
                    if (!goalToRemove) return;

                    const updatedGoals = goalsList.filter(g => g.id !== goalId);
                    let hScore = parseInt(match.homeScore as any, 10);
                    if (isNaN(hScore)) hScore = 0;
                    let aScore = parseInt(match.awayScore as any, 10);
                    if (isNaN(aScore)) aScore = 0;

                    if (goalToRemove.type === 'League') {
                      if (goalToRemove.team === 'home') hScore = Math.max(0, hScore - 1);
                      if (goalToRemove.team === 'away') aScore = Math.max(0, aScore - 1);
                    } else if (goalToRemove.type === 'Friendly') {
                      if (isFriendlyMatch) {
                        const teamSide = goalToRemove.team || (homeSquad.includes(goalToRemove.playerId) ? 'home' : awaySquad.includes(goalToRemove.playerId) ? 'away' : null);
                        if (teamSide === 'home') {
                          hScore = Math.max(0, hScore - 1);
                        } else if (teamSide === 'away') {
                          aScore = Math.max(0, aScore - 1);
                        }
                      }
                    }

                    onUpdateMatch?.({
                      ...match,
                      homeScore: hScore,
                      awayScore: aScore,
                      goals: updatedGoals
                    });
                  };

                  const handleUpdateStatus = (newStatus: 'Scheduled' | 'Live' | 'Played') => {
                    const updatedMatch = {
                      ...match,
                      status: newStatus,
                      homeScore: newStatus === 'Scheduled' ? undefined : parseInt(match.homeScore as any, 10) || 0,
                      awayScore: newStatus === 'Scheduled' ? undefined : parseInt(match.awayScore as any, 10) || 0
                    };
                    onUpdateMatch?.(updatedMatch);
                    setShowStatusDropdown(false);
                  };

                  const handleForfeitTeam = (team: 'home' | 'away') => {
                    let hScore = 0;
                    let aScore = 0;
                    if (team === 'home') {
                      hScore = 0;
                      aScore = 3;
                    } else {
                      hScore = 3;
                      aScore = 0;
                    }

                    onUpdateMatch?.({
                      ...match,
                      homeScore: hScore,
                      awayScore: aScore,
                      status: 'Played',
                      playerOfMatch: 'N/A (Forfeit)'
                    });
                    setShowForfeitPanel(false);
                    setForfeitConfirmTeam(null);
                  };

                  const handleSetPlayerOfMatch = (name: string) => {
                    const currentWinners = match.playerOfMatch && match.playerOfMatch !== 'N/A' && match.playerOfMatch !== 'N/A (Forfeit)'
                      ? match.playerOfMatch.split(/&|and|,|\//).map(s => s.trim()).filter(Boolean)
                      : [];
                    if (currentWinners.includes(name)) return;
                    const updatedWinners = [...currentWinners, name];
                    onUpdateMatch?.({
                      ...match,
                      playerOfMatch: updatedWinners.join(' & ')
                    });
                  };

                  const handleRemovePlayerOfMatch = (nameToRemove?: string) => {
                    if (typeof nameToRemove === 'string') {
                      const currentWinners = match.playerOfMatch
                        ? match.playerOfMatch.split(/&|and|,|\//).map(s => s.trim()).filter(Boolean)
                        : [];
                      const updatedWinners = currentWinners.filter(w => w !== nameToRemove);
                      onUpdateMatch?.({
                        ...match,
                        playerOfMatch: updatedWinners.join(' & ')
                      });
                    } else {
                      onUpdateMatch?.({
                        ...match,
                        playerOfMatch: ''
                      });
                    }
                  };

                  // Accumulate goals for display
                  const friendlyGoalScorers: Record<string, { name: string; count: number }> = {};
                  goalsList.forEach(g => {
                    if (!friendlyGoalScorers[g.playerId]) {
                      friendlyGoalScorers[g.playerId] = { name: g.playerName, count: 0 };
                    }
                    friendlyGoalScorers[g.playerId].count += 1;
                  });

                  const handleScorersContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
                    const target = e.target as HTMLElement;
                    const btn = target.closest('[data-action]');
                    if (!btn) return;
                    e.stopPropagation();
                    e.preventDefault();

                    const action = btn.getAttribute('data-action');
                    const goalId = btn.getAttribute('data-goal-id');
                    const playerId = btn.getAttribute('data-player-id');
                    const team = btn.getAttribute('data-team') as 'home' | 'away' | null;
                    const type = btn.getAttribute('data-type') as 'League' | 'Friendly';

                    if (action === 'remove-goal' && goalId) {
                      handleRemoveGoal(goalId);
                    } else if (action === 'add-goal' && playerId) {
                      handleAddGoalScorer(playerId, team, type);
                    }
                  };

                  const handleScoreboardClick = (e: React.MouseEvent<HTMLDivElement>) => {
                    const target = e.target as HTMLElement;
                    const btn = target.closest('[data-action]');
                    if (!btn) return;
                    e.stopPropagation();
                    e.preventDefault();

                    const action = btn.getAttribute('data-action');
                    if (action === 'home-dec') {
                      const hScore = parseInt(match.homeScore as any, 10) || 0;
                      onUpdateMatch?.({ ...match, homeScore: Math.max(0, hScore - 1) });
                    } else if (action === 'home-inc') {
                      const hScore = parseInt(match.homeScore as any, 10) || 0;
                      onUpdateMatch?.({ ...match, homeScore: hScore + 1 });
                    } else if (action === 'away-dec') {
                      const aScore = parseInt(match.awayScore as any, 10) || 0;
                      onUpdateMatch?.({ ...match, awayScore: Math.max(0, aScore - 1) });
                    } else if (action === 'away-inc') {
                      const aScore = parseInt(match.awayScore as any, 10) || 0;
                      onUpdateMatch?.({ ...match, awayScore: aScore + 1 });
                    } else if (action === 'go-live') {
                      onUpdateMatch?.({ ...match, status: 'Live', homeScore: 0, awayScore: 0 });
                    } else if (action === 'set-score') {
                      onUpdateMatch?.({ ...match, status: 'Played', homeScore: 0, awayScore: 0 });
                    }
                  };

                  const compactMatchesListEl = (
                    <div className="hidden lg:block lg:col-span-4 space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-2 scrollbar-thin">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-150 dark:border-slate-800">
                        <h3 className="text-xs font-black uppercase text-slate-400">Fixtures</h3>
                        <button 
                          onClick={() => activeSetSelectedMatchId?.(null)}
                          className="text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          ✕ Close
                        </button>
                      </div>
                      <div className="space-y-3" onClick={handleMatchesGridClick}>
                        {sortedMatches.map((m) => {
                          const isCurrent = m.id === activeSelectedMatchId;
                          const isMFriendly = m.type === 'Friendly Match';
                          return (
                            <div 
                              key={m.id}
                              id={`match-card-${m.id}`}
                              data-match-card-id={m.id}
                              className={`p-3.5 rounded-2xl border text-left cursor-pointer transition duration-150 relative overflow-hidden ${
                                isCurrent 
                                  ? isMFriendly
                                    ? 'bg-orange-500/10 border-orange-500 ring-1 ring-orange-500/20'
                                    : 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500/20' 
                                  : isMFriendly
                                    ? 'bg-orange-50/10 border-orange-200/40 hover:border-orange-400 dark:bg-orange-950/10'
                                    : 'bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800 hover:border-emerald-500/60'
                              }`}
                            >
                              <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 mb-1.5">
                                <span className={isMFriendly ? 'text-orange-600 dark:text-orange-400 font-extrabold' : 'text-emerald-600 dark:text-emerald-400 font-extrabold'}>
                                  {m.type} {m.matchNumber ? `#${m.matchNumber}` : ''}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <span className={`px-1.5 py-0.2 rounded font-black uppercase ${
                                    m.status === 'Live' ? 'bg-red-500/15 text-red-600' :
                                    m.status === 'Played' ? 'bg-emerald-500/15 text-emerald-600' :
                                    'bg-blue-500/15 text-blue-600'
                                  }`}>{m.status}</span>
                                  {onDeleteMatch && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteMatchClick(m.id);
                                      }}
                                      className="p-1 border border-red-500/30 bg-red-500/10 hover:bg-red-500 hover:text-white rounded text-red-500 cursor-pointer transition active:scale-95"
                                      title="Delete Fixture"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="text-xs font-black text-slate-900 dark:text-white flex justify-between gap-2">
                                <span className="truncate">{m.homeTeam}</span>
                                <span className="font-mono text-slate-400">{m.status !== 'Scheduled' ? (m.homeScore ?? 0) : ''}</span>
                              </div>
                              <div className="text-xs font-black text-slate-900 dark:text-white flex justify-between gap-2 mt-0.5">
                                <span className="truncate">{m.awayTeam}</span>
                                <span className="font-mono text-slate-400">{m.status !== 'Scheduled' ? (m.awayScore ?? 0) : ''}</span>
                              </div>
                              <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-1.5 text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                                <Calendar className={`w-3 h-3 ${isMFriendly ? 'text-orange-500' : 'text-emerald-550'}`} />
                                <span>{formatMatchDateDisplay(m.date)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-250">
                      {/* Left Panel: Compact Matches List (visible on desktop, hidden on mobile) */}
                      {compactMatchesListEl}

                      {/* Right Panel: Detail Card (12 cols on mobile, 8 cols on desktop) */}
                      <div className="lg:col-span-8 bg-slate-50 dark:bg-slate-950/40 p-1 rounded-3xl border border-slate-200/60 dark:border-slate-850 shadow-xs">
                        {/* Mobile Back Header */}
                        <div className="flex lg:hidden items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800 mb-4 bg-white dark:bg-slate-900 rounded-2xl shadow-xs">
                          <button 
                            onClick={() => activeSetSelectedMatchId?.(null)}
                            className="flex items-center gap-1.5 text-xs font-black text-slate-600 dark:text-slate-350 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                          >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Back to Matches List</span>
                          </button>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Match Details</span>
                        </div>

                        <div className="space-y-6 text-left animate-in fade-in duration-200">
                      {/* Top Header Controls (Action Buttons) */}
                      <div className="flex items-center justify-end flex-wrap gap-2 py-1 border-b border-slate-100 dark:border-slate-800 pb-4">
                        {/* Attendance / Session Link */}
                            {onNavigateToSession && (
                              <button
                                onClick={() => onNavigateToSession(match)}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-650 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-xs active:scale-95"
                              >
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Attendance</span>
                              </button>
                            )}


                          </div>

                      {/* Date and Format Labels */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-black mb-2.5 px-1">
                        <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-450 uppercase tracking-wider text-[10px]">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formatMatchDateDisplay(match.date)}
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-extrabold border ${
                            isFriendlyMatch
                              ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-900/40'
                              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40'
                          }`}>
                            {isFriendlyMatch ? 'Friendly Match' : 'League Match'}
                          </span>
                          {match.format && (
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-750 dark:text-slate-300 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider">
                              {match.format}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Main Score Board Hero Card */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl shadow-md p-4 sm:p-6 relative overflow-hidden" id="active-match-scoreboard">
                        <div className="grid grid-cols-3 items-center justify-between gap-2 sm:gap-6">
                          
                          {/* Home Team Column */}
                          <div className="flex flex-col items-center text-center space-y-2 col-span-1">
                            <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full ${getTeamColorClass(match.homeTeam)} flex items-center justify-center text-white text-base sm:text-xl font-black shadow-md border-2 border-white dark:border-slate-850 shrink-0`}>
                              {getInitials(match.homeTeam)}
                            </div>
                            <div className="w-full">
                              <div className="text-sm sm:text-lg md:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight truncate max-w-full">
                                {match.homeTeam}
                              </div>
                              <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Home</span>
                            </div>
                          </div>

                          {/* Center Score Display Column */}
                          <div className="flex flex-col items-center text-center space-y-1 col-span-1" onClick={handleScoreboardClick}>
                            {match.status === 'Scheduled' ? (
                              <div className="flex flex-col items-center gap-2">
                                <div className="text-2xl sm:text-4xl text-slate-400 dark:text-slate-600 font-black tracking-wider">VS</div>
                                <div className="flex flex-wrap justify-center gap-1.5 mt-1">
                                  <button 
                                    data-action="go-live"
                                    className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white font-extrabold text-[9px] uppercase tracking-wider rounded-md transition active:scale-95 cursor-pointer shadow-sm shrink-0"
                                  >
                                    🔴 Go Live
                                  </button>
                                  <button 
                                    data-action="set-score"
                                    className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-555 text-white font-extrabold text-[9px] uppercase tracking-wider rounded-md transition active:scale-95 cursor-pointer shadow-sm shrink-0"
                                  >
                                    📝 Score
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5 sm:gap-3">
                                {/* Home score adjust decrease */}
                                <div className="flex flex-col items-center">
                                  <button 
                                    data-action="home-dec"
                                    className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center font-black text-slate-700 dark:text-slate-300 cursor-pointer active:scale-90 text-[10px] transition select-none"
                                    title="Decrease Home Score"
                                  >
                                    -
                                  </button>
                                </div>

                                <div className="text-2xl sm:text-4xl md:text-5xl font-black font-mono tracking-tighter text-slate-950 dark:text-white min-w-[20px] text-center">
                                  {parseInt(match.homeScore as any, 10) || 0}
                                </div>

                                {/* Home score adjust increase */}
                                <div className="flex flex-col items-center">
                                  <button 
                                    data-action="home-inc"
                                    className="w-5 h-5 rounded bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 flex items-center justify-center font-black text-emerald-700 dark:text-emerald-400 cursor-pointer active:scale-90 text-[10px] transition select-none"
                                    title="Increase Home Score"
                                  >
                                    +
                                  </button>
                                </div>

                                <div className="text-lg text-slate-400 dark:text-slate-600 font-extrabold px-0.5 sm:px-1">-</div>

                                {/* Away score adjust decrease */}
                                <div className="flex flex-col items-center">
                                  <button 
                                    data-action="away-dec"
                                    className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center font-black text-slate-700 dark:text-slate-300 cursor-pointer active:scale-90 text-[10px] transition select-none"
                                    title="Decrease Away Score"
                                  >
                                    -
                                  </button>
                                </div>

                                <div className="text-2xl sm:text-4xl md:text-5xl font-black font-mono tracking-tighter text-slate-950 dark:text-white min-w-[20px] text-center">
                                  {parseInt(match.awayScore as any, 10) || 0}
                                </div>

                                {/* Away score adjust increase */}
                                <div className="flex flex-col items-center">
                                  <button 
                                    data-action="away-inc"
                                    className="w-5 h-5 rounded bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 flex items-center justify-center font-black text-emerald-700 dark:text-emerald-400 cursor-pointer active:scale-90 text-[10px] transition select-none"
                                    title="Increase Away Score"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            )}
                            
                            <div className="mt-1">
                              <span className={`text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                match.status === 'Live' ? 'bg-red-500/10 text-red-600 border-red-500/20 animate-pulse' :
                                match.status === 'Played' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                'bg-blue-500/10 text-blue-600 border-blue-500/20'
                              }`}>
                                {match.status === 'Played' ? 'Completed' : match.status}
                              </span>
                            </div>
                          </div>

                          {/* Away Team Column */}
                          <div className="flex flex-col items-center text-center space-y-2 col-span-1">
                            <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full ${getTeamColorClass(match.awayTeam)} flex items-center justify-center text-white text-base sm:text-xl font-black shadow-md border-2 border-white dark:border-slate-850 shrink-0`}>
                              {getInitials(match.awayTeam)}
                            </div>
                            <div className="w-full">
                              <div className="text-sm sm:text-lg md:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight truncate max-w-full">
                                {match.awayTeam}
                              </div>
                              <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Away</span>
                            </div>
                          </div>

                        </div>

                        {/* Unassociated Goals Alert */}
                        {(() => {
                          const homeLeagueGoalsCount = goalsList.filter(g => g.team === 'home' && g.type === 'League').length;
                          const awayLeagueGoalsCount = goalsList.filter(g => g.team === 'away' && g.type === 'League').length;
                          const homeScore = parseInt(match.homeScore as any, 10) || 0;
                          const awayScore = parseInt(match.awayScore as any, 10) || 0;
                          const unassociatedHomeGoals = Math.max(0, homeScore - homeLeagueGoalsCount);
                          const unassociatedAwayGoals = Math.max(0, awayScore - awayLeagueGoalsCount);
                          const totalUnassociatedGoals = unassociatedHomeGoals + unassociatedAwayGoals;

                          const friendlyGoalsCount = goalsList.filter(g => g.type === 'Friendly').length;
                          const totalFriendlyScore = homeScore + awayScore;
                          const unassociatedFriendlyGoals = Math.max(0, totalFriendlyScore - friendlyGoalsCount);

                          const unassociatedCount = isFriendlyMatch ? unassociatedFriendlyGoals : totalUnassociatedGoals;

                          if (match.status !== 'Scheduled' && unassociatedCount > 0) {
                            return (
                              <div className="mt-5 p-3.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/25 dark:border-amber-500/15 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-left animate-pulse">
                                <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-full bg-amber-500/20 dark:bg-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                                    <AlertCircle className="w-4.5 h-4.5" />
                                  </div>
                                  <div>
                                    <h5 className="text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">Unassociated Goals</h5>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                                      {unassociatedCount} goal{unassociatedCount > 1 ? 's' : ''} scored has no player associated yet.
                                    </p>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => setActiveGoalSelector({ team: null, type: isFriendlyMatch ? 'Friendly' : 'League' })}
                                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition duration-150 active:scale-95 cursor-pointer shadow-sm hover:shadow-md shrink-0 flex items-center gap-1"
                                >
                                  🎯 Associate Scorer
                                </button>
                              </div>
                            );
                          }
                          return null;
                        })()}



                        {/* League Match Scorers list */}
                        {!isFriendlyMatch && (homeGoalsGrouped.length > 0 || awayGoalsGrouped.length > 0) && (
                          <div className="border-t border-slate-100 dark:border-slate-800/80 mt-5 pt-4 text-center">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center justify-center gap-1.5">
                              <Award className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Match Scorers</span>
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs" onClick={handleScorersContainerClick}>
                              {/* Home Goals */}
                              <div className="space-y-2 flex flex-col items-center sm:items-end border-b sm:border-b-0 sm:border-r border-slate-150 dark:border-slate-800/60 pb-4 sm:pb-0 pr-0 sm:pr-4">
                                {homeGoalsGrouped.map(g => {
                                  const initials = getInitials(g.playerName);
                                  return (
                                    <div 
                                      key={g.playerId || g.playerName} 
                                      className="flex items-center justify-between gap-3 w-full max-w-xs pl-3 pr-2 py-1.5 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 hover:border-emerald-500/35 hover:bg-white dark:hover:bg-slate-900 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 shadow-3xs transition duration-150"
                                    >
                                      <div className="flex items-center gap-2 truncate">
                                        <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full ${getTeamColorClass(match.homeTeam)} flex items-center justify-center text-white text-[9px] sm:text-[10px] font-black shrink-0 shadow-xs`}>
                                          {initials}
                                        </div>
                                        <span className="truncate font-black text-xs sm:text-sm text-slate-900 dark:text-white">{g.playerName}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="px-1.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30 font-black text-[10px] flex items-center gap-1">
                                          ⚽ <span className="font-mono">x{g.goalIds.length}</span>
                                        </span>
                                        <div className="flex items-center gap-1">
                                          <button 
                                            data-action="remove-goal"
                                            data-goal-id={g.goalIds[g.goalIds.length - 1]}
                                            className="w-5.5 h-5.5 rounded-lg bg-slate-100 hover:bg-red-500 hover:text-white dark:bg-slate-800 dark:hover:bg-red-600 dark:hover:text-white transition flex items-center justify-center font-black text-xs shrink-0 cursor-pointer shadow-3xs" 
                                            title="Decrease player goals"
                                          >
                                            -
                                          </button>
                                          {g.playerId && (
                                            <button 
                                              data-action="add-goal"
                                              data-player-id={g.playerId}
                                              data-team="home"
                                              data-type="League"
                                              className="w-5.5 h-5.5 rounded-lg bg-emerald-100 hover:bg-emerald-500 hover:text-white dark:bg-emerald-950/60 dark:hover:bg-emerald-500 dark:hover:text-white transition flex items-center justify-center font-black text-xs shrink-0 cursor-pointer shadow-3xs" 
                                              title="Increase player goals"
                                            >
                                              +
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Away Goals */}
                              <div className="space-y-2 flex flex-col items-center sm:items-start pl-0 sm:pl-4 pt-2 sm:pt-0">
                                {awayGoalsGrouped.map(g => {
                                  const initials = getInitials(g.playerName);
                                  return (
                                    <div 
                                      key={g.playerId || g.playerName} 
                                      className="flex items-center justify-between gap-3 w-full max-w-xs pl-3 pr-2 py-1.5 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 hover:border-emerald-500/35 hover:bg-white dark:hover:bg-slate-900 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 shadow-3xs transition duration-150"
                                    >
                                      <div className="flex items-center gap-2 truncate">
                                        <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full ${getTeamColorClass(match.awayTeam)} flex items-center justify-center text-white text-[9px] sm:text-[10px] font-black shrink-0 shadow-xs`}>
                                          {initials}
                                        </div>
                                        <span className="truncate font-black text-xs sm:text-sm text-slate-900 dark:text-white">{g.playerName}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="px-1.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30 font-black text-[10px] flex items-center gap-1">
                                          ⚽ <span className="font-mono">x{g.goalIds.length}</span>
                                        </span>
                                        <div className="flex items-center gap-1">
                                          <button 
                                            data-action="remove-goal"
                                            data-goal-id={g.goalIds[g.goalIds.length - 1]}
                                            className="w-5.5 h-5.5 rounded-lg bg-slate-100 hover:bg-red-500 hover:text-white dark:bg-slate-800 dark:hover:bg-red-600 dark:hover:text-white transition flex items-center justify-center font-black text-xs shrink-0 cursor-pointer shadow-3xs" 
                                            title="Decrease player goals"
                                          >
                                            -
                                          </button>
                                          {g.playerId && (
                                            <button 
                                              data-action="add-goal"
                                              data-player-id={g.playerId}
                                              data-team="away"
                                              data-type="League"
                                              className="w-5.5 h-5.5 rounded-lg bg-emerald-100 hover:bg-emerald-500 hover:text-white dark:bg-emerald-950/60 dark:hover:bg-emerald-500 dark:hover:text-white transition flex items-center justify-center font-black text-xs shrink-0 cursor-pointer shadow-3xs" 
                                              title="Increase player goals"
                                            >
                                              +
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Friendly goals list */}
                        {friendlyGoalsGrouped.length > 0 && (
                          <div className="border-t border-slate-100 dark:border-slate-800/80 mt-5 pt-4 text-center">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center justify-center gap-1.5">
                              <Award className="w-3.5 h-3.5 text-orange-500" />
                              <span>{isFriendlyMatch ? "Match Goals" : "Friendly Match Goals"}</span>
                            </h4>
                            <div className="flex flex-wrap justify-center gap-2" onClick={handleScorersContainerClick}>
                              {friendlyGoalsGrouped.map(g => {
                                const initials = getInitials(g.playerName);
                                return (
                                  <div 
                                    key={g.playerId || g.playerName} 
                                    className="inline-flex items-center justify-between gap-3 pl-3 pr-2 py-1.5 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 hover:border-orange-500/35 hover:bg-white dark:hover:bg-slate-900 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 shadow-3xs transition duration-150"
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-[9px] sm:text-[10px] font-black shrink-0 shadow-xs">
                                        {initials}
                                      </div>
                                      <span className="truncate font-black text-xs sm:text-sm text-slate-900 dark:text-white">{g.playerName}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className="px-1.5 py-0.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border border-orange-100/50 dark:border-orange-900/30 font-black text-[10px] flex items-center gap-1">
                                        ⚽ <span className="font-mono">x{g.goalIds.length}</span>
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <button 
                                          data-action="remove-goal"
                                          data-goal-id={g.goalIds[g.goalIds.length - 1]}
                                          className="w-5.5 h-5.5 rounded-lg bg-slate-100 hover:bg-red-500 hover:text-white dark:bg-slate-800 dark:hover:bg-red-600 dark:hover:text-white transition flex items-center justify-center font-black text-xs shrink-0 cursor-pointer shadow-3xs" 
                                          title="Decrease player goals"
                                        >
                                          -
                                        </button>
                                        {g.playerId && (
                                          <button 
                                            data-action="add-goal"
                                            data-player-id={g.playerId}
                                            data-team={null}
                                            data-type="Friendly"
                                            className="w-5.5 h-5.5 rounded-lg bg-orange-100 hover:bg-orange-500 hover:text-white dark:bg-orange-950/60 dark:hover:bg-orange-500 dark:hover:text-white transition flex items-center justify-center font-black text-xs shrink-0 cursor-pointer shadow-3xs" 
                                            title="Increase player goals"
                                          >
                                            +
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Dropdown list to select who scored */}
                        {activeGoalSelector && (
                          <div className={`mt-5 p-5 border rounded-3xl animate-in slide-in-from-top-3 duration-150 shadow-md ${
                            activeGoalSelector.type === 'League'
                              ? 'border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/5'
                              : 'border-orange-500/30 bg-orange-50/20 dark:bg-orange-950/5'
                          }`}>
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/60">
                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                  activeGoalSelector.type === 'League'
                                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40'
                                    : 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-900/40'
                                }`}>
                                  {activeGoalSelector.type} Goal
                                </span>
                                <h5 className="text-[11px] sm:text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider font-sans flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                                  <span>
                                    {activeGoalSelector.team === null 
                                      ? `Associate Scorer Panel` 
                                      : `Select Scorer: ${activeGoalSelector.team === 'home' ? match.homeTeam : match.awayTeam}`
                                    }
                                  </span>
                                </h5>
                              </div>
                              <button 
                                onClick={() => { setActiveGoalSelector(null); setScorerSearchQuery(''); }} 
                                className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition duration-150 cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>

                            {/* Search bar specifically for scorers inside activeGoalSelector */}
                            <div className="mb-4 max-w-md mx-auto relative flex items-center">
                              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                              <input
                                type="text"
                                placeholder="Search players by name..."
                                value={scorerSearchQuery}
                                onChange={e => setScorerSearchQuery(e.target.value)}
                                className="w-full text-xs pl-10 pr-9 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition duration-150"
                              />
                              {scorerSearchQuery && (
                                <button
                                  onClick={() => setScorerSearchQuery('')}
                                  className="absolute right-3 text-xs font-bold text-slate-400 hover:text-slate-650 cursor-pointer"
                                >
                                  ✕
                                </button>
                              )}
                            </div>

                            {/* Render either single list for Friendly, split columns (team === null) for League, or a single focused column for League */}
                            {activeGoalSelector.type === 'Friendly' ? (
                              <div className="space-y-4">
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center leading-relaxed max-w-xl mx-auto">
                                  Select the player who scored. Friendly goals count for player stats, but do not change the match score. Any checked-in player is eligible.
                                </p>
                                <div className="max-w-md mx-auto p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-2xl flex flex-col">
                                  <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800/30 pb-2">
                                    <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">
                                      ⚽ Checked-In Players
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto scrollbar-thin pr-1">
                                    {(() => {
                                      const eligibleScorers = presentPlayers.filter(p =>
                                        p.name.toLowerCase().includes(scorerSearchQuery.toLowerCase())
                                      );
                                      if (eligibleScorers.length === 0) {
                                        return <div className="text-[10px] text-slate-400 italic col-span-2 text-center py-6">No players available</div>;
                                      }
                                      return eligibleScorers.map(p => {
                                        const existingCount = goalsList.filter(g => g.playerId === p.id && g.type === 'Friendly').length;
                                        const initials = getInitials(p.name);
                                        return (
                                          <button
                                            key={p.id}
                                            onClick={() => handleAddGoalScorer(p.id, null, 'Friendly')}
                                            className="px-2.5 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-150 hover:border-orange-500 dark:border-slate-800 dark:hover:border-orange-500/60 text-[11px] font-bold text-slate-700 dark:text-slate-200 rounded-xl transition duration-150 text-left cursor-pointer active:scale-95 min-h-[40px] flex items-center justify-between gap-2 shadow-3xs hover:bg-white dark:hover:bg-slate-900 hover:shadow-xs"
                                          >
                                            <div className="flex items-center gap-2 truncate">
                                              <div className="w-5.5 h-5.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[8px] font-black shrink-0">
                                                {initials}
                                              </div>
                                              <span className="truncate">{getPlayerDisplayName(p)}</span>
                                            </div>
                                            {existingCount > 0 && (
                                              <span className="px-1.5 py-0.5 rounded bg-orange-150 dark:bg-orange-950 text-[9px] font-mono font-black text-orange-850 dark:text-orange-400 shrink-0">
                                                x{existingCount}
                                              </span>
                                            )}
                                          </button>
                                        );
                                      });
                                    })()}
                                  </div>
                                </div>
                              </div>
                            ) : activeGoalSelector.team === null ? (
                              <div className="space-y-4">
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center leading-relaxed max-w-xl mx-auto">
                                  {activeGoalSelector.type === 'League' 
                                    ? "Select the player who scored. League goals update the official match scoreboard."
                                    : "Select the player who scored. Friendly goals count for player stats, but do not change the league score. Any checked-in player is eligible."
                                  }
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Home Team Scorer Column */}
                                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-2xl flex flex-col border-l-4 border-l-emerald-500/40">
                                    <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800/30 pb-2">
                                      <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${getTeamColorClass(match.homeTeam)}`} />
                                        <span className="truncate">{match.homeTeam}</span>
                                      </span>
                                      <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider shrink-0">
                                        {activeGoalSelector.type === 'League' ? 'Squad Only' : 'Present Only'}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto scrollbar-thin pr-1">
                                      {(() => {
                                        const eligibleScorers = (activeGoalSelector.type === 'League'
                                          ? getStepperPlayers('home').slice(0, 14)
                                          : presentPlayers).filter(p =>
                                            p.name.toLowerCase().includes(scorerSearchQuery.toLowerCase())
                                          );
                                        if (eligibleScorers.length === 0) {
                                          return <div className="text-[10px] text-slate-400 italic col-span-2 text-center py-6">No players available</div>;
                                        }
                                        return eligibleScorers.map(p => {
                                          const existingCount = goalsList.filter(g => g.playerId === p.id && g.type === activeGoalSelector.type).length;
                                          const initials = getInitials(p.name);
                                          return (
                                            <button
                                              key={p.id}
                                              onClick={() => handleAddGoalScorer(p.id, 'home', activeGoalSelector.type)}
                                              className={`px-2.5 py-2 bg-slate-50 dark:bg-slate-950/40 border text-[11px] font-bold text-slate-750 dark:text-slate-200 rounded-xl transition duration-150 text-left cursor-pointer active:scale-95 min-h-[40px] flex items-center justify-between gap-2 shadow-3xs hover:bg-white dark:hover:bg-slate-900 hover:shadow-xs ${
                                                activeGoalSelector.type === 'League'
                                                  ? 'border-slate-150 hover:border-emerald-500 dark:border-slate-800 dark:hover:border-emerald-550/60'
                                                  : 'border-slate-150 hover:border-orange-500 dark:border-slate-800 dark:hover:border-orange-550/60'
                                              }`}
                                            >
                                              <div className="flex items-center gap-2 truncate">
                                                <div className="w-5.5 h-5.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-650 dark:text-slate-350 flex items-center justify-center text-[8px] font-black shrink-0">
                                                  {initials}
                                                </div>
                                                <span className="truncate">{getPlayerDisplayName(p)}</span>
                                              </div>
                                              {existingCount > 0 && (
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-black shrink-0 ${
                                                  activeGoalSelector.type === 'League'
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                                                    : 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-400'
                                                }`}>
                                                  x{existingCount}
                                                </span>
                                              )}
                                            </button>
                                          );
                                        });
                                      })()}
                                    </div>
                                  </div>

                                  {/* Away Team Scorer Column */}
                                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-2xl flex flex-col border-l-4 border-l-emerald-500/40">
                                    <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800/30 pb-2">
                                      <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${getTeamColorClass(match.awayTeam)}`} />
                                        <span className="truncate">{match.awayTeam}</span>
                                      </span>
                                      <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider shrink-0">
                                        {activeGoalSelector.type === 'League' ? 'Squad Only' : 'Present Only'}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto scrollbar-thin pr-1">
                                      {(() => {
                                        const eligibleScorers = (activeGoalSelector.type === 'League'
                                          ? getStepperPlayers('away').slice(0, 14)
                                          : presentPlayers).filter(p =>
                                            p.name.toLowerCase().includes(scorerSearchQuery.toLowerCase())
                                          );
                                        if (eligibleScorers.length === 0) {
                                          return <div className="text-[10px] text-slate-400 italic col-span-2 text-center py-6">No players available</div>;
                                        }
                                        return eligibleScorers.map(p => {
                                          const existingCount = goalsList.filter(g => g.playerId === p.id && g.type === activeGoalSelector.type).length;
                                          const initials = getInitials(p.name);
                                          return (
                                            <button
                                              key={p.id}
                                              onClick={() => handleAddGoalScorer(p.id, 'away', activeGoalSelector.type)}
                                              className={`px-2.5 py-2 bg-slate-50 dark:bg-slate-950/40 border text-[11px] font-bold text-slate-750 dark:text-slate-200 rounded-xl transition duration-150 text-left cursor-pointer active:scale-95 min-h-[40px] flex items-center justify-between gap-2 shadow-3xs hover:bg-white dark:hover:bg-slate-900 hover:shadow-xs ${
                                                activeGoalSelector.type === 'League'
                                                  ? 'border-slate-150 hover:border-emerald-500 dark:border-slate-800 dark:hover:border-emerald-550/60'
                                                  : 'border-slate-150 hover:border-orange-500 dark:border-slate-800 dark:hover:border-orange-550/60'
                                              }`}
                                            >
                                              <div className="flex items-center gap-2 truncate">
                                                <div className="w-5.5 h-5.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-650 dark:text-slate-350 flex items-center justify-center text-[8px] font-black shrink-0">
                                                  {initials}
                                                </div>
                                                <span className="truncate">{getPlayerDisplayName(p)}</span>
                                              </div>
                                              {existingCount > 0 && (
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-black shrink-0 ${
                                                  activeGoalSelector.type === 'League'
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                                                    : 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-400'
                                                }`}>
                                                  x{existingCount}
                                                </span>
                                              )}
                                            </button>
                                          );
                                        });
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-3 font-semibold text-center">
                                  Select a player below to associate them with the goal:
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                  {(() => {
                                    const eligibleScorers = (activeGoalSelector.type === 'League'
                                      ? getStepperPlayers(activeGoalSelector.team!).slice(0, 14)
                                      : presentPlayers).filter(p =>
                                        p.name.toLowerCase().includes(scorerSearchQuery.toLowerCase())
                                      );
                                    if (eligibleScorers.length === 0) {
                                      return <div className="text-xs text-slate-400 italic col-span-2 sm:col-span-4 p-4 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">No players found matching search.</div>;
                                    }
                                    return eligibleScorers.map(p => {
                                      const existingCount = goalsList.filter(g => g.playerId === p.id && g.type === activeGoalSelector.type).length;
                                      const initials = getInitials(p.name);
                                      return (
                                        <button
                                          key={p.id}
                                          onClick={() => handleAddGoalScorer(p.id, activeGoalSelector.team!, activeGoalSelector.type)}
                                          className={`px-3 py-2.5 bg-white dark:bg-slate-900 border text-xs font-black text-slate-800 dark:text-slate-200 rounded-xl transition duration-150 truncate text-left cursor-pointer active:scale-95 min-h-[44px] flex items-center justify-between gap-2 shadow-2xs group hover:shadow-xs ${
                                            activeGoalSelector.type === 'League'
                                              ? 'border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400'
                                              : 'border-slate-200 dark:border-slate-800 hover:border-orange-500 hover:text-orange-600 dark:hover:text-orange-400'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2 truncate">
                                            <div className="w-5.5 h-5.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-300 flex items-center justify-center text-[8px] font-black shrink-0">
                                              {initials}
                                            </div>
                                            <span className="truncate group-hover:translate-x-0.5 transition-transform">⚽ {p.name}</span>
                                          </div>
                                          {existingCount > 0 && (
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-black shrink-0 ${
                                              activeGoalSelector.type === 'League'
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                                                : 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-400'
                                            }`}>
                                              x{existingCount}
                                            </span>
                                          )}
                                        </button>
                                      );
                                    });
                                  })()}
                                </div>
                              </div>
                            )}

                            {/* Done Button to close the scorer selector */}
                            <div className="flex justify-center mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/60">
                              <button
                                onClick={() => { setActiveGoalSelector(null); setScorerSearchQuery(''); }}
                                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-555 text-white font-black text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer min-h-[38px] flex items-center gap-1.5"
                              >
                                <CheckCircle2 className="w-4 h-4" /> Done Adding Goals
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Match Controls Panel (Wide, touch-friendly grid) */}
                        {match.status !== 'Scheduled' && (
                          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col items-center gap-3 w-full">
                            


                            <div className="w-full max-w-md grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {match.status === 'Live' && (
                                <button
                                  onClick={() => handleUpdateStatus('Played')}
                                  className="col-span-full bg-emerald-600 hover:bg-emerald-555 text-white text-xs font-black py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-all duration-150 active:scale-95 cursor-pointer min-h-[44px]"
                                >
                                  <CheckCircle2 className="w-4 h-4" /> Finish Match (Full Time)
                                </button>
                              )}

                              {/* Goal Buttons */}
                              {!isFriendlyMatch ? (
                                <button
                                  onClick={() => setActiveGoalSelector({ team: null, type: 'League' })}
                                  className="col-span-full border border-emerald-500 hover:bg-emerald-500/5 text-emerald-650 dark:text-emerald-400 text-xs font-black py-3 rounded-xl flex items-center justify-center gap-2 transition duration-150 cursor-pointer min-h-[44px]"
                                >
                                  <Target className="w-4 h-4" /> Add Goal
                                </button>
                              ) : (
                                <button
                                  onClick={() => setActiveGoalSelector({ team: null, type: 'Friendly' })}
                                  className="col-span-full border border-emerald-500 hover:bg-emerald-500/5 text-emerald-650 dark:text-emerald-400 text-xs font-black py-3 rounded-xl flex items-center justify-center gap-2 transition duration-150 cursor-pointer min-h-[44px]"
                                >
                                  <Plus className="w-4 h-4" /> Add Goal
                                </button>
                              )}
                            </div>

                            {/* Actions line with Safer Forfeit Panel */}
                            <div className="flex flex-col items-center justify-center w-full max-w-md mt-1">
                              {!isFriendlyMatch && !showForfeitPanel && (
                                <button
                                  onClick={() => setActiveGoalSelector({ team: null, type: 'Friendly' })}
                                  className="text-xs font-black text-orange-500 hover:text-orange-600 transition flex items-center gap-1 cursor-pointer min-h-[36px] mb-2"
                                >
                                  <Plus className="w-3.5 h-3.5" /> Add Friendly Goal
                                </button>
                              )}

                              {showForfeitPanel ? (
                                <div className="w-full bg-red-50/75 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl p-4 mt-3 text-center shadow-lg shadow-red-500/5 animate-in slide-in-from-bottom-2 duration-200 relative overflow-hidden">
                                  {/* Background highlight pill */}
                                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500" />
                                  
                                  <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 mb-2">
                                    <AlertCircle className="w-5 h-5 animate-pulse" />
                                    <span className="text-xs font-black uppercase tracking-wider">
                                      Forfeit Match Protocol
                                    </span>
                                  </div>
                                  
                                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold mb-4 px-2 leading-relaxed">
                                    Forfeiting assigns a permanent <span className="text-red-600 dark:text-red-400 font-bold">0-3 defeat</span> to the selected team. This action instantly updates league standings and cannot be reversed.
                                  </p>

                                  {forfeitConfirmTeam === null ? (
                                    <div className="space-y-3">
                                      <div className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                                        Identify the Forfeiting Side
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-3">
                                        <button
                                          onClick={() => setForfeitConfirmTeam('home')}
                                          className="p-3 bg-white dark:bg-slate-900 hover:border-red-400 dark:hover:border-red-800 border border-slate-200 dark:border-slate-850 rounded-xl transition duration-150 active:scale-95 cursor-pointer flex flex-col items-center justify-center gap-2 group"
                                        >
                                          <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-500 dark:text-red-400 group-hover:scale-110 transition">
                                            🏳️
                                          </div>
                                          <span className="text-xs font-black text-slate-800 dark:text-slate-200 text-center truncate max-w-full">
                                            {match.homeTeam}
                                          </span>
                                          <span className="text-[9px] font-bold text-red-500 uppercase tracking-tight">
                                            Will lose 0-3
                                          </span>
                                        </button>

                                        <button
                                          onClick={() => setForfeitConfirmTeam('away')}
                                          className="p-3 bg-white dark:bg-slate-900 hover:border-red-400 dark:hover:border-red-800 border border-slate-200 dark:border-slate-850 rounded-xl transition duration-150 active:scale-95 cursor-pointer flex flex-col items-center justify-center gap-2 group"
                                        >
                                          <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-500 dark:text-red-400 group-hover:scale-110 transition">
                                            🏳️
                                          </div>
                                          <span className="text-xs font-black text-slate-800 dark:text-slate-200 text-center truncate max-w-full">
                                            {match.awayTeam}
                                          </span>
                                          <span className="text-[9px] font-bold text-red-500 uppercase tracking-tight">
                                            Will lose 0-3
                                          </span>
                                        </button>
                                      </div>

                                      <button
                                        onClick={() => {
                                          setShowForfeitPanel(false);
                                          setForfeitConfirmTeam(null);
                                        }}
                                        className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg mt-2 transition cursor-pointer"
                                      >
                                        Dismiss Protocol
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-150">
                                      <div className="p-3 bg-red-500/5 dark:bg-red-950/10 border border-red-500/10 dark:border-red-900/20 rounded-xl">
                                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                          Are you absolutely sure <span className="text-red-600 dark:text-red-400 font-black">{forfeitConfirmTeam === 'home' ? match.homeTeam : match.awayTeam}</span> forfeited?
                                        </div>
                                        <div className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 mt-2 tracking-wider flex items-center justify-center gap-1">
                                          <Check className="w-3.5 h-3.5" /> 
                                          {forfeitConfirmTeam === 'home' ? (
                                            <span>{match.awayTeam} wins 3-0</span>
                                          ) : (
                                            <span>{match.homeTeam} wins 3-0</span>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex flex-col sm:flex-row gap-2.5">
                                        <button
                                          onClick={() => handleForfeitTeam(forfeitConfirmTeam)}
                                          className="py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl shadow-md hover:shadow-red-600/10 transition active:scale-95 cursor-pointer flex-1 flex items-center justify-center gap-1.5"
                                        >
                                          <Check className="w-4 h-4" /> Yes, Finalize Forfeit
                                        </button>
                                        <button
                                          onClick={() => setForfeitConfirmTeam(null)}
                                          className="py-2.5 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-xs font-black text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95 cursor-pointer flex-1 flex items-center justify-center gap-1.5"
                                        >
                                          <ArrowLeft className="w-4 h-4" /> Go Back
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setShowForfeitPanel(true);
                                    setForfeitConfirmTeam(null);
                                  }}
                                  className="text-xs font-black text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-450 transition flex items-center gap-1 cursor-pointer min-h-[36px] mt-2 opacity-65 hover:opacity-100 hover:scale-105"
                                >
                                  🏳️ Forfeit Match
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                      </div>

                      {/* Player of the Match Section */}
                      <div className="bg-gradient-to-br from-amber-500/[0.03] via-white to-slate-50/50 dark:from-amber-500/[0.015] dark:via-slate-900 dark:to-slate-950/80 border border-slate-200/70 dark:border-slate-800 rounded-3xl shadow-xs p-6 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                        {/* Elegant Top Decorative Accent */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/20 via-yellow-400/30 to-amber-600/10 opacity-70" />
                        <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <span>⭐ Player of the Day</span>
                        </h4>
                        {match.playerOfMatch && match.playerOfMatch !== 'N/A' && match.playerOfMatch !== 'N/A (Forfeit)' ? (
                          <div className="space-y-2.5 mb-4">
                            {match.playerOfMatch.split(/&|and|,|\//).map(s => s.trim()).filter(Boolean).map((winner, idx) => (
                              <div key={idx} className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-amber-500 shrink-0">
                                    <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                                  </div>
                                  <div>
                                    <div className="text-sm font-black text-slate-900 dark:text-white">{winner}</div>
                                    <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">Player of the Day ⭐</div>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => handleRemovePlayerOfMatch(winner)}
                                  className="text-xs font-bold text-slate-400 hover:text-red-500 flex items-center gap-1 transition cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" /> Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : match.playerOfMatch === 'N/A (Forfeit)' ? (
                          <div className="bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 mb-4">
                            N/A (Forfeit)
                          </div>
                        ) : null}

                        {match.playerOfMatch !== 'N/A (Forfeit)' && (
                          <div className="space-y-3">
                            <div className="relative">
                              <select
                                id="potd-select"
                                data-action="select-potd"
                                value={match.potdWinner || match.playerOfMatch || ""}
                                onChange={(e) => {
                                  const selectedValue = e.target.value;
                                  autoSaveRecord(selectedValue);
                                }}
                                className="w-full text-sm p-3 border border-slate-200 dark:border-slate-850 dark:bg-slate-950 dark:text-slate-100 rounded-2xl focus:outline-emerald-550 focus:ring-2 focus:ring-emerald-500/20 bg-white"
                              >
                                <option value="">-- Select Player of the Day --</option>
                                {players.map(p => (
                                  <option key={p.id} value={p.name}>{p.name}</option>
                                ))}
                              </select>
                            </div>

                            <div className="relative">
                            <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 px-3 py-1.5 shadow-sm">
                              <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                              <input 
                                type="text"
                                placeholder={match.playerOfMatch ? "Add another player of the day..." : "Search player of the day..."}
                                value={playerSearchQuery}
                                onChange={e => {
                                  setPlayerSearchQuery(e.target.value);
                                  setShowPOMDropdown(true);
                                }}
                                onFocus={() => setShowPOMDropdown(true)}
                                className="w-full text-sm bg-transparent border-none outline-none focus:ring-0 p-1.5 text-slate-800 dark:text-slate-200"
                              />
                              {playerSearchQuery && (
                                <button onClick={() => setPlayerSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>

                            {showPOMDropdown && (
                              <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-h-60 overflow-y-auto p-2.5 animate-in slide-in-from-top-1 duration-150">
                                {(() => {
                                  const eligiblePlayers = presentPlayers.filter(p => 
                                    p.name.toLowerCase().includes(playerSearchQuery.toLowerCase())
                                  );

                                  if (eligiblePlayers.length === 0) {
                                    return <div className="text-xs text-slate-500 dark:text-slate-400 p-3 italic text-center">No matching players found</div>;
                                  }

                                  return eligiblePlayers.map(player => {
                                    const isAlreadyWinner = match.playerOfMatch && match.playerOfMatch !== 'N/A' && match.playerOfMatch !== 'N/A (Forfeit)'
                                      ? match.playerOfMatch.split(/&|and|,|\//).map(s => s.trim()).filter(Boolean).includes(player.name)
                                      : false;

                                    return (
                                      <button
                                        key={player.id}
                                        disabled={isAlreadyWinner}
                                        onClick={() => {
                                          handleSetPlayerOfMatch(player.name);
                                          setPlayerSearchQuery('');
                                          setShowPOMDropdown(false);
                                        }}
                                        className={`w-full text-left px-3.5 py-2.5 text-xs font-black rounded-xl transition flex items-center gap-2.5 cursor-pointer border border-transparent mb-1 ${
                                          isAlreadyWinner
                                            ? "opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/30 text-slate-400"
                                            : "text-slate-950 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:border-slate-100 dark:hover:border-slate-750/50"
                                        }`}
                                      >
                                        <span className="text-sm shrink-0">{isAlreadyWinner ? "✅" : "⭐"}</span>
                                        <span className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-extrabold text-xs">{player.name}</span>
                                          {player.annualDuePaid && <span className="text-[11px] shrink-0" title="Annual Due Paid">✅</span>}
                                          {player.volunteeredToCook && <span className="text-[11px] shrink-0" title="Volunteered to Cook">🍲 🍗</span>}
                                          {player.endOfYearPartyAttendee && <span className="text-[11px] shrink-0" title="End of Year Party Attendee">🎉</span>}
                                        </span>
                                        {isAlreadyWinner && <span className="text-[9px] text-amber-600 dark:text-amber-400 font-extrabold uppercase ml-auto">Selected</span>}
                                        {!isAlreadyWinner && homeSquad.includes(player.id) && <span className="text-[9px] bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-300 px-2 py-0.5 rounded-md font-extrabold uppercase ml-auto border border-blue-200/50 dark:border-blue-900/40">Home Squad</span>}
                                        {!isAlreadyWinner && awaySquad.includes(player.id) && <span className="text-[9px] bg-pink-100 dark:bg-pink-950 text-pink-900 dark:text-pink-300 px-2 py-0.5 rounded-md font-extrabold uppercase ml-auto border border-pink-200/50 dark:border-pink-900/40">Away Squad</span>}
                                      </button>
                                    );
                                  });
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                        )}
                      </div>

                      {/* Squad Selection Container */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl shadow-xs p-6 space-y-4" onClick={handleSquadContainerClick}>
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                          <button
                            type="button"
                            onClick={() => setIsSquadExpanded(!isSquadExpanded)}
                            className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                          >
                            <Users className="w-4 h-4 text-slate-400" />
                            <span>Squad Selection / Match Team Allocation</span>
                            <span className="text-slate-400 text-[10px] ml-1">{isSquadExpanded ? '▲ Hide' : '▼ Expand'}</span>
                          </button>
                          
                          <div className="flex items-center gap-2">
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                              {homeSquad.length} vs {awaySquad.length} Players
                            </span>
                            <button
                              data-action="clear-squads"
                              className="p-1.5 text-slate-400 hover:text-slate-655 dark:hover:text-slate-200 rounded-lg transition cursor-pointer"
                              title="Reset squads"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {isSquadExpanded && (
                          <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                            {/* Captain's Selection Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-slate-900 dark:text-white">Captain's Selection</span>
                                <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                                  {presentCount} present • {registeredCount} registered
                                </span>
                              </div>

                              <button
                                data-action="autofill-squads"
                                className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-lg text-xs font-black transition cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Auto-fill</span>
                              </button>
                            </div>

                        {/* Squad Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          
                          {/* Home Squad Column */}
                          <div className={`border ${homeColors.borderClass} rounded-2xl overflow-hidden bg-white dark:bg-slate-900 flex flex-col min-h-[220px]`}>
                            <div className={`${getTeamColorClass(match.homeTeam)} text-white px-4 py-2.5 flex justify-between items-center font-black text-xs tracking-wider uppercase`}>
                              <span>{match.homeTeam}</span>
                              <span className="font-mono text-[11px]">{homeSquad.length}/{squadLimit}</span>
                            </div>

                            <div className="p-3 flex-1 flex flex-col gap-1">
                              {homeSquad.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20">
                                  <Users className={`w-8 h-8 ${homeColors.textClass} mb-1`} />
                                  <span className="text-xs font-bold">No players yet</span>
                                </div>
                              ) : (
                                players.filter(p => homeSquad.includes(p.id)).map(p => (
                                  <div key={p.id} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-7 h-7 rounded-full ${homeColors.badgeBg} ${homeColors.badgeText} flex items-center justify-center text-xs font-black shrink-0`}>
                                        {getInitials(p.name)}
                                      </div>
                                      <span className="text-xs font-extrabold text-slate-950 dark:text-white">{p.name}</span>
                                    </div>
                                    <button
                                      data-action="toggle-squad"
                                      data-player-id={p.id}
                                      data-team="none"
                                      className="p-1 hover:bg-slate-150 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 rounded-lg transition cursor-pointer"
                                    >
                                      <X className="w-3 h-3 text-slate-400 hover:text-red-500" />
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Away Squad Column */}
                          <div className={`border ${awayColors.borderClass} rounded-2xl overflow-hidden bg-white dark:bg-slate-900 flex flex-col min-h-[220px]`}>
                            <div className={`${getTeamColorClass(match.awayTeam)} text-white px-4 py-2.5 flex justify-between items-center font-black text-xs tracking-wider uppercase`}>
                              <span>{match.awayTeam}</span>
                              <span className="font-mono text-[11px]">{awaySquad.length}/{squadLimit}</span>
                            </div>

                            <div className="p-3 flex-1 flex flex-col gap-1">
                              {awaySquad.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20">
                                  <Users className={`w-8 h-8 ${awayColors.textClass} mb-1`} />
                                  <span className="text-xs font-bold">No players yet</span>
                                </div>
                              ) : (
                                players.filter(p => awaySquad.includes(p.id)).map(p => (
                                  <div key={p.id} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-7 h-7 rounded-full ${awayColors.badgeBg} ${awayColors.badgeText} flex items-center justify-center text-xs font-black shrink-0`}>
                                        {getInitials(p.name)}
                                      </div>
                                      <span className="text-xs font-extrabold text-slate-950 dark:text-white">{p.name}</span>
                                    </div>
                                    <button
                                      data-action="toggle-squad"
                                      data-player-id={p.id}
                                      data-team="none"
                                      className="p-1 hover:bg-slate-150 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 rounded-lg transition cursor-pointer"
                                    >
                                      <X className="w-3 h-3 text-slate-400 hover:text-red-500" />
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                        </div>

                        {/* Checked In Assignment Box (displays when there are unassigned checked in players) */}
                        {presentPlayers.length > 0 && (
                          <div className="border border-slate-250/70 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/40 dark:bg-slate-950/20 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Checked In</span>
                                <span className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  {unassignedPlayers.length} to assign
                                </span>
                              </div>
                              <div className="flex items-center gap-2.5 text-[10px] text-slate-450 dark:text-slate-550 font-bold">
                                <span>Tap to assign →</span>
                                <span className="flex items-center gap-1">
                                  <span className={`w-2 h-2 rounded-full ${homeColors.dotBg}`} />
                                  <span className={`${homeColors.textClass}`}>{match.homeTeam.split(' ')[0]}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className={`w-2 h-2 rounded-full ${awayColors.dotBg}`} />
                                  <span className={`${awayColors.textClass}`}>{match.awayTeam.split(' ')[0]}</span>
                                </span>
                              </div>
                            </div>

                            {/* Search checked-in */}
                            <div className="relative">
                              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                              <input
                                type="text"
                                id="checked-in-search"
                                placeholder="Search players..."
                                value={checkedInSearchQuery}
                                onChange={e => setCheckedInSearchQuery(e.target.value)}
                                className="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 rounded-xl focus:outline-emerald-550"
                              />
                            </div>

                            {/* List of checked in */}
                            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                              {filteredCheckedIn.length === 0 ? (
                                <div className="text-center p-4 text-xs text-slate-400 italic">No unassigned players matching search</div>
                              ) : (
                                filteredCheckedIn.map(p => {
                                  return (
                                    <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-slate-900 p-2.5 border border-slate-150 dark:border-slate-800 rounded-xl gap-2">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center text-[10px] font-black shrink-0 border border-slate-200 dark:border-slate-700">
                                          {getInitials(p.name)}
                                        </div>
                                        <span className="text-xs font-extrabold text-slate-950 dark:text-white">{p.name}</span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-1.5 w-full sm:w-auto">
                                        <button
                                          data-action="toggle-squad"
                                          data-player-id={p.id}
                                          data-team="home"
                                          className={`text-[10px] font-extrabold px-2.5 py-2 ${homeColors.dotBg} hover:opacity-90 text-white rounded-lg transition shadow-xs cursor-pointer active:scale-95 min-h-[36px]`}
                                        >
                                          {match.homeTeam.split(' ')[0] || 'Home'}
                                        </button>
                                        <button
                                          data-action="toggle-squad"
                                          data-player-id={p.id}
                                          data-team="away"
                                          className={`text-[10px] font-extrabold px-2.5 py-2 ${awayColors.dotBg} hover:opacity-90 text-white rounded-lg transition shadow-xs cursor-pointer active:scale-95 min-h-[36px]`}
                                        >
                                          {match.awayTeam.split(' ')[0] || 'Away'}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                          </div>
                        )}
                      </div>

                      {/* Expandable Match Schedule & Metadata Settings Card */}
                      <div className="border border-slate-150 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-950/20 p-5 mt-6 text-left" id="match-settings-card">
                        <button 
                          onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
                          className="w-full flex items-center justify-between font-black text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-emerald-555" />
                            <span>Match Settings & Schedule</span>
                          </div>
                          <span className="text-slate-400">{isSettingsExpanded ? '▲ Hide' : '▼ Expand'}</span>
                        </button>
                        
                        {isSettingsExpanded && (
                          <div className="space-y-4 mt-4 animate-in slide-in-from-top-2 duration-200">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-3xs">
                              <div className="space-y-1 text-left">
                                <label className="text-xs font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase">Home Team</label>
                                <select
                                  value={detailHomeTeam}
                                  onChange={e => setDetailHomeTeam(e.target.value)}
                                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:outline-emerald-550 bg-white font-extrabold uppercase shadow-xs"
                                  required
                                >
                                  <option value="">-- Select Team --</option>
                                  {detailType === 'Friendly Match' ? (
                                    <>
                                      <option value="Team Yellow">Team Yellow 🟡</option>
                                      <option value="Team Red">Team Red 🔴</option>
                                    </>
                                  ) : (
                                    alphabeticalTeams.map(t => (
                                      <option key={t.id} value={t.name}>{t.name}</option>
                                    ))
                                  )}
                                </select>
                              </div>

                              <div className="space-y-1 text-left">
                                <label className="text-xs font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase">Away Team</label>
                                <select
                                  value={detailAwayTeam}
                                  onChange={e => setDetailAwayTeam(e.target.value)}
                                  className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:outline-emerald-550 bg-white font-extrabold uppercase shadow-xs"
                                  required
                                >
                                  <option value="">-- Select Team --</option>
                                  {detailType === 'Friendly Match' ? (
                                    <>
                                      <option value="Team Yellow">Team Yellow 🟡</option>
                                      <option value="Team Red">Team Red 🔴</option>
                                    </>
                                  ) : (
                                    alphabeticalTeams.map(t => (
                                      <option key={t.id} value={t.name}>{t.name}</option>
                                    ))
                                  )}
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Date</label>
                                <input
                                  type="text"
                                  value={detailDate}
                                  onChange={e => setDetailDate(e.target.value)}
                                  className="w-full text-sm p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl bg-white focus:outline-emerald-550"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Time</label>
                                <input
                                  type="text"
                                  value={detailTime}
                                  onChange={e => setDetailTime(e.target.value)}
                                  className="w-full text-sm p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl bg-white focus:outline-emerald-550"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Format</label>
                                <input
                                  type="text"
                                  value={detailFormat}
                                  onChange={e => setDetailFormat(e.target.value)}
                                  className="w-full text-sm p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl bg-white focus:outline-emerald-550"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end pt-1">
                              <button
                                type="button"
                                onClick={handleSaveDetailChanges}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-550 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-sm active:scale-95"
                              >
                                Save Settings
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <>
                  {/* Action row with Create Match on the right */}
                  <div className="flex items-center justify-between py-2">
                    <div />

                    <button
                      onClick={handleOpenCreateMatch}
                      className="border border-emerald-300 text-emerald-650 dark:border-emerald-800/85 dark:text-emerald-400 bg-emerald-50/20 hover:bg-emerald-50/40 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      Create Match
                    </button>
                  </div>

                  {/* Badges Pill Row */}
                  <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-900/80 px-4 py-2 rounded-2xl w-fit mb-4">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <Users className="w-3.5 h-3.5 text-slate-400" /> {teamCount} Teams
                    </span>
                    <span className="text-slate-200 dark:text-slate-850">|</span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <Swords className="w-3.5 h-3.5 text-slate-400" /> {matchCount} Matches
                    </span>
                    <span className="text-slate-200 dark:text-slate-850">|</span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                      {completedMatchesCount} Completed
                    </span>
                    {liveCount > 0 && (
                      <>
                        <span className="text-slate-200 dark:text-slate-850">|</span>
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-650 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> {liveCount} Live
                        </span>
                      </>
                    )}
                  </div>

                  {/* Grid of match cards */}
                  {sortedMatches.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-3xl border border-slate-200/50 text-slate-400 dark:text-slate-500">
                      <Swords className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-750" />
                      <p className="text-sm">No matches scheduled yet for this league.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {sortedMatches.map((match) => {
                    const isFriendly = match.type === 'Friendly Match';
                    const isLive = match.status === 'Live';
                    const isPlayed = match.status === 'Played';
                    
                    const matchSession = sessions.find(s => s.matchId === match.id || s.id === match.id);
                    const matchSessionAttendance = matchSession ? attendance.filter(a => a.sessionId === matchSession.id) : [];
                    const checkedInCount = matchSession ? matchSessionAttendance.filter(sa => sa.status === 'Present').length : 0;
                    
                    return (
                        <div 
                          key={match.id} 
                          id={`match-card-${match.id}`}
                          onClick={() => {
                            if (activeSetSelectedMatchId) {
                              activeSetSelectedMatchId(match.id);
                            }
                          }}
                          className={`p-4 rounded-3xl border transition duration-150 flex flex-col justify-between min-h-[13rem] relative overflow-hidden group/card cursor-pointer hover:shadow-lg hover:scale-[1.01] ${
                            isFriendly
                              ? 'bg-orange-50/10 border-orange-100/40 hover:border-orange-500 dark:bg-orange-950/5 dark:border-orange-900/20 dark:hover:border-orange-500'
                              : 'bg-emerald-50/10 border-emerald-100/40 hover:border-emerald-500 dark:bg-emerald-950/5 dark:border-emerald-900/20 dark:hover:border-emerald-500'
                          } ${isLive ? (isFriendly ? 'ring-2 ring-orange-500/30' : 'ring-2 ring-emerald-500/30') : ''}`}
                        >
                          {/* Live Match Accent bar */}
                          {isLive && (
                            <div className={`absolute top-0 left-0 right-0 h-1.5 animate-pulse ${isFriendly ? 'bg-orange-500' : 'bg-emerald-500'}`} />
                          )}

                          {/* Top Line: Title badge & action buttons */}
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-black uppercase tracking-wider ${isFriendly ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {`${match.type || 'League Match'} ${match.matchNumber || ''}`}
                            </span>

                            <div className="flex items-center gap-1">
                              {onNavigateToSession && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); onNavigateToSession(match); }}
                                  className={`p-1 border rounded cursor-pointer transition ${
                                    matchSession 
                                      ? isFriendly
                                        ? 'border-orange-200/50 dark:border-orange-900/40 bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20'
                                        : 'border-emerald-200/50 dark:border-emerald-900/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20' 
                                      : 'border-slate-150 dark:border-slate-800 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                                  }`}
                                  title={matchSession ? "Manage Session Attendance" : "Create/Initialize Attendance Session"}
                                >
                                  <Users className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleOpenEditMatch(match); }}
                                className="p-1 border border-slate-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                                title="Edit Match Details"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteMatchClick(match.id); }}
                                className="p-1 border border-slate-150 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 rounded text-slate-400 hover:text-red-500 cursor-pointer"
                                title="Delete Fixture"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Middle Line: Scorecard representation with teams and scores */}
                          <div className="flex items-center justify-between gap-3 my-3">
                            {/* Home Team */}
                            <div className="flex-1 text-right min-w-0">
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="text-xs font-black tracking-tight text-slate-900 dark:text-white uppercase truncate" title={match.homeTeam}>
                                  {match.homeTeam}
                                </span>
                                {(() => {
                                  const tc = getTeamColorStyles(match.homeTeam);
                                  const hasStarted = match.status === 'Live' || match.status === 'Played';
                                  const startStyles = hasStarted
                                    ? match.status === 'Live'
                                      ? 'animate-pulse scale-125 ring-2 ring-emerald-500/40 shadow-xs'
                                      : 'opacity-75 scale-90'
                                    : '';
                                  return <span className={`w-2 h-2 rounded-full shrink-0 transition-all duration-300 ${tc.dotBg} ${startStyles}`} />;
                                })()}
                              </div>
                            </div>

                            {/* Scoreboard center pill */}
                            <div className="shrink-0">
                              {isPlayed || isLive ? (
                                <div className={`px-2.5 py-1 rounded-full font-mono font-black text-xs md:text-sm shadow-xs tracking-tighter border ${
                                  isLive 
                                    ? 'bg-red-500 text-white animate-pulse border-red-500' 
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200/50 dark:border-slate-700/50'
                                }`}>
                                  {match.homeScore ?? 0} — {match.awayScore ?? 0}
                                </div>
                              ) : (
                                <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded-md border border-slate-150 dark:border-slate-800">
                                  VS
                                </div>
                              )}
                            </div>

                            {/* Away Team */}
                            <div className="flex-1 text-left min-w-0">
                              <div className="flex items-center gap-1.5">
                                {(() => {
                                  const tc = getTeamColorStyles(match.awayTeam);
                                  const hasStarted = match.status === 'Live' || match.status === 'Played';
                                  const startStyles = hasStarted
                                    ? match.status === 'Live'
                                      ? 'animate-pulse scale-125 ring-2 ring-emerald-500/40 shadow-xs'
                                      : 'opacity-75 scale-90'
                                    : '';
                                  return <span className={`w-2 h-2 rounded-full shrink-0 transition-all duration-300 ${tc.dotBg} ${startStyles}`} />;
                                })()}
                                <span className="text-xs font-black tracking-tight text-slate-900 dark:text-white uppercase truncate" title={match.awayTeam}>
                                  {match.awayTeam}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Attendance Indicators & Match Status Badge */}
                          <div className="flex flex-col items-center gap-1 shrink-0 mb-2">
                            {/* Attendance Status Indicator */}
                            {matchSession ? (
                              <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[9px] font-black border ${
                                isFriendly
                                  ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
                                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              }`}>
                                <Users className="w-2.5 h-2.5 shrink-0" />
                                <span>{checkedInCount} Present</span>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); onNavigateToSession?.(match); }}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black border transition cursor-pointer ${
                                  isFriendly
                                    ? 'bg-slate-100 hover:bg-orange-50 dark:bg-slate-850 dark:hover:bg-orange-950/20 text-slate-550 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400 border-slate-200 dark:border-slate-800'
                                    : 'bg-slate-100 hover:bg-emerald-50 dark:bg-slate-850 dark:hover:bg-emerald-950/20 text-slate-550 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 border-slate-200 dark:border-slate-800'
                                }`}
                                title="Click to Initialize Attendance Session"
                              >
                                <Plus className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                                <span>Session Attendance</span>
                              </button>
                            )}
                          </div>

                          {/* Bottom Line: Date or Live score action tools */}
                          <div className="mt-auto pt-1">
                            {isLive ? (
                              <div className="flex items-center justify-between gap-2">
                                {/* Quick Goal triggers */}
                                <div className="flex gap-1 shrink-0">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleLiveGoal(match, 'home'); }}
                                    className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 px-2 py-1 rounded-md cursor-pointer"
                                    title="Add goal to Home Team"
                                  >
                                    + H
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleLiveGoal(match, 'away'); }}
                                    className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 px-2 py-1 rounded-md cursor-pointer"
                                    title="Add goal to Away Team"
                                  >
                                    + A
                                  </button>
                                </div>
                                
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleLiveFullTime(match); }}
                                  className={`text-[10px] font-black px-2.5 py-1 rounded-md flex items-center gap-1 shadow-xs cursor-pointer ml-auto text-white ${
                                    isFriendly
                                      ? 'bg-orange-600 hover:bg-orange-500'
                                      : 'bg-emerald-600 hover:bg-emerald-500'
                                  }`}
                                >
                                  <CheckCircle2 className="w-3 h-3" /> Full Time
                                </button>
                              </div>
                            ) : (
                              <div>
                                {/* Height-stabilized transition container to prevent layout shifts & flickering */}
                                <div className="relative h-4 overflow-hidden flex items-center justify-center w-full">
                                  {/* Date & Time - slides up and fades out on hover */}
                                  <div className="absolute inset-0 flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 transition-all duration-300 transform group-hover/card:-translate-y-4 group-hover/card:opacity-0">
                                    <Calendar className="w-3 h-3" />
                                    <span>{formatMatchDateDisplay(match.date)}</span>
                                  </div>
                                  {/* Click feedback indicator - slides in and fades in on hover */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onNavigateToSession?.(match);
                                    }}
                                    className={`absolute inset-0 flex items-center justify-center gap-1 text-[10px] font-bold transition-all duration-300 transform translate-y-4 opacity-0 group-hover/card:translate-y-0 group-hover/card:opacity-100 cursor-pointer ${
                                      isFriendly ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'
                                    }`}
                                  >
                                    <span>View Session Details</span>
                                    <ChevronRight className={`w-3 h-3 animate-pulse ${isFriendly ? 'text-orange-500' : 'text-emerald-500'}`} />
                                  </button>
                                </div>
                                {/* Player of Match / Day banner */}
                                {isPlayed && match.playerOfMatch && (
                                  <div className="text-[9px] font-black text-amber-800 dark:text-amber-400 bg-amber-500/10 border border-amber-100/40 dark:border-amber-950 px-2 py-0.5 rounded-lg w-fit mx-auto mt-1 flex items-center gap-1 truncate max-w-full">
                                    <Star className="w-2.5 h-2.5 text-amber-555 fill-amber-500 shrink-0" />
                                    <span className="truncate">{match.playerOfMatch} — Player of the Day</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

          {activeDetailTab === 'player-league' && (() => {
            // Compute Top Scorers (Golden Boot) and POTDs for accolades cards from playerStandings (starting 14 Feb 2026)
            const topScorersList = [...playerStandings]
              .filter(item => item.goals > 0)
              .sort((a, b) => b.goals - a.goals)
              .slice(0, 3);

            const topPOTDsList = [...playerStandings]
              .filter(item => item.potd > 0)
              .sort((a, b) => b.potd - a.potd)
              .slice(0, 3);

            return (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Accolades and Top Scorers Highlight Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="league-accolades-grid">
                  {/* 1. Golden Boot Card */}
                  <div className="bg-gradient-to-br from-amber-500/10 via-slate-900/5 to-amber-500/5 dark:from-amber-500/5 dark:via-slate-900/10 dark:to-slate-900 border border-amber-500/20 rounded-3xl p-5 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        🏆 League Top Scorers (Golden Boot)
                      </h4>
                      <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-400 font-extrabold px-2 py-0.5 rounded-full uppercase">
                        Goals
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {topScorersList.length > 0 ? (
                        topScorersList.map((item, idx) => (
                          <div key={item.player.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                            <div className="flex items-center gap-3">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                idx === 0 ? 'bg-amber-400 text-slate-950 font-black' :
                                idx === 1 ? 'bg-slate-300 text-slate-900' :
                                'bg-amber-600 text-white'
                              }`}>
                                {idx + 1}
                              </span>
                              <div>
                                <span className="text-xs font-black text-slate-850 dark:text-slate-200 block">
                                  {item.player.name}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                  {item.player.position || 'Forward'}
                                </span>
                              </div>
                            </div>
                            <span className="text-sm font-black text-amber-650 dark:text-amber-400 font-mono">
                              {item.goals} Goals
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-xs text-slate-400 italic">
                          No goals recorded yet in this league format.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. POTD Accolades Card */}
                  <div className="bg-gradient-to-br from-emerald-500/10 via-slate-900/5 to-emerald-500/5 dark:from-emerald-500/5 dark:via-slate-900/10 dark:to-slate-900 border border-emerald-500/20 rounded-3xl p-5 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <Star className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
                        ⭐ League Accolades (Player of the Day)
                      </h4>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-extrabold px-2 py-0.5 rounded-full uppercase">
                        Awards
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {topPOTDsList.length > 0 ? (
                        topPOTDsList.map((item, idx) => (
                          <div key={item.player.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                            <div className="flex items-center gap-3">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                idx === 0 ? 'bg-amber-400 text-slate-950 font-black' :
                                idx === 1 ? 'bg-slate-300 text-slate-900' :
                                'bg-emerald-650 text-white'
                              }`}>
                                {idx + 1}
                              </span>
                              <div>
                                <span className="text-xs font-black text-slate-850 dark:text-slate-200 block">
                                  {item.player.name}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                  {item.player.position || 'Player'}
                                </span>
                              </div>
                            </div>
                            <span className="text-sm font-black text-emerald-650 dark:text-emerald-400 font-mono">
                              {item.potd} ⭐
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-xs text-slate-400 italic">
                          No Player of the Day awards given yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Player League Standing Card */}
                <div className="bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-950 p-6 sm:p-7 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-5 transition-all duration-500 hover:border-emerald-500/40 dark:hover:border-emerald-500/40 hover:shadow-2xl hover:shadow-emerald-500/5 dark:hover:shadow-none relative overflow-hidden" id="player-standings-card">
                  {/* Premium top-edge gradient line accent */}
                  <div className="absolute top-0 left-0 right-0 h-[4px] bg-slate-800" />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                    <div>
                      <h3 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2.5">
                        <Users className="w-5.5 h-5.5 text-emerald-550" />
                        Player Standing
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed">
                        Tracks player performance across all League & Friendly matches. Click headers to sort.
                      </p>
                    </div>

                    {/* Actions and Search */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                      {onRebuildPlayerStats && (
                        <button
                          onClick={seedLocalDataToFirebase}
                          disabled={playerStandingsLoading}
                          title="Synchronize & Recalculate Player Standings from Database"
                          className="flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-black tracking-wider uppercase bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl transition cursor-pointer active:scale-95 border border-slate-200/40 dark:border-slate-800 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <RotateCw className={`w-4 h-4 text-emerald-500 ${playerStandingsLoading ? 'animate-spin' : 'animate-spin-slow'}`} />
                          <span>{playerStandingsLoading ? "Syncing..." : "Sync Stats"}</span>
                        </button>
                      )}
                      <div className="relative w-full sm:w-56">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                        <input
                          type="text"
                          placeholder="Search player name..."
                          value={playerTableSearchQuery}
                          onChange={e => setPlayerTableSearchQuery(e.target.value)}
                          className="w-full text-xs p-2.5 pl-10 border border-slate-200/80 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-550/25 bg-white dark:bg-slate-950 shadow-2xs hover:border-slate-300/80 dark:hover:border-slate-700/80 transition"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full min-w-[750px] text-left text-xs border-collapse" id="player-standings-table">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-950/60 text-[10px]">
                          <th className="py-2.5 px-1.5 sm:px-3 text-center w-10 sm:w-12">Pos</th>
                          <th className="py-2.5 px-1.5 sm:px-3 text-left">Player</th>
                          <th className="py-2.5 px-1.5 sm:px-3 text-center">PLD</th>
                          <th className="py-2.5 px-1.5 sm:px-3 text-center">W</th>
                          <th className="py-2.5 px-1.5 sm:px-3 text-center">D</th>
                          <th className="py-2.5 px-1.5 sm:px-3 text-center">L</th>
                          <th 
                            onClick={() => setPlayerSortField('G')}
                            className={`py-2.5 px-1.5 sm:px-3 text-center cursor-pointer select-none transition ${
                              playerSortField === 'G' 
                                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-black' 
                                : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                            }`}
                            title="Goals Scored (click to sort)"
                          >
                            ⚽ G {playerSortField === 'G' && '↓'}
                          </th>
                          <th 
                            onClick={() => setPlayerSortField('POTD')}
                            className={`py-2.5 px-1.5 sm:px-3 text-center cursor-pointer select-none transition ${
                              playerSortField === 'POTD' 
                                ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 font-black' 
                                : 'text-amber-600 dark:text-amber-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                            }`}
                            title="MVP / Player of the Day Awards (click to sort)"
                          >
                            ⭐ MVP {playerSortField === 'POTD' && '↓'}
                          </th>
                          <th 
                            onClick={() => setPlayerSortField('PTS')}
                            className={`py-2.5 px-1.5 sm:px-3 text-center font-black cursor-pointer select-none transition ${
                              playerSortField === 'PTS' 
                                ? 'text-emerald-600 dark:text-emerald-450 bg-emerald-500/10' 
                                : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                            } w-12 sm:w-16`}
                          >
                            PTS {playerSortField === 'PTS' && '↓'}
                          </th>
                          <th 
                            onClick={() => setPlayerSortField('PPG')}
                            className={`py-2.5 px-1.5 sm:px-3 text-center cursor-pointer select-none transition ${
                              playerSortField === 'PPG' 
                                ? 'text-emerald-600 dark:text-emerald-450 bg-emerald-500/10 font-black' 
                                : 'hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            PPG {playerSortField === 'PPG' && '↓'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {playerStandingsLoading && !localMatchesExist ? (
                          <tr>
                            <td colSpan={10} className="py-12 text-center">
                              <div className="flex flex-col items-center justify-center p-6">
                                <RotateCw className="w-8 h-8 text-emerald-550 animate-spin mb-3" />
                                <p className="text-slate-600 dark:text-slate-400 font-semibold text-sm animate-pulse">
                                  Fetching live standings from database...
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : backendStandings !== null && backendStandings.length === 0 && !localMatchesExist ? (
                          <tr>
                            <td colSpan={10} className="py-12 text-center">
                              <div className="flex flex-col items-center justify-center p-6 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-dashed border-rose-300 dark:border-rose-900/45 max-w-md mx-auto my-4 animate-in fade-in duration-200">
                                <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
                                <p className="text-slate-700 dark:text-slate-300 font-semibold text-sm">
                                  No records found in database.
                                </p>
                                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 mb-4 text-center">
                                  The database is currently empty. Click "Re-sync Database" to synchronize your local matches to Firebase.
                                </p>
                                <button
                                  type="button"
                                  onClick={seedLocalDataToFirebase}
                                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-550 text-white font-bold text-xs rounded-xl cursor-pointer transition active:scale-95 shadow-sm"
                                >
                                  Re-sync Database
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : (!hasAnyPlayedMatches || !playerStandings.some(item => item.points > 0)) ? (
                          <tr>
                            <td colSpan={10} className="py-12 text-center">
                              <div className="flex flex-col items-center justify-center p-6 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800/80 max-w-lg mx-auto my-4">
                                <p className="text-slate-600 dark:text-slate-400 font-semibold text-sm">
                                  No active matches found for the 2026 season.
                                </p>
                                <p className="text-slate-450 dark:text-slate-500 text-xs mt-1">
                                  Click 'Add Match Card' to begin.
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : sortedPlayerStandings.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="py-8 text-center text-slate-450 dark:text-slate-500 italic">
                              No players found matching your query.
                            </td>
                          </tr>
                        ) : (
                          sortedPlayerStandings.map((item, index) => {
                            const { player, played, won, drawn, lost, points, ppg, goals, potd, adjustment, calculated } = item;
                            const pos = index + 1;
                            const hasAdj = adjustment.played > 0;

                            return (
                              <tr 
                                key={player.id} 
                                className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition font-medium"
                              >
                                <td className="py-2 sm:py-3 px-1.5 sm:px-3 text-center">
                                  <span className={`inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-lg font-black text-xs ${
                                    pos === 1 ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400' :
                                    pos === 2 ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-850 dark:text-emerald-400' :
                                    pos === 3 ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-400' :
                                    'text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-950/50'
                                  }`}>
                                    {pos}
                                  </span>
                                </td>
                                <td className="py-2 sm:py-3 px-1.5 sm:px-3 font-bold text-slate-900 dark:text-white">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold text-[10px] flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                                      {getInitials(player.name)}
                                    </div>
                                    <div className="truncate">
                                      <div className="truncate text-slate-900 dark:text-white flex items-center" title={player.name}>
                                        <span>{player.name}</span>
                                        <button
                                          onClick={() => handleStartAdjusting(player)}
                                          className="ml-2 px-1.5 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded font-semibold transition cursor-pointer"
                                          title="Edit player standings"
                                        >
                                          ✏️
                                        </button>
                                      </div>
                                      <div className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                                        {player.position || 'Player'}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2 sm:py-3 px-1.5 sm:px-3 text-center font-mono text-slate-600 dark:text-slate-300">
                                  <div className="flex flex-col items-center">
                                    <span>{!hasAnyPlayedMatches ? '' : played}</span>
                                    {hasAnyPlayedMatches && hasAdj && (
                                      <span className="text-[9px] text-slate-400 dark:text-slate-500 scale-90">
                                        ({calculated.played}+{adjustment.played})
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 sm:py-3 px-1.5 sm:px-3 text-center font-mono text-emerald-650 dark:text-emerald-400">
                                  <div className="flex flex-col items-center">
                                    <span>{!hasAnyPlayedMatches ? '' : won}</span>
                                    {hasAnyPlayedMatches && hasAdj && (
                                      <span className="text-[9px] text-emerald-550 scale-90">
                                        ({calculated.won}+{adjustment.won})
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 sm:py-3 px-1.5 sm:px-3 text-center font-mono text-slate-600 dark:text-slate-300">
                                  <div className="flex flex-col items-center">
                                    <span>{!hasAnyPlayedMatches ? '' : drawn}</span>
                                    {hasAnyPlayedMatches && hasAdj && (
                                      <span className="text-[9px] text-slate-400 dark:text-slate-500 scale-90">
                                        ({calculated.drawn}+{adjustment.drawn})
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 sm:py-3 px-1.5 sm:px-3 text-center font-mono text-red-500 dark:text-red-400">
                                  <div className="flex flex-col items-center">
                                    <span>{!hasAnyPlayedMatches ? '' : lost}</span>
                                    {hasAnyPlayedMatches && hasAdj && (
                                      <span className="text-[9px] text-red-400 scale-90">
                                        ({calculated.lost}+{adjustment.lost})
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className={`py-2 sm:py-3 px-1.5 sm:px-3 text-center font-mono font-bold ${playerSortField === 'G' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-black' : 'text-slate-700 dark:text-slate-200'}`}>
                                  {!hasAnyPlayedMatches ? '' : (
                                    <span className="inline-flex items-center justify-center gap-1">
                                      <span className="text-[11px]">⚽</span>
                                      <span>{goals}</span>
                                    </span>
                                  )}
                                </td>
                                <td className={`py-2 sm:py-3 px-1.5 sm:px-3 text-center font-mono font-bold ${playerSortField === 'POTD' ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 font-black' : 'text-amber-600 dark:text-amber-400'}`}>
                                  {!hasAnyPlayedMatches ? '' : (
                                    <span className="inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-extrabold text-[11px]">
                                      <span>⭐</span>
                                      <span>{potd}</span>
                                    </span>
                                  )}
                                </td>
                                <td className={`py-2 sm:py-3 px-1.5 sm:px-3 text-center font-mono font-extrabold bg-slate-50 dark:bg-slate-950/40 ${playerSortField === 'PTS' ? 'text-emerald-600 dark:text-emerald-450 bg-emerald-500/5 font-black' : 'text-slate-950 dark:text-white'}`}>
                                  <div className="flex flex-col items-center justify-center">
                                    <span>{!hasAnyPlayedMatches ? '' : points}</span>
                                    {hasAnyPlayedMatches && hasAdj && (
                                      <span className="text-[8px] font-black tracking-wider text-emerald-550 uppercase">
                                        +{adjustment.points} ADJ
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className={`py-2 sm:py-3 px-1.5 sm:px-3 text-center font-mono font-bold ${playerSortField === 'PPG' ? 'text-emerald-600 dark:text-emerald-450 bg-emerald-500/5 font-black' : 'text-slate-700 dark:text-slate-300'}`}>
                                  {!hasAnyPlayedMatches ? '' : ppg.toFixed(1)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {activeDetailTab === 'table' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800 shadow-xs space-y-4" id="standings-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800/60">
                <div>
                  <h3 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    Standings Ladder
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Sorting formula: Points → Goal Diff (GD) → Goals For (GF)</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {onRebuildPlayerStats && (
                    <button
                      type="button"
                      onClick={seedLocalDataToFirebase}
                      disabled={playerStandingsLoading}
                      title="Force Synchronize & Recalculate Standings from Database"
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-black text-xs rounded-xl border border-slate-200/40 dark:border-slate-800 cursor-pointer transition active:scale-95 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RotateCw className={`w-4 h-4 text-emerald-500 ${playerStandingsLoading ? 'animate-spin' : ''}`} />
                      <span>{playerStandingsLoading ? "Syncing..." : "Sync Stats"}</span>
                    </button>
                  )}
                  {onAddTeamToLeague && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDetailTab('teams');
                        setShowAddTeamForm(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer transition active:scale-95 shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Team</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse" id="standings-table">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-950/60 text-[10px]">
                      <th className="py-2.5 px-1.5 sm:px-3 text-center w-10 sm:w-12 border-l-4 border-l-transparent">Pos</th>
                      <th className="py-2.5 px-1.5 sm:px-3 text-left">Team Name</th>
                      <th className="py-2.5 px-1.5 sm:px-3 text-center">PLD</th>
                      <th className="py-2.5 px-1.5 sm:px-3 text-center">W</th>
                      <th className="py-2.5 px-1.5 sm:px-3 text-center">D</th>
                      <th className="py-2.5 px-1.5 sm:px-3 text-center">L</th>
                      <th className="py-2.5 px-1.5 sm:px-3 text-center hidden sm:table-cell">GF</th>
                      <th className="py-2.5 px-1.5 sm:px-3 text-center hidden sm:table-cell">GA</th>
                      <th className="py-2.5 px-1.5 sm:px-3 text-center">GD</th>
                      <th className="py-2.5 px-1.5 sm:px-3 text-center hidden md:table-cell">Form (Last 5)</th>
                      <th className="py-2.5 px-1.5 sm:px-3 text-center font-bold text-slate-500 dark:text-slate-400 w-12">PPG</th>
                      <th className="py-2.5 px-1.5 sm:px-3 text-center font-black text-slate-800 dark:text-slate-200 bg-slate-100/50 dark:bg-slate-950/55 w-12 sm:w-16">PTS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sortedStandings.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-12 px-4 text-center">
                          <div className="flex flex-col items-center justify-center space-y-3">
                            <Trophy className="w-10 h-10 text-slate-300 dark:text-slate-700" />
                            <div className="space-y-1">
                              <p className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">No Teams Registered Yet</p>
                              <p className="text-xs text-slate-455 dark:text-slate-500 max-w-sm mx-auto">
                                Standings will generate automatically once clubs are registered and match scores are entered.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveDetailTab('teams');
                                setShowAddTeamForm(true);
                              }}
                              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer transition active:scale-95"
                            >
                              Add Teams Now
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      sortedStandings.map((team, index) => {
                      const isGameOnFC = team.name.toLowerCase().includes('game on');
                      const gd = team.goalsFor - team.goalsAgainst;
                      const pos = index + 1;

                      // Promotion/Playoffs/Relegation border colors
                      const borderLeftColor = 
                        pos === 1 ? 'border-l-4 border-l-amber-500' :
                        pos === 2 ? 'border-l-4 border-l-emerald-550' :
                        (index === sortedStandings.length - 1 && sortedStandings.length > 2) ? 'border-l-4 border-l-red-500' :
                        'border-l-4 border-l-transparent';

                      return (
                        <tr 
                          key={team.id} 
                          className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition font-medium ${borderLeftColor} ${
                            isGameOnFC ? 'bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30 font-semibold' : ''
                          }`}
                          id={`team-standing-row-${team.id}`}
                        >
                          <td className="py-2 sm:py-3 px-1.5 sm:px-3 text-center">
                            <span className={`inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-lg font-black text-xs ${
                              pos === 1 ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400' :
                              pos === 2 ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-850 dark:text-emerald-400' :
                              pos === 3 ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-400' :
                              'text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-950/50'
                            }`}>
                              {pos}
                            </span>
                          </td>
                          <td className="py-2 sm:py-3 px-1.5 sm:px-3 font-bold text-slate-900 dark:text-white">
                            <span className="flex items-center gap-1.5 sm:gap-2.5 truncate max-w-[95px] xs:max-w-[140px] sm:max-w-none">
                              {(() => {
                                const teamColor = getTeamColorStyles(team.name);
                                return (
                                  <span 
                                    className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs ${teamColor.dotBg} border border-white dark:border-slate-950`} 
                                    title={`${team.name} (${teamColor.colorName})`}
                                  />
                                );
                              })()}
                              <span className="truncate" title={team.name}>{team.name}</span>
                              <button
                                onClick={() => handleStartAdjustingTeam(team)}
                                className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded font-semibold transition cursor-pointer shrink-0"
                                title="Edit team standings"
                              >
                                ✏️
                              </button>
                            </span>
                          </td>
                          <td className="py-2 sm:py-3 px-1.5 sm:px-3 text-center font-mono text-slate-600 dark:text-slate-300">
                            {!hasAnyPlayedMatches ? '' : team.played}
                          </td>
                          <td className="py-2 sm:py-3 px-1.5 sm:px-3 text-center font-mono text-emerald-650 dark:text-emerald-400">
                            {!hasAnyPlayedMatches ? '' : team.won}
                          </td>
                          <td className="py-2 sm:py-3 px-1.5 sm:px-3 text-center font-mono text-slate-600 dark:text-slate-300">
                            {!hasAnyPlayedMatches ? '' : team.drawn}
                          </td>
                          <td className="py-2 sm:py-3 px-1.5 sm:px-3 text-center font-mono text-red-500 dark:text-red-400">
                            {!hasAnyPlayedMatches ? '' : team.lost}
                          </td>
                          <td className="py-2 sm:py-3 px-1.5 sm:px-3 text-center font-mono text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                            {!hasAnyPlayedMatches ? '' : team.goalsFor}
                          </td>
                          <td className="py-2 sm:py-3 px-1.5 sm:px-3 text-center font-mono text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                            {!hasAnyPlayedMatches ? '' : team.goalsAgainst}
                          </td>
                          <td className={`py-2 sm:py-3 px-1.5 sm:px-3 text-center font-mono font-bold ${
                            !hasAnyPlayedMatches ? 'text-slate-500' : (gd > 0 ? 'text-emerald-650' : gd < 0 ? 'text-red-500' : 'text-slate-500')
                          }`}>
                            {!hasAnyPlayedMatches ? '' : (gd > 0 ? `+${gd}` : gd)}
                          </td>
                          <td className="py-2 sm:py-3 px-1.5 sm:px-3 text-center hidden md:table-cell">
                            <div className="flex items-center justify-center gap-1">
                              {hasAnyPlayedMatches && getTeamForm(team.name).map((res, i) => (
                                <span 
                                  key={i} 
                                  className={`w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full flex items-center justify-center text-[8px] sm:text-[9px] font-black text-white select-none ${
                                    res === 'W' ? 'bg-emerald-550' :
                                    res === 'L' ? 'bg-red-500' :
                                    'bg-slate-400'
                                  }`}
                                  title={res === 'W' ? 'Win' : res === 'L' ? 'Loss' : 'Draw'}
                                >
                                  {res}
                                </span>
                              ))}
                              {!hasAnyPlayedMatches && (
                                <span className="text-[10px] text-slate-400 italic">-</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 sm:py-3 px-1.5 sm:px-3 text-center font-mono font-bold text-slate-650 dark:text-slate-400">
                            {!hasAnyPlayedMatches ? '' : (team.ppg !== undefined ? team.ppg.toFixed(1) : (team.played > 0 ? (team.points / team.played).toFixed(1) : '0.0'))}
                          </td>
                          <td className="py-2 sm:py-3 px-1.5 sm:px-3 text-center font-mono font-extrabold text-slate-950 dark:text-white bg-slate-50 dark:bg-slate-950/40">
                            {!hasAnyPlayedMatches ? '' : team.points}
                          </td>
                        </tr>
                      );
                    }))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Grid of Matrix and Remaining Fixtures */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
              
              {/* 1. Fixture Matrix Grid (2/3 columns) */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                  <div className="space-y-1">
                    <h3 className="text-md font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <Grid className="w-5 h-5 text-emerald-550" />
                      Fixture Matrix
                    </h3>
                    <p className="text-xs text-slate-450 dark:text-slate-400 font-medium">
                      {activeLeague?.name || "League Tournament"} • Rows: Home 🏠 | Columns: Away ✈️
                    </p>
                  </div>

                  <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-xl shadow-2xs">
                        {(() => {
                          const played = activeMatches.filter(m => m.status === 'Played').length;
                          return `${played} played`;
                        })()}
                      </span>
                      <span className="text-xs font-mono font-black text-slate-800 dark:text-slate-200">
                        {(() => {
                          const played = activeMatches.filter(m => m.status === 'Played').length;
                          const n = sortedStandings.length;
                          const format = activeLeague?.format || 'once';
                          const total = format === 'once' ? (n * (n - 1)) / 2 : format === 'twice' ? n * (n - 1) : activeMatches.length;
                          const pct = total > 0 ? Math.round((played / total) * 100) : 0;
                          return `${pct}%`;
                        })()}
                      </span>
                    </div>
                    {/* Progress bar matching mockup colors */}
                    <div className="w-full sm:w-40 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-550 h-full transition-all duration-500"
                        style={{
                          width: `${(() => {
                            const played = activeMatches.filter(m => m.status === 'Played').length;
                            const n = sortedStandings.length;
                            const format = activeLeague?.format || 'once';
                            const total = format === 'once' ? (n * (n - 1)) / 2 : format === 'twice' ? n * (n - 1) : activeMatches.length;
                            return total > 0 ? Math.min(100, Math.round((played / total) * 100)) : 0;
                          })()}%`
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-850">
                        <th className="p-1.5 sm:p-3 md:p-4 font-extrabold text-slate-500 dark:text-slate-400 w-20 xs:w-32 sm:w-[150px] md:w-[180px] text-xs">Club Name</th>
                        {sortedStandings.map(t => {
                          const initials = (() => {
                            const parts = t.name.trim().split(/\s+/);
                            if (parts.length > 1) {
                              return parts.map(p => p[0]).join('').toUpperCase().slice(0, 3);
                            }
                            return t.name.slice(0, 3).toUpperCase();
                          })();
                          
                          // Get dynamic bg/text color class
                          const colorClass = (() => {
                            const colors = [
                              'bg-rose-500 text-white',
                              'bg-emerald-550 text-white',
                              'bg-amber-400 text-slate-900',
                              'bg-blue-500 text-white',
                              'bg-indigo-500 text-white',
                              'bg-orange-500 text-white',
                              'bg-cyan-500 text-white',
                              'bg-slate-700 text-white',
                              'bg-fuchsia-500 text-white',
                              'bg-pink-500 text-white',
                            ];
                            let hash = 0;
                            for (let i = 0; i < t.name.length; i++) {
                              hash = t.name.charCodeAt(i) + ((hash << 5) - hash);
                            }
                            const index = Math.abs(hash) % colors.length;
                            return colors[index];
                          })();

                          return (
                            <th key={t.id} className="p-1.5 sm:p-2 md:p-4 text-center font-bold" title={t.name}>
                              <span className={`inline-flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full font-black text-[8px] sm:text-[10px] tracking-tight shadow-2xs ${colorClass}`}>
                                {initials}
                              </span>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedStandings.map(homeTeam => (
                        <tr key={homeTeam.id} className="border-b border-slate-50 dark:border-slate-850/50 hover:bg-slate-50/30 dark:hover:bg-slate-800/10">
                          <td className="p-1.5 sm:p-3 md:p-4 font-bold text-slate-850 dark:text-slate-200 bg-slate-50/20 dark:bg-slate-950/10 text-[11px] sm:text-xs">
                            <div className="truncate max-w-[80px] xs:max-w-[110px] sm:max-w-[145px] md:max-w-none" title={homeTeam.name}>
                              {homeTeam.name}
                            </div>
                          </td>
                          {sortedStandings.map(awayTeam => {
                            const isDiagonal = homeTeam.name === awayTeam.name;
                            
                            if (isDiagonal) {
                              return (
                                <td key={awayTeam.id} className="p-1 sm:p-2 md:p-4 text-center">
                                  <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-xl bg-slate-100 dark:bg-slate-800/70 text-slate-400 dark:text-slate-650 font-extrabold text-[10px] sm:text-xs flex items-center justify-center mx-auto shadow-2xs cursor-not-allowed select-none">
                                    X
                                  </span>
                                </td>
                              );
                            }

                            // Find match
                            const match = activeMatches.find(m => m.homeTeam === homeTeam.name && m.awayTeam === awayTeam.name);
                            const revMatch = activeMatches.find(m => m.homeTeam === awayTeam.name && m.awayTeam === homeTeam.name);
                            const formatIsSingle = (activeLeague?.format || 'once') === 'once';

                            let cellNode = null;
                            let tooltip = ``;

                            if (match) {
                              if (match.status === 'Played' && match.homeScore !== undefined && match.awayScore !== undefined) {
                                tooltip = `Played: ${homeTeam.name} ${match.homeScore} - ${match.awayScore} ${awayTeam.name}`;
                                cellNode = (
                                  <button
                                    onClick={() => {
                                      setEditingMatch(match);
                                      setEditHomeScore(match.homeScore?.toString() || '0');
                                      setEditAwayScore(match.awayScore?.toString() || '0');
                                      setEditMatchStatus(match.status);
                                      setEditPlayerOfMatch(match.potdWinner || match.playerOfMatch || '');
                                      const parts = match.date.split(' • ');
                                      if (parts.length === 2) {
                                        setEditMatchDate(parts[0]);
                                        setEditMatchTime(parts[1]);
                                      } else {
                                        setEditMatchDate(match.date || '');
                                        setEditMatchTime('10:30');
                                      }
                                      setEditMatchFormat(match.format || '7v7');
                                      setEditMatchType(match.type || 'League Match');
                                    }}
                                    className="px-1 sm:px-1.5 py-0.5 sm:py-1 rounded-lg bg-emerald-550 hover:bg-emerald-600 text-white font-black text-[8px] sm:text-[10px] flex items-center justify-center mx-auto shadow-2xs transition hover:scale-105 cursor-pointer select-none whitespace-nowrap min-w-[28px] sm:min-w-[36px]"
                                    title={`${tooltip} (Click to Edit)`}
                                  >
                                    {match.homeScore}-{match.awayScore}
                                  </button>
                                );
                              } else {
                                tooltip = `Scheduled: ${homeTeam.name} vs ${awayTeam.name} (${match.date})`;
                                cellNode = (
                                  <button
                                    onClick={() => {
                                      setEditingMatch(match);
                                      setEditHomeScore(match.homeScore?.toString() || '');
                                      setEditAwayScore(match.awayScore?.toString() || '');
                                      setEditMatchStatus(match.status);
                                      setEditPlayerOfMatch(match.potdWinner || match.playerOfMatch || '');
                                      const parts = match.date.split(' • ');
                                      if (parts.length === 2) {
                                        setEditMatchDate(parts[0]);
                                        setEditMatchTime(parts[1]);
                                      } else {
                                        setEditMatchDate(match.date || '');
                                        setEditMatchTime('10:30');
                                      }
                                      setEditMatchFormat(match.format || '7v7');
                                      setEditMatchType(match.type || 'League Match');
                                    }}
                                    className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] flex items-center justify-center mx-auto shadow-xs transition hover:scale-105 cursor-pointer animate-pulse"
                                    title={`${tooltip} (Click to Record Result)`}
                                  >
                                    <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
                                  </button>
                                );
                              }
                            } else if (formatIsSingle && revMatch) {
                              // If Single RR and there's a reverse match, they only play once at the other home.
                              if (revMatch.status === 'Played' && revMatch.homeScore !== undefined && revMatch.awayScore !== undefined) {
                                tooltip = `Played at ${awayTeam.name}: ${awayTeam.name} ${revMatch.homeScore} - ${revMatch.awayScore} ${homeTeam.name}`;
                                cellNode = (
                                  <div 
                                    className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-[8px] sm:text-[9px] flex items-center justify-center mx-auto select-none border border-slate-200/50 dark:border-slate-700/50"
                                    title={tooltip}
                                  >
                                    {revMatch.awayScore} - {revMatch.homeScore}
                                  </div>
                                );
                              } else {
                                tooltip = `Scheduled at ${awayTeam.name}: ${awayTeam.name} vs ${homeTeam.name} (${revMatch.date})`;
                                cellNode = (
                                  <div 
                                    className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-50 dark:bg-slate-900 text-slate-450 dark:text-slate-550 font-medium text-[8px] sm:text-[9px] flex items-center justify-center mx-auto select-none border border-slate-100 dark:border-slate-800/60"
                                    title={tooltip}
                                  >
                                    Sched
                                  </div>
                                );
                              }
                            } else {
                              // Not scheduled yet!
                              const isLimit = isMatchLimitReached(homeTeam.name, awayTeam.name);
                              if (isLimit) {
                                tooltip = `Format Limit Reached: ${homeTeam.name} and ${awayTeam.name} cannot play further matches.`;
                                cellNode = (
                                  <div 
                                    className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/30 dark:border-slate-800/40 text-slate-300 dark:text-slate-700 flex items-center justify-center mx-auto select-none cursor-not-allowed text-[8px] sm:text-[9px] font-bold"
                                    title={tooltip}
                                  >
                                    N/A
                                  </div>
                                );
                              } else {
                                tooltip = `No match scheduled yet between ${homeTeam.name} and ${awayTeam.name}. Click to schedule!`;
                                cellNode = (
                                  <button
                                    onClick={() => {
                                      setNewMatchHome(homeTeam.name);
                                      setNewMatchAway(awayTeam.name);
                                      setNewMatchDate(new Date().toISOString().split('T')[0]);
                                      setNewMatchTime('10:30');
                                      setNewMatchType('League Match');
                                      setNewMatchFormat(activeLeague ? getLeagueFormat(activeLeague) : '7v7');
                                      setShowCreateMatchModal(true);
                                    }}
                                    className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-dashed border-slate-300 hover:border-emerald-500 dark:border-slate-700 dark:hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-950/10 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 flex items-center justify-center mx-auto transition cursor-pointer"
                                    title={tooltip}
                                  >
                                    +
                                  </button>
                                );
                              }
                            }

                            return (
                              <td key={awayTeam.id} className="p-1 sm:p-2 md:p-4 text-center">
                                {cellNode}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center gap-5 text-[10px] text-slate-550 font-bold pt-3 px-1 border-t border-slate-100 dark:border-slate-800/60">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-550 flex items-center justify-center text-white"><Check className="w-2.5 h-2.5" /></span> Played
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-amber-500 flex items-center justify-center text-white"><Calendar className="w-2.5 h-2.5" /></span> Scheduled
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-full border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 flex items-center justify-center text-slate-400">+</span> Not Scheduled
                  </span>
                </div>
              </div>

              {/* 2. Remaining Fixtures Planner (1/3 column) */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                      Remaining Fixtures
                    </h4>
                    <p className="text-[11px] text-slate-450 dark:text-slate-400 font-medium">
                      Tournament match-ups to complete format
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                  {(() => {
                    const limit = getFormatLimit();
                    const format = activeLeague?.format || 'once';
                    const remainingList: { home: string, away: string }[] = [];

                    if (limit !== Infinity) {
                      const teams = sortedStandings.map(t => t.name);
                      for (let i = 0; i < teams.length; i++) {
                        for (let j = 0; j < teams.length; j++) {
                          if (i === j) continue;
                          const h = teams[i];
                          const a = teams[j];

                          if (format === 'once') {
                            // Only unique unordered pairs
                            if (i < j) {
                              const count = getExistingMatchesCount(h, a);
                              if (count < 1) {
                                remainingList.push({ home: h, away: a });
                              }
                            }
                          } else if (format === 'twice') {
                            // Ordered pairs (i plays at home against j)
                            const matchExists = activeMatches.some(m => m.homeTeam === h && m.awayTeam === a);
                            if (!matchExists) {
                              remainingList.push({ home: h, away: a });
                            }
                          }
                        }
                      }
                    }

                    if (remainingList.length === 0) {
                      return (
                        <div className="text-center py-12 px-4 bg-slate-50 dark:bg-slate-950/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                          <CheckCircle2 className="w-10 h-10 text-emerald-550 mx-auto mb-2.5" />
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            All Fixtures Completed!
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            No remaining standard matches required for this league format.
                          </p>
                        </div>
                      );
                    }

                    return remainingList.map((fixture, idx) => (
                      <div 
                        key={idx} 
                        className="p-3 bg-slate-50/50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-850 rounded-2xl flex items-center justify-between gap-2 hover:border-emerald-300 dark:hover:border-emerald-900/60 transition group"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-850 dark:text-slate-250">
                            <span className="truncate max-w-[100px]" title={fixture.home}>{fixture.home}</span>
                            <span className="text-[10px] font-bold text-slate-400">vs</span>
                            <span className="truncate max-w-[100px]" title={fixture.away}>{fixture.away}</span>
                          </div>
                          <div className="text-[9px] font-extrabold text-slate-400 group-hover:text-emerald-550 transition uppercase tracking-wide">
                            {format === 'twice' ? 'Double RR' : 'Single RR'}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setNewMatchHome(fixture.home);
                            setNewMatchAway(fixture.away);
                            setNewMatchDate(new Date().toISOString().split('T')[0]); // Default to today
                            setNewMatchTime('10:30');
                            setNewMatchType('League Match');
                            setNewMatchFormat(activeLeague ? getLeagueFormat(activeLeague) : '7v7');
                            setShowCreateMatchModal(true);
                          }}
                          className="bg-emerald-550/10 text-emerald-650 hover:bg-emerald-550 hover:text-white transition px-3 py-1.5 rounded-xl text-[10px] font-black cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="Schedule Fixture"
                        >
                          <Plus className="w-3 h-3 stroke-[2.5]" />
                          <span>Schedule</span>
                        </button>
                      </div>
                    ));
                  })()}
                </div>
              </div>

            </div>
          </div>
        )}

        {activeDetailTab === 'teams' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header with Add Team trigger */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    League Teams & Rosters
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Manage registered clubs, add new teams, or view active win records.
                  </p>
                </div>
                {onAddTeamToLeague && (
                  <button
                    type="button"
                    onClick={() => setShowAddTeamForm(!showAddTeamForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer transition active:scale-95 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Team</span>
                  </button>
                )}
              </div>

              {/* Collapsible Add Team Form */}
              {showAddTeamForm && onAddTeamToLeague && (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newTeamNameInput.trim()) return;
                    onAddTeamToLeague(currentSelectedLeagueId || '', newTeamNameInput);
                    setNewTeamNameInput('');
                    setShowAddTeamForm(false);
                  }}
                  className="bg-white dark:bg-slate-950 p-5 rounded-3xl border border-slate-200 dark:border-slate-850 shadow-md flex flex-col sm:flex-row gap-3 items-end max-w-xl animate-in slide-in-from-top-2 duration-200"
                >
                  <div className="flex-1 space-y-1.5 w-full">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Team Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Thunder FC"
                      value={newTeamNameInput}
                      onChange={(e) => setNewTeamNameInput(e.target.value)}
                      className="w-full text-xs p-3 border border-slate-200 dark:border-slate-850 dark:bg-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-hidden transition bg-white"
                    />
                  </div>
                  <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                    <button
                      type="submit"
                      className="flex-1 sm:flex-none px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl shadow-xs cursor-pointer transition text-center"
                    >
                      Save Team
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewTeamNameInput('');
                        setShowAddTeamForm(false);
                      }}
                      className="px-4 py-3 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 font-bold text-xs rounded-xl cursor-pointer transition text-center"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Grid of Teams */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {/* Dashed Add Card inside grid */}
                {onAddTeamToLeague && !showAddTeamForm && (
                  <button
                    type="button"
                    onClick={() => setShowAddTeamForm(true)}
                    className="p-5 min-h-[180px] rounded-3xl border-2 border-dashed border-slate-200 hover:border-emerald-500 dark:border-slate-800 dark:hover:border-emerald-500/50 flex flex-col items-center justify-center gap-3 text-center transition bg-slate-50/30 dark:bg-slate-900/10 hover:bg-white dark:hover:bg-slate-900 cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-850 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-emerald-500/10 group-hover:text-emerald-500 transition">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 block uppercase tracking-wide">Register New Team</span>
                      <span className="text-[10px] text-slate-455 dark:text-slate-500 font-bold mt-0.5 block">Add a custom roster to this league</span>
                    </div>
                  </button>
                )}

                {sortedStandings.map((team, index) => {
                  const isGameOnFC = team.name.toLowerCase().includes('game on');
                  const pos = index + 1;
                  const winRate = team.played > 0 ? Math.round((team.won / team.played) * 100) : 0;
                  const teamColor = getTeamColorStyles(team.name);
                  
                  return (
                    <div 
                      key={team.id}
                      className={`p-5 rounded-3xl border flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.01] ${
                        isGameOnFC 
                          ? 'bg-emerald-50/20 dark:bg-emerald-950/10 ' + teamColor.borderClass 
                          : 'bg-white dark:bg-slate-900 ' + teamColor.borderClass
                      }`}
                    >
                      {/* Top Accent Bar */}
                      <div className={`h-1.5 w-full absolute top-0 left-0 ${teamColor.dotBg}`} />

                      <div>
                        {/* Rank Indicator and Delete button */}
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg font-black text-xs ${
                            pos === 1 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400' :
                            pos === 2 ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
                            pos === 3 ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-400' :
                            'bg-slate-50 text-slate-400 dark:bg-slate-950 dark:text-slate-600'
                          }`}>
                            #{pos}
                          </span>

                          {onDeleteTeamFromLeague && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteTeamFromLeague(currentSelectedLeagueId || '', team.id);
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                              title="Delete Team"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Team Name with Custom Colored Emblem */}
                        <div className="flex items-center gap-2 mt-4">
                          <span className={`w-3 h-3 rounded-full shrink-0 shadow-2xs ${teamColor.dotBg} border border-white dark:border-slate-950`} />
                          <h3 className="text-md font-black text-slate-950 dark:text-white tracking-tight leading-tight uppercase truncate" title={team.name}>
                            {team.name}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-450 dark:text-slate-500 font-bold mt-1 ml-5">
                          Win Rate: {winRate}%
                        </p>
                      </div>

                      <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                        <div className="grid grid-cols-4 gap-2 text-center text-xs">
                          <div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">PLD</div>
                            <div className="font-mono font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{team.played}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-450 dark:text-slate-500 font-bold">W-D-L</div>
                            <div className="font-mono font-extrabold text-slate-850 dark:text-slate-200 mt-0.5 text-[10px] whitespace-nowrap">{team.won}-{team.drawn}-{team.lost}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">GD</div>
                            <div className="font-mono font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{team.goalsFor - team.goalsAgainst}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">PTS</div>
                            <div className="font-mono font-black text-slate-950 dark:text-white mt-0.5">{team.points}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CREATE MATCH MODAL */}
          {showCreateMatchModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-4 sm:p-6 space-y-3 sm:space-y-4 animate-in zoom-in-95 duration-150 text-left max-h-[92dvh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/65 pb-2.5 sm:pb-3">
                  <h3 className="text-md sm:text-lg font-black text-slate-950 dark:text-white flex items-center gap-1.5 sm:gap-2">
                    <Swords className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                    Create League Match Fixture
                  </h3>
                  <button 
                    onClick={() => setShowCreateMatchModal(false)}
                    className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateMatchSubmit} className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4 p-0.5">
                    <div className="space-y-1">
                      <label className="text-xs font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase select-none">Home Team (A)</label>
                      <select
                        value={newMatchHome}
                        onChange={e => setNewMatchHome(e.target.value)}
                        className="w-full text-sm p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-550 focus:outline-hidden bg-white shadow-xs transition-all duration-150"
                        required
                      >
                        <option value="">-- Select Team --</option>
                        {newMatchType === 'Friendly Match' && (
                          <>
                            <option value="Team Yellow">Team Yellow 🟡</option>
                            <option value="Team Red">Team Red 🔴</option>
                          </>
                        )}
                        {alphabeticalTeams.map(t => (
                          <option key={t.id} value={t.name}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase select-none">Away Team (B)</label>
                      <select
                        value={newMatchAway}
                        onChange={e => setNewMatchAway(e.target.value)}
                        className="w-full text-sm p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-550 focus:outline-hidden bg-white shadow-xs transition-all duration-150"
                        required
                      >
                        <option value="">-- Select Team --</option>
                        {newMatchType === 'Friendly Match' && (
                          <>
                            <option value="Team Yellow">Team Yellow 🟡</option>
                            <option value="Team Red">Team Red 🔴</option>
                          </>
                        )}
                        {alphabeticalTeams.map(t => (
                          <option key={t.id} value={t.name}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <CustomDatePicker
                        value={newMatchDate}
                        onChange={setNewMatchDate}
                        label="Date"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase select-none">Time</label>
                      <input
                        type="text"
                        placeholder="e.g. 10:30"
                        value={newMatchTime}
                        onChange={e => setNewMatchTime(e.target.value)}
                        className="w-full text-sm p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-550 focus:outline-hidden shadow-xs transition-all duration-150"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase select-none">Match Number</label>
                      <input
                        type="number"
                        placeholder="e.g. 17"
                        value={newMatchNumber}
                        onChange={e => setNewMatchNumber(e.target.value)}
                        className="w-full text-sm p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-550 focus:outline-hidden shadow-xs transition-all duration-150"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase select-none">Match Type</label>
                      <select
                        value={newMatchType}
                        onChange={e => {
                          const val = e.target.value as 'League Match' | 'Friendly Match';
                          setNewMatchType(val);
                          if (val === 'Friendly Match') {
                            setNewMatchHome('Team Yellow');
                            setNewMatchAway('Team Red');
                          } else {
                            setNewMatchHome('');
                            setNewMatchAway('');
                          }
                        }}
                        className="w-full text-sm p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-550 focus:outline-hidden bg-white shadow-xs transition-all duration-150"
                      >
                        <option value="League Match">League Match</option>
                        <option value="Friendly Match">Friendly Match</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase select-none">Match Format</label>
                      <select
                        value={newMatchFormat}
                        onChange={e => setNewMatchFormat(e.target.value)}
                        className="w-full text-sm p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-550 focus:outline-hidden bg-white shadow-xs transition-all duration-150"
                      >
                        <option value="5v5">5v5</option>
                        <option value="6v6">6v6</option>
                        <option value="7v7">7v7</option>
                        <option value="8v8">8v8</option>
                        <option value="9v9">9v9</option>
                        <option value="10v10">10v10</option>
                        <option value="11v11">11v11</option>
                      </select>
                    </div>
                  </div>

                  {newMatchType !== 'Friendly Match' && newMatchHome && newMatchAway && isMatchLimitReached(newMatchHome, newMatchAway) && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/60 rounded-2xl flex items-start gap-2 text-xs text-red-700 dark:text-red-400">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-extrabold uppercase tracking-wide text-[10px]">Fixture Limit Reached</p>
                        <p className="mt-0.5">
                          {newMatchHome} and {newMatchAway} have already reached their limit of <strong>
                            {(activeLeague?.format || 'once') === 'once' ? '1 match (Single Round-Robin)' : '2 matches (Double Round-Robin)'}
                          </strong>. Creating this match is prohibited.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowCreateMatchModal(false)}
                      className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition duration-150"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={Boolean(newMatchType !== 'Friendly Match' && newMatchHome && newMatchAway && isMatchLimitReached(newMatchHome, newMatchAway))}
                      className={`text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs transition duration-150 ${
                        newMatchType !== 'Friendly Match' && newMatchHome && newMatchAway && isMatchLimitReached(newMatchHome, newMatchAway)
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-550 text-white cursor-pointer active:scale-95'
                      }`}
                    >
                      Create Match
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* EDIT MATCH MODAL */}
          {editingMatch && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150 text-left max-h-[calc(100vh-2rem)] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-950 dark:text-white flex items-center gap-2">
                    <Edit2 className="w-5 h-5 text-amber-500" />
                    Edit Match
                  </h3>
                  <button 
                    onClick={() => setEditingMatch(null)}
                    className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleEditMatchSubmit} className="space-y-4" id="edit-match-form">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-850">
                    <div className="space-y-1">
                      <label className="text-xs font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase">Home Team</label>
                      <select
                        value={editHomeTeam}
                        onChange={e => setEditHomeTeam(e.target.value)}
                        className="w-full text-xs p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:outline-emerald-550 bg-white font-extrabold uppercase shadow-xs"
                        required
                      >
                        <option value="">-- Select Team --</option>
                        {editMatchType === 'Friendly Match' ? (
                          <>
                            <option value="Team Yellow">Team Yellow 🟡</option>
                            <option value="Team Red">Team Red 🔴</option>
                          </>
                        ) : (
                          alphabeticalTeams.map(t => (
                            <option key={t.id} value={t.name}>{t.name}</option>
                          ))
                        )}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase">Away Team</label>
                      <select
                        value={editAwayTeam}
                        onChange={e => setEditAwayTeam(e.target.value)}
                        className="w-full text-xs p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:outline-emerald-550 bg-white font-extrabold uppercase shadow-xs"
                        required
                      >
                        <option value="">-- Select Team --</option>
                        {editMatchType === 'Friendly Match' ? (
                          <>
                            <option value="Team Yellow">Team Yellow 🟡</option>
                            <option value="Team Red">Team Red 🔴</option>
                          </>
                        ) : (
                          alphabeticalTeams.map(t => (
                            <option key={t.id} value={t.name}>{t.name}</option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Match Type</label>
                      <select
                        value={editMatchType}
                        onChange={e => setEditMatchType(e.target.value as any)}
                        className="w-full text-sm p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:outline-emerald-550 bg-white"
                      >
                        <option value="League Match">League Match</option>
                        <option value="Friendly Match">Friendly Match</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Match Status</label>
                      <select
                        value={editMatchStatus}
                        onChange={e => setEditMatchStatus(e.target.value as any)}
                        className="w-full text-sm p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:outline-emerald-550 bg-white"
                      >
                        <option value="Scheduled">Scheduled</option>
                        <option value="Live">Live</option>
                        <option value="Played">Played (Completed)</option>
                      </select>
                    </div>

                    {editMatchStatus !== 'Scheduled' && (
                      <div className="space-y-1 grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Home Score</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={editHomeScore}
                            onChange={e => setEditHomeScore(e.target.value)}
                            className="w-full text-sm p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:outline-emerald-550"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Away Score</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={editAwayScore}
                            onChange={e => setEditAwayScore(e.target.value)}
                            className="w-full text-sm p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:outline-emerald-550"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Date</label>
                      <input
                        type="text"
                        placeholder="e.g. 27 Jun 2026"
                        value={editMatchDate}
                        onChange={e => setEditMatchDate(e.target.value)}
                        className="w-full text-sm p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:outline-emerald-550"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Time</label>
                      <input
                        type="text"
                        placeholder="e.g. 09:30"
                        value={editMatchTime}
                        onChange={e => setEditMatchTime(e.target.value)}
                        className="w-full text-sm p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:outline-emerald-550"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Match Format</label>
                      <select
                        value={editMatchFormat}
                        onChange={e => setEditMatchFormat(e.target.value)}
                        className="w-full text-sm p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:outline-emerald-550 bg-white"
                      >
                        <option value="5v5">5v5</option>
                        <option value="6v6">6v6</option>
                        <option value="7v7">7v7</option>
                        <option value="8v8">8v8</option>
                        <option value="9v9">9v9</option>
                        <option value="10v10">10v10</option>
                        <option value="11v11">11v11</option>
                      </select>
                    </div>

                    {editMatchStatus === 'Played' && (
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Player of the Day</label>
                        <input
                          type="text"
                          placeholder="e.g. Chinedu"
                          value={editPlayerOfMatch}
                          onChange={e => setEditPlayerOfMatch(e.target.value)}
                          className="w-full text-sm p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:outline-emerald-550"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setEditingMatch(null)}
                      className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-xl shadow-xs cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-2xl border border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500">
          <HelpCircle className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-705" />
          <p className="text-sm">Please select a league to view standings boards and fixtures schedules.</p>
        </div>
      )}
      {/* Custom Delete League Confirmation Modal */}
      {leagueToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-red-100 dark:bg-red-950/30 text-red-600 rounded-full shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="text-lg font-black text-slate-950 dark:text-slate-50 leading-tight">
                  Delete League?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                  Are you sure you want to delete <span className="font-bold text-slate-850 dark:text-slate-100">"{leagueToDelete.name}"</span>? This will clear all standing ladders, matches, and logs associated with this league. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                id="confirm-delete-league-btn"
                onClick={() => {
                  if (onDeleteLeague) {
                    onDeleteLeague(leagueToDelete.id);
                  }
                  setLeagueToDelete(null);
                }}
                className="w-full sm:flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl transition cursor-pointer shadow-sm active:scale-95"
              >
                Confirm Delete
              </button>
              <button
                id="cancel-delete-league-btn"
                onClick={() => setLeagueToDelete(null)}
                className="w-full sm:flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-xs font-black rounded-xl transition cursor-pointer active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Match Confirmation Modal */}
      {matchIdToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-red-100 dark:bg-red-950/30 text-red-600 rounded-full shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="text-lg font-black text-slate-950 dark:text-slate-50 leading-tight">
                  Delete Match Fixture?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                  Are you sure you want to delete this match fixture? All associated statistics, scores, and details will be permanently removed.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                id="confirm-delete-match-btn"
                onClick={() => {
                  if (matchIdToDelete) {
                    console.log("Delete button clicked", matchIdToDelete);
                    try {
                      if (onDeleteMatch) {
                        onDeleteMatch(matchIdToDelete);
                      }
                    } catch (error) {
                      console.error("Delete failed:", error);
                    }
                  }
                  setMatchIdToDelete(null);
                }}
                className="w-full sm:flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl transition cursor-pointer shadow-sm active:scale-95"
              >
                Confirm Delete
              </button>
              <button
                id="cancel-delete-match-btn"
                onClick={() => setMatchIdToDelete(null)}
                className="w-full sm:flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-xs font-black rounded-xl transition cursor-pointer active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Match Details Verification Report Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" id="verification-report-modal">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-indigo-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 sm:p-7 space-y-4 animate-in zoom-in-95 duration-200 relative overflow-hidden">
            {/* Top color bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800" />
            
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl shrink-0">
                  <CheckCircle2 className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-950 dark:text-slate-50 leading-tight">
                    Match Details Verification Report
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                    System scanned all played match details, goals, player of match accolades, and team rosters for consistency.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowVerificationModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition p-1 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Results Status Header */}
            <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
              verificationDiscrepancies === 0 
                ? 'bg-emerald-50/60 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400' 
                : 'bg-amber-50/60 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30 text-amber-800 dark:text-amber-400'
            }`}>
              {verificationDiscrepancies === 0 ? (
                <div className="p-1 bg-emerald-100 dark:bg-emerald-900/40 rounded-full text-emerald-600">
                  <Check className="w-4 h-4 font-black" />
                </div>
              ) : (
                <div className="p-1 bg-amber-100 dark:bg-amber-900/40 rounded-full text-amber-600">
                  <AlertCircle className="w-4 h-4 font-black" />
                </div>
              )}
              <div className="text-xs font-bold leading-relaxed">
                {verificationDiscrepancies === 0 
                  ? "Perfect Integrity: All match detail cards are consistent. Player standings calculated with 100% precision." 
                  : `Sync Complete: Detected & auto-synchronized ${verificationDiscrepancies} structural discrepancies inside match details cards.`}
              </div>
            </div>

            {/* Logs List Container */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500">Verification Steps & Log Audit</span>
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl p-4 max-h-[240px] overflow-y-auto space-y-2.5 scrollbar-thin">
                {verificationReport && verificationReport.length > 0 ? (
                  verificationReport.map((line, idx) => {
                    const isIssue = line.includes("discrepancy") || line.includes("Missing") || line.includes("missing") || line.includes("does not match") || line.includes("incorrect");
                    return (
                      <div key={idx} className="flex gap-2.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                        <span className={`text-[10px] mt-0.5 select-none font-black ${isIssue ? 'text-amber-500' : 'text-indigo-500'}`}>
                          {isIssue ? '⚠' : '✓'}
                        </span>
                        <p className="flex-1">{line}</p>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500 italic">No verification output available.</div>
                )}
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowVerificationModal(false)}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 text-xs font-black rounded-xl transition cursor-pointer shadow-md active:scale-95 text-center"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Developer Debugger Panel */}
      <div 
        id="developer-debugger-panel" 
        className="mt-12 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden transition-all duration-300 shadow-xs"
      >
        <div 
          onClick={() => setShowDebuggerPanel(!showDebuggerPanel)}
          className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-150/50 dark:hover:bg-slate-800/40 select-none transition"
        >
          <div className="flex items-center gap-3">
            <span className="p-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl">
              ⚙️
            </span>
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white leading-none">
                Developer Debugger Panel
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                Automated Player State Inspection, Data Mutation Audits & Log Tracer
              </p>
            </div>
          </div>
          <button 
            className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-[10px] font-black rounded-lg transition"
          >
            {showDebuggerPanel ? 'COLLAPSE' : 'EXPAND'}
          </button>
        </div>

        {showDebuggerPanel && (
          <div className="p-5 border-t border-slate-200 dark:border-slate-800 space-y-4 animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  if ((window as any).auditPlayerState) {
                    (window as any).auditPlayerState();
                  }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer active:scale-95"
              >
                Run Live State Audit (`auditPlayerState()`)
              </button>
              
              <button
                onClick={() => setDebuggerLogs([])}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer active:scale-95"
              >
                Clear Log Console
              </button>

              {onRebuildPlayerStats && (
                <button
                  onClick={() => {
                    onRebuildPlayerStats();
                    const logMsg = `[DEV] Triggered forced global rebuild of all player stats!`;
                    setDebuggerLogs(prev => [...prev, logMsg]);
                    console.log(logMsg);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer active:scale-95 flex items-center gap-1"
                >
                  <RotateCw className="w-3.5 h-3.5 animate-spin-reverse" />
                  Force Global Recalculation
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500 block">
                Diagnostic Console Logs
              </span>
              <div className="bg-slate-950 text-slate-300 font-mono text-[11px] leading-relaxed p-4 rounded-2xl border border-slate-800 max-h-72 overflow-y-auto space-y-1 scrollbar-thin shadow-inner">
                {debuggerLogs && debuggerLogs.length > 0 ? (
                  debuggerLogs.map((line, idx) => {
                    let colorClass = "text-slate-300";
                    if (line.includes("✅")) {
                      colorClass = "text-emerald-400 font-semibold";
                    } else if (line.includes("⚠️") || line.includes("DISCREPANCY")) {
                      colorClass = "text-amber-400 font-semibold";
                    } else if (line.includes("❌") || line.includes("FAILED")) {
                      colorClass = "text-rose-400 font-semibold";
                    } else if (line.includes("=== ") || line.includes("--- ")) {
                      colorClass = "text-indigo-400 font-bold";
                    } else if (line.includes("[DEV]")) {
                      colorClass = "text-cyan-400";
                    }
                    return (
                      <div key={idx} className={`${colorClass} whitespace-pre-wrap`}>
                        {line}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-500 italic">
                    Log console idle. Click &apos;Run Live State Audit&apos; or type &apos;window.auditPlayerState()&apos; in DevTools.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Adjust Player Standings Modal */}
      {adjustingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>✏️</span> Adjust Standings: {adjustingPlayer.name}
              </h3>
              <button
                onClick={() => setAdjustingPlayer(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Played (PLD)</label>
                <input
                  type="number"
                  value={adjustPlayed}
                  onChange={(e) => setAdjustPlayed(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Won (W)</label>
                <input
                  type="number"
                  value={adjustWon}
                  onChange={(e) => setAdjustWon(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Drawn (D)</label>
                <input
                  type="number"
                  value={adjustDrawn}
                  onChange={(e) => setAdjustDrawn(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Lost (L)</label>
                <input
                  type="number"
                  value={adjustLost}
                  onChange={(e) => setAdjustLost(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Goals Scored</label>
                <input
                  type="number"
                  value={adjustGoals}
                  onChange={(e) => setAdjustGoals(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-amber-600 dark:text-amber-400 mb-1">MVP (POTD) Awards</label>
                <input
                  type="number"
                  value={adjustPOTD}
                  onChange={(e) => setAdjustPOTD(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-amber-600 dark:text-amber-400 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Points (PTS)</label>
                <input
                  type="number"
                  value={adjustPoints}
                  onChange={(e) => setAdjustPoints(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setAdjustingPlayer(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAdjustment}
                className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md cursor-pointer"
              >
                Save Standings Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Team Standings Modal */}
      {adjustingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>🛡️</span> Adjust Team Standings: {adjustingTeam.name}
              </h3>
              <button
                onClick={() => setAdjustingTeam(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Played (PLD)</label>
                <input
                  type="number"
                  value={adjustTeamPlayed}
                  onChange={(e) => setAdjustTeamPlayed(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Won (W)</label>
                <input
                  type="number"
                  value={adjustTeamWon}
                  onChange={(e) => setAdjustTeamWon(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Drawn (D)</label>
                <input
                  type="number"
                  value={adjustTeamDrawn}
                  onChange={(e) => setAdjustTeamDrawn(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Lost (L)</label>
                <input
                  type="number"
                  value={adjustTeamLost}
                  onChange={(e) => setAdjustTeamLost(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Goals For (GF)</label>
                <input
                  type="number"
                  value={adjustTeamGF}
                  onChange={(e) => setAdjustTeamGF(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Goals Against (GA)</label>
                <input
                  type="number"
                  value={adjustTeamGA}
                  onChange={(e) => setAdjustTeamGA(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Points (PTS)</label>
                <input
                  type="number"
                  value={adjustTeamPoints}
                  onChange={(e) => setAdjustTeamPoints(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setAdjustingTeam(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTeamAdjustment}
                className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md cursor-pointer"
              >
                Save Team Standings
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
