/**
 * Google Sheets and Google Drive integration helpers
 */

export interface GoogleSpreadsheetInfo {
  id: string;
  name: string;
  webViewLink?: string;
}

// Search for the Game On spreadsheet in Google Drive
export async function findOrCreateSpreadsheet(accessToken: string, name: string = 'Game On - Session Attendance Records'): Promise<GoogleSpreadsheetInfo> {
  
  // 1. Search for existing spreadsheet
  const query = encodeURIComponent(`name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`;
  
  try {
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (!searchRes.ok) {
      throw new Error(`Failed to search Drive: ${searchRes.statusText}`);
    }
    
    const searchData = await searchRes.json();
    
    if (searchData.files && searchData.files.length > 0) {
      const file = searchData.files[0];
      return {
        id: file.id,
        name: file.name,
        webViewLink: file.webViewLink,
      };
    }
    
    // 2. Not found, create a new spreadsheet
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: name,
        },
      }),
    });
    
    if (!createRes.ok) {
      throw new Error(`Failed to create spreadsheet: ${createRes.statusText}`);
    }
    
    const createData = await createRes.json();
    
    // Fetch spreadsheet view link from Drive to open in new tab
    const fileId = createData.spreadsheetId;
    const driveFileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=webViewLink`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    let webViewLink = `https://docs.google.com/spreadsheets/d/${fileId}/edit`;
    if (driveFileRes.ok) {
      const driveFileData = await driveFileRes.json();
      webViewLink = driveFileData.webViewLink || webViewLink;
    }
    
    return {
      id: fileId,
      name: name,
      webViewLink,
    };
  } catch (err) {
    console.error('Error finding or creating spreadsheet:', err);
    throw err;
  }
}

// Add a sheet (tab) if it doesn't already exist
export async function ensureSheetExists(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string
): Promise<void> {
  // 1. Fetch current sheets
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch spreadsheet metadata: ${res.statusText}`);
  }
  
  const data = await res.json();
  const existingTitles = data.sheets?.map((s: any) => s.properties.title) || [];
  
  if (existingTitles.includes(sheetTitle)) {
    return; // Already exists
  }
  
  // 2. Create the sheet
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  const updateRes = await fetch(updateUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          addSheet: {
            properties: {
              title: sheetTitle,
            },
          },
        },
      ],
    }),
  });
  
  if (!updateRes.ok) {
    throw new Error(`Failed to add sheet "${sheetTitle}": ${updateRes.statusText}`);
  }
}

// Clear a sheet range
export async function clearSheetRange(
  accessToken: string,
  spreadsheetId: string,
  range: string
): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!res.ok) {
    console.warn(`Failed to clear range "${range}": ${res.statusText}`);
  }
}

// Write values to a sheet range
export async function writeSheetValues(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values,
    }),
  });
  
  if (!res.ok) {
    throw new Error(`Failed to write values to range "${range}": ${res.statusText}`);
  }
}

// Format date to a safe sheet name (replace invalid chars like :, /, *, ?, etc.)
export function formatSafeSheetTitle(dateStr: string, sessionTitle: string): string {
  const cleanTitle = sessionTitle.replace(/[:\\\/\?\*\[\]]/g, '-').substring(0, 20);
  return `${dateStr} - ${cleanTitle}`.substring(0, 31); // Sheets max sheet name length is 31 chars
}
