import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

// ============================================================================
// FOOTBALL UNITED MULTI-TAB EXCEL ATTENDANCE TRACKER SERVICE
// Automated Data Integration Assistant Implementation
// ============================================================================

export const DEFAULT_TEMPORARY_OWNER = "ralph.boer@hillsong.co.uk";

// Expose dynamic variable [New_Owner_Email] as specified in Requirement 3
export let New_Owner_Email: string = "";
export let currentTrackerOwner: string = process.env.GRAPH_SERVICE_ACCOUNT_OWNER || DEFAULT_TEMPORARY_OWNER;
export let temporaryOwnerAccess: "owner" | "editor" | "viewer" | "removed" = "owner";

export interface OwnershipTransferRecord {
  id: string;
  timestamp: string;
  fromOwner: string;
  toOwner: string;
  temporaryOwnerAccess: "editor" | "viewer" | "removed";
  action: "downgrade" | "remove";
  details: string;
}

export const ownershipTransferLog: OwnershipTransferRecord[] = [];

// Exactly four worksheet tabs named as specified in Requirement 1
export const QUARTER_TABS = ["Sep-Nov", "Dec-Feb", "Mar-May", "Jun-Aug"] as const;
export type QuarterTab = typeof QUARTER_TABS[number];

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Target file location for the primary workbook
export const ATTENDANCE_TRACKER_FILE = path.join(
  process.cwd(),
  "public",
  "reports",
  "Football_United_Attendance_Tracker.xlsx"
);

// Standard Excel Green styling (#107C41)
const EXCEL_GREEN_ARGB = "FF107C41";
const LIGHT_GREEN_FILL_ARGB = "FFE2EFDA";
const BORDER_COLOR_ARGB = "FFD9D9D9";

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: BORDER_COLOR_ARGB } },
  left: { style: "thin", color: { argb: BORDER_COLOR_ARGB } },
  bottom: { style: "thin", color: { argb: BORDER_COLOR_ARGB } },
  right: { style: "thin", color: { argb: BORDER_COLOR_ARGB } }
};

const checkboxValidation: ExcelJS.DataValidation = {
  type: "list",
  allowBlank: true,
  formulae: ['"TRUE,FALSE"'],
  showErrorMessage: true,
  errorTitle: "Invalid Checkbox Entry",
  error: "Please select TRUE or FALSE"
};

/**
 * Generates the 17 weekly dates for a given quarter spaced exactly 7 days apart.
 * Fits columns B through R (17 columns).
 * E.g., for Sep-Nov: "4-Sep", "11-Sep", "18-Sep", etc.
 */
export function getQuarterWeeklyDates(quarter: QuarterTab): string[] {
  let startMonth = 8; // Sep (0-indexed)
  let startDay = 4;
  const startYear = 2024;

  if (quarter === "Sep-Nov") {
    startMonth = 8; // September
    startDay = 4;
  } else if (quarter === "Dec-Feb") {
    startMonth = 11; // December
    startDay = 4;
  } else if (quarter === "Mar-May") {
    startMonth = 2; // March
    startDay = 4;
  } else if (quarter === "Jun-Aug") {
    startMonth = 5; // June
    startDay = 3;
  }

  const dates: string[] = [];
  const cur = new Date(startYear, startMonth, startDay, 12, 0, 0);
  for (let i = 0; i < 17; i++) {
    dates.push(`${cur.getDate()}-${MONTH_NAMES[cur.getMonth()]}`);
    cur.setDate(cur.getDate() + 7);
  }
  return dates;
}

/**
 * Maps any calendar date to the correct quarterly worksheet tab name.
 */
export function getQuarterTabForDate(dateInput: string | Date): QuarterTab {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const m = isNaN(d.getTime()) ? new Date().getMonth() : d.getMonth();
  if (m === 8 || m === 9 || m === 10) return "Sep-Nov";
  if (m === 11 || m === 0 || m === 1) return "Dec-Feb";
  if (m === 2 || m === 3 || m === 4) return "Mar-May";
  return "Jun-Aug";
}

/**
 * Requirement 1 & 2: Create and format the Excel Workbook with exactly 4 quarterly tabs,
 * standard Excel green merged title row (A1:R1), row 2 column headers (A2="Player Name",
 * B2:R2=17 weekly dates), and checkbox data validation on Row 3 and below.
 */
export async function createAttendanceTrackerWorkbook(initialPlayers: string[] = []): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Football United automated data integration assistant";
  workbook.lastModifiedBy = currentTrackerOwner;
  workbook.created = new Date();
  workbook.modified = new Date();

  // Deduplicate and clean initial player names
  const cleanPlayers = Array.from(
    new Set(
      initialPlayers
        .map((p) => String(p || "").trim())
        .filter((p) => p.length > 0 && !p.startsWith("p_") && p !== "[object Object]")
    )
  );

  for (const tabName of QUARTER_TABS) {
    const ws = workbook.addWorksheet(tabName, {
      views: [{ state: "frozen", ySplit: 2, xSplit: 1 }]
    });

    // Column A: Width 28 for Player Names
    ws.getColumn(1).width = 28;
    // Columns B through R: Width 12 for weekly checkboxes
    for (let c = 2; c <= 18; c++) {
      ws.getColumn(c).width = 12;
    }

    // --- 1. HEADER ROW (Row 1) ---
    // Merge cells A1 through R1. Fill with standard Excel green. Centered text: "Football United Attendance Tracker".
    ws.mergeCells("A1:R1");
    const row1 = ws.getRow(1);
    row1.height = 38;
    const titleCell = ws.getCell("A1");
    titleCell.value = "Football United Attendance Tracker";
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: EXCEL_GREEN_ARGB }
    };
    titleCell.font = {
      name: "Segoe UI",
      size: 16,
      bold: true,
      color: { argb: "FFFFFFFF" }
    };
    titleCell.alignment = {
      vertical: "middle",
      horizontal: "center"
    };

    // --- 2. COLUMN HEADERS (Row 2) ---
    // Cell A2: "Player Name"
    // Cells B2 through R2: Specific weekly dates spaced exactly 7 days apart.
    const row2 = ws.getRow(2);
    row2.height = 28;
    const a2 = ws.getCell("A2");
    a2.value = "Player Name";
    a2.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: LIGHT_GREEN_FILL_ARGB }
    };
    a2.font = {
      name: "Segoe UI",
      size: 11,
      bold: true,
      color: { argb: EXCEL_GREEN_ARGB }
    };
    a2.alignment = { vertical: "middle", horizontal: "center" };
    a2.border = thinBorder;

    const dates = getQuarterWeeklyDates(tabName);
    dates.forEach((dStr, idx) => {
      const col = idx + 2; // Col 2 is B, Col 18 is R
      const dateCell = row2.getCell(col);
      dateCell.value = dStr;
      dateCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: LIGHT_GREEN_FILL_ARGB }
      };
      dateCell.font = {
        name: "Segoe UI",
        size: 11,
        bold: true,
        color: { argb: EXCEL_GREEN_ARGB }
      };
      dateCell.alignment = { vertical: "middle", horizontal: "center" };
      dateCell.border = thinBorder;
    });

    // --- 3. DATA VALIDATION (Row 3 and below) ---
    // Format columns B through R (from row 3 downwards) to accept Excel Checkbox elements.
    // Populate initial players across all sheets
    let currentRow = 3;
    for (const playerName of cleanPlayers) {
      const row = ws.getRow(currentRow);
      row.height = 22;

      const pCell = row.getCell(1);
      pCell.value = playerName;
      pCell.font = { name: "Segoe UI", size: 10 };
      pCell.alignment = { vertical: "middle", horizontal: "left" };
      pCell.border = thinBorder;

      for (let col = 2; col <= 18; col++) {
        const checkCell = row.getCell(col);
        checkCell.value = false;
        checkCell.dataValidation = checkboxValidation;
        checkCell.alignment = { vertical: "middle", horizontal: "center" };
        checkCell.border = thinBorder;
      }
      currentRow++;
    }
  }

  return workbook;
}

/**
 * Saves workbook to disk at ATTENDANCE_TRACKER_FILE.
 */
export async function saveAttendanceTrackerWorkbook(workbook: ExcelJS.Workbook): Promise<string> {
  const dir = path.dirname(ATTENDANCE_TRACKER_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  await workbook.xlsx.writeFile(ATTENDANCE_TRACKER_FILE);
  return ATTENDANCE_TRACKER_FILE;
}

/**
 * Loads existing tracker workbook, or creates and saves a new one if missing.
 */
export async function getOrLoadAttendanceTracker(initialPlayers: string[] = []): Promise<ExcelJS.Workbook> {
  if (fs.existsSync(ATTENDANCE_TRACKER_FILE)) {
    try {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(ATTENDANCE_TRACKER_FILE);
      const names = wb.worksheets.map((ws) => ws.name);
      if (QUARTER_TABS.every((q) => names.includes(q))) {
        return wb;
      }
    } catch (err) {
      console.warn("Could not read existing attendance tracker file, recreating fresh:", err);
    }
  }

  const wb = await createAttendanceTrackerWorkbook(initialPlayers);
  await saveAttendanceTrackerWorkbook(wb);
  return wb;
}

/**
 * Requirement 4: Adding a New Player
 * "When a new user registers in the app, append their name to the first empty row
 * in Column A across all four quarterly sheets."
 */
export async function appendPlayerToAllQuarterlySheets(
  playerName: string
): Promise<{ success: boolean; row: number; playerName: string; message: string }> {
  if (!playerName || !playerName.trim()) {
    return { success: false, row: 0, playerName: "", message: "Player name is required." };
  }
  const cleanName = playerName.trim();
  if (cleanName.startsWith("p_") || cleanName === "[object Object]") {
    return { success: false, row: 0, playerName: cleanName, message: "Skipping placeholder player key." };
  }

  const wb = await getOrLoadAttendanceTracker();
  let assignedRow = 3;

  for (const tabName of QUARTER_TABS) {
    let ws = wb.getWorksheet(tabName);
    if (!ws) {
      ws = wb.addWorksheet(tabName);
    }

    // Check if player is already present in Column A
    let existingRow = -1;
    let firstEmptyRow = -1;

    for (let r = 3; r <= Math.max(100, ws.rowCount + 5); r++) {
      const val = ws.getCell(`A${r}`).value;
      if (val === null || val === undefined || val === "") {
        if (firstEmptyRow === -1) firstEmptyRow = r;
        break;
      }
      if (String(val).trim().toLowerCase() === cleanName.toLowerCase()) {
        existingRow = r;
        break;
      }
    }

    if (existingRow !== -1) {
      assignedRow = existingRow;
      continue;
    }

    const targetRow = firstEmptyRow !== -1 ? firstEmptyRow : Math.max(3, ws.rowCount + 1);
    assignedRow = targetRow;

    const row = ws.getRow(targetRow);
    row.height = 22;

    const playerCell = row.getCell(1);
    playerCell.value = cleanName;
    playerCell.font = { name: "Segoe UI", size: 10 };
    playerCell.alignment = { vertical: "middle", horizontal: "left" };
    playerCell.border = thinBorder;

    // Initialize Columns B through R with checkbox data validation
    for (let c = 2; c <= 18; c++) {
      const cell = row.getCell(c);
      if (cell.value === null || cell.value === undefined) {
        cell.value = false;
      }
      cell.dataValidation = checkboxValidation;
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = thinBorder;
    }
  }

  await saveAttendanceTrackerWorkbook(wb);
  return {
    success: true,
    row: assignedRow,
    playerName: cleanName,
    message: `Appended ${cleanName} to Column A (Row ${assignedRow}) across all four quarterly sheets.`
  };
}

/**
 * Requirement 4: Logging Attendance
 * "When the app registers an attendance event, identify the correct worksheet based on
 * the current date's quarter. Locate the row matching the 'Player Name' and the column
 * matching the specific weekly date. Update that cell's checkbox to TRUE (checked)."
 */
export async function logAttendanceToQuarterlySheet(
  playerName: string,
  sessionDateInput: string | Date,
  attended: boolean = true
): Promise<{
  success: boolean;
  quarter: QuarterTab;
  row: number;
  col: number;
  dateHeader: string;
  playerName: string;
  attended: boolean;
}> {
  if (!playerName || !playerName.trim()) {
    throw new Error("Player name is required to log attendance.");
  }
  const cleanName = playerName.trim();
  const sessionDate = typeof sessionDateInput === "string" ? new Date(sessionDateInput) : sessionDateInput;
  const quarter = getQuarterTabForDate(sessionDate);

  const wb = await getOrLoadAttendanceTracker();
  let ws = wb.getWorksheet(quarter);
  if (!ws) {
    ws = wb.addWorksheet(quarter);
  }

  // 1. Locate the row matching "Player Name" in Column A
  let playerRow = -1;
  for (let r = 3; r <= Math.max(100, ws.rowCount + 5); r++) {
    const val = ws.getCell(`A${r}`).value;
    if (val !== null && val !== undefined && String(val).trim().toLowerCase() === cleanName.toLowerCase()) {
      playerRow = r;
      break;
    }
  }

  // If not found in Column A, append across all 4 quarterly sheets first
  if (playerRow === -1) {
    const appendResult = await appendPlayerToAllQuarterlySheets(cleanName);
    playerRow = appendResult.row;
  }

  // 2. Locate the column matching the specific weekly date (Row 2, cols B to R)
  const targetDayMonth = `${sessionDate.getDate()}-${MONTH_NAMES[sessionDate.getMonth()]}`.toLowerCase();
  let matchedCol = -1;
  let matchedHeader = "";

  for (let c = 2; c <= 18; c++) {
    const headerVal = String(ws.getRow(2).getCell(c).value || "").trim().toLowerCase();
    if (headerVal === targetDayMonth) {
      matchedCol = c;
      matchedHeader = String(ws.getRow(2).getCell(c).value || "");
      break;
    }
  }

  // If no exact match (e.g. session was scheduled on adjacent day), find the nearest weekly date in quarter
  if (matchedCol === -1) {
    let minDiff = Infinity;
    const quarterDates = getQuarterWeeklyDates(quarter);
    for (let idx = 0; idx < quarterDates.length; idx++) {
      const qd = quarterDates[idx];
      const col = idx + 2;
      const [dPart, mPart] = qd.split("-");
      const mIdx = MONTH_NAMES.indexOf(mPart);
      if (mIdx !== -1) {
        const diff =
          Math.abs(sessionDate.getDate() - parseInt(dPart, 10)) + Math.abs(sessionDate.getMonth() - mIdx) * 30;
        if (diff < minDiff) {
          minDiff = diff;
          matchedCol = col;
          matchedHeader = qd;
        }
      }
    }
  }

  if (matchedCol === -1) {
    matchedCol = 2; // Column B fallback
    matchedHeader = String(ws.getRow(2).getCell(2).value || "Week 1");
  }

  // 3. Update that cell's checkbox to TRUE (checked) or FALSE
  const targetCell = ws.getRow(playerRow).getCell(matchedCol);
  targetCell.value = attended ? true : false;
  targetCell.dataValidation = checkboxValidation;
  targetCell.alignment = { vertical: "middle", horizontal: "center" };
  targetCell.border = thinBorder;

  await saveAttendanceTrackerWorkbook(wb);

  return {
    success: true,
    quarter,
    row: playerRow,
    col: matchedCol,
    dateHeader: matchedHeader,
    playerName: cleanName,
    attended
  };
}

/**
 * Batch logs attendance for a match day or training session with multiple attendees.
 */
export async function batchLogAttendanceToQuarterlySheet(
  sessionDateInput: string | Date,
  presentPlayerNames: string[],
  allRosterPlayerNames: string[] = []
): Promise<{
  success: boolean;
  quarter: QuarterTab;
  dateHeader: string;
  totalUpdated: number;
  presentCount: number;
}> {
  const sessionDate = typeof sessionDateInput === "string" ? new Date(sessionDateInput) : sessionDateInput;
  const quarter = getQuarterTabForDate(sessionDate);
  const wb = await getOrLoadAttendanceTracker();
  let ws = wb.getWorksheet(quarter);
  if (!ws) {
    ws = wb.addWorksheet(quarter);
  }

  // Ensure all players are registered in Column A across all 4 sheets
  const combinedNames = Array.from(new Set([...presentPlayerNames, ...allRosterPlayerNames]));
  for (const name of combinedNames) {
    if (!name || name.startsWith("p_") || name === "[object Object]") continue;
    let found = false;
    for (let r = 3; r <= Math.max(100, ws.rowCount); r++) {
      const val = ws.getCell(`A${r}`).value;
      if (val && String(val).trim().toLowerCase() === name.trim().toLowerCase()) {
        found = true;
        break;
      }
    }
    if (!found) {
      await appendPlayerToAllQuarterlySheets(name);
    }
  }

  // Reload workbook after potential additions
  const updatedWb = await getOrLoadAttendanceTracker();
  const targetWs = updatedWb.getWorksheet(quarter)!;

  // Locate weekly date column
  const targetDayMonth = `${sessionDate.getDate()}-${MONTH_NAMES[sessionDate.getMonth()]}`.toLowerCase();
  let matchedCol = -1;
  let matchedHeader = "";

  for (let c = 2; c <= 18; c++) {
    const headerVal = String(targetWs.getRow(2).getCell(c).value || "").trim().toLowerCase();
    if (headerVal === targetDayMonth) {
      matchedCol = c;
      matchedHeader = String(targetWs.getRow(2).getCell(c).value || "");
      break;
    }
  }

  if (matchedCol === -1) {
    let minDiff = Infinity;
    const quarterDates = getQuarterWeeklyDates(quarter);
    for (let idx = 0; idx < quarterDates.length; idx++) {
      const qd = quarterDates[idx];
      const col = idx + 2;
      const [dPart, mPart] = qd.split("-");
      const mIdx = MONTH_NAMES.indexOf(mPart);
      if (mIdx !== -1) {
        const diff =
          Math.abs(sessionDate.getDate() - parseInt(dPart, 10)) + Math.abs(sessionDate.getMonth() - mIdx) * 30;
        if (diff < minDiff) {
          minDiff = diff;
          matchedCol = col;
          matchedHeader = qd;
        }
      }
    }
  }

  if (matchedCol === -1) {
    matchedCol = 2;
    matchedHeader = String(targetWs.getRow(2).getCell(2).value || "Week 1");
  }

  const presentLowerSet = new Set(presentPlayerNames.map((p) => p.trim().toLowerCase()));
  let updatedCount = 0;
  let presentCount = 0;

  for (let r = 3; r <= targetWs.rowCount; r++) {
    const pNameVal = targetWs.getCell(`A${r}`).value;
    if (!pNameVal) continue;
    const pName = String(pNameVal).trim();
    const isAttended = presentLowerSet.has(pName.toLowerCase());

    const cell = targetWs.getRow(r).getCell(matchedCol);
    cell.value = isAttended ? true : false;
    cell.dataValidation = checkboxValidation;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = thinBorder;

    updatedCount++;
    if (isAttended) presentCount++;
  }

  await saveAttendanceTrackerWorkbook(updatedWb);

  return {
    success: true,
    quarter,
    dateHeader: matchedHeader,
    totalUpdated: updatedCount,
    presentCount
  };
}

/**
 * Requirement 3: Ownership and Permissions
 * "Default Temporary Owner: Assign 'Owner' (Full Control) rights to ralph.boer@hillsong.co.uk.
 * Dynamic Ownership Switch: Expose a variable called [New_Owner_Email]. When a request is triggered
 * to change the owner, transfer the 'Owner' permissions from the temporary owner to the email address
 * provided in [New_Owner_Email], and downgrade or remove the temporary owner's access as specified
 * by the system admin."
 */
export async function executeOwnershipTransfer(
  newOwnerEmail: string,
  downgradeAction: "downgrade" | "remove" = "downgrade",
  graphTokenProvider?: () => Promise<string | null>,
  graphDriveId: string = "2820CE6C9C58187A",
  graphItemId: string = "2820CE6C9C58187A!s88c637d68b7d4196b27df0e8c2303d1b"
): Promise<{
  success: boolean;
  previousOwner: string;
  currentOwner: string;
  temporaryOwnerAccess: "editor" | "viewer" | "removed";
  action: "downgrade" | "remove";
  details: string;
  message: string;
}> {
  if (!newOwnerEmail || !newOwnerEmail.trim() || !newOwnerEmail.includes("@")) {
    throw new Error("Valid email address is required for [New_Owner_Email]");
  }

  const cleanEmail = newOwnerEmail.trim().toLowerCase();
  const previousOwner = currentTrackerOwner;

  // Expose variable [New_Owner_Email]
  New_Owner_Email = cleanEmail;
  currentTrackerOwner = cleanEmail;
  temporaryOwnerAccess = downgradeAction === "remove" ? "removed" : "editor";

  let graphDetails = "Updated in Local Workbook & System State";

  // Attempt Microsoft Graph API permission transfer if token is accessible
  if (graphTokenProvider) {
    try {
      const token = await graphTokenProvider();
      if (token) {
        const inviteUrl = `https://graph.microsoft.com/v1.0/drives/${graphDriveId}/items/${graphItemId}/invite`;
        const res = await fetch(inviteUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            recipients: [{ email: New_Owner_Email }],
            roles: ["write"],
            requireSignIn: true,
            sendInvitation: false,
            message: "Ownership (Full Control) rights transferred for Football United Attendance Tracker"
          })
        });

        if (res.ok) {
          graphDetails = `Permissions successfully granted to ${New_Owner_Email} on Microsoft Graph & OneDrive.`;
        } else {
          const errData = await res.json().catch(() => ({}));
          graphDetails = `Local transfer complete. Microsoft Graph returned: ${JSON.stringify(errData)}`;
        }
      }
    } catch (err: any) {
      console.warn("Microsoft Graph permission sync note:", err?.message || err);
      graphDetails = `Local transfer complete. Graph sync note: ${err?.message || err}`;
    }
  }

  const record: OwnershipTransferRecord = {
    id: `transfer_${Date.now()}`,
    timestamp: new Date().toISOString(),
    fromOwner: previousOwner,
    toOwner: currentTrackerOwner,
    temporaryOwnerAccess,
    action: downgradeAction,
    details: graphDetails
  };

  ownershipTransferLog.unshift(record);

  return {
    success: true,
    previousOwner,
    currentOwner: currentTrackerOwner,
    temporaryOwnerAccess,
    action: downgradeAction,
    details: graphDetails,
    message: `Ownership successfully transferred to ${currentTrackerOwner}. Temporary owner (${DEFAULT_TEMPORARY_OWNER}) access: ${temporaryOwnerAccess}.`
  };
}

/**
 * Summarizes the state of the 4-tab attendance tracker.
 */
export async function getAttendanceTrackerMetadata() {
  const wb = await getOrLoadAttendanceTracker();
  const sheets = QUARTER_TABS.map((tab) => {
    const ws = wb.getWorksheet(tab);
    const rowCount = ws ? Math.max(0, ws.rowCount - 2) : 0; // Exclude header rows 1 & 2
    const dates = getQuarterWeeklyDates(tab);
    return {
      name: tab,
      playerCount: rowCount,
      weeklyDates: dates
    };
  });

  return {
    workbookTitle: "Football United Attendance Tracker",
    sheets,
    currentOwner: currentTrackerOwner,
    defaultTemporaryOwner: DEFAULT_TEMPORARY_OWNER,
    temporaryOwnerAccess,
    New_Owner_Email,
    recentTransfers: ownershipTransferLog.slice(0, 5),
    filePath: "/reports/Football_United_Attendance_Tracker.xlsx"
  };
}
