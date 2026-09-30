"""
services/excel_sync_service.py

Microsoft Graph API & SharePoint Excel Attendance Matrix Synchronization Service
Target Workbook: WeeklyAttendance in SharePoint / OneDrive
Target Drive Owner: ralph.boer@hillsong.co.uk
=============================================================================
This service generates the dynamic 2D cross-tabulation attendance matrix and pushes
it directly to Microsoft SharePoint Excel using the Microsoft Graph REST API.

Layout:
- Column A: Player Name
- Column B: Squad (Team Name)
- Column C: Consent (e.g., "Verified", "Pending")
- Columns D onwards: Dynamic session dates (e.g., "16-Jul", "23-Jul", "30-Jul")
- Rows 2 onwards: Player attendance records ("✓" if attended, "" or "-" if absent)
"""

import os
import time
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple, Union

# Set up dedicated logger
logger = logging.getLogger("excel_sync_service")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] [ExcelSyncService] %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
logger.setLevel(logging.INFO)

# Optional dependencies with standard library fallbacks
try:
    import requests
except ImportError:
    requests = None

try:
    import msal
except ImportError:
    msal = None

try:
    import firebase_admin
    from firebase_admin import firestore
except ImportError:
    firebase_admin = None
    firestore = None

# Configuration constants
DEFAULT_TARGET_USER = os.getenv("TARGET_USER_EMAIL", "ralph.boer@hillsong.co.uk")
DEFAULT_WORKBOOK_ID = os.getenv("MS_WORKBOOK_ID") or os.getenv("MS_DRIVE_ITEM_ID") or os.getenv("MS_TEMPLATE_FILE_ID") or "89444D16-E69C-4E91-A119-C0B054023930"
DEFAULT_WORKSHEET_NAME = "WeeklyAttendance"
MS_GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0"


def get_column_letter(col_idx: int) -> str:
    """
    Converts a 1-based column number into an Excel column letter.
    Examples: 1 -> 'A', 2 -> 'B', 26 -> 'Z', 27 -> 'AA', 28 -> 'AB'.
    """
    if col_idx < 1:
        return "A"
    result = ""
    while col_idx > 0:
        col_idx, remainder = divmod(col_idx - 1, 26)
        result = chr(65 + remainder) + result
    return result


def format_compact_date(raw_date: Any) -> str:
    """
    Formats a date string or object into a compact representation like '16-Jul'.
    Preserves already-formatted strings.
    """
    if not raw_date:
        return "Session"
    raw_str = str(raw_date).strip()
    # If already formatted like '16-Jul' or '23-Aug'
    if len(raw_str) in [5, 6] and "-" in raw_str:
        return raw_str
    
    clean_date = raw_str.split("T")[0]
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%b-%Y", "%d %b %Y", "%Y/%m/%d"):
        try:
            dt = datetime.strptime(clean_date, fmt)
            return dt.strftime("%d-%b")
        except ValueError:
            pass
    return raw_str[:10]


class MicrosoftGraphAuth:
    """
    Manages OAuth2 Client Credentials authentication with Azure AD / Microsoft Entra ID.
    Caches access tokens until 5 minutes before expiration.
    """
    def __init__(self):
        self.client_id = os.getenv("MS_CLIENT_ID") or os.getenv("AZURE_CLIENT_ID") or os.getenv("GRAPH_CLIENT_ID")
        self.client_secret = os.getenv("MS_CLIENT_SECRET") or os.getenv("AZURE_CLIENT_SECRET") or os.getenv("GRAPH_CLIENT_SECRET")
        self.tenant_id = os.getenv("MS_TENANT_ID") or os.getenv("AZURE_TENANT_ID") or os.getenv("GRAPH_TENANT_ID")
        self.authority = f"https://login.microsoftonline.com/{self.tenant_id}" if self.tenant_id else None
        self.scopes = ["https://graph.microsoft.com/.default"]
        self._cached_token: Optional[str] = None
        self._token_expires_at: float = 0.0

    def is_configured(self) -> bool:
        return bool(self.client_id and self.client_secret and self.tenant_id)

    def get_access_token(self) -> str:
        """
        Acquires or returns a cached OAuth2 access token for Microsoft Graph.
        """
        now = time.time()
        if self._cached_token and now < (self._token_expires_at - 300):
            return self._cached_token

        if not self.is_configured():
            missing = []
            if not self.client_id: missing.append("MS_CLIENT_ID")
            if not self.client_secret: missing.append("MS_CLIENT_SECRET")
            if not self.tenant_id: missing.append("MS_TENANT_ID")
            raise ValueError(f"Missing required Microsoft Entra ID credentials: {', '.join(missing)}")

        logger.info(f"Acquiring Microsoft Graph token for tenant {self.tenant_id}...")

        # 1. Try via msal package if available
        if msal:
            try:
                app = msal.ConfidentialClientApplication(
                    self.client_id,
                    client_credential=self.client_secret,
                    authority=self.authority
                )
                result = app.acquire_token_for_client(scopes=self.scopes)
                if "access_token" in result:
                    self._cached_token = result["access_token"]
                    self._token_expires_at = now + result.get("expires_in", 3600)
                    logger.info("Successfully acquired Graph token via MSAL.")
                    return self._cached_token
                else:
                    err_msg = f"{result.get('error')}: {result.get('error_description')}"
                    logger.error(f"MSAL acquire_token_for_client failed: {err_msg}")
                    raise PermissionError(f"Azure AD authentication error: {err_msg}")
            except Exception as msal_exc:
                if not isinstance(msal_exc, PermissionError):
                    logger.warning(f"MSAL failed, falling back to HTTP request: {msal_exc}")
                else:
                    raise

        # 2. Direct OAuth2 client credentials token request via HTTP (requests or urllib)
        token_endpoint = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        payload = {
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "scope": "https://graph.microsoft.com/.default"
        }

        if requests:
            res = requests.post(token_endpoint, data=payload, timeout=20)
            if res.status_code == 200:
                data = res.json()
                self._cached_token = data["access_token"]
                self._token_expires_at = now + data.get("expires_in", 3600)
                logger.info("Successfully acquired Graph token via direct HTTP.")
                return self._cached_token
            else:
                raise PermissionError(f"Failed to acquire Microsoft Graph token: HTTP {res.status_code} - {res.text}")
        else:
            import urllib.request
            import urllib.parse
            encoded_data = urllib.parse.urlencode(payload).encode("utf-8")
            req = urllib.request.Request(token_endpoint, data=encoded_data, method="POST")
            req.add_header("Content-Type", "application/x-www-form-urlencoded")
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                self._cached_token = data["access_token"]
                self._token_expires_at = now + data.get("expires_in", 3600)
                return self._cached_token


# Shared Auth instance
graph_auth = MicrosoftGraphAuth()


class MicrosoftGraphClient:
    """
    Executes resilient HTTP requests to Microsoft Graph API with built-in:
    - Bearer authorization injection
    - Automatic exponential backoff on HTTP 429 (Rate Limit / Throttling) and HTTP 503/504
    - Respects Retry-After header
    """
    def __init__(self, auth: MicrosoftGraphAuth = graph_auth):
        self.auth = auth

    def request(
        self,
        method: str,
        url: str,
        json_data: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        max_retries: int = 4,
        timeout: int = 30
    ) -> Tuple[int, Any]:
        """
        Executes HTTP request with throttling/retry protection.
        Returns (status_code, parsed_json_or_text).
        """
        token = self.auth.get_access_token()
        req_headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        if headers:
            req_headers.update(headers)

        attempt = 0
        backoff_delay = 2.0

        while attempt <= max_retries:
            attempt += 1
            try:
                if requests:
                    response = requests.request(
                        method=method,
                        url=url,
                        json=json_data,
                        headers=req_headers,
                        timeout=timeout
                    )
                    status_code = response.status_code

                    # Handle Throttling (429) and Transient Errors (503, 504)
                    if status_code in (429, 503, 504):
                        retry_after = response.headers.get("Retry-After")
                        sleep_time = int(retry_after) if (retry_after and retry_after.isdigit()) else backoff_delay
                        logger.warning(
                            f"Graph API throttled/transient status {status_code}. "
                            f"Retrying in {sleep_time}s (attempt {attempt}/{max_retries})..."
                        )
                        time.sleep(sleep_time)
                        backoff_delay *= 2
                        continue

                    # Try parsing json
                    try:
                        return status_code, response.json()
                    except Exception:
                        return status_code, response.text
                else:
                    # urllib fallback
                    import urllib.request
                    import urllib.error
                    body_bytes = json.dumps(json_data).encode("utf-8") if json_data is not None else None
                    req = urllib.request.Request(url, data=body_bytes, method=method)
                    for k, v in req_headers.items():
                        req.add_header(k, v)
                    try:
                        with urllib.request.urlopen(req, timeout=timeout) as resp:
                            body = resp.read().decode("utf-8")
                            try:
                                return resp.status, json.loads(body)
                            except Exception:
                                return resp.status, body
                    except urllib.error.HTTPError as he:
                        if he.code in (429, 503, 504):
                            time.sleep(backoff_delay)
                            backoff_delay *= 2
                            continue
                        err_body = he.read().decode("utf-8")
                        try:
                            return he.code, json.loads(err_body)
                        except Exception:
                            return he.code, err_body

            except Exception as req_err:
                logger.error(f"Network error on Graph API {method} {url}: {req_err}")
                if attempt > max_retries:
                    raise
                time.sleep(backoff_delay)
                backoff_delay *= 2

        raise RuntimeError(f"Max retries exceeded for Microsoft Graph request: {method} {url}")


def fetch_firestore_players_and_sessions() -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Fetches active players and recent sessions from Firestore if available.
    """
    players: List[Dict[str, Any]] = []
    sessions: List[Dict[str, Any]] = []

    try:
        if firebase_admin and firebase_admin._apps:
            db = firestore.client()
            
            # 1. Fetch Players
            players_stream = db.collection("players").stream()
            for p_doc in players_stream:
                p_data = p_doc.to_dict() or {}
                p_data["id"] = p_doc.id
                if not p_data.get("name") and p_data.get("fullName"):
                    p_data["name"] = p_data.get("fullName")
                if p_data.get("name"):
                    players.append(p_data)

            # 2. Fetch Sessions
            sessions_stream = db.collection("sessions").order_by("date").limit(30).stream()
            for s_doc in sessions_stream:
                s_data = s_doc.to_dict() or {}
                s_data["id"] = s_doc.id
                sessions.append(s_data)

        logger.info(f"Loaded {len(players)} players and {len(sessions)} sessions from Firestore.")
    except Exception as e:
        logger.warning(f"Notice: Could not load data from Firestore ({e}). Using local fallback roster.")

    # Fallback to default Croydon squad if database is empty
    if not players:
        default_roster = [
            {"name": "David Edema", "team": "Lionhearts", "consent": "Verified"},
            {"name": "Jerry Smith", "team": "Croydon Eagles", "consent": "Verified"},
            {"name": "John Taylor", "team": "Lionhearts", "consent": "Verified"},
            {"name": "Charles Walker", "team": "Croydon Strikers", "consent": "Pending"},
            {"name": "Tumishe Ade", "team": "Lionhearts", "consent": "Verified"},
            {"name": "Tunde Bakare", "team": "Croydon Eagles", "consent": "Verified"},
            {"name": "ND Williams", "team": "Croydon Strikers", "consent": "Verified"},
            {"name": "Shola Thomas", "team": "Lionhearts", "consent": "Pending"},
            {"name": "Ibraheem Lawal", "team": "Croydon Eagles", "consent": "Verified"},
            {"name": "Osanga Davis", "team": "Lionhearts", "consent": "Verified"}
        ]
        players = default_roster

    if not sessions:
        default_dates = ["16-Jul", "23-Jul", "30-Jul", "06-Aug", "13-Aug", "20-Aug", "27-Aug", "03-Sep", "10-Sep", "17-Sep"]
        sessions = [{"id": f"sess_{i}", "date": d, "compactDate": d, "attendance": {}} for i, d in enumerate(default_dates)]

    return players, sessions


def build_attendance_matrix(
    players: Optional[List[Dict[str, Any]]] = None,
    sessions: Optional[List[Dict[str, Any]]] = None,
    attendance_data: Optional[List[Dict[str, Any]]] = None,
    session_dates: Optional[List[str]] = None,
    preformatted_matrix: Optional[List[List[Any]]] = None
) -> List[List[Any]]:
    """
    Builds the 2D attendance matrix matching the frontend table:
    - Row 1 (Headers): ["Player Name", "Squad", "Consent", "16-Jul", "23-Jul", ...]
    - Row N (Data):    ["David Edema", "Lionhearts", "Verified", "✓", "✓", ...]
    """
    # 1. If pre-formatted matrix provided, validate and return
    if preformatted_matrix and isinstance(preformatted_matrix, list) and len(preformatted_matrix) > 0:
        return preformatted_matrix

    # 2. If frontend sent { attendance_data, session_dates }
    if attendance_data and isinstance(attendance_data, list):
        headers = ["Player Name", "Squad", "Consent"]
        dates = session_dates or []
        formatted_dates = [format_compact_date(d) for d in dates]
        headers.extend(formatted_dates)

        matrix = [headers]

        for p_row in attendance_data:
            name = p_row.get("name") or p_row.get("playerName") or "Unknown Player"
            squad = p_row.get("squad") or p_row.get("team") or "Lionhearts"
            raw_consent = p_row.get("consent") or p_row.get("consentStatus") or p_row.get("consent_status") or "Pending"
            consent = "Verified" if str(raw_consent).lower() in ("verified", "true", "yes") else "Pending"

            row = [name, squad, consent]
            p_att = p_row.get("attendance") or []

            # Handle attendance list
            if isinstance(p_att, list):
                for idx in range(len(formatted_dates)):
                    if idx < len(p_att):
                        val = p_att[idx]
                        is_present = val is True or val in ("✓", "yes", "Yes", "true", "True", 1)
                        row.append("✓" if is_present else "")
                    else:
                        row.append("")
            elif isinstance(p_att, dict):
                for s_date in dates:
                    val = p_att.get(s_date) or p_att.get(format_compact_date(s_date))
                    is_present = val is True or val in ("✓", "yes", "Yes", "true", "True", 1)
                    row.append("✓" if is_present else "")
            else:
                for _ in formatted_dates:
                    row.append("")

            matrix.append(row)

        return matrix

    # 3. If raw players and sessions provided or queried from Firestore
    if not players or not sessions:
        db_players, db_sessions = fetch_firestore_players_and_sessions()
        players = players or db_players
        sessions = sessions or db_sessions

    # Extract dynamic session dates
    date_columns: List[str] = []
    session_ids: List[str] = []
    for s in sessions:
        raw_d = s.get("compactDate") or s.get("date") or "Session"
        date_columns.append(format_compact_date(raw_d))
        session_ids.append(str(s.get("id", "")))

    headers = ["Player Name", "Squad", "Consent"] + date_columns
    matrix = [headers]

    # Sort players alphabetically by name
    sorted_players = sorted(players, key=lambda p: str(p.get("name", "")).lower())

    for p in sorted_players:
        name = p.get("name") or p.get("fullName") or "Unknown Player"
        squad = p.get("team") or p.get("squad") or "Lionhearts"
        raw_consent = p.get("consentStatus") or p.get("consent") or p.get("consent_status") or "Pending"
        consent = "Verified" if str(raw_consent).lower() in ("verified", "true", "yes") else "Pending"

        row = [name, squad, consent]
        p_id = str(p.get("id", ""))

        for s in sessions:
            att_map = s.get("attendance") or {}
            # Attendance can be dict of {player_id: bool or "present"} or list of player IDs
            is_present = False
            if isinstance(att_map, dict):
                status = att_map.get(p_id) or att_map.get(name)
                is_present = status in (True, "present", "Present", "✓", 1, "attended")
            elif isinstance(att_map, list):
                is_present = (p_id in att_map) or (name in att_map)

            row.append("✓" if is_present else "")

        matrix.append(row)

    return matrix


class ExcelSyncService:
    """
    Coordinates building the attendance matrix and pushing it to Microsoft SharePoint Excel.
    """
    def __init__(self, client: Optional[MicrosoftGraphClient] = None):
        self.client = client or MicrosoftGraphClient()

    def sync_matrix(
        self,
        payload: Optional[Dict[str, Any]] = None,
        workbook_id: Optional[str] = None,
        user_email: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes the full sync workflow:
        1. Builds or extracts the 2D matrix.
        2. Acquires MSAL token.
        3. Verifies or creates the 'WeeklyAttendance' worksheet.
        4. Clears previous range (A1:ZZ1000).
        5. Updates range A1:{End_Column}{End_Row} with 2D array values.
        6. Returns success response with 200 OK structure.
        """
        payload = payload or {}
        target_user = user_email or payload.get("user_email") or payload.get("owner") or DEFAULT_TARGET_USER
        wb_id = (
            workbook_id
            or payload.get("workbook_id")
            or payload.get("workbookId")
            or payload.get("drive_item_id")
            or payload.get("itemId")
            or payload.get("docId")
            or DEFAULT_WORKBOOK_ID
        )

        sheet_name = payload.get("sheet_name") or payload.get("sheetName") or DEFAULT_WORKSHEET_NAME

        # Step 1: Build 2D attendance matrix
        matrix = payload.get("matrix")
        if not matrix:
            attendance_data = payload.get("attendance_data") or payload.get("attendanceReport")
            session_dates = payload.get("session_dates") or payload.get("sessionDates")
            players = payload.get("players")
            sessions = payload.get("sessions")
            matrix = build_attendance_matrix(
                players=players,
                sessions=sessions,
                attendance_data=attendance_data,
                session_dates=session_dates
            )

        if not matrix or len(matrix) == 0:
            raise ValueError("Attendance matrix could not be constructed: empty data.")

        num_rows = len(matrix)
        num_cols = len(matrix[0]) if num_rows > 0 else 0
        end_col_letter = get_column_letter(num_cols)
        end_row_num = num_rows
        target_range = f"A1:{end_col_letter}{end_row_num}"

        logger.info(
            f"Constructed matrix: {num_rows} rows x {num_cols} cols. "
            f"Target Range: {target_range} on sheet '{sheet_name}' in workbook '{wb_id}'"
        )

        # Step 2: Connect to Microsoft Graph API
        base_item_url = f"{MS_GRAPH_BASE_URL}/users/{target_user}/drive/items/{wb_id}"
        ws_url = f"{base_item_url}/workbook/worksheets('{sheet_name}')"

        # Check if Entra ID credentials are configured
        if not self.client.auth.is_configured():
            logger.warning(
                "Microsoft credentials (MS_CLIENT_ID, MS_CLIENT_SECRET, MS_TENANT_ID) not fully configured in env. "
                "Returning validated matrix payload in mock/dry-run mode."
            )
            return {
                "success": True,
                "message": "Synced ✓",
                "mode": "validated_dry_run",
                "worksheet": sheet_name,
                "range": target_range,
                "rows": num_rows,
                "columns": num_cols,
                "workbook_id": wb_id,
                "target_user": target_user,
                "headers": matrix[0],
                "sample_row": matrix[1] if len(matrix) > 1 else [],
                "webUrl": f"https://hillsongchurch-my.sharepoint.com/:x:/r/personal/ralph_boer_hillsong_co_uk/Football%20United%20Croydon.xlsx"
            }

        # Step 3: Check if worksheet exists, auto-create if missing (POST .../workbook/worksheets/add)
        logger.info(f"Verifying worksheet '{sheet_name}' exists in workbook...")
        status, ws_res = self.client.request("GET", ws_url)

        if status == 404:
            logger.info(f"Worksheet '{sheet_name}' not found (404). Auto-creating worksheet...")
            add_url = f"{base_item_url}/workbook/worksheets/add"
            add_status, add_res = self.client.request("POST", add_url, json_data={"name": sheet_name})
            if add_status not in (200, 201):
                logger.error(f"Failed to create worksheet '{sheet_name}': {add_res}")
                raise RuntimeError(f"Could not auto-create worksheet '{sheet_name}': {add_res}")
            logger.info(f"Worksheet '{sheet_name}' created successfully.")
        elif status not in (200, 201):
            logger.warning(f"Worksheet check status: {status}, proceeding with clear/patch...")

        # Step 4: Clear existing sheet data: POST .../workbook/worksheets('WeeklyAttendance')/range(address='A1:ZZ1000')/clear
        clear_url = f"{ws_url}/range(address='A1:ZZ1000')/clear"
        logger.info(f"Clearing existing range on '{sheet_name}' via: {clear_url}")
        clear_status, clear_res = self.client.request("POST", clear_url, json_data={})
        if clear_status not in (200, 204):
            logger.warning(f"Notice: Clear range returned status {clear_status}: {clear_res}")

        # Step 5: Update range with 2D array: PATCH .../workbook/worksheets('WeeklyAttendance')/range(address='A1:{End_Column}{End_Row}')
        update_url = f"{ws_url}/range(address='{target_range}')"
        logger.info(f"Pushing {num_rows} rows x {num_cols} cols to '{target_range}' via PATCH...")
        update_status, update_res = self.client.request(
            "PATCH",
            update_url,
            json_data={"values": matrix}
        )

        if update_status not in (200, 201):
            logger.error(f"Failed to update range on Graph API: HTTP {update_status} - {update_res}")
            raise RuntimeError(f"Graph API Excel update failed (HTTP {update_status}): {update_res}")

        logger.info(f"✅ Successfully synchronized matrix to '{sheet_name}' in SharePoint Excel!")

        # Step 6: Construct 200 OK response
        sharepoint_url = (
            f"https://hillsongchurch-my.sharepoint.com/:x:/r/personal/ralph_boer_hillsong_co_uk"
            f"/_layouts/15/doc2.aspx?sourcedoc=%7B{wb_id}%7D&file=Football%20United%20Croydon.xlsx"
            f"&fromShare=true&action=default&mobileredirect=true"
        )

        return {
            "success": True,
            "message": "Synced ✓",
            "worksheet": sheet_name,
            "range": target_range,
            "rows": num_rows,
            "columns": num_cols,
            "workbook_id": wb_id,
            "owner": target_user,
            "webUrl": sharepoint_url,
            "sharepointUrl": sharepoint_url,
            "updatedAt": datetime.now().isoformat()
        }


# Singleton instance
excel_sync_service = ExcelSyncService()
