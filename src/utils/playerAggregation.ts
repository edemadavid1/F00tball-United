import { normalizeDateToISO } from './dateUtils';
import { normalizePlayerName } from './nameUtils';
import { Player, LeagueMatch } from '../types';
import { OFFICIAL_PLAYER_STANDINGS } from '../data/officialPlayerStandings';

export function parseTolerantDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const trimmed = String(dateStr).trim();
  const dmyRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
  const match = trimmed.match(dmyRegex);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d;
  return null;
}

export function getStartOfDayTimestamp(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export const MIN_DATE_TIMESTAMP = new Date(2026, 1, 14).getTime(); // Feb 14, 2026
export const MAX_DATE_TIMESTAMP = new Date(2026, 11, 31).getTime(); // Dec 31, 2026

export const isCaptainsLeagueIdLocal = (id: string) => {
  if (!id) return false;
  const norm = String(id).toLowerCase().replace(/['’]/g, '').trim();
  return norm === 'l-3' || norm === 'l-captain' || norm === 'captains_league' || norm === "captain's league" || norm === "captains league" || norm.includes('captain') || norm === '1' || norm === 'l-1';
};

/**
 * Pure, non-mutating function that generates player standings dynamically 
 * derived 100% from raw Match Details cards.
 */
export function generatePlayerStandingsFromMatches(
  customMatches?: LeagueMatch[],
  customPlayers?: Player[],
  leagueId?: string,
  customSessions?: any[],
  customAttendance?: any[]
) {
  const matches: LeagueMatch[] = (customMatches && customMatches.length > 0) ? customMatches : JSON.parse(localStorage.getItem('gameon_matches') || '[]');
  const players: Player[] = (customPlayers && customPlayers.length > 0) ? customPlayers : JSON.parse(localStorage.getItem('gameon_players') || '[]');
  const sessions: any[] = (customSessions && customSessions.length > 0) ? customSessions : JSON.parse(localStorage.getItem('gameon_sessions') || '[]');
  const attendance: any[] = (customAttendance && customAttendance.length > 0) ? customAttendance : JSON.parse(localStorage.getItem('gameon_attendance') || '[]');

  console.log(`⚡ [DYNAMIC AGGREGATION ENGINE]: Recalculating player standings from ${matches.length} matches for league ${leagueId || 'All'}...`);

  const playerMap = new Map<string, Player>();

  // 1. Identify and normalise Jerry canonical profile
  let canonicalJerry: Player | null = players.find(p => p && p.name && p.name.toLowerCase() === 'jerry') || null;
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
      const cleanPlayer: Player = {
        ...p,
        name: normName
      };
      playerMap.set(p.id.toLowerCase(), cleanPlayer);
      playerMap.set(key, cleanPlayer);
    }
  });

  const findPlayerInMap = (identifier: string) => {
    if (!identifier) return null;
    const cleanId = String(identifier).trim().toLowerCase();
    if (cleanId.includes('jerry')) {
      return playerMap.get('jerry') || null;
    }
    if (playerMap.has(cleanId)) {
      return playerMap.get(cleanId)!;
    }
    const norm = normalizePlayerName(identifier).toLowerCase();
    if (norm.includes('jerry')) {
      return playerMap.get('jerry') || null;
    }
    if (playerMap.has(norm)) {
      return playerMap.get(norm)!;
    }
    for (const p of playerMap.values()) {
      if (p.id.toLowerCase() === cleanId) return p;
      if (normalizePlayerName(p.name).toLowerCase() === norm) return p;
    }
    return null;
  };

  const getOrCreatePlayerInMap = (identifier: string, defaultName?: string) => {
    const found = findPlayerInMap(identifier);
    if (found) return found;
    const cleanName = normalizePlayerName(defaultName || identifier || "Unknown Player");
    const key = cleanName.toLowerCase();
    if (key.includes('jerry') || String(identifier).toLowerCase().includes('jerry')) {
      return playerMap.get('jerry')!;
    }

    const newId = identifier || `p-discovered-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const newPlayer: Player = {
      id: newId,
      name: cleanName,
      position: "Player",
      status: 'Active',
      joinDate: '2026-02-14'
    };
    playerMap.set(newId.toLowerCase(), newPlayer);
    playerMap.set(key, newPlayer);
    return newPlayer;
  };

  // Pre-discover players in matches
  matches.forEach(match => {
    if (match) {
      if (match.goals) {
        match.goals.forEach(g => {
          if (g) {
            getOrCreatePlayerInMap(g.playerId || g.playerName, g.playerName);
          }
        });
      }
      const matchAny = match as any;
      const matchSession = sessions.find(s => s.matchId === match.id || s.id === match.id);
      const homeSquad = (match.homeRoster || match.homeSquad || matchAny.homeRoster || matchAny.homeSquad || (matchSession && matchSession.homeRoster) || []) as any[];
      const awaySquad = (match.awayRoster || match.awaySquad || matchAny.awayRoster || matchAny.awaySquad || (matchSession && matchSession.awayRoster) || []) as any[];
      const squads = [...homeSquad, ...awaySquad];
      squads.forEach(pId => {
        if (pId) {
          getOrCreatePlayerInMap(String(pId));
        }
      });
      if (match.status === 'Played' && (match.potdWinner || match.playerOfMatch)) {
        const parts = (match.potdWinner || match.playerOfMatch || '').split(/&|and|,|\//);
        parts.forEach(part => {
          const pom = part.trim();
          if (pom) {
            getOrCreatePlayerInMap(pom);
          }
        });
      }
    }
  });

  const uniquePlayersList = Array.from(new Set(playerMap.values()));

  // Build initial stats mapping for all unique players
  const statsMap = uniquePlayersList.reduce((acc, p) => {
    acc[p.id] = { played: 0, won: 0, drawn: 0, lost: 0, points: 0, goals: 0, potd: 0 };
    return acc;
  }, {} as Record<string, { played: number, won: number, drawn: number, lost: number, points: number, goals: number, potd: number }>);

  matches.forEach(match => {
    if (!match) return;

    const parsedDate = parseTolerantDate(match.date || '');
    if (!parsedDate) return;
    const matchTimestamp = getStartOfDayTimestamp(parsedDate);

    // Purely aggregate for matches on or after start bound
    const isCaptains = leagueId && isCaptainsLeagueIdLocal(leagueId);
    const startBound = new Date(2026, 1, 14).getTime();

    if (leagueId) {
      const matchesBelong = isCaptains
        ? (!match.leagueId || isCaptainsLeagueIdLocal(match.leagueId) || match.type === 'Friendly Match')
        : (!match.leagueId || match.leagueId === leagueId || match.type === 'Friendly Match');
      if (!matchesBelong) return;
    }

    // Enforce official record start bound (14 February 2026) for matches, goals, and POTD awards
    if (matchTimestamp < startBound) return;

    // Process goals (From 14 February 2026 onwards)
    const goalsList = match.goals || [];
    goalsList.forEach(g => {
      if (g) {
        const p = findPlayerInMap(g.playerId) || findPlayerInMap(g.playerName);
        if (p) {
          if (!statsMap[p.id]) {
            statsMap[p.id] = { played: 0, won: 0, drawn: 0, lost: 0, points: 0, goals: 0, potd: 0 };
          }
          statsMap[p.id].goals += 1;
        }
      }
    });

    // Process POTD / MVP Award (From 14 February 2026 onwards)
    const pomValue = match.potdWinner || match.playerOfMatch || '';
    if (pomValue) {
      const parts = pomValue.split(/&|and|,|\//);
      parts.forEach(part => {
        const pom = part.trim();
        if (pom) {
          const p = findPlayerInMap(pom);
          if (p) {
            if (!statsMap[p.id]) {
              statsMap[p.id] = { played: 0, won: 0, drawn: 0, lost: 0, points: 0, goals: 0, potd: 0 };
            }
            statsMap[p.id].potd += 1;
          }
        }
      });
    }

    const matchAny = match as any;
    const matchSession = sessions.find(s => s.matchId === match.id || s.id === match.id);
    let homeSquad = (match.homeRoster || match.homeSquad || matchAny.homeRoster || matchAny.homeSquad || (matchSession && matchSession.homeRoster) || []) as any[];
    let awaySquad = (match.awayRoster || match.awaySquad || matchAny.awayRoster || matchAny.awaySquad || (matchSession && matchSession.awayRoster) || []) as any[];

    if (matchSession) {
      const presentPlayerRecords = attendance.filter((a: any) => a.sessionId === matchSession.id && a.status === 'Present');
      if (presentPlayerRecords.length > 0) {
        const presentIds = new Set(presentPlayerRecords.map((a: any) => String(a.playerId).toLowerCase()));
        if (homeSquad.length > 0 || awaySquad.length > 0) {
          homeSquad = homeSquad.filter(id => {
            const pObj = findPlayerInMap(String(id));
            const normId = pObj ? pObj.id.toLowerCase() : String(id).toLowerCase();
            return presentIds.has(normId);
          });
          awaySquad = awaySquad.filter(id => {
            const pObj = findPlayerInMap(String(id));
            const normId = pObj ? pObj.id.toLowerCase() : String(id).toLowerCase();
            return presentIds.has(normId);
          });
        } else {
          const presentIdsList = Array.from(new Set(presentPlayerRecords.map((a: any) => a.playerId)));
          homeSquad = [...presentIdsList];
          awaySquad = [...presentIdsList];
        }
      }
    }

    // Process played match results (wins, draws, losses)
    const hScoreVal = match.homeScore !== undefined && match.homeScore !== null ? parseInt(match.homeScore as any, 10) : null;
    const aScoreVal = match.awayScore !== undefined && match.awayScore !== null ? parseInt(match.awayScore as any, 10) : null;
    const hasScores = hScoreVal !== null && !isNaN(hScoreVal) && aScoreVal !== null && !isNaN(aScoreVal);

    const isMatchPlayed = (match.status === 'Played' || hasScores) && (homeSquad.length > 0 && awaySquad.length > 0);
    if (isMatchPlayed) {
      const hScore = hScoreVal !== null && !isNaN(hScoreVal) ? hScoreVal : 0;
      const aScore = aScoreVal !== null && !isNaN(aScoreVal) ? aScoreVal : 0;

      let homeResult: 'w' | 'd' | 'l' = 'd';
      let awayResult: 'w' | 'd' | 'l' = 'd';
      if (hScore > aScore) {
        homeResult = 'w';
        awayResult = 'l';
      } else if (hScore < aScore) {
        homeResult = 'l';
        awayResult = 'w';
      }

      const uniqueHome = Array.from(new Set(homeSquad.map(id => String(id))));
      const uniqueAway = Array.from(new Set(awaySquad.map(id => String(id))));

      uniqueHome.forEach(pId => {
        const p = findPlayerInMap(String(pId));
        if (p) {
          if (!statsMap[p.id]) {
            statsMap[p.id] = { played: 0, won: 0, drawn: 0, lost: 0, points: 0, goals: 0, potd: 0 };
          }
          const cur = statsMap[p.id];
          statsMap[p.id] = {
            ...cur,
            played: cur.played + 1,
            won: cur.won + (homeResult === 'w' ? 1 : 0),
            drawn: cur.drawn + (homeResult === 'd' ? 1 : 0),
            lost: cur.lost + (homeResult === 'l' ? 1 : 0),
            points: cur.points + (homeResult === 'w' ? 3 : homeResult === 'd' ? 1 : 0)
          };
        }
      });

      uniqueAway.forEach(pId => {
        const p = findPlayerInMap(String(pId));
        if (p) {
          if (!statsMap[p.id]) {
            statsMap[p.id] = { played: 0, won: 0, drawn: 0, lost: 0, points: 0, goals: 0, potd: 0 };
          }
          const cur = statsMap[p.id];
          statsMap[p.id] = {
            ...cur,
            played: cur.played + 1,
            won: cur.won + (awayResult === 'w' ? 1 : 0),
            drawn: cur.drawn + (awayResult === 'd' ? 1 : 0),
            lost: cur.lost + (awayResult === 'l' ? 1 : 0),
            points: cur.points + (awayResult === 'w' ? 3 : awayResult === 'd' ? 1 : 0)
          };
        }
      });
    }
  });

  // Build official standings map for fast lookup
  const officialMap = new Map<string, typeof OFFICIAL_PLAYER_STANDINGS[0]>();
  OFFICIAL_PLAYER_STANDINGS.forEach(item => {
    const norm = normalizePlayerName(item.name).toLowerCase();
    officialMap.set(norm, item);
    officialMap.set(item.name.toLowerCase(), item);
  });

  const processedOfficialNames = new Set<string>();

  // Load player adjustments
  let savedAdjustments: Record<string, any> = {};
  try {
    const raw = localStorage.getItem('app_player_adjustments') || localStorage.getItem('gameon_player_adjustments');
    if (raw) savedAdjustments = JSON.parse(raw);
  } catch (e) {}

  const resultList = uniquePlayersList.map(player => {
    const localStats = statsMap[player.id] || { played: 0, won: 0, drawn: 0, lost: 0, points: 0, goals: 0, potd: 0 };
    const normName = normalizePlayerName(player.name).toLowerCase();
    const official = officialMap.get(normName) || officialMap.get(player.name.toLowerCase());

    if (official) {
      processedOfficialNames.add(official.name.toLowerCase());
      processedOfficialNames.add(normName);
    }

    // Use official stats as base when local calculated stats do not exceed official figures
    let played = official ? Math.max(official.pld, localStats.played) : localStats.played;
    let won = official && localStats.played <= official.pld ? official.w : localStats.won;
    let drawn = official && localStats.played <= official.pld ? official.d : localStats.drawn;
    let lost = official && localStats.played <= official.pld ? official.l : localStats.lost;
    let points = official && localStats.played <= official.pld ? official.pts : localStats.points;
    let ppg = official && localStats.played <= official.pld ? official.ppg : (played > 0 ? Number((points / played).toFixed(1)) : 0.0);
    let goals = localStats.goals;
    let potd = localStats.potd;

    const adj = savedAdjustments[normName] || savedAdjustments[player.name.toLowerCase()] || savedAdjustments[player.id.toLowerCase()];
    if (adj) {
      if (adj.played !== undefined && adj.played !== null) played = Number(adj.played);
      if (adj.won !== undefined && adj.won !== null) won = Number(adj.won);
      if (adj.drawn !== undefined && adj.drawn !== null) drawn = Number(adj.drawn);
      if (adj.lost !== undefined && adj.lost !== null) lost = Number(adj.lost);
      if (adj.points !== undefined && adj.points !== null) points = Number(adj.points);
      if (adj.goals !== undefined && adj.goals !== null) goals = Number(adj.goals);
      if (adj.potd !== undefined && adj.potd !== null) potd = Number(adj.potd);
      ppg = played > 0 ? Number((points / played).toFixed(1)) : 0.0;
    }

    return {
      player: { ...player },
      played,
      won,
      drawn,
      lost,
      points,
      ppg,
      goals,
      potd,
      calculated: { played, won, drawn, lost, points },
      adjustment: { played: 0, won: 0, drawn: 0, lost: 0, points: 0 }
    };
  });

  // Add any official standings players who were not in uniquePlayersList
  OFFICIAL_PLAYER_STANDINGS.forEach(off => {
    const norm = normalizePlayerName(off.name).toLowerCase();
    if (!processedOfficialNames.has(norm) && !processedOfficialNames.has(off.name.toLowerCase())) {
      let played = off.pld;
      let won = off.w;
      let drawn = off.d;
      let lost = off.l;
      let points = off.pts;
      let ppg = off.ppg;
      let goals = 0;
      let potd = 0;

      const adj = savedAdjustments[norm] || savedAdjustments[off.name.toLowerCase()];
      if (adj) {
        if (adj.played !== undefined && adj.played !== null) played = Number(adj.played);
        if (adj.won !== undefined && adj.won !== null) won = Number(adj.won);
        if (adj.drawn !== undefined && adj.drawn !== null) drawn = Number(adj.drawn);
        if (adj.lost !== undefined && adj.lost !== null) lost = Number(adj.lost);
        if (adj.points !== undefined && adj.points !== null) points = Number(adj.points);
        if (adj.goals !== undefined && adj.goals !== null) goals = Number(adj.goals);
        if (adj.potd !== undefined && adj.potd !== null) potd = Number(adj.potd);
        ppg = played > 0 ? Number((points / played).toFixed(1)) : 0.0;
      }

      resultList.push({
        player: {
          id: `p-official-${off.rank}`,
          name: off.name,
          position: 'Player',
          status: 'Active',
          joinDate: '2026-02-14'
        },
        played,
        won,
        drawn,
        lost,
        points,
        ppg,
        goals,
        potd,
        calculated: { played: off.pld, won: off.w, drawn: off.d, lost: off.l, points: off.pts },
        adjustment: { played: 0, won: 0, drawn: 0, lost: 0, points: 0 }
      });
    }
  });

  return resultList.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.ppg !== a.ppg) return b.ppg - a.ppg;
    if (b.won !== a.won) return b.won - a.won;
    if (b.played !== a.played) return b.played - a.played;
    return a.player.name.localeCompare(b.player.name);
  });
}

/**
 * Developer utility function window.verifyMatchToTableSync() that logs 
 * a breakdown showing each player's stats along with the exact Match Card IDs
 * that contributed to their record.
 */
export function verifyMatchToTableSync(
  customMatches?: LeagueMatch[],
  customPlayers?: Player[],
  leagueId?: string
) {
  const matches: LeagueMatch[] = customMatches || JSON.parse(localStorage.getItem('gameon_matches') || '[]');
  const players: Player[] = customPlayers || JSON.parse(localStorage.getItem('gameon_players') || '[]');

  console.group('🔍 [MATCH-TO-TABLE SYNC AUDIT VERIFICATION]');
  console.log(`Audited League ID: ${leagueId || 'All Leagues'}`);
  console.log(`Total Match Cards: ${matches.length}`);
  console.log(`Total Roster Players: ${players.length}`);

  // Generate standings
  const standings = generatePlayerStandingsFromMatches(matches, players, leagueId);

  standings.forEach(item => {
    const player = item.player;
    const playerIdLower = player.id.toLowerCase();
    const playerNameLower = player.name.toLowerCase();

    // Find contributing matches
    const contributingPlayedMatches: Array<{ id: string; desc: string; date: string; result: string }> = [];
    const contributingGoalsMatches: Array<{ id: string; goalsCount: number; date: string }> = [];
    const contributingPotdMatches: Array<{ id: string; date: string }> = [];

    matches.forEach(m => {
      if (!m) return;
      
      const parsedDate = parseTolerantDate(m.date || '');
      if (!parsedDate) return;
      const matchTimestamp = getStartOfDayTimestamp(parsedDate);

      // Filter by league start bound
      const isCaptains = leagueId && isCaptainsLeagueIdLocal(leagueId);
      const startBound = new Date(2026, 1, 14).getTime();

      if (matchTimestamp < startBound) return;

      if (leagueId) {
        const matchesBelong = isCaptains
          ? (!m.leagueId || isCaptainsLeagueIdLocal(m.leagueId) || m.type === 'Friendly Match')
          : (!m.leagueId || m.leagueId === leagueId || m.type === 'Friendly Match');
        if (!matchesBelong) return;
      }

      // Check Squad / Played (Check all property fallback lookups)
      const mAny = m as any;
      const homeSquad = (mAny.homeSquad || mAny.homeRoster || mAny.homePlayers || mAny.teamA || []) as any[];
      const awaySquad = (mAny.awaySquad || mAny.awayRoster || mAny.awayPlayers || mAny.teamB || []) as any[];
      
      const isHome = homeSquad.some(id => String(id).toLowerCase() === playerIdLower || normalizePlayerName(String(id)).toLowerCase() === playerNameLower);
      const isAway = awaySquad.some(id => String(id).toLowerCase() === playerIdLower || normalizePlayerName(String(id)).toLowerCase() === playerNameLower);

      if (isHome || isAway) {
        const hScoreVal = m.homeScore !== undefined && m.homeScore !== null ? parseInt(m.homeScore as any, 10) : null;
        const aScoreVal = m.awayScore !== undefined && m.awayScore !== null ? parseInt(m.awayScore as any, 10) : null;
        const hasScores = hScoreVal !== null && !isNaN(hScoreVal) && aScoreVal !== null && !isNaN(aScoreVal);

        const isMatchPlayed = (m.status === 'Played' || hasScores) && (homeSquad.length > 0 && awaySquad.length > 0);
        const hScore = hScoreVal !== null && !isNaN(hScoreVal) ? hScoreVal : 0;
        const aScore = aScoreVal !== null && !isNaN(aScoreVal) ? aScoreVal : 0;
        let resultStr = 'Scheduled';
        if (isMatchPlayed) {
          if (hScore === aScore) {
            resultStr = 'Draw';
          } else if ((hScore > aScore && isHome) || (aScore > hScore && isAway)) {
            resultStr = 'Win';
          } else {
            resultStr = 'Loss';
          }
        }
        contributingPlayedMatches.push({
          id: m.id,
          desc: `${m.homeTeam} (${hScore}) vs ${m.awayTeam} (${aScore})`,
          date: m.date,
          result: resultStr
        });
      }

      // Check Goals
      const pGoals = (m.goals || []).filter(g => {
        if (!g) return false;
        const gPlayerId = String(g.playerId || '').toLowerCase();
        const gPlayerName = String(g.playerName || '').toLowerCase();
        return gPlayerId === playerIdLower || gPlayerName === playerNameLower || normalizePlayerName(gPlayerName).toLowerCase() === playerNameLower;
      });
      if (pGoals.length > 0) {
        contributingGoalsMatches.push({
          id: m.id,
          goalsCount: pGoals.length,
          date: m.date
        });
      }

      // Check POTD
      const pomValue = m.potdWinner || m.playerOfMatch || '';
      if (pomValue) {
        const parts = pomValue.split(/&|and|,|\//).map(x => x.trim().toLowerCase());
        const isPom = parts.some(part => {
          return part === playerNameLower || part === playerIdLower || normalizePlayerName(part).toLowerCase() === playerNameLower;
        });
        if (isPom) {
          contributingPotdMatches.push({
            id: m.id,
            date: m.date
          });
        }
      }
    });

    console.group(`👤 Player: ${player.name} (ID: ${player.id})`);
    console.log(`📊 STATS SUMMARY:`);
    console.table({
      'Played (PLD)': item.played,
      'Wins (W)': item.won,
      'Draws (D)': item.drawn,
      'Losses (L)': item.lost,
      'Points (PTS)': item.points,
      'PPG': item.ppg,
      'Goals (G)': item.goals,
      'POTD / MVP': item.potd
    });

    if (contributingPlayedMatches.length > 0) {
      console.log('📋 Contributing Match Squads / Appearances:');
      console.table(contributingPlayedMatches);
    } else {
      console.log('⚪ No Contributing Match appearances found.');
    }

    if (contributingGoalsMatches.length > 0) {
      console.log('⚽ Contributing Goals Scored:');
      console.table(contributingGoalsMatches);
    }

    if (contributingPotdMatches.length > 0) {
      console.log('🏆 Contributing Player of the Day awards:');
      console.table(contributingPotdMatches);
    }

    console.groupEnd();
  });

  console.groupEnd();

  return standings;
}
