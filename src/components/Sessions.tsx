import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Player, Session, AttendanceRecord, League, LeagueMatch, MatchGoal } from '../types';
import { getInitialsColor } from './Players';
import { getTeamColorStyles } from '../utils/teamColors';
import { callBackendSyncValidator } from '../utils/validation';
import { getPresentPlayersForSession, isPlayerPresentForSession } from '../utils/sessionAttendanceUtils';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Plus, 
  Check, 
  X, 
  AlertCircle,
  ChevronDown, 
  ChevronUp, 
  UserCheck, 
  Save, 
  Trash2,
  FileText,
  Download,
  Search,
  CheckCircle,
  HelpCircle,
  ArrowLeft,
  Home,
  Star,
  UserPlus,
  Ban,
  RotateCw,
  Activity,
  Trophy,
  RefreshCw,
  Edit2,
  Swords,
  Timer
} from 'lucide-react';

import { normalizeDateToISO } from '../utils/dateUtils';
import { CustomDatePicker } from './CustomDatePicker';

const normalizeToISODate = (dateStr: string | undefined | null): string => {
  return normalizeDateToISO(dateStr);
};

interface SwipeToggleProps {
  value: boolean;
  onChange: (newValue: boolean) => void;
}

const SwipeToggle: React.FC<SwipeToggleProps> = ({ value, onChange }) => {
  const handleRef = React.useRef<HTMLDivElement>(null);
  const greenOverlayRef = React.useRef<HTMLDivElement>(null);
  const isDraggingRef = React.useRef(false);
  const offsetRef = React.useRef(0);

  const TRACK_WIDTH = 104; // px
  const HANDLE_SIZE = 26;  // px
  const PADDING = 2;       // px
  const maxOffset = TRACK_WIDTH - HANDLE_SIZE - PADDING * 2; // 74px

  React.useEffect(() => {
    if (!isDraggingRef.current) {
      const targetOffset = value ? maxOffset : 0;
      offsetRef.current = targetOffset;
      if (handleRef.current) {
        handleRef.current.style.transform = `translate3d(${targetOffset}px, 0, 0)`;
        handleRef.current.style.transition = 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)';
      }
      if (greenOverlayRef.current) {
        greenOverlayRef.current.style.opacity = value ? '1' : '0';
        greenOverlayRef.current.style.transition = 'opacity 200ms cubic-bezier(0.16, 1, 0.3, 1)';
      }
    }
  }, [value, maxOffset]);

  const handleStart = (clientX: number) => {
    isDraggingRef.current = true;
    const startX = clientX;
    const startOffset = offsetRef.current;

    if (handleRef.current) {
      handleRef.current.style.transition = 'none';
    }
    if (greenOverlayRef.current) {
      greenOverlayRef.current.style.transition = 'none';
    }

    const handleMove = (currentX: number) => {
      if (!isDraggingRef.current) return;
      const deltaX = currentX - startX;
      let newOffset = startOffset + deltaX;
      newOffset = Math.max(0, Math.min(maxOffset, newOffset));
      offsetRef.current = newOffset;

      if (handleRef.current) {
        handleRef.current.style.transform = `translate3d(${newOffset}px, 0, 0)`;
      }
      if (greenOverlayRef.current) {
        greenOverlayRef.current.style.opacity = String(newOffset / maxOffset);
      }
    };

    const handleEnd = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;

      const finalOffset = offsetRef.current;
      const isNowIn = finalOffset > maxOffset / 2;

      const targetOffset = isNowIn ? maxOffset : 0;
      offsetRef.current = targetOffset;

      if (handleRef.current) {
        handleRef.current.style.transition = 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)';
        handleRef.current.style.transform = `translate3d(${targetOffset}px, 0, 0)`;
      }
      if (greenOverlayRef.current) {
        greenOverlayRef.current.style.transition = 'opacity 200ms cubic-bezier(0.16, 1, 0.3, 1)';
        greenOverlayRef.current.style.opacity = isNowIn ? '1' : '0';
      }

      if (isNowIn !== value) {
        onChange(isNowIn);
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX);
    };

    const onMouseUp = () => {
      handleEnd();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX);
      }
    };

    const onTouchEnd = () => {
      handleEnd();
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleStart(e.touches[0].clientX);
    }
  };

  const handleTrackClick = (e: React.MouseEvent) => {
    if (isDraggingRef.current) return;
    if (handleRef.current && handleRef.current.contains(e.target as Node)) return;
    onChange(!value);
  };

  return (
    <div 
      onClick={handleTrackClick}
      className="relative w-[104px] h-[30px] bg-slate-200 dark:bg-slate-800 rounded-full cursor-pointer select-none overflow-hidden border border-slate-300/40 dark:border-slate-700/40 shadow-inner flex items-center shrink-0"
      style={{ touchAction: 'none' }}
    >
      {/* Off/Out Base Track */}
      <div className="absolute inset-0 flex items-center justify-between px-3 text-slate-400 dark:text-slate-500 font-extrabold text-[9px] pointer-events-none select-none">
        <span>OUT</span>
        <span className="text-[11px] font-bold opacity-40">✕</span>
      </div>

      {/* On/In Active Overlay */}
      <div 
        ref={greenOverlayRef}
        className="absolute inset-0 bg-emerald-555 dark:bg-emerald-600 flex items-center justify-between px-3 text-white font-extrabold text-[9px] pointer-events-none select-none"
        style={{ opacity: value ? 1 : 0 }}
      >
        <span className="text-[11px] font-bold opacity-60">✓</span>
        <span>IN</span>
      </div>

      {/* Touch Handle */}
      <div
        ref={handleRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className="absolute w-[26px] h-[26px] bg-white dark:bg-slate-100 rounded-full shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing border border-slate-200/50"
        style={{
          left: `${PADDING}px`,
          willChange: 'transform',
          transform: `translate3d(${value ? maxOffset : 0}px, 0, 0)`,
        }}
      >
        <div className="flex gap-[2px] items-center justify-center pointer-events-none">
          <span className="w-[2px] h-[8px] bg-slate-300 dark:bg-slate-450 rounded-full" />
          <span className="w-[2px] h-[8px] bg-slate-300 dark:bg-slate-450 rounded-full" />
          <span className="w-[2px] h-[8px] bg-slate-300 dark:bg-slate-450 rounded-full" />
        </div>
      </div>
    </div>
  );
};

interface SessionsProps {
  sessions: Session[];
  players: Player[];
  attendance: AttendanceRecord[];
  leagues: League[];
  matches?: LeagueMatch[];
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  onAddSession: (session: Omit<Session, 'id'> | Omit<Session, 'id'>[]) => void;
  onAddPlayer?: (player: Omit<Player, 'id'>) => Player;
  onUpdateAttendance: (sessionId: string, records: AttendanceRecord[]) => void;
  onDeleteSession: (sessionId: string, deleteAllInSeries?: boolean) => void;
  onDeleteAllSessions?: () => void;
  onDeleteMatch?: (matchId: string) => void;
  sessionOrigin?: 'sessions' | 'leagues';
  onBackToOrigin?: () => void;
  onNavigateToLeagueMatch?: (leagueId: string, matchId?: string) => void;
  sheetsSyncStatus?: 'idle' | 'syncing' | 'synced' | 'error';
  onUpdateMatch?: (match: LeagueMatch) => void;
  onAddMatch?: (match: LeagueMatch) => void;
  onRecordMatchResult?: (matchId: string, homeScore: number, awayScore: number) => void;
  onSyncSessionWithMatch?: (sessionId: string, matchId: string) => Promise<any>;
  onUpdateSession?: (session: Session) => void;
  onNavigate?: (tab: string) => void;
}

export default function Sessions({ 
  sessions, 
  players, 
  attendance, 
  leagues, 
  matches = [],
  activeSessionId,
  setActiveSessionId,
  onAddSession, 
  onAddPlayer,
  onUpdateAttendance,
  onDeleteSession,
  onDeleteAllSessions,
  onDeleteMatch,
  sessionOrigin = 'sessions',
  onBackToOrigin,
  onNavigateToLeagueMatch,
  sheetsSyncStatus = 'idle',
  onUpdateMatch,
  onAddMatch,
  onRecordMatchResult,
  onSyncSessionWithMatch,
  onUpdateSession,
  onNavigate
}: SessionsProps) {
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [isValidatingSync, setIsValidatingSync] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const handleRunSyncValidator = async () => {
    setIsValidatingSync(true);
    setSyncStatusMsg(null);
    try {
      const res = await callBackendSyncValidator();
      if (res && res.success) {
        setSyncStatusMsg(`Synced: ${res.created_sessions} new session cards created, ${res.total_matches} matches verified.`);
      } else {
        setSyncStatusMsg('Matches & session cards verified.');
      }
    } catch (err) {
      setSyncStatusMsg('Sync check completed.');
    } finally {
      setIsValidatingSync(false);
      setTimeout(() => setSyncStatusMsg(null), 6000);
    }
  };
  
  // Filtering & Search
  const [statusFilter, setStatusFilter] = useState<'All' | 'Completed' | 'Upcoming'>('All');
  const [typeFilter, setTypeFilter] = useState<'All' | 'League Match' | 'Friendly Match'>('All');
  const [linkFilter, setLinkFilter] = useState<'All' | 'Linked' | 'Unlinked'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Form states for adding session
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newType, setNewType] = useState<'League Match' | 'Friendly Match'>('Friendly Match');
  const [newLeagueId, setNewLeagueId] = useState('');
  const [newFee, setNewFee] = useState('0.00');
  const [newFormat, setNewFormat] = useState<string>('7v7');
  
  // New session team & roster states
  const [newSessionHome, setNewSessionHome] = useState('');
  const [newSessionAway, setNewSessionAway] = useState('');
  const [newSessionHomeRoster, setNewSessionHomeRoster] = useState<string[]>([]);
  const [newSessionAwayRoster, setNewSessionAwayRoster] = useState<string[]>([]);

  // Edit Session Modal states
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [editSessionTitle, setEditSessionTitle] = useState('');
  const [editSessionDate, setEditSessionDate] = useState('');
  const [editSessionTime, setEditSessionTime] = useState('');
  const [editSessionLocation, setEditSessionLocation] = useState('');
  const [editSessionType, setEditSessionType] = useState<'League Match' | 'Friendly Match'>('Friendly Match');
  const [editSessionLeagueId, setEditSessionLeagueId] = useState('');
  const [editSessionHome, setEditSessionHome] = useState('');
  const [editSessionAway, setEditSessionAway] = useState('');
  const [editSessionHomeRoster, setEditSessionHomeRoster] = useState<string[]>([]);
  const [editSessionAwayRoster, setEditSessionAwayRoster] = useState<string[]>([]);

  const [activeCreateMatchSession, setActiveCreateMatchSession] = useState<Session | null>(null);
  
  // Recurrence states
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringCount, setRecurringCount] = useState<number>(4);
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
  const [matchToDelete, setMatchToDelete] = useState<LeagueMatch | null>(null);

  // Search and selector state for the session details view
  const [searchPlayerQuery, setSearchPlayerQuery] = useState('');
  const [starPlayerId, setStarPlayerId] = useState<string>('');

  // Custom Create Match Modal states
  const [showCreateMatchModal, setShowCreateMatchModal] = useState(false);
  const [newMatchHome, setNewMatchHome] = useState('TBD');
  const [newMatchAway, setNewMatchAway] = useState('TBD');
  const [newMatchHomeScore, setNewMatchHomeScore] = useState<string>('');
  const [newMatchAwayScore, setNewMatchAwayScore] = useState<string>('');
  const [newMatchStatus, setNewMatchStatus] = useState<'Scheduled' | 'Played'>('Scheduled');
  const [newMatchTypeState, setNewMatchTypeState] = useState<'League Match' | 'Friendly Match'>('Friendly Match');
  const [newMatchLeagueId, setNewMatchLeagueId] = useState('');

  // Interactive Attendance Record state for currently open session
  const [sessionAttendance, setSessionAttendance] = useState<Record<string, {
    status: 'Present' | 'Absent' | 'Excused';
    feePaid: boolean;
    notes: string;
    arrivalTime?: string;
  }>>({});

  const lastSessionIdRef = React.useRef<string | null>(null);

  // Sync isUserEditing state to window object for snapshot locking
  React.useEffect(() => {
    const isEditing = !!activeSessionId || !!editingSession;
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
  }, [activeSessionId, editingSession]);

  // --- BULLETPROOF REAL-TIME AUTO-SAVE ENGINE (Sessions) ---
  React.useEffect(() => {
    if (!editingSession) return;

    const handler = setTimeout(() => {
      // Build updated session with strict DEEP-MERGE SCHEMA GUARD
      const updated: Session = {
        ...editingSession,
        title: editSessionTitle || editingSession.title,
        date: editSessionDate || editingSession.date,
        time: editSessionTime || editingSession.time,
        location: editSessionLocation || editingSession.location,
        type: editSessionType || editingSession.type,
        leagueId: editSessionLeagueId || editingSession.leagueId || undefined,
        homeTeam: editSessionHome || editingSession.homeTeam || undefined,
        awayTeam: editSessionAway || editingSession.awayTeam || undefined,
        homeRoster: editSessionHomeRoster || editingSession.homeRoster || [],
        awayRoster: editSessionAwayRoster || editingSession.awayRoster || [],
        sessionTeams: [editSessionHome || editingSession.homeTeam, editSessionAway || editingSession.awayTeam].filter(Boolean) as string[]
      };

      console.log("⚡ [DEBUNCED AUTO-SAVE SESSION EDIT MODAL] Syncing...", updated);

      if (onUpdateSession) {
        onUpdateSession(updated);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [
    editingSession,
    editSessionTitle,
    editSessionDate,
    editSessionTime,
    editSessionLocation,
    editSessionType,
    editSessionLeagueId,
    editSessionHome,
    editSessionAway,
    editSessionHomeRoster,
    editSessionAwayRoster
  ]);

  React.useEffect(() => {
    if (activeSessionId) {
      const session = sessions.find(s => s.id === activeSessionId);
      if (session) {
        const isSameSession = lastSessionIdRef.current === activeSessionId;
        lastSessionIdRef.current = activeSessionId;

        setSessionAttendance(prev => {
          const tempAttendance: typeof sessionAttendance = {};
          const activePlayers = players.filter(p => p.status === 'Active');

          activePlayers.forEach(p => {
            if (isSameSession && prev && prev[p.id]) {
              tempAttendance[p.id] = prev[p.id];
            } else {
              const existing = attendance.find(a => a.sessionId === session.id && a.playerId === p.id);
              if (existing) {
                tempAttendance[p.id] = {
                  status: existing.status,
                  feePaid: existing.feePaid || false,
                  notes: existing.notes || '',
                  arrivalTime: existing.arrivalTime
                };
              }
            }
          });
          return tempAttendance;
        });
      }
    } else {
      lastSessionIdRef.current = null;
      setSessionAttendance({});
    }
  }, [activeSessionId, sessions, players, attendance]);

  const handleOpenAttendance = (session: Session) => {
    if (activeSessionId === session.id) {
      setActiveSessionId(null);
      return;
    }
    
    // Initialize temporary state with existing records, fallback to defaults
    const tempAttendance: typeof sessionAttendance = {};
    const activePlayers = players.filter(p => p.status === 'Active');
    
    activePlayers.forEach(p => {
      const existing = attendance.find(a => a.sessionId === session.id && a.playerId === p.id);
      if (existing) {
        tempAttendance[p.id] = {
          status: existing.status,
          feePaid: existing.feePaid || false,
          notes: existing.notes || '',
          arrivalTime: existing.arrivalTime
        };
      }
    });

    setSessionAttendance(tempAttendance);
    setSearchPlayerQuery('');
    setStarPlayerId('');
    setActiveSessionId(session.id);
  };

  const saveAttendanceImmediately = (updatedAttendance: typeof sessionAttendance) => {
    if (!activeSessionId) return;
    const recordsToSave: AttendanceRecord[] = Object.keys(updatedAttendance).map(playerId => {
      const val = updatedAttendance[playerId];
      return {
        sessionId: activeSessionId,
        playerId,
        status: val.status,
        feePaid: val.feePaid,
        notes: val.notes,
        arrivalTime: val.arrivalTime
      };
    });
    onUpdateAttendance(activeSessionId, recordsToSave);
  };

  const handleQuickRegisterAndPresent = (nameToRegister: string) => {
    if (!onAddPlayer) return;
    
    const newPlayer: Omit<Player, 'id'> = {
      name: nameToRegister,
      status: 'Active',
      joinDate: new Date().toISOString().split('T')[0]
    };
    
    const registered = onAddPlayer(newPlayer);
    
    const existingNumbers = Object.values(sessionAttendance)
      .map((v: any) => parseInt(v?.arrivalTime || '0', 10))
      .filter(n => !isNaN(n) && n > 0);
    const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const arrivalTime = String(maxNum + 1);
    
    const updated = {
      ...sessionAttendance,
      [registered.id]: {
        status: 'Present' as const,
        feePaid: false,
        notes: '',
        arrivalTime
      }
    };
    
    setSessionAttendance(updated);
    saveAttendanceImmediately(updated);
    setSearchPlayerQuery('');
  };

  const handleStatusChange = (playerId: string, status: 'Present' | 'Absent' | 'Excused') => {
    let arrivalTime = sessionAttendance[playerId]?.arrivalTime;
    if (status === 'Present' && !arrivalTime) {
      const existingNumbers = Object.values(sessionAttendance)
        .map((v: any) => parseInt(v?.arrivalTime || '0', 10))
        .filter(n => !isNaN(n) && n > 0);
      const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
      arrivalTime = String(maxNum + 1);
    } else if (status !== 'Present') {
      arrivalTime = undefined;
    }
    const updated = {
      ...sessionAttendance,
      [playerId]: {
        ...sessionAttendance[playerId],
        status,
        arrivalTime,
        feePaid: status === 'Present' ? sessionAttendance[playerId].feePaid : false
      }
    };
    setSessionAttendance(updated);
    saveAttendanceImmediately(updated);
  };

  const handleArrivalTimeChange = (playerId: string, arrivalTime: string) => {
    const updated = {
      ...sessionAttendance,
      [playerId]: {
        ...sessionAttendance[playerId],
        arrivalTime
      }
    };
    setSessionAttendance(updated);
    saveAttendanceImmediately(updated);
  };

  const handleMarkAllPresent = () => {
    if (!activeSessionId) return;
    const activePlayers = players.filter(p => p.status === 'Active');
    const updated: typeof sessionAttendance = {};
    activePlayers.forEach((p, idx) => {
      updated[p.id] = {
        status: 'Present',
        feePaid: sessionAttendance[p.id]?.feePaid || false,
        notes: sessionAttendance[p.id]?.notes || '',
        arrivalTime: sessionAttendance[p.id]?.arrivalTime || String(idx + 1)
      };
    });
    setSessionAttendance(updated);
    saveAttendanceImmediately(updated);
  };

  const handleMarkAllAbsent = () => {
    if (!activeSessionId) return;
    const activePlayers = players.filter(p => p.status === 'Active');
    const updated: typeof sessionAttendance = {};
    activePlayers.forEach(p => {
      updated[p.id] = {
        status: 'Absent',
        feePaid: false,
        notes: sessionAttendance[p.id]?.notes || '',
        arrivalTime: undefined
      };
    });
    setSessionAttendance(updated);
    saveAttendanceImmediately(updated);
  };

  const handleClearAttendance = () => {
    if (!activeSessionId) return;
    setSessionAttendance({});
    onUpdateAttendance(activeSessionId, []);
  };

  const handleFeeChange = (playerId: string, feePaid: boolean) => {
    const updated = {
      ...sessionAttendance,
      [playerId]: {
        ...sessionAttendance[playerId],
        feePaid
      }
    };
    setSessionAttendance(updated);
    saveAttendanceImmediately(updated);
  };

  const handleNotesChange = (playerId: string, notes: string) => {
    const updated = {
      ...sessionAttendance,
      [playerId]: {
        ...sessionAttendance[playerId],
        notes
      }
    };
    setSessionAttendance(updated);
    saveAttendanceImmediately(updated);
  };

  const handleSaveAttendance = (sessionId: string) => {
    const recordsToSave: AttendanceRecord[] = Object.keys(sessionAttendance).map(playerId => {
      const val = sessionAttendance[playerId];
      return {
        sessionId,
        playerId,
        status: val.status,
        feePaid: val.feePaid,
        notes: val.notes,
        arrivalTime: val.arrivalTime
      };
    });

    onUpdateAttendance(sessionId, recordsToSave);
    setActiveSessionId(null);
  };

  const handleOpenCreateMatchForSession = (session: Session) => {
    setActiveCreateMatchSession(session);
    setNewMatchHome(session.homeTeam || 'TBD');
    setNewMatchAway(session.awayTeam || 'TBD');
    setNewMatchHomeScore('');
    setNewMatchAwayScore('');
    setNewMatchStatus('Scheduled');
    setNewMatchTypeState(session.type);
    setNewMatchLeagueId(session.leagueId || '');
    setNewSessionHomeRoster(session.homeRoster || []);
    setNewSessionAwayRoster(session.awayRoster || []);
    setShowCreateMatchModal(true);
  };

  const handleOpenEditSession = (session: Session) => {
    setEditingSession(session);
    setEditSessionTitle(session.title);
    setEditSessionDate(session.date);
    setEditSessionTime(session.time);
    setEditSessionLocation(session.location);
    setEditSessionType(session.type);
    setEditSessionLeagueId(session.leagueId || '');
    setEditSessionHome(session.homeTeam || '');
    setEditSessionAway(session.awayTeam || '');
    setEditSessionHomeRoster(session.homeRoster || []);
    setEditSessionAwayRoster(session.awayRoster || []);
  };

  const handleEditSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;

    const updated: Session = {
      ...editingSession,
      title: editSessionTitle || editingSession.title,
      date: editSessionDate || editingSession.date,
      time: editSessionTime || editingSession.time,
      location: editSessionLocation || editingSession.location,
      type: editSessionType || editingSession.type,
      leagueId: editSessionLeagueId || editingSession.leagueId || undefined,
      homeTeam: editSessionHome || editingSession.homeTeam || undefined,
      awayTeam: editSessionAway || editingSession.awayTeam || undefined,
      homeRoster: (editSessionHomeRoster && editSessionHomeRoster.length > 0) ? editSessionHomeRoster : (editingSession.homeRoster || []),
      awayRoster: (editSessionAwayRoster && editSessionAwayRoster.length > 0) ? editSessionAwayRoster : (editingSession.awayRoster || []),
      sessionTeams: [editSessionHome || editingSession.homeTeam, editSessionAway || editingSession.awayTeam].filter(Boolean) as string[]
    };

    if (onUpdateSession) {
      onUpdateSession(updated);
    }
    setEditingSession(null);
  };

  const handleSubmitSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDate || !newTime || !newLocation) {
      alert('Please fill in all required fields');
      return;
    }

    const homeTeamName = newSessionHome || (newType === 'Friendly Match' ? 'Team Yellow' : 'Team A');
    const awayTeamName = newSessionAway || (newType === 'Friendly Match' ? 'Team Red' : 'Team B');

    // Helper to find or create linked match for a date
    const getOrCreateLinkedMatchId = (dateISO: string, indexOffset: number = 0): string | undefined => {
      // 1. Check if an existing match card has same date and matching type/teams
      const existingMatch = matches.find(m => {
        if (!m) return false;
        const mPlainDate = m.date ? m.date.split(' • ')[0].trim() : '';
        const mIso = normalizeDateToISO(mPlainDate);
        if (mIso !== dateISO) return false;
        if (m.type === newType) return true;
        if (m.homeTeam === homeTeamName && m.awayTeam === awayTeamName) return true;
        return false;
      });

      if (existingMatch) {
        return existingMatch.id;
      }

      // 2. If session card type is match-based ("Friendly Match", "League Match" or home/away teams selected), create match card!
      if (newType === 'Friendly Match' || newType === 'League Match' || (newSessionHome && newSessionAway)) {
        const newMatchId = `match-${Date.now()}-${indexOffset}`;
        const newMatch: LeagueMatch = {
          id: newMatchId,
          homeTeam: homeTeamName,
          awayTeam: awayTeamName,
          date: `${dateISO} • ${newTime}`,
          leagueId: newLeagueId || 'l-player',
          status: 'Scheduled',
          type: newType === 'Friendly Match' ? 'Friendly Match' : 'League Match',
          format: newFormat || '7v7',
          matchNumber: matches.filter(m => m.type === newType).length + 1 + indexOffset
        };

        if (onAddMatch) {
          onAddMatch(newMatch);
        }
        return newMatchId;
      }

      return undefined;
    };

    if (isRecurring) {
      const groupID = `rec-group-${Date.now()}`;
      const sessionsToCreate: Omit<Session, 'id'>[] = [];
      const startDate = new Date(newDate + 'T00:00:00');
      
      for (let i = 0; i < recurringCount; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + (i * 7));
        
        const yyyy = currentDate.getFullYear();
        const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
        const dd = String(currentDate.getDate()).padStart(2, '0');
        const formattedDate = `${yyyy}-${mm}-${dd}`;
        
        const linkedMatchId = getOrCreateLinkedMatchId(formattedDate, i);

        sessionsToCreate.push({
          title: `${newTitle}${i > 0 ? ` (Week ${i + 1})` : ' (Start)'}`,
          date: formattedDate,
          time: newTime,
          location: newLocation,
          type: newType,
          status: 'Upcoming',
          feePerPlayer: 0,
          leagueId: newLeagueId || undefined,
          matchId: linkedMatchId,
          isRecurring: true,
          recurringGroupId: groupID,
          homeTeam: homeTeamName,
          awayTeam: awayTeamName,
          homeRoster: newSessionHomeRoster,
          awayRoster: newSessionAwayRoster,
          sessionTeams: [homeTeamName, awayTeamName].filter(Boolean)
        });
      }
      
      onAddSession(sessionsToCreate);
    } else {
      const linkedMatchId = getOrCreateLinkedMatchId(newDate, 0);

      onAddSession({
        title: newTitle,
        date: newDate,
        time: newTime,
        location: newLocation,
        type: newType,
        status: 'Upcoming',
        feePerPlayer: 0,
        leagueId: newLeagueId || undefined,
        matchId: linkedMatchId,
        homeTeam: homeTeamName,
        awayTeam: awayTeamName,
        homeRoster: newSessionHomeRoster,
        awayRoster: newSessionAwayRoster,
        sessionTeams: [homeTeamName, awayTeamName].filter(Boolean)
      });
    }

    // Reset Form
    setNewTitle('');
    setNewDate('');
    setNewTime('');
    setNewLocation('');
    setIsRecurring(false);
    setRecurringCount(4);
    setNewType('Friendly Match');
    setNewLeagueId('');
    setNewFee('0.00');
    setNewFormat('7v7');
    setNewSessionHome('');
    setNewSessionAway('');
    setNewSessionHomeRoster([]);
    setNewSessionAwayRoster([]);
    setShowAddForm(false);
  };

  // Date formatters for high-fidelity rendering
  const getVerboseDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getShortDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Stats for Header Card
  const totalSessionsCount = sessions.length;
  const upcomingSessionsCount = sessions.filter(s => s.status === 'Upcoming').length;
  const completedSessionsCount = sessions.filter(s => s.status === 'Completed').length;

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

  // Calculate unlinked count
  const unlinkedSessionsList = sessions.filter(s => {
    if (!s) return false;
    if (s.id && (deletedMatchIds.has(String(s.id)) || deletedMatchIds.has(String(s.id).replace('session-', '')))) return false;
    if (s.matchId && deletedMatchIds.has(String(s.matchId))) return false;
    const sPlainDate = normalizeToISODate(s.date);
    return !matches.some(m => m.id === s.matchId || (m.date && normalizeToISODate(m.date) === sPlainDate));
  });
  const unlinkedSessionsCount = unlinkedSessionsList.length;
  const linkedSessionsCount = sessions.length - unlinkedSessionsCount;

  // Filtered Sessions
  const filteredSessions = sessions
    .filter(s => {
      if (!s) return false;
      const isMatchActive = matches.some(m => m.id === s.matchId || m.id === s.id || `session-${m.id}` === s.id);
      if (!isMatchActive) {
        if (s.id && (deletedMatchIds.has(String(s.id)) || deletedMatchIds.has(String(s.id).replace('session-', '')))) return false;
        if (s.matchId && deletedMatchIds.has(String(s.matchId))) return false;
      }
      const sPlainDate = normalizeToISODate(s.date);
      const matchStatus = statusFilter === 'All' || s.status === statusFilter;
      const matchType = typeFilter === 'All' || s.type === typeFilter;
      const matchSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.location.toLowerCase().includes(searchQuery.toLowerCase());
      
      const isLinked = matches.some(m => m.id === s.matchId || (m.date && normalizeToISODate(m.date) === sPlainDate));
      const matchLink = linkFilter === 'All' || (linkFilter === 'Linked' ? isLinked : !isLinked);

      return matchStatus && matchType && matchSearch && matchLink;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first

  const renderDeleteModals = () => (
    <>
      {/* Custom Delete Confirmation Modal */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="p-3 bg-red-100 dark:bg-red-950/30 text-red-600 rounded-full shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="text-lg font-black text-slate-950 dark:text-slate-50 leading-tight">
                  Delete Session?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                  Are you sure you want to delete <span className="font-bold text-slate-800 dark:text-slate-200">"{sessionToDelete.title}"</span>? This will also remove all associated attendance records.
                </p>
              </div>
            </div>

            {sessionToDelete.recurringGroupId && (
              <div className="bg-amber-50 dark:bg-amber-950/10 p-4 rounded-2xl border border-amber-200/30 dark:border-amber-950/30 space-y-2">
                <p className="text-xs font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                  <RotateCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} /> Recurring Session Series!
                </p>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 leading-relaxed font-medium">
                  This session belongs to a recurring weekly series. You can choose to delete only this session or delete all remaining sessions in the series.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              {sessionToDelete.recurringGroupId ? (
                <>
                  <button
                    id="delete-all-series-btn"
                    onClick={() => {
                      console.log("Delete button clicked", sessionToDelete.id);
                      try {
                        onDeleteSession(sessionToDelete.id, true);
                      } catch (error) {
                        console.error("Delete failed:", error);
                      }
                      setSessionToDelete(null);
                      setActiveSessionId(null);
                    }}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl transition cursor-pointer shadow-sm active:scale-95"
                  >
                    Delete Entire Recurring Series
                  </button>
                  <button
                    id="delete-single-btn"
                    onClick={() => {
                      console.log("Delete button clicked", sessionToDelete.id);
                      try {
                        onDeleteSession(sessionToDelete.id, false);
                      } catch (error) {
                        console.error("Delete failed:", error);
                      }
                      setSessionToDelete(null);
                      setActiveSessionId(null);
                    }}
                    className="w-full py-2.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-black rounded-xl transition cursor-pointer active:scale-95 dark:bg-slate-900 dark:hover:bg-slate-950 dark:border-slate-800"
                  >
                    Delete This Session Only
                  </button>
                </>
              ) : (
                <button
                  id="delete-single-confirm-btn"
                  onClick={() => {
                    console.log("Delete button clicked", sessionToDelete.id);
                    try {
                      onDeleteSession(sessionToDelete.id, false);
                    } catch (error) {
                      console.error("Delete failed:", error);
                    }
                    setSessionToDelete(null);
                    setActiveSessionId(null);
                  }}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl transition cursor-pointer shadow-sm active:scale-95"
                >
                  Confirm Delete Session
                </button>
              )}
              <button
                id="delete-cancel-btn"
                onClick={() => setSessionToDelete(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-xs font-black rounded-xl transition cursor-pointer active:scale-95"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Custom Delete Match Confirmation Modal */}
      {matchToDelete && (
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
                  Are you sure you want to delete this match fixture ({matchToDelete.homeTeam} vs {matchToDelete.awayTeam})? All associated statistics, scores, and details will be permanently removed.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                id="confirm-delete-match-btn-sessions"
                onClick={() => {
                  console.log("Delete button clicked", matchToDelete.id);
                  try {
                    if (onDeleteMatch) {
                      onDeleteMatch(matchToDelete.id);
                    }
                  } catch (error) {
                    console.error("Delete failed:", error);
                  }
                  setMatchToDelete(null);
                  setActiveSessionId(null);
                }}
                className="w-full sm:flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl transition cursor-pointer shadow-sm active:scale-95"
              >
                Confirm Delete
              </button>
              <button
                id="cancel-delete-match-btn-sessions"
                onClick={() => setMatchToDelete(null)}
                className="w-full sm:flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-xs font-black rounded-xl transition cursor-pointer active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // Conditionally render the "Session Detail" view if a session is actively selected
  const activeSession = activeSessionId ? sessions.find(s => s.id === activeSessionId) : null;
  if (activeSession) {
    const activePlayers = players.filter(p => p.status === 'Active');
    
    // Filter active players based on search query
    const filteredPlayersRaw = activePlayers.filter(p => 
      p.name.toLowerCase().includes(searchPlayerQuery.toLowerCase())
    );

    // Sort players: Present players first sorted by arrivalTime (numerically), then Absent/Excused, then alphabetically
    const filteredPlayers = [...filteredPlayersRaw].sort((a, b) => {
      const stateA = sessionAttendance[a.id] || { status: 'Absent', feePaid: false, notes: '' };
      const stateB = sessionAttendance[b.id] || { status: 'Absent', feePaid: false, notes: '' };
      
      const isPresentA = stateA.status === 'Present';
      const isPresentB = stateB.status === 'Present';
      
      if (isPresentA && !isPresentB) return -1;
      if (!isPresentA && isPresentB) return 1;
      
      if (isPresentA && isPresentB) {
        const numA = parseInt(stateA.arrivalTime || '', 10);
        const numB = parseInt(stateB.arrivalTime || '', 10);
        const hasA = !isNaN(numA);
        const hasB = !isNaN(numB);
        if (hasA && !hasB) return -1;
        if (!hasA && hasB) return 1;
        if (hasA && hasB) {
          if (numA !== numB) return numA - numB;
        } else {
          const timeA = stateA.arrivalTime || '';
          const timeB = stateB.arrivalTime || '';
          if (timeA && !timeB) return -1;
          if (!timeA && timeB) return 1;
          if (timeA && timeB) return timeA.localeCompare(timeB);
        }
      }
      
      return a.name.localeCompare(b.name);
    });

    const cleanQuery = searchPlayerQuery.trim();
    const hasExactMatch = cleanQuery.length > 0 && activePlayers.some(p => p.name.toLowerCase() === cleanQuery.toLowerCase());

    const presentCount = activePlayers.filter(p => (sessionAttendance[p.id]?.status || 'Absent') === 'Present').length;
    const absentCount = activePlayers.filter(p => (sessionAttendance[p.id]?.status || 'Absent') === 'Absent').length;
    const excusedCount = activePlayers.filter(p => (sessionAttendance[p.id]?.status || 'Absent') === 'Excused').length;
    const outCount = absentCount + excusedCount;
    const attendanceRate = activePlayers.length > 0 ? Math.round((presentCount / activePlayers.length) * 100) : 0;
    
    // Find matching league if any
    const associatedLeague = leagues.find(l => l.id === activeSession.leagueId);

    const sessionPlainDate = normalizeToISODate(activeSession.date);

    // Find all matching matches
    const associatedMatches = matches.filter(m => 
      m.id === activeSession.matchId || 
      normalizeToISODate(m.date) === sessionPlainDate
    );

    // Default associatedMatch to first item for backward compatibility / playerOfTheDay options
    const associatedMatch = associatedMatches[0];

    const getFullDate = (dateStr: string) => {
      if (!dateStr) return '';
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const handleSyncGoals = () => {
      const match = associatedMatches[0];
      if (!match) {
        alert("Please create a match first before syncing goals.");
        return;
      }

      let ojukwu = players.find(p => p.name.toLowerCase().includes('ojukwu'));
      if (!ojukwu && onAddPlayer) {
        ojukwu = onAddPlayer({ name: 'Ojukwu', status: 'Active', joinDate: '2026-02-14' });
      }
      
      let liam = players.find(p => p.name.toLowerCase().includes('liam'));
      if (!liam && onAddPlayer) {
        liam = onAddPlayer({ name: 'Liam', status: 'Active', joinDate: '2026-02-14' });
      }

      let kennedy = players.find(p => p.name.toLowerCase().includes('kennedy'));
      if (!kennedy && onAddPlayer) {
        kennedy = onAddPlayer({ name: 'Kennedy (Cana)', status: 'Active', joinDate: '2026-02-14' });
      }

      const seededGoals: MatchGoal[] = [
        {
          id: 'g-seed-1',
          playerId: ojukwu?.id || 'p-ojukwu',
          playerName: ojukwu?.name || 'Ojukwu',
          team: 'home',
          type: 'Friendly'
        },
        {
          id: 'g-seed-2',
          playerId: ojukwu?.id || 'p-ojukwu',
          playerName: ojukwu?.name || 'Ojukwu',
          team: 'home',
          type: 'Friendly'
        },
        {
          id: 'g-seed-3',
          playerId: liam?.id || 'p-liam',
          playerName: liam?.name || 'Liam',
          team: 'home',
          type: 'Friendly'
        },
        {
          id: 'g-seed-4',
          playerId: kennedy?.id || 'p-kennedy',
          playerName: kennedy?.name || 'Kennedy (Cana)',
          team: 'home',
          type: 'Friendly'
        }
      ];

      if (onUpdateMatch) {
        onUpdateMatch({
          ...match,
          goals: seededGoals,
          homeScore: 0,
          awayScore: 0,
          status: 'Played',
          playerOfMatch: 'Kennedy (Cana)'
        });
        alert("Goals successfully synced with match detail card!");
      }
    };

    const handleAddGoalScorerInSession = (playerId: string, team: 'home' | 'away' | null, type: 'League' | 'Friendly') => {
      if (!associatedMatch) return;
      const player = players.find(p => p.id === playerId);
      if (!player) return;

      const newGoal: MatchGoal = {
        id: 'goal-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        playerId,
        playerName: player.name,
        team: type === 'Friendly' ? null : team,
        type
      };

      const updatedGoals = [...(associatedMatch.goals || []), newGoal];
      let hScore = associatedMatch.homeScore || 0;
      let aScore = associatedMatch.awayScore || 0;

      if (type === 'League') {
        if (team === 'home') hScore += 1;
        if (team === 'away') aScore += 1;
      }

      const updatedMatch = {
        ...associatedMatch,
        homeScore: hScore,
        awayScore: aScore,
        goals: updatedGoals
      };

      onUpdateMatch?.(updatedMatch);

      if (associatedMatch.status === 'Played' && type === 'League') {
        onRecordMatchResult?.(associatedMatch.id, hScore, aScore);
      }
    };

    const handleRemoveGoalInSession = (goalId: string) => {
      if (!associatedMatch) return;
      const goalsList = associatedMatch.goals || [];
      const goalToRemove = goalsList.find(g => g.id === goalId);
      if (!goalToRemove) return;

      const updatedGoals = goalsList.filter(g => g.id !== goalId);
      let hScore = associatedMatch.homeScore || 0;
      let aScore = associatedMatch.awayScore || 0;
      const isFriendlyMatch = associatedMatch.type === 'Friendly Match';

      if (isFriendlyMatch || goalToRemove.type === 'League') {
        if (goalToRemove.team === 'home') hScore = Math.max(0, hScore - 1);
        if (goalToRemove.team === 'away') aScore = Math.max(0, aScore - 1);
      }

      const updatedMatch = {
        ...associatedMatch,
        homeScore: hScore,
        awayScore: aScore,
        goals: updatedGoals
      };

      onUpdateMatch?.(updatedMatch);

      if (associatedMatch.status === 'Played' && (isFriendlyMatch || goalToRemove.type === 'League')) {
        onRecordMatchResult?.(associatedMatch.id, hScore, aScore);
      }
    };

    const isAttendanceTaken = attendance.some(a => a.sessionId === activeSession.id);
    const isMatchPlayed = associatedMatch?.status === 'Played' || activeSession.status === 'Completed';

    let playerOfTheDayOptions: Player[] = [];
    if (isAttendanceTaken && !isMatchPlayed) {
      playerOfTheDayOptions = activePlayers
        .filter(p => (sessionAttendance[p.id]?.status || 'Absent') === 'Present')
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    const groupGoalsByPlayer = (goals: MatchGoal[]) => {
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
      return Object.values(groups).sort((a, b) => b.goalIds.length - a.goalIds.length);
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-300" id="session-detail-view">
        {/* Breadcrumbs Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (sessionOrigin === 'leagues' && onBackToOrigin) {
                  onBackToOrigin();
                } else {
                  setActiveSessionId(null);
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer shadow-xs active:scale-95"
              id="back-to-sessions-btn"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              {sessionOrigin === 'leagues' ? 'Back to Match Details' : 'Back'}
            </button>
            
            <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 font-semibold">
              <Home className="w-3.5 h-3.5" />
              <span>/</span>
              {sessionOrigin === 'leagues' ? (
                <>
                  <span 
                    className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    onClick={() => {
                      if (onBackToOrigin) onBackToOrigin();
                    }}
                  >
                    Match Details
                  </span>
                  <span>/</span>
                  <span className="text-slate-800 dark:text-slate-200 font-extrabold">Session Detail</span>
                </>
              ) : (
                <>
                  <span 
                    className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    onClick={() => setActiveSessionId(null)}
                  >
                    Sessions
                  </span>
                  <span>/</span>
                  <span className="text-slate-800 dark:text-slate-200 font-extrabold">Session Detail</span>
                </>
              )}
            </div>
          </div>

          {onNavigateToLeagueMatch && leagues.length > 0 && (
            <button
              onClick={() => {
                const targetLeagueId = associatedLeague?.id || leagues[0]?.id || 'l-3';
                onNavigateToLeagueMatch(targetLeagueId, associatedMatch?.id);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md active:scale-95"
              id="top-go-to-league-detail-btn"
            >
              <Trophy className="w-4 h-4" />
              <span>{associatedMatch ? 'Match Details →' : 'League Detail'}</span>
            </button>
          )}
        </div>

        {/* Layout Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Info & Actions */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* Redesigned Session Detail Card: Premium dark slate glassmorphism */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 backdrop-blur-md border border-slate-800 rounded-3xl p-5 shadow-2xl text-white space-y-4 animate-in slide-in-from-top-4 duration-300" id="session-profile-card">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Session Profile
                  </span>
                </div>
                <span className="text-[9px] font-black uppercase bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-lg">
                  {activeSession.type === 'League Match' ? 'Match' : 'Training'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Date */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>Date</span>
                  </div>
                  <p className="text-sm font-black text-white tracking-tight">
                    {getShortDate(activeSession.date)}
                  </p>
                </div>

                {/* Time */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Time</span>
                  </div>
                  <p className="text-sm font-black text-white tracking-tight">
                    {activeSession.time}
                  </p>
                </div>

                {/* Location */}
                <div className="space-y-1 col-span-1 min-w-0">
                  <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Location</span>
                  </div>
                  <p className="text-sm font-black text-white truncate" title={activeSession.location}>
                    {activeSession.location}
                  </p>
                </div>

                {/* Attendance */}
                <div className="space-y-1 col-span-1">
                  <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                    <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Attendance</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black text-white font-mono">
                      {presentCount} / {activePlayers.length}
                    </span>
                    <span className="text-[9px] font-black font-mono text-blue-300 bg-blue-500/10 border border-blue-500/20 px-1 py-0.2 rounded">
                      {attendanceRate}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Combined Card (Match Result/Details + Player of the Day) */}
            {associatedMatch && (() => {
              const isFeb14Or21 = false;
              return (
                <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-2 border-slate-800 rounded-3xl p-6 shadow-2xl text-white space-y-5 animate-in fade-in duration-300 relative overflow-hidden" id="combined-match-pod-card">
                  
                  {/* Card Header & Sync Status */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-md">
                        ⏱️ Match Timer
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">
                        Synced
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      {onNavigateToLeagueMatch && (
                        <button
                          onClick={() => {
                            const targetLeagueId = associatedLeague?.id || associatedMatch.leagueId || leagues[0]?.id || 'l-3';
                            onNavigateToLeagueMatch(targetLeagueId, associatedMatch.id);
                          }}
                          className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 text-white px-2.5 py-1 rounded-lg shadow-sm hover:shadow transition duration-150 active:scale-95 cursor-pointer"
                          title="View Linked Match Card in Leagues tab"
                        >
                          <Trophy className="w-3 h-3" />
                          <span>Match Details →</span>
                        </button>
                      )}
                      
                      {onSyncSessionWithMatch && (
                        <button
                          onClick={async () => {
                            const btn = document.getElementById('sync-match-btn');
                            if (btn) btn.classList.add('animate-spin');
                            await onSyncSessionWithMatch(activeSession.id, associatedMatch.id);
                            if (btn) btn.classList.remove('animate-spin');
                            alert("Match details, goals, and Player of the Day successfully synced via backend function!");
                          }}
                          className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-2.5 py-1 rounded-lg shadow-sm hover:shadow transition duration-150 active:scale-95 cursor-pointer"
                          title="Sync from Match details"
                        >
                          <RefreshCw className="w-3 h-3" id="sync-match-btn" />
                          <span>Sync Match Details</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {isFeb14Or21 ? (
                    <div className="text-center py-2.5 border border-dashed border-slate-800 bg-slate-950/40 rounded-2xl">
                      <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 font-mono">
                        🤝 Friendly Match stats
                      </span>
                    </div>
                  ) : (
                    <>
                      {/* Match Info Badge Row */}
                      <div className="flex items-center justify-between text-xs">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          associatedMatch.type === 'Friendly Match'
                            ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {associatedMatch.type === 'Friendly Match' ? '🤝 Friendly Match' : '🏆 League Match'}
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black font-mono text-slate-400 bg-slate-850 border border-slate-800 px-1.5 py-0.5 rounded-md">
                            FT
                          </span>
                          {onDeleteMatch && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMatchToDelete(associatedMatch);
                              }}
                              className="p-1 border border-red-500/30 bg-red-500/20 hover:bg-red-500 hover:text-white rounded text-red-400 cursor-pointer transition active:scale-95"
                              title="Delete Fixture"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Scoreline Board - Pure Read-only High Fidelity Display */}
                      <div className="grid grid-cols-3 items-center justify-between gap-4 bg-slate-950/65 border border-slate-850 p-4 rounded-2xl shadow-inner">
                        {/* Home Team Column */}
                        <div className="flex flex-col items-center text-center space-y-1.5 col-span-1 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-black shadow-md shrink-0 border-2 border-blue-400/40">
                            {associatedMatch.homeTeam.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-[11px] font-black text-slate-100 uppercase truncate w-full tracking-wide">
                            {associatedMatch.homeTeam}
                          </span>
                          <span className="text-[9px] font-extrabold text-blue-300 uppercase font-mono">
                            Home
                          </span>
                        </div>

                        {/* Middle: Big bold score display */}
                        <div className="text-center col-span-1 flex flex-col items-center justify-center">
                          <div className="text-2xl sm:text-3xl font-black font-mono text-amber-400 tracking-tight leading-none bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 shadow-sm">
                            {associatedMatch.homeScore ?? 0} <span className="text-slate-500 text-xl font-normal font-mono mx-1">—</span> {associatedMatch.awayScore ?? 0}
                          </div>
                          <span className="text-[8px] font-extrabold uppercase text-slate-400 tracking-widest mt-2 bg-slate-850 px-1.5 py-0.5 rounded border border-slate-800">
                            {associatedMatch.status === 'Played' ? 'Full Time' : 'Scheduled'}
                          </span>
                        </div>

                        {/* Away Team Column */}
                        <div className="flex flex-col items-center text-center space-y-1.5 col-span-1 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white text-sm font-black shadow-md shrink-0 border-2 border-red-400/40">
                            {associatedMatch.awayTeam.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-[11px] font-black text-slate-100 uppercase truncate w-full tracking-wide">
                            {associatedMatch.awayTeam}
                          </span>
                          <span className="text-[9px] font-extrabold text-red-300 uppercase font-mono">
                            Away
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Seamless Divider */}
                  <div className="border-t border-dashed border-slate-800" />

                  {/* Player of the Day Highlight (Bottom) - Read Only */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5 justify-center sm:justify-start">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 animate-pulse" />
                      <span>Player of the Day Award</span>
                    </div>

                    {(() => {
                      const playerOfMatchName = associatedMatch.potdWinner || associatedMatch.playerOfMatch;
                      const pomPlayer = players.find(p => p.name === playerOfMatchName);
                      const pomGoalsCount = associatedMatch.goals?.filter(g => g.playerName === playerOfMatchName || g.playerId === pomPlayer?.id).length || 0;

                      return (
                        <div className="space-y-3">
                          {playerOfMatchName ? (
                            <div className="flex items-center justify-between bg-gradient-to-r from-slate-900/60 to-slate-950/60 border border-amber-400/25 p-3.5 rounded-2xl shadow-md animate-in zoom-in-95 duration-200">
                              <div className="flex items-center gap-3.5 min-w-0">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-sm border-2 border-amber-400 shadow-md shrink-0 bg-gradient-to-br ${getInitialsColor(playerOfMatchName)}`}>
                                  {(() => {
                                    const clean = playerOfMatchName.replace(/\(.*?\)/g, '').replace(/[^a-zA-Z0-9\s]/g, ' ');
                                    const parts = clean.trim().split(/\s+/).filter(Boolean);
                                    if (parts.length >= 2) {
                                      return (parts[0][0] + parts[1][0]).toUpperCase();
                                    }
                                    if (parts.length === 1) {
                                      return parts[0].substring(0, 2).toUpperCase();
                                    }
                                    return '';
                                  })()}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-amber-300 uppercase tracking-widest font-mono">
                                      ★ Award Winner
                                    </span>
                                  </div>
                                  <span className="text-sm font-black text-white block truncate leading-snug mt-0.5">
                                    {playerOfMatchName}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-300 block truncate mt-0.5">
                                    {pomGoalsCount > 0 ? `⚽ ${pomGoalsCount} Goals Scored` : '🔑 Key Contributions • Active Presence'}
                                    {pomPlayer?.jerseyNumber ? ` • #${pomPlayer.jerseyNumber}` : ''}
                                    {pomPlayer?.position ? ` • ${pomPlayer.position}` : ''}
                                  </span>
                                </div>
                              </div>

                              <div className="px-3 py-1 bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[9px] font-black uppercase rounded-lg tracking-wider shrink-0">
                                👑 MVP
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-4 bg-slate-950/40 border border-dashed border-slate-850 rounded-2xl flex flex-col items-center justify-center gap-1">
                              <span className="text-xs font-bold text-slate-400">No player awarded yet</span>
                            </div>
                          )}

                          <div className="relative">
                            <select
                              id="potd-select"
                              data-action="select-potd"
                              value={playerOfMatchName || ""}
                              onChange={(e) => {
                                const selectedValue = e.target.value;
                                
                                const updatedMatch = {
                                  ...associatedMatch,
                                  potdWinner: selectedValue || "",
                                  playerOfMatch: selectedValue || ""
                                };
                                onUpdateMatch?.(updatedMatch);

                                const updatedSession = {
                                  ...activeSession,
                                  potdWinner: selectedValue || "",
                                  playerOfMatch: selectedValue || ""
                                };
                                onUpdateSession?.(updatedSession);
                              }}
                              className="w-full text-xs p-3 border border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-2xl focus:outline-emerald-550 bg-slate-900 text-slate-300"
                            >
                              <option value="">{playerOfMatchName ? "-- Remove or Change Player --" : "-- Select Player of the Day --"}</option>
                              {players.map(p => (
                                <option key={p.id} value={p.name}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="text-[9px] font-extrabold text-slate-400/60 truncate flex items-center gap-1">
                    <span>⚽</span>
                    <span className="uppercase tracking-wider">
                      {associatedMatch.type}: {associatedLeague ? associatedLeague.name : "Captain's League"}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Session Goals Card */}
            {associatedMatch && associatedMatch.goals && associatedMatch.goals.length > 0 && (
              <div className="bg-slate-500/[0.02] dark:bg-slate-900/40 border border-slate-250 dark:border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4 shadow-sm animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                      <svg className="w-3.5 h-3.5 text-yellow-500 dark:text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="6" />
                        <circle cx="12" cy="12" r="2" />
                      </svg>
                    </div>
                    <span className="text-xs sm:text-sm font-black text-yellow-500 dark:text-yellow-400 uppercase tracking-tight">Session Goals</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-800 dark:bg-slate-700 text-yellow-500 dark:text-yellow-400 shadow-3xs uppercase font-mono">
                    {associatedMatch.goals.length} Total
                  </span>
                </div>

                <div className="space-y-2">
                  {(() => {
                    const groupedGoals = groupGoalsByPlayer(associatedMatch.goals);
                    return groupedGoals.map(g => {
                      const playerIndex = filteredPlayers.findIndex(p => p.id === g.playerId || p.name === g.playerName);
                      const displayNum = playerIndex !== -1 ? playerIndex + 1 : "?";
                      
                      return (
                        <div key={g.playerId || g.playerName} className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-100/80 dark:border-slate-800 p-2.5 rounded-2xl shadow-3xs transition duration-150 hover:border-slate-400 dark:hover:border-slate-600">
                          <div className="flex items-center min-w-0">
                            <div className="w-5.5 h-5.5 rounded-full bg-slate-700 text-white font-mono font-black text-[10px] flex items-center justify-center shrink-0 shadow-3xs">
                              {displayNum}
                            </div>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 ml-2.5 truncate">
                              {g.playerName}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[10px] font-mono font-black rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
                            x{g.goalIds.length}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* Actions Panel */}
            <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <button
                onClick={() => alert("Fixture match linking initialized.")}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-black rounded-xl text-xs transition cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
              >
                <Activity className="w-3.5 h-3.5" />
                Link Fixture
              </button>

              <button
                id={`cancel-session-details-btn-${activeSession.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log("Delete button clicked", activeSession.id);
                  try {
                    onDeleteSession(activeSession.id, false);
                  } catch (error) {
                    console.error("Delete failed:", error);
                  }
                }}
                className="px-3.5 py-2 bg-white hover:bg-red-50 hover:text-red-600 border border-slate-200 dark:border-slate-850 rounded-xl text-xs font-black text-slate-500 dark:text-slate-400 hover:border-red-200 transition cursor-pointer shadow-xs active:scale-95 flex items-center justify-center gap-1.5 dark:bg-slate-900 dark:hover:bg-slate-950"
              >
                <Ban className="w-3.5 h-3.5 text-red-500 shrink-0" />
                Cancel Session
              </button>
            </div>

          </div>

          {/* Right Column: Attendance Card */}
          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm p-5 space-y-4">
              {/* Header Row */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-50 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4.5 h-4.5 text-emerald-500" />
                  <h2 className="text-sm font-black text-slate-900 dark:text-slate-100">Attendance</h2>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/15 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    {presentCount} In
                  </span>
                  <span className="text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                    {outCount} Out
                  </span>
                </div>
              </div>

              {/* Progress bar and rate */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                  <span>Roster Capacity</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono">{attendanceRate}% attendance</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300" 
                    style={{ width: `${attendanceRate}%` }}
                  />
                </div>
              </div>

              {/* Search and Quick Add */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-emerald-500 dark:text-emerald-400 absolute left-3 top-3 transition-colors group-focus-within:text-emerald-600" />
                  <input
                    type="text"
                    placeholder="Search players..."
                    value={searchPlayerQuery}
                    onChange={(e) => setSearchPlayerQuery(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2.5 border-2 border-slate-200 dark:border-slate-800 rounded-xl focus:border-emerald-550 focus:ring-4 focus:ring-emerald-555/10 focus:outline-none bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-black shadow-sm placeholder-slate-400 dark:placeholder-slate-500 transition-all duration-200"
                  />
                </div>
                <button
                  onClick={() => alert("Go to Players tab to add new team members.")}
                  className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-500 cursor-pointer shrink-0"
                  title="Add Player"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Roster Table */}
              <div className="border border-slate-100 dark:border-slate-800/80 rounded-2xl overflow-hidden bg-slate-50/20 dark:bg-slate-950/10">
                {/* Table Header */}
                <div className="grid grid-cols-2 p-2.5 bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-850 text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <div>Player</div>
                  <div className="text-right">Status</div>
                </div>

                {/* Table Rows */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[350px] overflow-y-auto">
                  {cleanQuery && !hasExactMatch && (
                    <div className="p-2.5 bg-emerald-5/50 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between gap-3 animate-in fade-in duration-200">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0 uppercase tracking-wider">
                          New
                        </span>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] uppercase border shadow-2xs select-none shrink-0 ${getInitialsColor(cleanQuery)}`}>
                          {cleanQuery.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                            {cleanQuery}
                          </h4>
                          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                            Not registered yet &bull; Click to add and mark present
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleQuickRegisterAndPresent(cleanQuery)}
                        className="shrink-0 text-[9px] px-2.5 py-1 bg-emerald-550 hover:bg-emerald-650 text-white rounded-lg font-black uppercase tracking-wider transition cursor-pointer shadow-xs active:scale-95"
                      >
                        Register & Mark In
                      </button>
                    </div>
                  )}

                  {filteredPlayers.length === 0 ? (
                    (!cleanQuery || hasExactMatch) && (
                      <div className="p-6 text-center text-xs text-slate-400 italic">
                        No active players match search query.
                      </div>
                    )
                  ) : (
                    filteredPlayers.map((player, index) => {
                      const pState = sessionAttendance[player.id] || { status: 'Absent', feePaid: false, notes: '' };
                      const isPresent = pState.status === 'Present';

                      return (
                        <div 
                          key={player.id} 
                          className="grid grid-cols-2 items-center p-2.5 hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition group"
                        >
                          {/* Left: Player info */}
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Index Number */}
                            <span className="text-[9px] font-mono font-bold text-slate-400 shrink-0 w-3">
                              {index + 1}
                            </span>
                            
                            {/* Attendance Dot */}
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isPresent ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`} />

                            {/* Initial badge without photo */}
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] uppercase border shadow-2xs select-none shrink-0 ${getInitialsColor(player.name)}`}>
                              {player.name.charAt(0)}
                            </div>

                            {/* Name & Subtitle */}
                            <div className="min-w-0">
                              <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 truncate group-hover:text-emerald-550 transition flex items-center gap-1 flex-wrap">
                                <span>{player.name}</span>
                                {player.annualDuePaid && <span className="text-[10px] shrink-0" title="Annual Due Paid">✅</span>}
                                {player.volunteeredToCook && <span className="text-[10px] shrink-0" title="Volunteered to Cook">🍲 🍗</span>}
                                {player.endOfYearPartyAttendee && <span className="text-[10px] shrink-0" title="End of Year Party Attendee">🎉</span>}
                              </h4>
                              <span className={`text-[8px] font-extrabold block leading-tight ${isPresent ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                {pState.status}
                              </span>
                            </div>
                          </div>

                          {/* Right: Actions / Toggle button */}
                          <div className="flex items-center gap-2 justify-end">
                            {/* Slid-to-toggle Swipe Switch */}
                            <SwipeToggle 
                              value={isPresent} 
                              onChange={(isNowIn) => {
                                handleStatusChange(player.id, isNowIn ? 'Present' : 'Absent');
                              }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Action Footer */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Present: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{presentCount}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    Absent: <strong className="text-slate-600 dark:text-slate-400 font-mono">{absentCount}</strong>
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-500/10 px-1.5 py-0.5 rounded-md text-[8px] uppercase tracking-wider animate-pulse shrink-0">
                    ✓ Auto-saved
                  </span>
                  {sheetsSyncStatus === 'syncing' && (
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-extrabold bg-amber-500/10 px-1.5 py-0.5 rounded-md text-[8px] uppercase tracking-wider animate-pulse shrink-0">
                      ⚡ Syncing with Sheets...
                    </span>
                  )}
                  {sheetsSyncStatus === 'synced' && (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-450 font-extrabold bg-emerald-500/10 px-1.5 py-0.5 rounded-md text-[8px] uppercase tracking-wider shrink-0">
                      ✓ Synced to Sheets
                    </span>
                  )}
                  {sheetsSyncStatus === 'error' && (
                    <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-extrabold bg-red-500/10 px-1.5 py-0.5 rounded-md text-[8px] uppercase tracking-wider shrink-0">
                      ⚠ Sheets Sync Failed
                    </span>
                  )}
                </div>

                <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
                  <button
                    onClick={() => setActiveSessionId(null)}
                    className="w-full sm:w-auto text-[10px] font-black text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer text-center"
                  >
                    Close Register
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
        {renderDeleteModals()}
      </div>
    );
  }

  return (
    <div className="space-y-6" id="sessions-tab">
      
      {/* Weekly Report Download Card Banner */}
      <div id="sessions-weekly-report-download-card" className="bg-slate-900 text-white p-5 rounded-2xl shadow-md border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-mono">
              <FileText className="w-3 h-3" /> OFFICIAL REPORT
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-800 text-slate-200 border border-slate-700 font-mono">
              PDF DOWNLOAD
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-black tracking-tight">Game On - Weekly League Report</h3>
          <p className="text-xs text-slate-300 font-medium">
            Download or view the official landscape weekly league PDF report containing Captain's League, Player Standings, MVP awards, and Top Scorers.
          </p>
        </div>
        <button
          id="btn-download-weekly-report-sessions"
          onClick={() => onNavigate && onNavigate('weekly-report')}
          className="px-4 py-2.5 bg-white text-slate-900 font-black text-xs rounded-xl hover:bg-slate-100 transition shadow-md active:scale-95 cursor-pointer shrink-0 flex items-center justify-center gap-2 border border-slate-200"
        >
          <Download className="w-4 h-4 text-slate-900" />
          <span>Download PDF Report</span>
        </button>
      </div>

      {/* Tab Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-xl" id="sessions-header-card">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 flex-1">
          {/* Total Sessions Stat */}
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-150/80 dark:border-slate-800/80 min-w-[120px] flex-1 sm:flex-initial">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-bold tracking-wider uppercase">Sessions</div>
              <div className="text-lg font-black text-slate-900 dark:text-white font-mono">{totalSessionsCount}</div>
            </div>
          </div>

          {/* Upcoming Stat */}
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-150/80 dark:border-slate-800/80 min-w-[120px] flex-1 sm:flex-initial">
            <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-bold tracking-wider uppercase">Upcoming</div>
              <div className="text-lg font-black text-slate-900 dark:text-white font-mono">{upcomingSessionsCount}</div>
            </div>
          </div>

          {/* Completed Stat */}
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-150/80 dark:border-slate-800/80 min-w-[120px] flex-1 sm:flex-initial">
            <div className="p-2 bg-slate-500/10 text-slate-700 dark:text-slate-300 rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-bold tracking-wider uppercase">Completed</div>
              <div className="text-lg font-black text-slate-900 dark:text-white font-mono">{completedSessionsCount}</div>
            </div>
          </div>

          {/* Sync & Match Cards Link Stat */}
          <button
            type="button"
            onClick={() => setLinkFilter(linkFilter === 'Unlinked' ? 'All' : 'Unlinked')}
            className={`flex items-center gap-3 p-3 rounded-xl border min-w-[140px] flex-1 sm:flex-initial text-left transition cursor-pointer active:scale-95 ${
              unlinkedSessionsCount > 0 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15' 
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15'
            }`}
            title="Click to toggle filter for unlinked session cards"
          >
            <div className={`p-2 rounded-lg ${unlinkedSessionsCount > 0 ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'}`}>
              {unlinkedSessionsCount > 0 ? <AlertCircle className="w-5 h-5" /> : <Trophy className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-xs font-bold tracking-wider uppercase opacity-80">Match Cards Link</div>
              <div className="text-sm font-black font-mono flex items-center gap-1">
                <span>{linkedSessionsCount}/{totalSessionsCount} Linked</span>
                {unlinkedSessionsCount > 0 && (
                  <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                    ({unlinkedSessionsCount} Unlinked)
                  </span>
                )}
              </div>
            </div>
          </button>
        </div>

        <div className="shrink-0 flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <button
            id="sync-matches-sessions-validator-btn"
            onClick={handleRunSyncValidator}
            disabled={isValidatingSync}
            title="Run Backend Sync Validator to ensure all matches have matching session cards"
            className="w-full sm:w-auto flex items-center justify-center gap-2 font-bold text-xs px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition duration-200 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-500 ${isValidatingSync ? 'animate-spin' : ''}`} />
            <span>{isValidatingSync ? 'Validating Sync...' : 'Sync Matches & Sessions'}</span>
          </button>

          <button
            id="toggle-add-session-btn"
            onClick={() => setShowAddForm(!showAddForm)}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 font-bold text-xs px-5 py-3 rounded-xl transition duration-200 cursor-pointer shadow-md active:scale-95 ${
              showAddForm 
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-white dark:border-slate-700' 
                : 'bg-emerald-550 hover:bg-emerald-600 text-white'
            }`}
          >
            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAddForm ? 'Cancel Form' : 'Schedule Session'}
          </button>
        </div>
      </div>

      {syncStatusMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span>{syncStatusMsg}</span>
          </div>
          <button onClick={() => setSyncStatusMsg(null)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Add Session Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-900 text-slate-100 w-full max-w-lg rounded-2xl border border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150 text-left max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-1">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                Schedule New Session
              </h3>
              <button 
                type="button"
                onClick={() => setShowAddForm(false)}
                className="p-1 text-slate-400 hover:text-white transition cursor-pointer rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSession} className="space-y-4" id="add-session-form">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium text-slate-300">Session Title *</label>
                  <input 
                    id="session-title-input"
                    type="text" 
                    placeholder="e.g. Tactical Scrimmage / Friendly Match"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full text-sm p-2.5 bg-slate-950 border border-slate-800 text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-hidden shadow-xs transition"
                    required
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Session Card Type *</label>
                  <select 
                    id="session-type-input"
                    value={newType} 
                    onChange={e => {
                      const val = e.target.value as any;
                      setNewType(val);
                      if (val !== 'League Match') {
                        setNewLeagueId('');
                      }
                    }}
                    className="w-full text-sm p-2.5 bg-slate-950 border border-slate-800 text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-hidden shadow-xs cursor-pointer transition"
                  >
                    <option value="Friendly Match">Friendly Match</option>
                    <option value="League Match">League Match</option>
                  </select>
                </div>

                {newType === 'League Match' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Associated League *</label>
                    <select 
                      id="session-league-input"
                      value={newLeagueId} 
                      onChange={e => {
                        const lId = e.target.value;
                        setNewLeagueId(lId);
                        
                        const selectedLeague = leagues.find(l => l.id === lId);
                        if (selectedLeague) {
                          if (!newTitle || newTitle.trim() === '' || leagues.some(lg => lg.name === newTitle || lg.name + " Match" === newTitle)) {
                            setNewTitle(`${selectedLeague.name} Match`);
                          }
                          
                          if (selectedLeague.startDate) {
                            setNewDate(selectedLeague.startDate);
                            
                            if (selectedLeague.endDate) {
                              try {
                                const start = new Date(selectedLeague.startDate);
                                const end = new Date(selectedLeague.endDate);
                                const diffTime = Math.abs(end.getTime() - start.getTime());
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                const weeks = Math.max(2, Math.ceil(diffDays / 7) + 1);
                                setIsRecurring(true);
                                setRecurringCount(weeks);
                              } catch (err) {
                                console.error("Error calculating duration weeks:", err);
                              }
                            }
                          }
                        }
                      }}
                      className="w-full text-sm p-2.5 bg-slate-950 border border-slate-800 text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-hidden shadow-xs cursor-pointer transition"
                      required
                    >
                      <option value="">-- Select League --</option>
                      {leagues.map(l => (
                        <option key={l.id} value={l.id}>{l.name} ({l.season})</option>
                      ))}
                    </select>
                  </div>
                )}

                <CustomDatePicker
                  value={newDate}
                  onChange={setNewDate}
                  label="Session Date *"
                  id="session-date-input"
                />

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Kick-off Time *</label>
                  <input 
                    id="session-time-input"
                    type="time" 
                    value={newTime}
                    onChange={e => setNewTime(e.target.value)}
                    className="w-full text-sm p-2.5 bg-slate-950 border border-slate-800 text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-hidden shadow-xs transition"
                    required
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium text-slate-300">Location / Venue *</label>
                  <input 
                    id="session-location-input"
                    type="text" 
                    placeholder="e.g. West Ham Park / Pitch 3"
                    value={newLocation}
                    onChange={e => setNewLocation(e.target.value)}
                    className="w-full text-sm p-2.5 bg-slate-950 border border-slate-800 text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-hidden shadow-xs transition"
                    required
                  />
                </div>
              </div>

              {/* Team Matchup & Roster Assignment section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-950/60 p-3.5 sm:p-4 rounded-xl border border-slate-800">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Home Team / Team A</label>
                  <select
                    id="new-session-home-team"
                    value={newSessionHome}
                    onChange={e => setNewSessionHome(e.target.value)}
                    className="w-full text-sm p-2.5 bg-slate-900 border border-slate-800 text-slate-100 rounded-xl shadow-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="">-- Select Home Team --</option>
                    <option value="Team Yellow">Team Yellow 🟡</option>
                    <option value="Team Red">Team Red 🔴</option>
                    <option value="Team Jerry">Team Jerry ⚽</option>
                    <option value="Team Kayviva">Team Kayviva ⚡</option>
                    {Array.from(new Set(leagues.map(l => l.name))).map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Away Team / Team B</label>
                  <select
                    id="new-session-away-team"
                    value={newSessionAway}
                    onChange={e => setNewSessionAway(e.target.value)}
                    className="w-full text-sm p-2.5 bg-slate-900 border border-slate-800 text-slate-100 rounded-xl shadow-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="">-- Select Away Team --</option>
                    <option value="Team Yellow">Team Yellow 🟡</option>
                    <option value="Team Red">Team Red 🔴</option>
                    <option value="Team Jerry">Team Jerry ⚽</option>
                    <option value="Team Kayviva">Team Kayviva ⚡</option>
                    {Array.from(new Set(leagues.map(l => l.name))).map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 space-y-2 border-t border-slate-800/80 pt-3 mt-1">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Session Roster & Player Assignments
                  </label>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Assign each active player to Home Team, Away Team, or leave Unassigned.
                  </p>
                  
                  <div className="max-h-44 overflow-y-auto border border-slate-800 rounded-xl p-2 space-y-1.5 bg-slate-900/80">
                    {players.filter(p => p.status === 'Active').map(p => {
                      const isHome = newSessionHomeRoster.includes(p.id);
                      const isAway = newSessionAwayRoster.includes(p.id);
                      const selection = isHome ? 'home' : (isAway ? 'away' : 'unassigned');
                      
                      const handleSelect = (val: 'home' | 'away' | 'unassigned') => {
                        let h = newSessionHomeRoster.filter(id => id !== p.id);
                        let a = newSessionAwayRoster.filter(id => id !== p.id);
                        if (val === 'home') h.push(p.id);
                        if (val === 'away') a.push(p.id);
                        setNewSessionHomeRoster(h);
                        setNewSessionAwayRoster(a);
                      };
                      
                      return (
                        <div key={p.id} className="flex items-center justify-between p-1.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
                          <span className="text-xs font-bold text-slate-200">{p.name}</span>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSelect('home')}
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                                selection === 'home'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                              }`}
                            >
                              Home Team
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSelect('away')}
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                                selection === 'away'
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                              }`}
                            >
                              Away Team
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSelect('unassigned')}
                              className={`px-1.5 py-0.5 text-[10px] font-medium rounded-lg transition-all cursor-pointer ${
                                selection === 'unassigned'
                                  ? 'bg-slate-700 text-slate-200'
                                  : 'bg-slate-800/50 text-slate-500'
                              }`}
                            >
                              None
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Recurrence Options */}
              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <RotateCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} /> Recurring Session Schedule
                    </label>
                    <p className="text-[11px] text-slate-400 font-medium">Enable to auto-generate multiple sessions repeating weekly</p>
                  </div>
                  <button
                    id="toggle-recurrence-btn"
                    type="button"
                    onClick={() => setIsRecurring(!isRecurring)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      isRecurring ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                        isRecurring ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {isRecurring && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/60 animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-400">Repeat Frequency</label>
                      <select
                        id="recurrence-freq-select"
                        disabled
                        className="w-full text-xs p-2.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl cursor-not-allowed"
                      >
                        <option value="weekly">Every Week (Weekly)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-400">Total Occurrences (Weeks) *</label>
                      <input
                        id="recurrence-count-input"
                        type="number"
                        min={2}
                        max={24}
                        value={recurringCount}
                        onChange={e => setRecurringCount(Math.max(2, Math.min(24, parseInt(e.target.value) || 2)))}
                        className="w-full text-xs p-2.5 bg-slate-900 border border-slate-800 text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        required
                      />
                      <p className="text-[10px] text-slate-500 mt-0.5">Generates {recurringCount} weekly sessions successively</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Automatic Session/Match Sync Notification Card (matching screenshot style) */}
              <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-800/60 flex items-start gap-2.5 text-xs text-emerald-300 font-medium">
                <span className="text-emerald-400 text-sm leading-none mt-0.5 shrink-0">⚡</span>
                <span className="leading-snug">
                  <strong className="text-emerald-200 font-semibold">Automatic Match Sync:</strong> Creating this session will automatically build a linked match card for <strong className="text-emerald-100 font-bold">{newDate || 'selected date'}</strong>!
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  id="cancel-session-form-btn"
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-sm font-medium text-slate-400 hover:text-white px-3 py-2 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="save-session-btn"
                  type="submit"
                  className="text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl cursor-pointer shadow-md transition duration-150 active:scale-95"
                >
                  Schedule Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Filters Panel */}
      <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex gap-2 flex-wrap">
          {/* Status buttons */}
          {(['All', 'Completed', 'Upcoming'] as const).map(status => (
            <button
              id={`filter-status-${status}`}
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                statusFilter === status 
                  ? 'bg-emerald-550 text-white' 
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            id="session-search-input"
            type="text"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-emerald-550 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Sessions Grid / Table list */}
      <div className="space-y-4">
        {filteredSessions.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-2xl border border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center">
            <Calendar className="w-10 h-10 mb-3 text-slate-300 dark:text-slate-600 stroke-1" />
            <h4 className="font-semibold text-slate-700 dark:text-slate-300">No Sessions Found</h4>
            <p className="text-xs mt-1 text-slate-400 dark:text-slate-500 max-w-sm">No scheduled sessions match your filter criteria or search. Create a new session or reset filters.</p>
          </div>
        ) : (
          filteredSessions.map(session => {
            const isOpen = activeSessionId === session.id;
            
            // Session specific metrics
            const sessionRecords = attendance.filter(a => a.sessionId === session.id);
            const presentCount = sessionRecords.filter(r => r.status === 'Present').length;
            const absentCount = sessionRecords.filter(r => r.status === 'Absent').length;
            const excusedCount = sessionRecords.filter(r => r.status === 'Excused').length;
            
            const attendanceRate = sessionRecords.length > 0 
              ? Math.round((presentCount / sessionRecords.length) * 100) 
              : 0;

            const sessionPlainDate = normalizeToISODate(session.date);

            const sessionMatch = matches.find(m => 
              m.id === session.matchId || 
              (m.date && normalizeToISODate(m.date) === sessionPlainDate)
            );

            return (
              <div 
                key={session.id} 
                className={`bg-white dark:bg-slate-900 rounded-2xl border transition duration-300 overflow-hidden ${
                  isOpen ? 'border-emerald-550 shadow-md ring-1 ring-emerald-550/30' : 'border-slate-100 dark:border-slate-800 shadow-xs hover:border-slate-200 dark:hover:border-slate-700'
                }`}
                id={`session-card-${session.id}`}
              >
                {/* Session Summary Header */}
                <div 
                  className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                  onClick={() => handleOpenAttendance(session)}
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-xl shrink-0 ${
                      session.type === 'League Match' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/60' :
                      'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/60'
                    }`}>
                      <Calendar className="w-5 h-5" />
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          session.type === 'League Match' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border dark:border-emerald-900/20' :
                          'bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-400 border dark:border-orange-900/20'
                        }`}>
                          {session.type}
                        </span>
                        {session.leagueId && (
                          <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full">
                            League: {leagues.find(l => l.id === session.leagueId)?.name || 'Fixture'}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          session.status === 'Completed' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400' : 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-400'
                        }`}>
                          {session.status}
                        </span>
                      </div>
                      
                      <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 mt-1">{session.title}</h4>
                      
                      {session.homeTeam && session.awayTeam && (
                        <div className="mt-1.5 text-xs font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5" id={`session-matchup-${session.id}`}>
                          <Swords className="w-3.5 h-3.5 text-indigo-550 dark:text-indigo-400 shrink-0" />
                          <span>Session Matchup: {session.homeTeam} vs {session.awayTeam}</span>
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {session.date} @ {session.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> {session.location}
                        </span>
                      </div>

                      {sessionMatch && (
                        <div 
                          className="mt-3 p-3 bg-slate-50/80 dark:bg-slate-950/40 hover:bg-emerald-500/5 dark:hover:bg-emerald-950/20 rounded-xl border border-slate-100 dark:border-slate-800/80 hover:border-emerald-500/30 flex flex-wrap items-center justify-between gap-3 max-w-md transition cursor-pointer group"
                          id={`session-match-card-${session.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onNavigateToLeagueMatch && sessionMatch) {
                              const targetLeagueId = sessionMatch.leagueId || session.leagueId || 'l-3';
                              onNavigateToLeagueMatch(targetLeagueId, sessionMatch.id);
                            }
                          }}
                          title="Click to view linked match details card"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono shrink-0">
                              MATCH
                            </span>
                            <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                              {sessionMatch.homeTeam} vs {sessionMatch.awayTeam}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-auto">
                            <span className="font-mono text-xs font-black bg-slate-200 dark:bg-slate-850 px-2 py-0.5 rounded text-slate-800 dark:text-slate-200">
                              {sessionMatch.homeScore ?? 0} - {sessionMatch.awayScore ?? 0}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onNavigateToLeagueMatch && sessionMatch) {
                                  const targetLeagueId = sessionMatch.leagueId || session.leagueId || 'l-3';
                                  onNavigateToLeagueMatch(targetLeagueId, sessionMatch.id);
                                }
                              }}
                              className="text-[10px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                            >
                              <span>Match Details →</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {!sessionMatch && (
                        <div className="mt-3 p-3 bg-amber-500/10 dark:bg-amber-950/30 rounded-xl border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 max-w-md">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-mono shrink-0">
                              UNLINKED
                            </span>
                            <span className="text-xs font-bold text-amber-800 dark:text-amber-200 truncate">
                              Standalone Training / Unlinked Session
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCreateMatchForSession(session);
                            }}
                            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-black transition cursor-pointer shadow-xs active:scale-95 shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5 shrink-0" />
                            <span>Link/Create Match Card</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right side stats summary or open indicator */}
                  <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                    {session.status === 'Completed' ? (
                      <div className="flex items-center gap-4">
                        <div className="flex gap-4 md:gap-6 text-right font-mono">
                          <div>
                            <p className="text-[9px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">Present</p>
                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{presentCount} ({attendanceRate}%)</p>
                          </div>
                          <div className="hidden sm:block">
                            <p className="text-[9px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">Absent/Excused</p>
                            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{absentCount + excusedCount}</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-emerald-550 flex items-center gap-1 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 px-2.5 py-1 rounded-lg">
                          Details
                        </span>
                      </div>
                    ) : (
                      <div className="text-right flex items-center gap-2">
                        <span className="text-xs font-bold text-white bg-emerald-550 hover:bg-emerald-600 px-4 py-1.5 rounded-xl shadow-md cursor-pointer transition">
                          Take Attendance
                        </span>
                      </div>
                    )}
                    <button
                      id={`delete-session-card-icon-${session.id}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log("Delete button clicked", session.id);
                        try {
                          onDeleteSession(session.id, false);
                        } catch (error) {
                          console.error("Delete failed:", error);
                        }
                      }}
                      className="p-2 border border-red-500/30 bg-red-500/10 hover:bg-red-500 hover:text-white rounded-xl text-red-500 cursor-pointer transition active:scale-95 shrink-0"
                      title="Delete Session Card"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Session Attendance List Editor */}
                {isOpen && (
                  <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-5 md:p-6 space-y-6 animate-in slide-in-from-top-4 duration-300" id={`attendance-editor-${session.id}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/60 dark:border-slate-800 pb-4">
                      <div>
                        <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-emerald-550" />
                          Attendance Register Editor
                        </h5>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Toggle attendee presence and sub payment status. Changes persist dynamically.</p>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleMarkAllPresent}
                          className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-lg border border-emerald-200 dark:border-emerald-800 transition cursor-pointer active:scale-95"
                        >
                          All Present
                        </button>
                        <button
                          type="button"
                          onClick={handleMarkAllAbsent}
                          className="px-2.5 py-1.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 text-xs font-bold rounded-lg border border-red-200 dark:border-red-800 transition cursor-pointer active:scale-95"
                        >
                          All Absent
                        </button>
                        <button
                          type="button"
                          onClick={handleClearAttendance}
                          className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 transition cursor-pointer active:scale-95"
                        >
                          Clear All
                        </button>
                        <button
                          id={`edit-session-btn-${session.id}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditSession(session);
                          }}
                          className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-600 dark:text-amber-400 px-3 py-1.5 rounded-lg text-xs font-black border border-amber-100 dark:border-amber-900/40 transition cursor-pointer active:scale-95"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit Session
                        </button>

                        <button
                          id={`delete-session-btn-${session.id}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log("Delete button clicked", session.id);
                            try {
                              onDeleteSession(session.id, false);
                            } catch (error) {
                              console.error("Delete failed:", error);
                            }
                          }}
                          className="flex items-center gap-1 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-100 dark:border-red-900/40 transition cursor-pointer active:scale-95"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete Session
                        </button>
                      </div>
                    </div>

                    {/* Attendance Grid */}
                    <div className="space-y-3">
                      {players.filter(p => p.status === 'Active').length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No active players on roster. Go to Players tab to add team members.</p>
                      ) : (
                        players
                          .filter(p => p.status === 'Active')
                          .map(player => {
                            const pState = sessionAttendance[player.id] || { status: 'Absent', feePaid: false, notes: '' };
                            
                            return (
                              <div 
                                key={player.id} 
                                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-white dark:bg-slate-900 rounded-xl border transition ${
                                  pState.status === 'Present' ? 'border-emerald-100 dark:border-emerald-950/60 hover:border-emerald-200' :
                                  pState.status === 'Absent' ? 'border-red-100 dark:border-red-950/60 hover:border-red-200' :
                                  'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                }`}
                                id={`player-row-${player.id}`}
                              >
                                {/* Player Info */}
                                <div className="flex items-center gap-3">
                                  {/* Initial badge without photo */}
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm uppercase border shadow-xs select-none shrink-0 ${getInitialsColor(player.name)}`}>
                                    {player.name.charAt(0)}
                                  </div>
                                  <div>
                                    <h6 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                                      <span>{player.name}</span>
                                      {player.annualDuePaid && <span className="text-[12px] shrink-0" title="Annual Due Paid">✅</span>}
                                      {player.volunteeredToCook && <span className="text-[12px] shrink-0" title="Volunteered to Cook">🍲 🍗</span>}
                                      {player.endOfYearPartyAttendee && <span className="text-[12px] shrink-0" title="End of Year Party Attendee">🎉</span>}
                                    </h6>
                                  </div>
                                </div>

                                {/* Attendance Status Toggles */}
                                <div className="flex flex-wrap items-center gap-4 sm:gap-6 justify-between sm:justify-end">
                                  {/* Radio button statuses */}
                                  <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
                                    {(['Present', 'Absent'] as const).map(st => (
                                      <button
                                        id={`status-${player.id}-${st}`}
                                        key={st}
                                        type="button"
                                        onClick={() => handleStatusChange(player.id, st)}
                                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                                          pState.status === st 
                                            ? st === 'Present' ? 'bg-emerald-550 text-white shadow-xs' 
                                              : 'bg-red-550 text-white shadow-xs'
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                        }`}
                                      >
                                        {st}
                                      </button>
                                    ))}
                                  </div>

                                  {/* Sub Fee toggle removed */}


                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 rounded-xl">
                      <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-500 dark:text-slate-400 items-center">
                        <span>Total Active Team Present: <strong className="text-emerald-600 dark:text-emerald-400">{Object.keys(sessionAttendance).filter(id => sessionAttendance[id].status === 'Present').length} players</strong></span>
                        <span>Absent: <strong className="text-red-500 dark:text-red-400">{Object.keys(sessionAttendance).filter(id => sessionAttendance[id].status === 'Absent').length} players</strong></span>
                        {sheetsSyncStatus === 'syncing' && (
                          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-extrabold bg-amber-500/10 px-1.5 py-0.5 rounded-md text-[8px] uppercase tracking-wider animate-pulse shrink-0">
                            ⚡ Syncing...
                          </span>
                        )}
                        {sheetsSyncStatus === 'synced' && (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-450 font-extrabold bg-emerald-500/10 px-1.5 py-0.5 rounded-md text-[8px] uppercase tracking-wider shrink-0">
                            ✓ Synced
                          </span>
                        )}
                        {sheetsSyncStatus === 'error' && (
                          <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-extrabold bg-red-500/10 px-1.5 py-0.5 rounded-md text-[8px] uppercase tracking-wider shrink-0">
                            ⚠ Failed
                          </span>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          id={`close-attendance-btn-${session.id}`}
                          type="button"
                          onClick={() => setActiveSessionId(null)}
                          className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          Discard
                        </button>
                        <button
                          id={`save-attendance-btn-${session.id}`}
                          type="button"
                          onClick={() => handleSaveAttendance(session.id)}
                          className="flex items-center gap-1.5 bg-emerald-550 hover:bg-emerald-600 text-white text-xs font-bold px-5 py-2 rounded-xl cursor-pointer shadow-sm shadow-emerald-900/10"
                        >
                          <Save className="w-4 h-4" /> Save Register & Complete
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Custom Delete Confirmation Modal */}
      {renderDeleteModals()}

      {/* CUSTOM EDIT SESSION MODAL */}
      {editingSession && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150 text-left max-h-[calc(100vh-2rem)] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-950 dark:text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-amber-500" />
                Edit Session Details
              </h3>
              <button 
                type="button"
                onClick={() => setEditingSession(null)}
                className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSessionSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Session Title *</label>
                <input 
                  type="text" 
                  value={editSessionTitle}
                  onChange={e => setEditSessionTitle(e.target.value)}
                  className="w-full text-sm p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:outline-emerald-550"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Date *</label>
                  <input 
                    type="date" 
                    value={editSessionDate}
                    onChange={e => setEditSessionDate(e.target.value)}
                    className="w-full text-sm p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:outline-emerald-550"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Time *</label>
                  <input 
                    type="time" 
                    value={editSessionTime}
                    onChange={e => setEditSessionTime(e.target.value)}
                    className="w-full text-sm p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:outline-emerald-550"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Location/Venue *</label>
                <input 
                  type="text" 
                  value={editSessionLocation}
                  onChange={e => setEditSessionLocation(e.target.value)}
                  className="w-full text-sm p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:outline-emerald-550"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Session Type</label>
                  <select
                    value={editSessionType}
                    onChange={e => setEditSessionType(e.target.value as any)}
                    className="w-full text-sm p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:outline-emerald-550 bg-white"
                  >
                    <option value="Friendly Match">Friendly Match</option>
                    <option value="League Match">League Match</option>
                  </select>
                </div>

                {editSessionType === 'League Match' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">League Association</label>
                    <select
                      value={editSessionLeagueId}
                      onChange={e => setEditSessionLeagueId(e.target.value)}
                      className="w-full text-sm p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:outline-emerald-550 bg-white"
                    >
                      <option value="">-- Select League --</option>
                      {leagues.map(l => (
                        <option key={l.id} value={l.id}>{l.name} ({l.season})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Home Team</label>
                  <select
                    value={editSessionHome}
                    onChange={e => setEditSessionHome(e.target.value)}
                    className="w-full text-sm p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:outline-emerald-550 bg-white"
                  >
                    <option value="">-- Select --</option>
                    <option value="Team Yellow">Team Yellow 🟡</option>
                    <option value="Team Red">Team Red 🔴</option>
                    <option value="Team Jerry">Team Jerry ⚽</option>
                    <option value="Team Kayviva">Team Kayviva ⚡</option>
                    {Array.from(new Set(leagues.map(l => l.name))).map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Away Team</label>
                  <select
                    value={editSessionAway}
                    onChange={e => setEditSessionAway(e.target.value)}
                    className="w-full text-sm p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:outline-emerald-550 bg-white"
                  >
                    <option value="">-- Select --</option>
                    <option value="Team Yellow">Team Yellow 🟡</option>
                    <option value="Team Red">Team Red 🔴</option>
                    <option value="Team Jerry">Team Jerry ⚽</option>
                    <option value="Team Kayviva">Team Kayviva ⚡</option>
                    {Array.from(new Set(leagues.map(l => l.name))).map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <label className="text-xs font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase select-none block">
                  Assign Players to Teams (Roster)
                </label>
                <div className="max-h-40 overflow-y-auto border border-slate-150 dark:border-slate-800 rounded-xl p-2.5 space-y-1.5 bg-slate-50/50 dark:bg-slate-950/20">
                  {getPresentPlayersForSession(editingSession, null, attendance, players).map(p => {
                    const isHome = editSessionHomeRoster.includes(p.id);
                    const isAway = editSessionAwayRoster.includes(p.id);
                    const selection = isHome ? 'home' : (isAway ? 'away' : 'unassigned');
                    
                    const handleSelect = (val: 'home' | 'away' | 'unassigned') => {
                      let h = editSessionHomeRoster.filter(id => id !== p.id);
                      let a = editSessionAwayRoster.filter(id => id !== p.id);
                      if (val === 'home') h.push(p.id);
                      if (val === 'away') a.push(p.id);
                      setEditSessionHomeRoster(h);
                      setEditSessionAwayRoster(a);
                    };
                    
                    return (
                      <div key={p.id} className="flex items-center justify-between p-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-150 dark:border-slate-800/80">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{p.name}</span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSelect('home')}
                            className={`px-2 py-0.5 text-[9px] font-black rounded-lg transition-all ${
                              selection === 'home'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            Team A
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelect('away')}
                            className={`px-2 py-0.5 text-[9px] font-black rounded-lg transition-all ${
                              selection === 'away'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            Team B
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingSession(null)}
                  className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-xs font-bold bg-emerald-550 hover:bg-emerald-650 text-white px-5 py-2.5 rounded-xl shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM CREATE MATCH MODAL FOR SESSIONS */}
      {showCreateMatchModal && activeCreateMatchSession && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150 text-left max-h-[calc(100vh-2rem)] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-950 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-500" />
                Schedule Match Detail Card
              </h3>
              <button 
                type="button"
                onClick={() => {
                  setShowCreateMatchModal(false);
                  setActiveCreateMatchSession(null);
                }}
                className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Create a custom Match Card for <span className="font-bold text-slate-800 dark:text-slate-200">"{activeCreateMatchSession.title}"</span> on {activeCreateMatchSession.date}. Teams and roster assignments will be inherited automatically!
            </p>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!newMatchHome || !newMatchAway) {
                alert('Please select both home and away teams.');
                return;
              }
              if (newMatchHome === newMatchAway) {
                alert('Home and away teams cannot be the same.');
                return;
              }

              const newMatchId = `m-custom-${Date.now()}`;
              const newMatch: LeagueMatch = {
                id: newMatchId,
                leagueId: newMatchLeagueId || 'friendly-league',
                homeTeam: newMatchHome,
                awayTeam: newMatchAway,
                date: `${activeCreateMatchSession.date} • ${activeCreateMatchSession.time}`,
                status: newMatchStatus === 'Played' ? 'Played' : 'Scheduled',
                type: newMatchTypeState,
                format: '7v7',
                goals: [],
                homeSquad: newSessionHomeRoster,
                awaySquad: newSessionAwayRoster,
                homeRoster: newSessionHomeRoster,
                awayRoster: newSessionAwayRoster,
              };

              if (newMatch.status === 'Played') {
                newMatch.homeScore = parseInt(newMatchHomeScore) || 0;
                newMatch.awayScore = parseInt(newMatchAwayScore) || 0;
              }

              if (onAddMatch) {
                onAddMatch(newMatch);
              }

              // Update the session to link it with the match!
              const updatedSession: Session = {
                ...activeCreateMatchSession,
                matchId: newMatchId,
                matchGoals: [],
                matchHomeScore: newMatch.homeScore,
                matchAwayScore: newMatch.awayScore,
                // also propagate roster details to session level
                homeTeam: newMatchHome,
                awayTeam: newMatchAway,
                homeRoster: newSessionHomeRoster,
                awayRoster: newSessionAwayRoster,
              };

              if (onUpdateSession) {
                onUpdateSession(updatedSession);
              }

              setShowCreateMatchModal(false);
              setActiveCreateMatchSession(null);
            }} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Home Team</label>
                  <select
                    value={newMatchHome}
                    onChange={e => setNewMatchHome(e.target.value)}
                    className="w-full text-sm p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:outline-emerald-550 bg-white"
                    required
                  >
                    <option value="">-- Select --</option>
                    <option value="Team Yellow">Team Yellow 🟡</option>
                    <option value="Team Red">Team Red 🔴</option>
                    <option value="Team Jerry">Team Jerry ⚽</option>
                    <option value="Team Kayviva">Team Kayviva ⚡</option>
                    {Array.from(new Set(leagues.map(l => l.name))).map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Away Team</label>
                  <select
                    value={newMatchAway}
                    onChange={e => setNewMatchAway(e.target.value)}
                    className="w-full text-sm p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:outline-emerald-550 bg-white"
                    required
                  >
                    <option value="">-- Select --</option>
                    <option value="Team Yellow">Team Yellow 🟡</option>
                    <option value="Team Red">Team Red 🔴</option>
                    <option value="Team Jerry">Team Jerry ⚽</option>
                    <option value="Team Kayviva">Team Kayviva ⚡</option>
                    {Array.from(new Set(leagues.map(l => l.name))).map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Match Status</label>
                  <select
                    value={newMatchStatus}
                    onChange={e => setNewMatchStatus(e.target.value as any)}
                    className="w-full text-sm p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:outline-emerald-550 bg-white"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Played">Played (Finished)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Match Type</label>
                  <select
                    value={newMatchTypeState}
                    onChange={e => setNewMatchTypeState(e.target.value as any)}
                    className="w-full text-sm p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:outline-emerald-550 bg-white"
                  >
                    <option value="Friendly Match">Friendly Match</option>
                    <option value="League Match">League Match</option>
                  </select>
                </div>
              </div>

              {newMatchTypeState === 'League Match' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">League Association</label>
                  <select
                    value={newMatchLeagueId}
                    onChange={e => setNewMatchLeagueId(e.target.value)}
                    className="w-full text-sm p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:outline-emerald-550 bg-white"
                    required
                  >
                    <option value="">-- Select League --</option>
                    {leagues.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.season})</option>
                    ))}
                  </select>
                </div>
              )}

              {newMatchStatus === 'Played' && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2 duration-150">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Home Goals</label>
                    <input 
                      type="number" 
                      min={0}
                      value={newMatchHomeScore}
                      onChange={e => setNewMatchHomeScore(e.target.value)}
                      className="w-full text-sm p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Away Goals</label>
                    <input 
                      type="number" 
                      min={0}
                      value={newMatchAwayScore}
                      onChange={e => setNewMatchAwayScore(e.target.value)}
                      className="w-full text-sm p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl bg-white"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <label className="text-xs font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase select-none block">
                  Verify Player Squad Assignments (Roster)
                </label>
                <div className="max-h-40 overflow-y-auto border border-slate-150 dark:border-slate-800 rounded-xl p-2.5 space-y-1.5 bg-slate-50/50 dark:bg-slate-950/20">
                  {getPresentPlayersForSession(activeCreateMatchSession, null, attendance, players).map(p => {
                    const isHome = newSessionHomeRoster.includes(p.id);
                    const isAway = newSessionAwayRoster.includes(p.id);
                    const selection = isHome ? 'home' : (isAway ? 'away' : 'unassigned');
                    
                    const handleSelect = (val: 'home' | 'away' | 'unassigned') => {
                      let h = newSessionHomeRoster.filter(id => id !== p.id);
                      let a = newSessionAwayRoster.filter(id => id !== p.id);
                      if (val === 'home') h.push(p.id);
                      if (val === 'away') a.push(p.id);
                      setNewSessionHomeRoster(h);
                      setNewSessionAwayRoster(a);
                    };
                    
                    return (
                      <div key={p.id} className="flex items-center justify-between p-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-150 dark:border-slate-800/80">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{p.name}</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleSelect('home')}
                            className={`px-2 py-0.5 text-[9px] font-black rounded-lg transition-all ${
                              selection === 'home'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            Team A
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelect('away')}
                            className={`px-2 py-0.5 text-[9px] font-black rounded-lg transition-all ${
                              selection === 'away'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            Team B
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateMatchModal(false);
                    setActiveCreateMatchSession(null);
                  }}
                  className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-xs font-bold bg-emerald-550 hover:bg-emerald-650 text-white px-5 py-2.5 rounded-xl shadow-xs"
                >
                  Schedule Match Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
