import React, { useState } from 'react';
import { Player, Session, AttendanceRecord, ActivityLog, League, TeamStanding, LeagueMatch } from '../types';
import { getInitialsColor } from './Players';
import { 
  Users, 
  Calendar, 
  ArrowRight, 
  Plus, 
  Award, 
  Clock, 
  MapPin, 
  CheckCircle, 
  UserX,
  Target,
  Trophy,
  Zap,
  RotateCw,
  Settings,
  ChevronRight,
  Sparkles,
  Search,
  Activity,
  X,
  Check,
  Save,
  UserCheck,
  Trash2,
  FileText,
  Download
} from 'lucide-react';
import { motion } from 'motion/react';
import { normalizeDateToISO } from '../utils/dateUtils';

interface DashboardProps {
  players: Player[];
  sessions: Session[];
  attendance: AttendanceRecord[];
  logs: ActivityLog[];
  leagues: League[];
  standings: Record<string, TeamStanding[]>;
  matches?: LeagueMatch[];
  onNavigate: (tab: 'dashboard' | 'sessions' | 'leagues' | 'players' | 'reporting') => void;
  onQuickAddPlayer: () => void;
  onQuickCreateSession: () => void;
  onUpdateAttendance: (sessionId: string, records: AttendanceRecord[]) => void;
  onAddPlayer?: (player: Omit<Player, 'id'>) => Player;
  onClearAllData?: () => void;
}

export default function Dashboard({ 
  players, 
  sessions, 
  attendance, 
  logs, 
  leagues,
  standings,
  matches = [],
  onNavigate,
  onQuickAddPlayer,
  onQuickCreateSession,
  onUpdateAttendance,
  onAddPlayer,
  onClearAllData
}: DashboardProps) {
  const formatPlayerName = (name: string) => {
    if (!name) return '';
    const trimmedName = name.trim();
    const firstName = trimmedName.split(' ')[0].toLowerCase();
    
    // Find player record with this name if available
    const playerRecord = (players || []).find(p => p.name && p.name.trim().toLowerCase() === trimmedName.toLowerCase());

    const hasConflict = (players || []).some(p => {
      if (!p.name) return false;
      const otherTrimmed = p.name.trim();
      const isDifferentPlayer = playerRecord ? p.id !== playerRecord.id : p.name !== name;
      if (!isDifferentPlayer) return false;

      const otherFirstName = otherTrimmed.split(' ')[0].toLowerCase();
      return otherFirstName === firstName;
    });

    if (hasConflict || firstName === 'john') {
      return trimmedName;
    }
    return trimmedName.split(' ')[0];
  };
  
  // Use Captain's League as default if available
  const captainsLeague = leagues.find(l => l.name.includes("Captain's")) || leagues[0];
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>(captainsLeague?.id || '');
  const [comparedTeamIds, setComparedTeamIds] = useState<string[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const activeLeague = leagues.find(l => l.id === selectedLeagueId) || captainsLeague;
  const activeStandings = standings[selectedLeagueId] || standings[captainsLeague?.id] || [];

  // Sort standings by points DESC, GD DESC
  const sortedStandings = [...activeStandings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;
    return gdB - gdA;
  });

  // Dynamic or fallback calculations for Season Highlights
  const hasPlayers = players.length > 0;
  const hasLeagues = leagues.length > 0;

  // 1. Dynamic Top Scorer
  const { topScorerName, topScorerSub } = React.useMemo(() => {
    if (matches && matches.length > 0) {
      const scorerCounts: Record<string, { name: string; count: number }> = {};
      matches.forEach(m => {
        if (m.goals) {
          m.goals.forEach(g => {
            const name = g.playerName || players.find(p => p.id === g.playerId)?.name || "Unknown Player";
            const pId = g.playerId || name;
            if (!scorerCounts[pId]) {
              scorerCounts[pId] = { name, count: 0 };
            }
            scorerCounts[pId].count += 1;
          });
        }
      });

      const scorersList = Object.values(scorerCounts);
      if (scorersList.length > 0) {
        scorersList.sort((a, b) => b.count - a.count);
        const topCount = scorersList[0].count;
        const ties = scorersList.filter(s => s.count === topCount);
        if (ties.length === 1) {
          return {
            topScorerName: ties[0].name,
            topScorerSub: `${topCount} goal${topCount > 1 ? 's' : ''}`
          };
        } else if (ties.length > 1) {
          const names = ties.map(t => formatPlayerName(t.name)).join(' & ');
          return {
            topScorerName: names.length > 25 ? `${formatPlayerName(ties[0].name)} & ${formatPlayerName(ties[1].name)}` : names,
            topScorerSub: `${topCount} goal${topCount > 1 ? 's' : ''} each`
          };
        }
      }
    }
    // Fallback matching original mockData screenshot vibe
    return {
      topScorerName: "No goals recorded",
      topScorerSub: "Play matches and log goals to see rankings"
    };
  }, [matches, players, hasPlayers]);

  // 2. Dynamic League Leader
  const { leagueLeaderName, leagueLeaderSub, isPendingLeader } = React.useMemo(() => {
    if (hasLeagues && sortedStandings.length > 0) {
      const leader = sortedStandings[0];
      const isZero = leader.points === 0;
      return {
        leagueLeaderName: leader.name,
        leagueLeaderSub: isZero 
          ? "0 pts (Pending match cards)" 
          : `${leader.points} pts (${leader.won}W - ${leader.drawn}D - ${leader.lost}L)`,
        isPendingLeader: isZero
      };
    }
    return {
      leagueLeaderName: "No league leader yet",
      leagueLeaderSub: "Create leagues and play matches to calculate leaders",
      isPendingLeader: true
    };
  }, [hasLeagues, sortedStandings]);

  // 3. Dynamic Most Attendance (Iron Man Award)
  const { mostAttendanceName, mostAttendanceSub } = React.useMemo(() => {
    if (attendance && attendance.length > 0) {
      const attendanceCounts: Record<string, number> = {};
      attendance.forEach(att => {
        if (att.status === 'Present') {
          attendanceCounts[att.playerId] = (attendanceCounts[att.playerId] || 0) + 1;
        }
      });

      const attendanceList = Object.entries(attendanceCounts).map(([pId, count]) => {
        const playerObj = players.find(p => p.id === pId);
        return {
          id: pId,
          name: playerObj ? playerObj.name : "Unknown Player",
          count
        };
      });

      if (attendanceList.length > 0) {
        attendanceList.sort((a, b) => b.count - a.count);
        const topCount = attendanceList[0].count;
        const ties = attendanceList.filter(a => a.count === topCount);
        if (ties.length === 1) {
          return {
            mostAttendanceName: ties[0].name,
            mostAttendanceSub: `${topCount} session${topCount > 1 ? 's' : ''}`
          };
        } else if (ties.length > 1) {
          const names = ties.map(t => formatPlayerName(t.name)).join(' & ');
          return {
            mostAttendanceName: names.length > 25 ? `${formatPlayerName(ties[0].name)} & others` : names,
            mostAttendanceSub: `${topCount} session${topCount > 1 ? 's' : ''} each`
          };
        }
      }
    }
    return {
      mostAttendanceName: "No attendance tracked yet",
      mostAttendanceSub: "Mark attendance in sessions to see most active players"
    };
  }, [attendance, players, hasPlayers]);

  // 4. Dynamic MVP Leader
  const { mvpName, mvpSub } = React.useMemo(() => {
    if (matches && matches.length > 0) {
      const mvpCounts: Record<string, number> = {};
      matches.forEach(m => {
        if (m.status === 'Played' && m.playerOfMatch) {
          const rawMvp = m.playerOfMatch.trim();
          const parts = rawMvp.split(/&|and|,|\//);
          parts.forEach(part => {
            const name = part.trim();
            if (name) {
              mvpCounts[name] = (mvpCounts[name] || 0) + 1;
            }
          });
        }
      });

      const mvpList = Object.entries(mvpCounts).map(([name, count]) => ({ name, count }));
      if (mvpList.length > 0) {
        mvpList.sort((a, b) => b.count - a.count);
        const topMvpCount = mvpList[0].count;
        const ties = mvpList.filter(m => m.count === topMvpCount);
        if (ties.length === 1) {
          return {
            mvpName: ties[0].name,
            mvpSub: `${topMvpCount} Award${topMvpCount > 1 ? 's' : ''}`
          };
        } else if (ties.length > 1) {
          const names = ties.map(t => formatPlayerName(t.name)).join(' & ');
          return {
            mvpName: names.length > 25 ? `${formatPlayerName(ties[0].name)} & others` : names,
            mvpSub: `${topMvpCount} Award${topMvpCount > 1 ? 's' : ''} each`
          };
        }
      }
    }
    return {
      mvpName: "No MVPs awarded yet",
      mvpSub: "Award MVP in matches to track leadership"
    };
  }, [matches, players, hasPlayers]);

  // 5. Dynamic Total Goals Count
  const { totalGoalsCount, totalGoalsSub } = React.useMemo(() => {
    if (matches && matches.length > 0) {
      let count = 0;
      let playedCount = 0;
      matches.forEach(m => {
        if (m.status === 'Played') {
          playedCount++;
          if (m.goals && m.goals.length > 0) {
            count += m.goals.length;
          } else {
            count += (m.homeScore || 0) + (m.awayScore || 0);
          }
        }
      });
      if (playedCount > 0) {
        return {
          totalGoalsCount: count,
          totalGoalsSub: `Across ${playedCount} completed fixtures`
        };
      }
    }
    return {
      totalGoalsCount: 0,
      totalGoalsSub: "No matches played yet"
    };
  }, [matches]);

  // 6. Dynamic Attendance Rate
  const { overallAttendanceRate, overallAttendanceSub } = React.useMemo(() => {
    if (attendance && attendance.length > 0) {
      const presentCount = attendance.filter(a => a.status === 'Present').length;
      const totalCount = attendance.filter(a => a.status === 'Present' || a.status === 'Absent').length;
      if (totalCount > 0) {
        const rate = (presentCount / totalCount) * 100;
        let sub = "Solid squad showing";
        if (rate >= 85) {
          sub = "Elite dedication levels";
        } else if (rate < 70) {
          sub = "Need stronger turnout";
        }
        return {
          overallAttendanceRate: `${rate.toFixed(1)}%`,
          overallAttendanceSub: sub
        };
      }
    }
    return {
      overallAttendanceRate: "0%",
      overallAttendanceSub: "No sessions completed yet"
    };
  }, [attendance]);

  const upcomingSessions = sessions.filter(s => s.status === 'Upcoming');

  // Attendance taking states for the Dashboard popup modal
  const [attendanceSession, setAttendanceSession] = useState<Session | null>(null);
  const [sessionAttendance, setSessionAttendance] = useState<Record<string, {
    status: 'Present' | 'Absent' | 'Excused';
    notes: string;
    feePaid: boolean;
  }>>({});
  const [searchPlayerQuery, setSearchPlayerQuery] = useState('');

  const handleOpenAttendance = (session: Session) => {
    const tempAttendance: typeof sessionAttendance = {};
    const activePlayers = players.filter(p => p.status === 'Active');
    
    activePlayers.forEach(p => {
      const existing = attendance.find(a => a.sessionId === session.id && a.playerId === p.id);
      if (existing) {
        tempAttendance[p.id] = {
          status: existing.status,
          notes: existing.notes || '',
          feePaid: existing.feePaid || false
        };
      }
    });

    setSearchPlayerQuery('');
    setSessionAttendance(tempAttendance);
    setAttendanceSession(session);
  };

  const handleClearAttendance = () => {
    if (!attendanceSession) return;
    setSessionAttendance({});
    onUpdateAttendance(attendanceSession.id, []);
  };

  const saveAttendanceImmediately = (updatedAttendance: typeof sessionAttendance) => {
    if (!attendanceSession) return;
    const recordsToSave: AttendanceRecord[] = Object.keys(updatedAttendance).map(playerId => {
      const val = updatedAttendance[playerId];
      return {
        sessionId: attendanceSession.id,
        playerId,
        status: val.status,
        feePaid: val.feePaid,
        notes: val.notes
      };
    });
    onUpdateAttendance(attendanceSession.id, recordsToSave);
  };

  const handleQuickRegisterAndPresent = (nameToRegister: string) => {
    if (!onAddPlayer) return;
    
    const newPlayer: Omit<Player, 'id'> = {
      name: nameToRegister,
      status: 'Active',
      joinDate: new Date().toISOString().split('T')[0]
    };
    
    const registered = onAddPlayer(newPlayer);
    
    const updated = {
      ...sessionAttendance,
      [registered.id]: {
        status: 'Present' as const,
        feePaid: false,
        notes: ''
      }
    };
    
    setSessionAttendance(updated);
    saveAttendanceImmediately(updated);
    setSearchPlayerQuery('');
  };

  const handleStatusChange = (playerId: string, status: 'Present' | 'Absent' | 'Excused') => {
    const updated = {
      ...sessionAttendance,
      [playerId]: {
        ...sessionAttendance[playerId],
        status
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

  const handleSaveAttendance = () => {
    setAttendanceSession(null);
    setSearchPlayerQuery('');
  };

  // Custom colors matching the bullet points in screenshot
  const getBulletColor = (teamName: string) => {
    const upper = teamName.toUpperCase();
    if (upper.includes('JERRY')) return 'bg-lime-500';
    if (upper.includes('OJUKWU')) return 'bg-amber-400';
    if (upper.includes('SHOLA')) return 'bg-fuchsia-500';
    if (upper.includes('JOHN')) return 'bg-blue-500';
    if (upper.includes('DAVID')) return 'bg-rose-500';
    if (upper.includes('ND')) return 'bg-slate-400';
    if (upper.includes('IBRAHEEM')) return 'bg-emerald-500';
    if (upper.includes('OSANGA')) return 'bg-sky-400';
    return 'bg-slate-300';
  };

  // Format dates into parts for date blocks (e.g., 'JUL', '11')
  const getFormattedDateParts = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      return {
        month: months[date.getMonth()] || 'JUL',
        day: date.getDate() || '11'
      };
    } catch (e) {
      return { month: 'JUL', day: '11' };
    }
  };

  // Compare team action
  const handleTeamRowClick = (teamId: string) => {
    setComparedTeamIds(prev => {
      if (prev.includes(teamId)) {
        return prev.filter(id => id !== teamId);
      }
      if (prev.length >= 2) {
        return [prev[1], teamId];
      }
      return [...prev, teamId];
    });
  };

  const comparedTeams = sortedStandings.filter(t => comparedTeamIds.includes(t.id));

  return (
    <div className="space-y-6" id="dashboard-tab">

      {/* Featured Weekly Report Download Card */}
      <div id="weekly-report-download-card" className="bg-slate-900 text-white p-5 sm:p-6 rounded-3xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-mono">
              <FileText className="w-3 h-3" /> OFFICIAL REPORT
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-800 text-slate-200 border border-slate-700 font-mono">
              PDF EXPORT
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-black tracking-tight">Game On - Weekly League Report</h3>
          <p className="text-xs text-slate-300 font-medium max-w-2xl leading-relaxed">
            Capture true data across Captain's League, Player League, MVP awards, and Top Scorers in landscape PDF layout.
          </p>
        </div>
        <button
          id="btn-download-weekly-report-card"
          onClick={() => onNavigate('weekly-report' as any)}
          className="px-5 py-3 bg-white text-slate-900 font-black text-xs sm:text-sm rounded-2xl hover:bg-slate-100 transition shadow-lg active:scale-95 cursor-pointer shrink-0 flex items-center justify-center gap-2 border border-slate-200"
        >
          <Download className="w-4 h-4 text-slate-900" />
          <span>Download PDF Report</span>
        </button>
      </div>

      {/* Season Highlights */}
      <div className={`space-y-3 ${(!hasPlayers && !hasLeagues) ? 'hidden' : ''}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <div>
            <h2 className="text-[10px] sm:text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider font-mono">
              Season Highlights
            </h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Live awards and dynamic roster performance tracked across all sessions and matches
            </p>
          </div>
        </div>
        
        {(!matches || matches.length === 0) ? (
          <div className="bg-slate-100/40 dark:bg-slate-900/40 p-10 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 text-center flex flex-col items-center justify-center space-y-2 py-12" id="season-highlights-empty">
            <Trophy className="w-8 h-8 text-slate-400 dark:text-slate-600 animate-pulse" />
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No Data / Season Not Started</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Record played match cards to compute season achievements.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="season-highlights-grid">
            
            {/* Card 1: Top Scorer */}
            <motion.div 
              whileHover={{ y: -3, scale: 1.01 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="bg-amber-50/60 dark:bg-amber-950/10 p-5 rounded-2xl border border-amber-200/40 dark:border-amber-950/30 flex items-center gap-4 hover:shadow-md dark:hover:shadow-none transition-all duration-200" 
              id="highlight-top-scorer"
            >
              <div className="p-3 bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <p className="text-[9px] font-extrabold uppercase text-amber-500 tracking-widest font-mono">Golden Boot</p>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 leading-tight truncate">
                  {topScorerName}
                </h3>
                <p className="text-xs font-black text-amber-600 dark:text-amber-400">{topScorerSub}</p>
              </div>
            </motion.div>

            {/* Card 2: League Leader */}
            <motion.div 
              whileHover={{ y: -3, scale: 1.01 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className={isPendingLeader 
                ? "bg-slate-50/60 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex items-center gap-4 hover:shadow-md dark:hover:shadow-none transition-all duration-200"
                : "bg-emerald-50/60 dark:bg-emerald-950/10 p-5 rounded-2xl border border-emerald-200/40 dark:border-emerald-950/30 flex items-center gap-4 hover:shadow-md dark:hover:shadow-none transition-all duration-200"
              }
              id="highlight-league-leader"
            >
              <div className={isPendingLeader
                ? "p-3 bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 rounded-full flex items-center justify-center shrink-0 relative"
                : "p-3 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center shrink-0"
              }>
                <Trophy className="w-5 h-5" />
                {isPendingLeader && (
                  <span className="absolute top-0 right-0 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </span>
                )}
              </div>
              <div className="space-y-1 min-w-0">
                <p className={isPendingLeader
                  ? "text-[9px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-widest font-mono flex items-center gap-1.5"
                  : "text-[9px] font-extrabold uppercase text-emerald-500 tracking-widest font-mono"
                }>
                  League Leader
                  {isPendingLeader && (
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[8px] font-bold bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200/30 dark:border-amber-900/30">
                      AWAITING STATS
                    </span>
                  )}
                </p>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 leading-tight truncate">
                  {leagueLeaderName}
                </h3>
                <p className={isPendingLeader
                  ? "text-xs font-semibold text-slate-500 dark:text-slate-400"
                  : "text-xs font-black text-emerald-600 dark:text-emerald-400"
                }>
                  {leagueLeaderSub}
                </p>
              </div>
            </motion.div>

            {/* Card 3: Most Attendance */}
            <motion.div 
              whileHover={{ y: -3, scale: 1.01 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="bg-blue-50/60 dark:bg-blue-950/10 p-5 rounded-2xl border border-blue-200/40 dark:border-blue-950/30 flex items-center gap-4 hover:shadow-md dark:hover:shadow-none transition-all duration-200" 
              id="highlight-most-attendance"
            >
              <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <p className="text-[9px] font-extrabold uppercase text-blue-500 tracking-widest font-mono">Iron Man Award</p>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 leading-tight truncate">
                  {mostAttendanceName}
                </h3>
                <p className="text-xs font-black text-blue-600 dark:text-blue-400">{mostAttendanceSub}</p>
              </div>
            </motion.div>

            {/* Card 4: MVP Leader */}
            <motion.div 
              whileHover={{ y: -3, scale: 1.01 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="bg-violet-50/60 dark:bg-violet-950/10 p-5 rounded-2xl border border-violet-200/40 dark:border-violet-950/30 flex items-center gap-4 hover:shadow-md dark:hover:shadow-none transition-all duration-200" 
              id="highlight-mvp-leader"
            >
              <div className="p-3 bg-violet-500/10 dark:bg-violet-500/20 text-violet-500 rounded-full flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <p className="text-[9px] font-extrabold uppercase text-violet-500 tracking-widest font-mono">MVP Leader</p>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 leading-tight truncate">
                  {mvpName}
                </h3>
                <p className="text-xs font-black text-violet-600 dark:text-violet-400">{mvpSub}</p>
              </div>
            </motion.div>

            {/* Card 5: Goal Fest */}
            <motion.div 
              whileHover={{ y: -3, scale: 1.01 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="bg-rose-50/60 dark:bg-rose-950/10 p-5 rounded-2xl border border-rose-200/40 dark:border-rose-950/30 flex items-center gap-4 hover:shadow-md dark:hover:shadow-none transition-all duration-200" 
              id="highlight-goal-fest"
            >
              <div className="p-3 bg-rose-500/10 dark:bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <p className="text-[9px] font-extrabold uppercase text-rose-500 tracking-widest font-mono">Season Goal Fest</p>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 leading-tight truncate">
                  {totalGoalsCount} Goals Scored
                </h3>
                <p className="text-xs font-black text-rose-600 dark:text-rose-400">{totalGoalsSub}</p>
              </div>
            </motion.div>

            {/* Card 6: Attendance Rate */}
            <motion.div 
              whileHover={{ y: -3, scale: 1.01 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-4 hover:shadow-md dark:hover:shadow-none transition-all duration-200" 
              id="highlight-attendance-rate"
            >
              <div className="p-3 bg-slate-500/10 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 rounded-full flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <p className="text-[9px] font-extrabold uppercase text-slate-500 tracking-widest font-mono">Turnout Rate</p>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 leading-tight truncate">
                  {overallAttendanceRate} Present
                </h3>
                <p className="text-xs font-black text-slate-600 dark:text-slate-400">{overallAttendanceSub}</p>
              </div>
            </motion.div>

          </div>
        )}
      </div>

      {/* League Table Block */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs overflow-hidden" id="league-standings-block">
        <div className="p-5 flex items-center justify-between border-b border-slate-50 dark:border-slate-800 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
              League Standings
            </h3>
            {leagues.length > 0 ? (
              <div className="relative inline-block">
                <select
                  id="league-picker-select"
                  value={selectedLeagueId}
                  onChange={(e) => {
                    setSelectedLeagueId(e.target.value);
                    setComparedTeamIds([]);
                  }}
                  className="bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-extrabold text-xs px-3 py-1.5 rounded-full pr-8 appearance-none focus:outline-none cursor-pointer hover:bg-emerald-500/20"
                >
                  {leagues.map(l => (
                    <option key={l.id} value={l.id} className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900">
                      {l.name}
                    </option>
                  ))}
                </select>
                <div className="absolute top-1/2 right-3 -translate-y-1/2 pointer-events-none text-emerald-700 dark:text-emerald-400 font-bold text-[8px]">
                  ▼
                </div>
              </div>
            ) : (
              <span className="text-xs bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full font-bold">
                League
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button 
              id="reload-standings-btn"
              onClick={() => {
                setComparedTeamIds([]);
              }}
              title="Refresh Standings"
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition rounded-lg"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button 
              id="settings-standings-btn"
              onClick={() => onNavigate('leagues')}
              title="Configure Leagues"
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition rounded-lg"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* League Standings Table */}
        {leagues.length === 0 ? (
          <div className="py-12 text-center text-slate-400 dark:text-slate-500">
            <Trophy className="w-12 h-12 mx-auto mb-3 stroke-1 text-slate-300 dark:text-slate-700 text-emerald-500" />
            <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">No active leagues or tournaments</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto px-4">Clear to get a clean slate, then register your own local leagues, clubs, matches and lineups.</p>
            <button
              onClick={() => onNavigate('leagues')}
              className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-2 rounded-xl transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" /> Create League
            </button>
          </div>
        ) : sortedStandings.length === 0 ? (
          <div className="py-12 text-center text-slate-400 dark:text-slate-500">
            <Award className="w-12 h-12 mx-auto mb-3 stroke-1 text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-semibold">No standings registered for this league</p>
            <p className="text-xs text-slate-400 mt-1">Configure teams and enter matches in the Leagues tab</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed sm:table-auto">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-950/20 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider border-b border-slate-100/60 dark:border-slate-800/40">
                  <th className="py-2.5 px-1 text-center w-7 sm:w-12">#</th>
                  <th className="py-2.5 px-2 text-left">Team</th>
                  <th className="py-2.5 px-1 text-center w-8 sm:w-12">P</th>
                  <th className="py-2.5 px-1 text-center w-8 sm:w-12">W</th>
                  <th className="py-2.5 px-1 text-center w-8 sm:w-12">D</th>
                  <th className="py-2.5 px-1 text-center w-8 sm:w-12">L</th>
                  <th className="py-2.5 px-1 text-center w-10 sm:w-14">GD</th>
                  <th className="py-2.5 px-1.5 text-center w-11 sm:w-16 text-slate-800 dark:text-slate-200">
                    PTS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
                {sortedStandings.map((team, idx) => {
                  const rank = idx + 1;
                  const gd = team.goalsFor - team.goalsAgainst;
                  const isPromotion = rank === 1;
                  // Wahala / Relegation is the bottom 4 places in this 8-team Captain's League layout
                  const isWahala = rank >= 5;
                  const isSelected = comparedTeamIds.includes(team.id);

                  return (
                    <tr 
                      key={team.id}
                      onClick={() => handleTeamRowClick(team.id)}
                      className={`group transition cursor-pointer select-none text-xs sm:text-sm ${
                        isPromotion 
                          ? 'bg-emerald-500/[0.04] dark:bg-emerald-500/[0.02] hover:bg-emerald-500/[0.08] dark:hover:bg-emerald-500/[0.04]' 
                          : isWahala 
                          ? 'bg-rose-500/[0.04] dark:bg-rose-500/[0.02] hover:bg-rose-500/[0.08] dark:hover:bg-rose-500/[0.04]' 
                          : 'hover:bg-slate-50/50 dark:hover:bg-slate-950/40'
                      } ${isSelected ? 'ring-2 ring-inset ring-emerald-550/40 bg-emerald-500/[0.06]' : ''}`}
                    >
                      {/* Rank Column */}
                      <td className="py-2.5 px-1 text-center font-black text-slate-800 dark:text-slate-200">
                        {rank}
                      </td>

                      {/* Team Name with Custom Bullet */}
                      <td className="py-2.5 px-2 font-black text-slate-900 dark:text-slate-100 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
                          <span className={`w-2 h-2 rounded-full ${getBulletColor(team.name)} shrink-0 shadow-xs`} />
                          <span className="truncate max-w-[80px] xs:max-w-[120px] sm:max-w-none group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-150">
                            {team.name}
                          </span>
                        </div>
                      </td>

                      {/* Played, Won, Drawn, Lost */}
                      <td className="py-2.5 px-1 text-center font-bold text-slate-700 dark:text-slate-300">
                        {team.played}
                      </td>
                      <td className="py-2.5 px-1 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {team.won}
                      </td>
                      <td className="py-2.5 px-1 text-center font-bold text-slate-600 dark:text-slate-400">
                        {team.drawn}
                      </td>
                      <td className="py-2.5 px-1 text-center font-bold text-rose-600 dark:text-rose-400">
                        {team.lost}
                      </td>

                      {/* GD */}
                      <td className={`py-2.5 px-1 text-center font-bold font-mono ${
                        gd > 0 ? 'text-emerald-600 dark:text-emerald-400' : gd < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'
                      }`}>
                        {gd > 0 ? `+${gd}` : gd}
                      </td>

                      {/* PTS with circle highlights */}
                      <td className="py-2.5 px-1.5 text-center">
                        <div className="flex items-center justify-center">
                          <span className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-black font-mono text-[10px] sm:text-xs text-white shadow-xs ${
                            isWahala ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}>
                            {team.points}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend Footer */}
        <div className="p-4 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-50 dark:border-slate-800 text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-bold flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block" />
              <span>Promotion</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-rose-500 rounded-full inline-block" />
              <span>Wahala</span>
            </div>
          </div>
          <div>
            {comparedTeamIds.length > 0 ? (
              <button 
                onClick={() => setComparedTeamIds([])}
                className="text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Clear comparison ({comparedTeamIds.length} selected)
              </button>
            ) : (
              <span>Tap rows to compare teams</span>
            )}
          </div>
        </div>
      </div>

      {/* Head to Head Comparison Interactive Drawer */}
      {comparedTeams.length === 2 && (
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-550 animate-pulse" />
              <h4 className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-400 tracking-wider font-mono">
                Head-to-Head Comparison
              </h4>
            </div>
            <button 
              onClick={() => setComparedTeamIds([])}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-3 items-center gap-2 text-center text-xs md:text-sm">
            {/* Team 1 */}
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${getBulletColor(comparedTeams[0].name)}`} />
                <span className="font-extrabold text-slate-900 dark:text-white truncate max-w-[120px]">
                  {comparedTeams[0].name}
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-500">Rank #{sortedStandings.indexOf(comparedTeams[0]) + 1}</p>
            </div>

            {/* Vs Badge */}
            <div className="flex items-center justify-center">
              <span className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                VS
              </span>
            </div>

            {/* Team 2 */}
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${getBulletColor(comparedTeams[1].name)}`} />
                <span className="font-extrabold text-slate-900 dark:text-white truncate max-w-[120px]">
                  {comparedTeams[1].name}
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-500">Rank #{sortedStandings.indexOf(comparedTeams[1]) + 1}</p>
            </div>
          </div>

          {/* Stats Breakdown comparison bars */}
          <div className="space-y-3 mt-4">
            {[
              { label: 'Points', key: 'points', val1: comparedTeams[0].points, val2: comparedTeams[1].points },
              { label: 'Wins', key: 'won', val1: comparedTeams[0].won, val2: comparedTeams[1].won },
              { label: 'Draws', key: 'drawn', val1: comparedTeams[0].drawn, val2: comparedTeams[1].drawn },
              { label: 'Losses', key: 'lost', val1: comparedTeams[0].lost, val2: comparedTeams[1].lost },
              { label: 'Goals For', key: 'goalsFor', val1: comparedTeams[0].goalsFor, val2: comparedTeams[1].goalsFor },
              { label: 'Goal Diff', key: 'gd', val1: comparedTeams[0].goalsFor - comparedTeams[0].goalsAgainst, val2: comparedTeams[1].goalsFor - comparedTeams[1].goalsAgainst }
            ].map(stat => {
              const maxVal = Math.max(Math.abs(stat.val1), Math.abs(stat.val2), 1);
              const p1Pct = Math.max(10, Math.round((Math.abs(stat.val1) / maxVal) * 100));
              const p2Pct = Math.max(10, Math.round((Math.abs(stat.val2) / maxVal) * 100));

              return (
                <div key={stat.label} className="space-y-1 text-xs">
                  <div className="flex justify-between font-bold text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs">
                    <span>{stat.val1}</span>
                    <span className="uppercase tracking-wider text-[10px] text-slate-400 font-black">{stat.label}</span>
                    <span>{stat.val2}</span>
                  </div>
                  <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-950 border dark:border-slate-800">
                    {/* Team 1 bar */}
                    <div className="w-1/2 flex justify-end">
                      <div 
                        className={`h-full rounded-l-full ${stat.val1 >= stat.val2 ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                        style={{ width: `${p1Pct}%` }}
                      />
                    </div>
                    {/* Team 2 bar */}
                    <div className="w-1/2 flex justify-start">
                      <div 
                        className={`h-full rounded-r-full ${stat.val2 >= stat.val1 ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                        style={{ width: `${p2Pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Sessions Section */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4" id="upcoming-sessions-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
              Upcoming Sessions
            </h3>
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black px-2 py-0.5 rounded-md font-mono">
              {upcomingSessions.length}
            </span>
          </div>
          <button 
            id="view-sessions-link"
            onClick={() => onNavigate('sessions')}
            className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 cursor-pointer flex items-center gap-1"
          >
            View all <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3">
          {upcomingSessions.length === 0 ? (
            <div className="py-8 text-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 flex flex-col items-center">
              <Calendar className="w-6 h-6 text-slate-300 dark:text-slate-700" />
            </div>
          ) : (
            upcomingSessions.slice(0, 5).map((session) => {
              const { month, day } = getFormattedDateParts(session.date);
              
              // Dynamic attendance metrics
              const sessionRecords = attendance.filter(a => a.sessionId === session.id);
              const presentCount = sessionRecords.filter(r => r.status === 'Present').length;
              const excusedCount = sessionRecords.filter(r => r.status === 'Excused').length;
              const hasAttendance = sessionRecords.length > 0;

              return (
                <div 
                  key={session.id} 
                  onClick={() => handleOpenAttendance(session)}
                  className="p-3.5 bg-slate-50/50 dark:bg-slate-950/20 hover:bg-slate-100/50 dark:hover:bg-slate-950/60 rounded-2xl border border-slate-100/60 dark:border-slate-800/40 transition-all duration-200 flex items-center justify-between group cursor-pointer"
                  title="Click to take attendance register directly"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Rounded Date Block */}
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex flex-col items-center justify-center shrink-0 border border-slate-200/40 dark:border-slate-750">
                      <span className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                        {month}
                      </span>
                      <span className="text-base font-black text-slate-800 dark:text-slate-200 mt-0.5 leading-none">
                        {day}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs sm:text-sm truncate">
                          {session.title}
                        </h4>
                        <span className={`text-[9px] font-black tracking-wide px-1.5 py-0.5 rounded ${
                          session.type === 'League Match'
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30'
                            : 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border border-orange-100/50 dark:border-orange-900/30'
                        }`}>
                          {session.type === 'League Match' ? 'Official' : 'Friendly'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-y-1 gap-x-2 text-[10px] sm:text-xs text-slate-400 dark:text-slate-500">
                        {/* Session Time */}
                        <span className="font-mono flex items-center gap-1 font-semibold text-slate-500 dark:text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {session.time}
                        </span>

                        <span className="text-slate-200 dark:text-slate-800">•</span>

                        {/* Location */}
                        <span className="flex items-center gap-1 max-w-[120px] sm:max-w-[160px] truncate">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{session.location}</span>
                        </span>

                        <span className="text-slate-200 dark:text-slate-800">•</span>

                        {/* Attendance Statistics */}
                        {hasAttendance ? (
                          <div className="flex items-center gap-1.5">
                            <span className="flex items-center gap-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>{presentCount} Confirmed</span>
                            </span>
                            {excusedCount > 0 && (
                              <span className="flex items-center gap-0.5 font-semibold text-amber-500 dark:text-amber-400">
                                <UserX className="w-3.5 h-3.5" />
                                <span>{excusedCount} Excused</span>
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 font-semibold text-slate-400 dark:text-slate-500">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>Roster ({players.length})</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 pl-2">
                    <span className="text-[10px] bg-emerald-550/10 text-emerald-550 dark:text-emerald-400 font-extrabold px-2.5 py-1 rounded-lg group-hover:bg-emerald-550 group-hover:text-white transition duration-200 shadow-xs">
                      Take Register
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Dynamic Attendance-Taking Popup Modal */}
      {attendanceSession && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="dashboard-attendance-modal">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-950 p-5 text-white flex justify-between items-start relative border-b border-slate-800">
              <div className="space-y-1 pr-6">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">
                    {attendanceSession.type}
                  </span>
                  <span className="text-[9px] font-mono font-semibold text-slate-400">
                    {attendanceSession.date} @ {attendanceSession.time}
                  </span>
                </div>
                <h3 className="text-base font-black text-white">{attendanceSession.title}</h3>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {attendanceSession.location}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAttendanceSession(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900 transition shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Active Roster */}
            <div className="p-5 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-950/40 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-555" />
                  Active Squad Register
                </h4>
                <span className="text-[10px] font-semibold text-slate-400">
                  {players.filter(p => p.status === 'Active').length} Players Available
                </span>
              </div>

              {/* Search and Quick Register */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search roster or type name to register unregistered player..."
                  value={searchPlayerQuery}
                  onChange={(e) => setSearchPlayerQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-emerald-550 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs"
                />
              </div>

              <div className="space-y-2.5">
                {/* Unregistered Player Card */}
                {(() => {
                  const cleanQuery = searchPlayerQuery.trim();
                  const hasExactMatch = cleanQuery.length > 0 && players.filter(p => p.status === 'Active').some(p => p.name.toLowerCase() === cleanQuery.toLowerCase());
                  
                  if (cleanQuery && !hasExactMatch && onAddPlayer) {
                    return (
                      <div className="p-3 bg-emerald-500/10 dark:bg-emerald-950/20 border border-dashed border-emerald-500/30 rounded-xl flex items-center justify-between gap-3 animate-in fade-in duration-200">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0 uppercase tracking-wider">
                            New
                          </span>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase border shadow-2xs select-none shrink-0 ${getInitialsColor(cleanQuery)}`}>
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
                          type="button"
                          onClick={() => handleQuickRegisterAndPresent(cleanQuery)}
                          className="shrink-0 text-[10px] px-3 py-1.5 bg-emerald-555 hover:bg-emerald-600 text-white rounded-lg font-bold uppercase tracking-wider transition cursor-pointer shadow-xs active:scale-95"
                        >
                          Register & Mark In
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}

                {(() => {
                  const activePlayers = players.filter(p => p.status === 'Active');
                  const filteredPlayers = activePlayers.filter(p =>
                    p.name.toLowerCase().includes(searchPlayerQuery.toLowerCase())
                  );

                  if (activePlayers.length === 0) {
                    return (
                      <p className="text-xs text-slate-500 italic text-center py-6">
                        No active players on roster. Go to Players tab or type a name above to add team members.
                      </p>
                    );
                  }

                  if (filteredPlayers.length === 0) {
                    return (
                      <p className="text-xs text-slate-500 italic text-center py-6">
                        No roster players match your search.
                      </p>
                    );
                  }

                  return filteredPlayers.map(player => {
                    const pState = sessionAttendance[player.id] || { status: 'Absent', notes: '' };
                    
                    return (
                      <div 
                        key={player.id} 
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border transition ${
                          pState.status === 'Present' ? 'border-emerald-100 dark:border-emerald-950/60 hover:border-emerald-200' :
                          pState.status === 'Absent' ? 'border-red-100 dark:border-red-950/60 hover:border-red-200' :
                          'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        {/* Player Info */}
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs uppercase border shadow-xs select-none ${getInitialsColor(player.name)}`}>
                            {player.name.charAt(0)}
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                              <span>{player.name}</span>
                              {player.annualDuePaid && <span className="text-[11px] shrink-0" title="Annual Due Paid">✅</span>}
                              {player.volunteeredToCook && <span className="text-[11px] shrink-0" title="Volunteered to Cook">🍲 🍗</span>}
                              {player.endOfYearPartyAttendee && <span className="text-[11px] shrink-0" title="End of Year Party Attendee">🎉</span>}
                            </h5>
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex flex-wrap items-center gap-3 justify-between sm:justify-end">
                          {/* In/Out Segmented Button Group with motion for scale pop */}
                          <div className="flex bg-slate-100 dark:bg-slate-950 p-0.5 rounded-xl border border-slate-205 dark:border-slate-800 items-center shrink-0">
                            <motion.button
                              whileTap={{ scale: 0.92 }}
                              whileHover={{ scale: 1.02 }}
                              type="button"
                              onClick={() => handleStatusChange(player.id, 'Present')}
                              className={`flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg font-black tracking-wider uppercase transition-all duration-150 cursor-pointer ${
                                pState.status === 'Present' 
                                  ? 'bg-emerald-550 text-white shadow-xs shadow-emerald-500/10' 
                                  : 'text-slate-400 dark:text-slate-500 hover:text-emerald-550 hover:bg-emerald-550/5'
                              }`}
                              title="Mark Present"
                            >
                              <Check className="w-3 h-3 stroke-[3.5]" />
                              <span>IN</span>
                            </motion.button>
                            <motion.button
                              whileTap={{ scale: 0.92 }}
                              whileHover={{ scale: 1.02 }}
                              type="button"
                              onClick={() => handleStatusChange(player.id, 'Absent')}
                              className={`flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg font-black tracking-wider uppercase transition-all duration-150 cursor-pointer ${
                                pState.status !== 'Present' 
                                  ? 'bg-rose-500 text-white shadow-xs shadow-rose-500/10' 
                                  : 'text-slate-400 dark:text-slate-500 hover:text-rose-500 hover:bg-rose-500/5'
                              }`}
                              title="Mark Absent"
                            >
                              <X className="w-3 h-3 stroke-[3.5]" />
                              <span>OUT</span>
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
              <div className="flex flex-wrap justify-center sm:justify-start gap-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 items-center">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Present: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{Object.keys(sessionAttendance).filter(id => sessionAttendance[id].status === 'Present').length}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Absent: <strong className="text-red-500 dark:text-red-400 font-mono">{Object.keys(sessionAttendance).filter(id => sessionAttendance[id].status === 'Absent').length}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  Excused: <strong className="text-slate-500 dark:text-slate-300 font-mono">{Object.keys(sessionAttendance).filter(id => sessionAttendance[id].status === 'Excused').length}</strong>
                </span>
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-500/10 px-2 py-0.5 rounded-md text-[9px] uppercase tracking-wider animate-pulse shrink-0">
                  ✓ Auto-saved
                </span>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setAttendanceSession(null)}
                  className="flex-1 sm:flex-initial text-xs font-black text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-5 py-2.5 border border-slate-200 dark:border-slate-850 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Close Register
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Clear All Data Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-red-100 dark:bg-red-950/30 text-red-600 rounded-full shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="text-lg font-black text-slate-950 dark:text-slate-50 leading-tight">
                  Clear All Test Data?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                  Are you sure you want to delete <span className="font-bold text-slate-800 dark:text-slate-200">ALL</span> players, leagues, sessions, matches, and histories? This will give you an empty clean slate and cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                id="confirm-clear-data-btn"
                onClick={() => {
                  if (onClearAllData) {
                    onClearAllData();
                  }
                  setShowClearConfirm(false);
                }}
                className="w-full sm:flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl transition cursor-pointer shadow-sm active:scale-95"
              >
                Confirm Delete
              </button>
              <button
                id="cancel-clear-data-btn"
                onClick={() => setShowClearConfirm(false)}
                className="w-full sm:flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-xs font-black rounded-xl transition cursor-pointer active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
