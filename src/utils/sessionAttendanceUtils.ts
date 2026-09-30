import { Player, Session, AttendanceRecord, LeagueMatch } from '../types';

/**
 * Determines whether a player is marked 'Present' for a given session or match.
 * Uses both attendance array records and session.attendance dictionary object.
 */
export function isPlayerPresentForSession(
  player: Player,
  session: Session | null | undefined,
  match: LeagueMatch | null | undefined,
  attendanceRecords: AttendanceRecord[] = []
): boolean {
  if (!player || player.status !== 'Active') return false;

  const sessionId = session?.id;
  const matchId = match?.id || session?.matchId;

  // 1. Filter attendance records for this session/match
  const matchingRecords = attendanceRecords.filter(a => {
    if (sessionId && (a.sessionId === sessionId || a.sessionId === `session-${sessionId}` || a.sessionId === `session_${sessionId}`)) return true;
    if (matchId && (a.sessionId === matchId || a.sessionId === `session-${matchId}` || a.sessionId === `session_${matchId}`)) return true;
    if (session?.date && match?.date && session.date === match.date) return true;
    return false;
  });

  const rec = matchingRecords.find(sa => 
    sa.playerId === player.id || 
    sa.playerId === player.name || 
    (player.name && sa.playerId.toLowerCase() === player.name.toLowerCase())
  );
  if (rec) {
    return rec.status === 'Present';
  }

  // 2. Check session.attendance dictionary
  if (session && (session as any).attendance && typeof (session as any).attendance === 'object') {
    const dict = (session as any).attendance;
    const val = dict[player.id] ?? dict[player.name] ?? (player.name ? dict[player.name.toLowerCase()] : undefined);
    if (val !== undefined && val !== null) {
      if (typeof val === 'string') return val.toLowerCase() === 'present';
      if (typeof val === 'object' && val.status) return String(val.status).toLowerCase() === 'present';
    }
  }

  // If attendance records or dictionary exist for this session, but player is NOT marked Present, they are Absent/unregistered!
  const hasAttendanceData = matchingRecords.length > 0 || (session && (session as any).attendance && Object.keys((session as any).attendance).length > 0);
  if (hasAttendanceData) {
    return false;
  }

  // Default fallback if no attendance has been recorded yet for this session: true
  return true;
}

/**
 * Returns ONLY players who are registered as 'Present' for the specified session or match.
 */
export function getPresentPlayersForSession(
  session: Session | null | undefined,
  match: LeagueMatch | null | undefined,
  attendanceRecords: AttendanceRecord[] = [],
  players: Player[] = []
): Player[] {
  const activePlayers = (players || []).filter(p => p && p.status === 'Active');
  if (!session && !match) return activePlayers.sort((a, b) => a.name.localeCompare(b.name));

  return activePlayers
    .filter(p => isPlayerPresentForSession(p, session, match, attendanceRecords))
    .sort((a, b) => a.name.localeCompare(b.name));
}
