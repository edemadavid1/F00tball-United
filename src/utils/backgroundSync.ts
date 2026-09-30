import { getAccessToken } from './auth';
import { 
  findOrCreateSpreadsheet, 
  ensureSheetExists, 
  clearSheetRange, 
  writeSheetValues, 
  formatSafeSheetTitle,
  GoogleSpreadsheetInfo
} from './googleSheets';
import { Player, Session, AttendanceRecord, League } from '../types';

let syncTimeout: any = null;

// Background spreadsheet resolver from localStorage or API
const getSpreadsheetForCategoryBackground = async (
  currentToken: string, 
  categoryName: string
): Promise<GoogleSpreadsheetInfo> => {
  const savedSheets = localStorage.getItem('gameon_reporting_spreadsheets_by_category');
  let spreadsheets: Record<string, GoogleSpreadsheetInfo> = {};
  
  if (savedSheets) {
    try {
      spreadsheets = JSON.parse(savedSheets);
    } catch (e) {
      console.error('[Background Sync] Error parsing saved spreadsheets info:', e);
    }
  }

  if (spreadsheets[categoryName]) {
    return spreadsheets[categoryName];
  }

  // Not cached, search Drive or create
  const sheetInfo = await findOrCreateSpreadsheet(currentToken, categoryName);
  spreadsheets[categoryName] = sheetInfo;
  localStorage.setItem('gameon_reporting_spreadsheets_by_category', JSON.stringify(spreadsheets));
  return sheetInfo;
};

// Main background sync worker
export const syncSessionBackground = async (
  sessionId: string,
  players: Player[],
  sessions: Session[],
  attendance: AttendanceRecord[],
  leagues: League[]
): Promise<boolean> => {
  const currentToken = await getAccessToken();
  if (!currentToken) {
    console.log('[Background Sync] Skipping background sync: user not authenticated or token missing.');
    return false;
  }

  const session = sessions.find(s => s.id === sessionId);
  if (!session) {
    console.error(`[Background Sync] Session with ID ${sessionId} not found.`);
    return false;
  }

  try {
    const getSessionCategory = (s: Session): string => {
      if (s.type === 'League Match' && s.leagueId) {
        const lg = leagues.find(l => l.id === s.leagueId);
        if (lg && lg.name) {
          return lg.name;
        }
      }
      return 'Friendly Matches';
    };

    const categoryName = getSessionCategory(session);
    const activeSheet = await getSpreadsheetForCategoryBackground(currentToken, categoryName);

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
    
    // Save to locally synced session IDs to match what Reporting.tsx uses
    const savedSynced = localStorage.getItem('gameon_synced_sessions');
    let syncedIds: string[] = [];
    if (savedSynced) {
      try {
        syncedIds = JSON.parse(savedSynced);
      } catch (e) {}
    }
    if (!syncedIds.includes(sessionId)) {
      syncedIds.push(sessionId);
      localStorage.setItem('gameon_synced_sessions', JSON.stringify(syncedIds));
    }

    console.log(`[Background Sync] Session "${session.title}" synced successfully to "${categoryName}".`);
    return true;
  } catch (err) {
    console.error(`[Background Sync] Failed to background sync session "${session.title}":`, err);
    throw err;
  }
};

// Debounced wrapper
export const debouncedSyncSession = (
  sessionId: string,
  players: Player[],
  sessions: Session[],
  attendance: AttendanceRecord[],
  leagues: League[],
  onSyncStatusChange?: (status: 'idle' | 'syncing' | 'synced' | 'error') => void
) => {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  getAccessToken().then(token => {
    if (!token) {
      if (onSyncStatusChange) onSyncStatusChange('idle');
      return;
    }

    if (onSyncStatusChange) {
      onSyncStatusChange('syncing');
    }

    syncTimeout = setTimeout(async () => {
      try {
        const success = await syncSessionBackground(sessionId, players, sessions, attendance, leagues);
        if (onSyncStatusChange) {
          onSyncStatusChange(success ? 'synced' : 'idle');
        }
      } catch (e) {
        console.error('[Background Sync] Sync error in debounce timeout:', e);
        if (onSyncStatusChange) onSyncStatusChange('error');
      }
    }, 2000); // 2-second debounce
  });
};
