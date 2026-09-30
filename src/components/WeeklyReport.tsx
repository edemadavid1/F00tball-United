import React, { useState, useRef, useMemo } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  FileText, 
  Download, 
  Printer, 
  Calendar, 
  Trophy, 
  Users, 
  Award, 
  Flame, 
  ArrowLeft, 
  Check, 
  Share2, 
  ChevronDown,
  Sparkles,
  Filter
} from 'lucide-react';
import { Player, Session, AttendanceRecord, League, TeamStanding, LeagueMatch } from '../types';
import { generatePlayerStandingsFromMatches, isCaptainsLeagueIdLocal } from '../utils/playerAggregation';
import { normalizeDateToISO } from '../utils/dateUtils';
import { normalizePlayerName } from '../utils/nameUtils';

// Format alias map for report display names (matching PDF spec)
export const formatReportPlayerName = (rawName: string): string => {
  if (!rawName) return '';
  const norm = rawName.trim().toLowerCase();
  if (norm === 'jerry' || norm === 'onye army' || norm === 'onye army (jerry)') return 'Onye Army (Jerry)';
  if (norm === 'kennedy' || norm === 'cana' || norm === 'kennedy (cana)') return 'Kennedy (Cana)';
  if (norm === 'charles' || norm === 'kayviva' || norm === 'charles (kayviva)') return 'Charles (Kayviva)';
  if (norm === 'samson' || norm === 'shola' || norm === 'samson (shola)') return 'Samson (Shola)';
  return rawName;
};

interface WeeklyReportProps {
  players: Player[];
  sessions: Session[];
  attendance: AttendanceRecord[];
  leagues: League[];
  standings: Record<string, TeamStanding[]>;
  matches: LeagueMatch[];
  onNavigate?: (tab: string) => void;
}

export default function WeeklyReport({
  players = [],
  sessions = [],
  attendance = [],
  leagues = [],
  standings = {},
  matches = [],
  onNavigate
}: WeeklyReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>(() => {
    const captainsLg = leagues.find(l => isCaptainsLeagueIdLocal(l.id));
    return captainsLg ? captainsLg.id : (leagues[0]?.id || 'l-3');
  });

  // Date range filters
  const [startDateStr, setStartDateStr] = useState<string>('2026-02-14');
  const [endDateStr, setEndDateStr] = useState<string>('2026-06-27');

  // Filter played matches by date range
  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      if (!m || m.status !== 'Played') return false;
      if (!m.date) return true;
      const iso = normalizeDateToISO(m.date);
      if (!iso) return true;
      return iso >= startDateStr && iso <= endDateStr;
    });
  }, [matches, startDateStr, endDateStr]);

  // 1. CAPTAIN'S LEAGUE STANDINGS
  const captainsLeagueStandings = useMemo(() => {
    const activeLeague = leagues.find(l => l.id === selectedLeagueId) || leagues[0];
    const initialStandings = (activeLeague && standings[activeLeague.id]) || standings['l-3'] || [];

    // Map base teams
    const teamStatsMap = new Map<string, {
      name: string;
      played: number;
      won: number;
      drawn: number;
      lost: number;
      goalsFor: number;
      goalsAgainst: number;
      points: number;
    }>();

    // Initialize with existing teams if any
    initialStandings.forEach(t => {
      teamStatsMap.set(t.name.toUpperCase(), {
        name: t.name,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0
      });
    });

    // Calculate from played matches for this league
    const leagueMatches = filteredMatches.filter(m => 
      m.leagueId === selectedLeagueId || isCaptainsLeagueIdLocal(m.leagueId) || m.type === 'League Match'
    );

    leagueMatches.forEach(m => {
      if (m.homeScore === undefined || m.awayScore === undefined) return;
      const homeName = m.homeTeam ? m.homeTeam.toUpperCase() : 'HOME';
      const awayName = m.awayTeam ? m.awayTeam.toUpperCase() : 'AWAY';

      if (!teamStatsMap.has(homeName)) {
        teamStatsMap.set(homeName, { name: m.homeTeam, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
      }
      if (!teamStatsMap.has(awayName)) {
        teamStatsMap.set(awayName, { name: m.awayTeam, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
      }

      const h = teamStatsMap.get(homeName)!;
      const a = teamStatsMap.get(awayName)!;

      h.played += 1;
      a.played += 1;

      h.goalsFor += m.homeScore;
      h.goalsAgainst += m.awayScore;
      a.goalsFor += m.awayScore;
      a.goalsAgainst += m.homeScore;

      if (m.homeScore > m.awayScore) {
        h.won += 1;
        h.points += 3;
        a.lost += 1;
      } else if (m.homeScore < m.awayScore) {
        a.won += 1;
        a.points += 3;
        h.lost += 1;
      } else {
        h.drawn += 1;
        h.points += 1;
        a.drawn += 1;
        a.points += 1;
      }
    });

    const result = Array.from(teamStatsMap.values()).map(t => {
      const gd = t.goalsFor - t.goalsAgainst;
      const ppg = t.played > 0 ? (t.points / t.played) : 0;
      return { ...t, gd, ppg };
    });

    // Sort by Points desc, GD desc, GoalsFor desc, PPG desc
    result.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return b.ppg - a.ppg;
    });

    return result;
  }, [leagues, standings, selectedLeagueId, filteredMatches]);

  // 2. PLAYER LEAGUE STANDINGS
  const playerLeagueStandings = useMemo(() => {
    const rawPlayerStandings = generatePlayerStandingsFromMatches(
      filteredMatches,
      players,
      selectedLeagueId,
      sessions,
      attendance
    );

    return rawPlayerStandings.map(p => {
      const pName = p.player?.name || (p as any).name || 'Player';
      const pld = p.played ?? (p as any).pld ?? 0;
      const w = p.won ?? (p as any).w ?? 0;
      const d = p.drawn ?? (p as any).d ?? 0;
      const l = p.lost ?? (p as any).l ?? 0;
      const pts = p.points ?? (p as any).pts ?? 0;
      const ppg = p.ppg ?? 0;

      return {
        id: p.player?.id || (p as any).id || pName,
        name: pName,
        pld,
        w,
        d,
        l,
        pts,
        ppg,
        displayName: formatReportPlayerName(pName)
      };
    });
  }, [filteredMatches, players, selectedLeagueId, sessions, attendance]);

  // 3. MVP (AWARDS / POTD WINNERS)
  const mvpList = useMemo(() => {
    const awardsMap = new Map<string, { name: string; count: number }>();

    filteredMatches.forEach(m => {
      const potd = m.playerOfMatch || (m as any).potd_winner;
      if (potd && potd.trim()) {
        const rawName = potd.trim();
        const formatted = formatReportPlayerName(rawName);
        const normKey = formatted.toLowerCase();

        if (awardsMap.has(normKey)) {
          awardsMap.get(normKey)!.count += 1;
        } else {
          awardsMap.set(normKey, { name: formatted, count: 1 });
        }
      }
    });

    // Fallback/enrichment from player object awards if map is sparse
    if (awardsMap.size < 5) {
      players.forEach(p => {
        if ((p as any).potmAwards && (p as any).potmAwards > 0) {
          const formatted = formatReportPlayerName(p.name);
          const normKey = formatted.toLowerCase();
          if (!awardsMap.has(normKey)) {
            awardsMap.set(normKey, { name: formatted, count: (p as any).potmAwards });
          }
        }
      });
    }

    const list = Array.from(awardsMap.values());
    list.sort((a, b) => b.count - a.count);
    return list;
  }, [filteredMatches, players]);

  // 4. TOP SCORERS
  const topScorers = useMemo(() => {
    const goalsMap = new Map<string, { name: string; goals: number }>();

    filteredMatches.forEach(m => {
      if (m.goals && Array.isArray(m.goals)) {
        m.goals.forEach(g => {
          const rawName = g.playerName || g.playerId || '';
          if (rawName) {
            const formatted = formatReportPlayerName(rawName);
            const normKey = formatted.toLowerCase();
            if (goalsMap.has(normKey)) {
              goalsMap.get(normKey)!.goals += 1;
            } else {
              goalsMap.set(normKey, { name: formatted, goals: 1 });
            }
          }
        });
      }
    });

    // Fallback/enrichment from player stats
    if (goalsMap.size < 5) {
      players.forEach(p => {
        if ((p as any).goals && (p as any).goals > 0) {
          const formatted = formatReportPlayerName(p.name);
          const normKey = formatted.toLowerCase();
          if (!goalsMap.has(normKey)) {
            goalsMap.set(normKey, { name: formatted, goals: (p as any).goals });
          }
        }
      });
    }

    const list = Array.from(goalsMap.values());
    list.sort((a, b) => b.goals - a.goals);
    return list;
  }, [filteredMatches, players]);

  // Dynamic Date Range string
  const formattedDateRangeStr = useMemo(() => {
    const formatD = (dStr: string) => {
      try {
        const parts = dStr.split('-');
        if (parts.length === 3) {
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const day = parseInt(parts[2], 10);
          const month = months[parseInt(parts[1], 10) - 1];
          const year = parts[0];
          return `${day} ${month} ${year}`;
        }
      } catch (e) {
        // fallback
      }
      return dStr;
    };
    return `${formatD(startDateStr)} to ${formatD(endDateStr)}`;
  }, [startDateStr, endDateStr]);

  // Download PDF Handler
  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2.5, // Crisp retina quality
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth(); // 297mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 210mm

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Football_United_Weekly_League_Report_${startDateStr}_to_${endDateStr}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Unable to generate PDF. Please try using the Print option.');
    } finally {
      setIsExporting(false);
    }
  };

  // Browser Print Handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Controls Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('reporting')}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
              title="Back to Reports"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight">
                  Weekly League Report
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> PDF Export Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Exact weekly league capture including League Table, Player Standings, MVP awards, and Top Scorers.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-2 border border-slate-200/80 dark:border-slate-700 active:scale-95"
            >
              <Printer className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span>Print Report</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition cursor-pointer shadow-lg shadow-emerald-600/20 flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Generating PDF...' : 'Download PDF Report'}</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-4 text-xs font-bold text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-emerald-500" />
            <span>Date Range:</span>
            <input 
              type="date"
              value={startDateStr}
              onChange={(e) => setStartDateStr(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-900 dark:text-white"
            />
            <span>to</span>
            <input 
              type="date"
              value={endDateStr}
              onChange={(e) => setEndDateStr(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <span>League:</span>
            <select
              value={selectedLeagueId}
              onChange={(e) => setSelectedLeagueId(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-900 dark:text-white cursor-pointer"
            >
              {leagues.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* PRINTABLE / DISPLAY REPORT CANVAS */}
      <div className="overflow-x-auto pb-6">
        {/* Printable page container styled matching the exact A4 landscape screenshot */}
        <div 
          ref={reportRef}
          id="weekly-report-print-container"
          className="w-[1120px] bg-white text-slate-900 p-6 shadow-2xl mx-auto rounded-xl border border-slate-200 print:shadow-none print:border-none print:p-0 font-sans"
          style={{ minHeight: '780px' }}
        >
          {/* Top Banner Header */}
          <div className="bg-emerald-600 text-white px-6 py-3.5 rounded-t-lg flex items-center justify-between font-bold mb-4">
            <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
              Football United - Weekly League Report
            </h2>
            <div className="text-sm font-extrabold tracking-wide">
              {formattedDateRangeStr}
            </div>
          </div>

          {/* 3 Column Grid Layout */}
          <div className="grid grid-cols-12 gap-4 items-start">
            
            {/* LEFT COLUMN: LEAGUE TABLE & MVP (3.5 / 12 cols = ~30%) */}
            <div className="col-span-3 space-y-4">
              
              {/* LEAGUE TABLE */}
              <div>
                <div className="bg-emerald-700 text-white text-center py-1.5 font-black text-xs uppercase tracking-wider rounded-t-sm">
                  LEAGUE
                </div>
                <table className="w-full text-[10px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 font-extrabold text-slate-700 bg-slate-50">
                      <th className="py-1 px-1 text-left w-5">#</th>
                      <th className="py-1 px-1 text-left">Team</th>
                      <th className="py-1 px-1 text-center">P</th>
                      <th className="py-1 px-1 text-center">W</th>
                      <th className="py-1 px-1 text-center">D</th>
                      <th className="py-1 px-1 text-center">L</th>
                      <th className="py-1 px-1 text-center">GD</th>
                      <th className="py-1 px-1 text-center font-black">PTS</th>
                      <th className="py-1 px-1 text-center">PPG</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {captainsLeagueStandings.map((team, idx) => (
                      <tr key={team.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className="py-1 px-1 font-bold text-slate-900">{idx + 1}</td>
                        <td className="py-1 px-1 font-extrabold text-slate-950 uppercase truncate max-w-[80px]">{team.name}</td>
                        <td className="py-1 px-1 text-center">{team.played}</td>
                        <td className="py-1 px-1 text-center">{team.won}</td>
                        <td className="py-1 px-1 text-center">{team.drawn}</td>
                        <td className="py-1 px-1 text-center">{team.lost}</td>
                        <td className="py-1 px-1 text-center font-bold">{team.gd}</td>
                        <td className="py-1 px-1 text-center font-black text-slate-950">{team.points}</td>
                        <td className="py-1 px-1 text-center font-bold text-emerald-700">{team.ppg.toFixed(1)}</td>
                      </tr>
                    ))}
                    {captainsLeagueStandings.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-3 text-center text-slate-400 italic">No league data</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* MVP TABLE */}
              <div>
                <div className="bg-emerald-700 text-white text-center py-1.5 font-black text-xs uppercase tracking-wider rounded-t-sm">
                  MVP
                </div>
                <table className="w-full text-[10px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 font-extrabold text-slate-700 bg-slate-50">
                      <th className="py-1 px-1.5 text-left w-6">#</th>
                      <th className="py-1 px-1.5 text-left">Player</th>
                      <th className="py-1 px-1.5 text-right font-black">Awards</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {mvpList.slice(0, 16).map((item, idx) => (
                      <tr key={item.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className="py-1 px-1.5 font-bold text-slate-900">{idx + 1}</td>
                        <td className="py-1 px-1.5 font-bold text-slate-900 truncate max-w-[130px]">{item.name}</td>
                        <td className="py-1 px-1.5 text-right font-black text-slate-950">{item.count}</td>
                      </tr>
                    ))}
                    {mvpList.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-3 text-center text-slate-400 italic">No MVP records</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>

            {/* MIDDLE COLUMN: PLAYER LEAGUE (5.5 / 12 cols = ~45%) */}
            <div className="col-span-6">
              <div className="bg-emerald-700 text-white text-center py-1.5 font-black text-xs uppercase tracking-wider rounded-t-sm">
                PLAYER LEAGUE
              </div>
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 font-extrabold text-slate-700 bg-slate-50">
                    <th className="py-1 px-1.5 text-left w-6">#</th>
                    <th className="py-1 px-1.5 text-left">Player</th>
                    <th className="py-1 px-1 text-center">PLD</th>
                    <th className="py-1 px-1 text-center">W</th>
                    <th className="py-1 px-1 text-center">D</th>
                    <th className="py-1 px-1 text-center">L</th>
                    <th className="py-1 px-1 text-center font-black">PTS</th>
                    <th className="py-1 px-1 text-center font-bold">PPG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {playerLeagueStandings.map((player, idx) => (
                    <tr key={player.id || player.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                      <td className="py-1 px-1.5 font-bold text-slate-900">{idx + 1}</td>
                      <td className="py-1 px-1.5 font-extrabold text-slate-950 truncate max-w-[180px]">
                        {player.displayName}
                      </td>
                      <td className="py-1 px-1 text-center">{player.pld}</td>
                      <td className="py-1 px-1 text-center">{player.w}</td>
                      <td className="py-1 px-1 text-center">{player.d}</td>
                      <td className="py-1 px-1 text-center">{player.l}</td>
                      <td className="py-1 px-1 text-center font-black text-slate-950">{player.pts}</td>
                      <td className="py-1 px-1 text-center font-bold text-emerald-700">
                        {typeof player.ppg === 'number' ? player.ppg.toFixed(1) : player.ppg}
                      </td>
                    </tr>
                  ))}
                  {playerLeagueStandings.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-4 text-center text-slate-400 italic">No player standings data</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* RIGHT COLUMN: TOP SCORER (3 / 12 cols = ~25%) */}
            <div className="col-span-3">
              <div className="bg-emerald-700 text-white text-center py-1.5 font-black text-xs uppercase tracking-wider rounded-t-sm">
                TOP SCORER
              </div>
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 font-extrabold text-slate-700 bg-slate-50">
                    <th className="py-1 px-1.5 text-left w-6">#</th>
                    <th className="py-1 px-1.5 text-left">Player</th>
                    <th className="py-1 px-1.5 text-right font-black">Goals</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {topScorers.slice(0, 30).map((item, idx) => (
                    <tr key={item.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                      <td className="py-1 px-1.5 font-bold text-slate-900">{idx + 1}</td>
                      <td className="py-1 px-1.5 font-bold text-slate-900 truncate max-w-[130px]">{item.name}</td>
                      <td className="py-1 px-1.5 text-right font-black text-slate-950">{item.goals}</td>
                    </tr>
                  ))}
                  {topScorers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-3 text-center text-slate-400 italic">No goals recorded</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

          {/* Footer Bar */}
          <div className="mt-6 pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] font-semibold text-slate-500">
            <div>© Game On - Weekly League Report</div>
            <div>Generated: {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
