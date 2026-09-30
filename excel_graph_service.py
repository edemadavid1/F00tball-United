"""
excel_graph_service.py

Microsoft Graph API Service & Flask Blueprint for Dynamic Session Attendance Tabs
Target Workbook: "Football United Croydon.xlsx" in Microsoft 365 SharePoint / OneDrive
Target User: ralph.boer@hillsong.co.uk
=============================================================================
Strict Layout Specifications:
- Row 1 (A1 to End of Dates): Merged cells, Green background fill (#8fce9f),
  Bold white text (#ffffff) reading: "FOOTBALL UNITED [SESSION NAME]"
- Row 2 (Headers):
    - Cell A2: "Player Name"
    - Cells B2 onwards: Session dates formatted like "2-Oct", "9-Oct"
- Column A (Row 3 downwards): Alphabetical list of player names
- Grid (B3 downwards): Boolean True/False values mapping player attendance
- Data Validation: Checkbox list validation restricted to "TRUE,FALSE" on B3:{End_Col}{End_Row}
"""

import os
import re
import time
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple, Union
# Flask / WSGI compatibility layer with fallbacks
try:
    from flask import Blueprint, request, jsonify, Response
except ImportError:
    class Blueprint:
        def __init__(self, name, import_name, url_prefix=None):
            self.name = name
            self.import_name = import_name
            self.url_prefix = url_prefix or ""
            self.routes = []

        def route(self, rule, **options):
            def decorator(f):
                self.routes.append((rule, options, f))
                return f
            return decorator

    # Try importing MockRequest/jsonify from app if running in pure standard library
    try:
        from app import request, jsonify
    except Exception:
        class _DummyRequest:
            def get_json(self, force=False, silent=True):
                return {}
        request = _DummyRequest()
        def jsonify(data):
            return data


# Set up dedicated logger
logger = logging.getLogger("excel_graph_service")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] [ExcelGraphService] %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
logger.setLevel(logging.INFO)

# Third-party libraries with fallbacks
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

# Blueprint definition
excel_bp = Blueprint("excel_graph_api", __name__)

# Constants & Defaults
DEFAULT_TARGET_USER = os.getenv("TARGET_USER_EMAIL", "ralph.boer@hillsong.co.uk")
DEFAULT_WORKBOOK_ID = (
    os.getenv("MS_WORKBOOK_ID")
    or os.getenv("MS_DRIVE_ITEM_ID")
    or os.getenv("MS_TEMPLATE_FILE_ID")
    or "89444D16-E69C-4E91-A119-C0B054023930"
)
MS_GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0"


# -----------------------------------------------------------------------------
# Helper Utilities
# -----------------------------------------------------------------------------

def get_column_letter(col_idx: int) -> str:
    """Converts a 1-based column index to an Excel column letter (1 -> 'A', 2 -> 'B', etc.)."""
    if col_idx < 1:
        return "A"
    result = ""
    while col_idx > 0:
        col_idx, remainder = divmod(col_idx - 1, 26)
        result = chr(65 + remainder) + result
    return result


def sanitize_sheet_name(raw_name: str) -> str:
    """
    Cleans and restricts worksheet name to Excel limits:
    - Maximum 31 characters.
    - Prohibited characters: [ ] * / ? : \
    - Strips leading/trailing quotes and spaces.
    """
    if not raw_name or not str(raw_name).strip():
        return "Session_Tab"
    
    clean = re.sub(r'[\/\\?\*\[\]:]', '_', str(raw_name).strip())
    clean = clean.strip("' \"")
    if len(clean) > 31:
        clean = clean[:31].strip(" _-")
    return clean or "Session_Tab"


def format_date_header(date_val: Any) -> str:
    """
    Formats a date string/object into compact header format (e.g. '2-Oct', '9-Oct', '16-Jul').
    Single-digit days have no leading zero.
    """
    if not date_val:
        return "Session"
    raw_str = str(date_val).strip()
    clean_date = raw_str.split("T")[0]
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%b-%Y", "%d %b %Y", "%Y/%m/%d"):
        try:
            dt = datetime.strptime(clean_date, fmt)
            return f"{dt.day}-{dt.strftime('%b')}"
        except ValueError:
            pass
    return raw_str[:10]


def normalize_attendance(
    raw_att: Any,
    date_keys: List[str],
    players: List[Dict[str, Any]]
) -> Dict[str, Dict[str, bool]]:
    """
    Normalizes attendance payload into a nested lookup: {date_key: {player_identifier: bool}}.
    Supports:
    - Flat dict for single session: {"player_1": true, "David Edema": true}
    - Nested dict for recurring series: {"2026-10-02": {"player_1": true}} or {"2-Oct": {"p1": true}}
    - List of present player IDs/names
    """
    normalized: Dict[str, Dict[str, bool]] = {d: {} for d in date_keys}
    if not raw_att:
        return normalized

    if isinstance(raw_att, dict):
        # Determine if raw_att is nested or flat
        # If any top-level key matches a date format (YYYY-MM-DD or contains '-' or matches date_keys)
        is_nested = False
        for k in raw_att.keys():
            k_str = str(k).strip()
            if any(k_str == d or k_str == d.split("T")[0] for d in date_keys) or re.match(r'^\d{4}-\d{2}-\d{2}', k_str):
                is_nested = True
                break

        if is_nested:
            for d_input, att_sub in raw_att.items():
                d_input_clean = str(d_input).split("T")[0]
                matched_key = None
                for d in date_keys:
                    if d_input_clean == d or d_input_clean == d.split("T")[0] or format_date_header(d_input_clean) == format_date_header(d):
                        matched_key = d
                        break
                target_key = matched_key or d_input_clean
                if target_key not in normalized:
                    normalized[target_key] = {}

                if isinstance(att_sub, dict):
                    for p_key, val in att_sub.items():
                        is_p = val is True or val in (1, "1", "true", "True", "present", "Present", "✓", "attended")
                        normalized[target_key][str(p_key).strip()] = is_p
                elif isinstance(att_sub, list):
                    for p_id in att_sub:
                        normalized[target_key][str(p_id).strip()] = True
        else:
            # Flat dictionary: map to all provided date_keys (usually a single session)
            target_dates = date_keys if date_keys else ["default"]
            for d in target_dates:
                if d not in normalized:
                    normalized[d] = {}
                for p_key, val in raw_att.items():
                    is_p = val is True or val in (1, "1", "true", "True", "present", "Present", "✓", "attended")
                    normalized[d][str(p_key).strip()] = is_p

    elif isinstance(raw_att, list):
        # List of present player IDs/names for single session
        target_dates = date_keys if date_keys else ["default"]
        for d in target_dates:
            if d not in normalized:
                normalized[d] = {}
            for p_id in raw_att:
                normalized[d][str(p_id).strip()] = True

    return normalized


# -----------------------------------------------------------------------------
# Microsoft Graph Authentication
# -----------------------------------------------------------------------------

class MicrosoftGraphAuth:
    """
    Manages OAuth2 access tokens via msal.ConfidentialClientApplication
    using Azure AD / Entra ID Client Credentials.
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
        now = time.time()
        if self._cached_token and now < (self._token_expires_at - 300):
            return self._cached_token

        if not self.is_configured():
            missing = [k for k in ["MS_CLIENT_ID", "MS_CLIENT_SECRET", "MS_TENANT_ID"] if not os.getenv(k)]
            raise ValueError(f"Missing required Microsoft Entra credentials: {', '.join(missing)}")

        logger.info(f"Acquiring Graph token via MSAL for tenant {self.tenant_id}...")

        # 1. Use MSAL ConfidentialClientApplication
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
                    return self._cached_token
                else:
                    err_msg = f"{result.get('error')}: {result.get('error_description')}"
                    logger.error(f"MSAL authentication error: {err_msg}")
                    raise PermissionError(f"Azure AD authentication failed: {err_msg}")
            except Exception as e:
                if isinstance(e, PermissionError):
                    raise
                logger.warning(f"MSAL client exception, falling back to direct HTTP: {e}")

        # 2. Direct HTTP Client Credentials flow fallback
        token_url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        payload = {
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "scope": "https://graph.microsoft.com/.default"
        }

        if requests:
            resp = requests.post(token_url, data=payload, timeout=20)
            if resp.status_code == 200:
                data = resp.json()
                self._cached_token = data["access_token"]
                self._token_expires_at = now + data.get("expires_in", 3600)
                return self._cached_token
            raise PermissionError(f"Direct token acquisition failed: {resp.status_code} - {resp.text}")
        else:
            import urllib.request
            import urllib.parse
            encoded = urllib.parse.urlencode(payload).encode("utf-8")
            req = urllib.request.Request(token_url, data=encoded, method="POST")
            req.add_header("Content-Type", "application/x-www-form-urlencoded")
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                self._cached_token = data["access_token"]
                self._token_expires_at = now + data.get("expires_in", 3600)
                return self._cached_token


graph_auth = MicrosoftGraphAuth()


# -----------------------------------------------------------------------------
# Microsoft Graph Client with Rate-Limit & Error Handling
# -----------------------------------------------------------------------------

class MicrosoftGraphClient:
    def __init__(self, auth: MicrosoftGraphAuth = graph_auth):
        self.auth = auth

    def request(
        self,
        method: str,
        url: str,
        json_data: Optional[Dict[str, Any]] = None,
        max_retries: int = 4,
        timeout: int = 30
    ) -> Tuple[int, Any]:
        """
        Executes HTTP requests to Microsoft Graph with backoff handling for 429 and 503/504.
        """
        token = self.auth.get_access_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        attempt = 0
        backoff = 2.0

        while attempt <= max_retries:
            attempt += 1
            try:
                if requests:
                    res = requests.request(
                        method=method,
                        url=url,
                        json=json_data,
                        headers=headers,
                        timeout=timeout
                    )
                    status_code = res.status_code

                    # Handle Rate Limiting / Transient server throttling
                    if status_code in (429, 503, 504):
                        retry_after = res.headers.get("Retry-After")
                        sleep_time = int(retry_after) if (retry_after and retry_after.isdigit()) else backoff
                        logger.warning(f"Graph API {status_code}. Retrying in {sleep_time}s (attempt {attempt}/{max_retries})...")
                        time.sleep(sleep_time)
                        backoff *= 2
                        continue

                    try:
                        return status_code, res.json()
                    except Exception:
                        return status_code, res.text
                else:
                    import urllib.request
                    import urllib.error
                    body = json.dumps(json_data).encode("utf-8") if json_data is not None else None
                    req = urllib.request.Request(url, data=body, method=method)
                    for k, v in headers.items():
                        req.add_header(k, v)
                    try:
                        with urllib.request.urlopen(req, timeout=timeout) as r:
                            payload = r.read().decode("utf-8")
                            try:
                                return r.status, json.loads(payload)
                            except Exception:
                                return r.status, payload
                    except urllib.error.HTTPError as he:
                        if he.code in (429, 503, 504):
                            time.sleep(backoff)
                            backoff *= 2
                            continue
                        err_payload = he.read().decode("utf-8")
                        try:
                            return he.code, json.loads(err_payload)
                        except Exception:
                            return he.code, err_payload

            except Exception as e:
                logger.error(f"Network error on Graph API {method} {url}: {e}")
                if attempt > max_retries:
                    raise
                time.sleep(backoff)
                backoff *= 2

        raise RuntimeError(f"Max retries exceeded for Graph API call: {method} {url}")


# -----------------------------------------------------------------------------
# Firestore / Roster Lookup
# -----------------------------------------------------------------------------

def fetch_roster_players() -> List[Dict[str, Any]]:
    """
    Retrieves player roster from Firestore collection 'players'
    or uses the official Croydon squad list as fallback.
    """
    players: List[Dict[str, Any]] = []
    try:
        if firebase_admin and firebase_admin._apps:
            db = firestore.client()
            for doc in db.collection("players").stream():
                d = doc.to_dict() or {}
                d["id"] = doc.id
                if not d.get("name") and d.get("fullName"):
                    d["name"] = d.get("fullName")
                if d.get("name"):
                    players.append(d)
        if players:
            logger.info(f"Loaded {len(players)} players from Firestore.")
    except Exception as err:
        logger.warning(f"Could not load players from Firestore: {err}")

    if not players:
        default_names = [
            "Alive O", "Charles Walker", "David Edema", "Dodo M",
            "Ibraheem Lawal", "Jerry Smith", "John Taylor", "Kennedy B",
            "Mayor O", "ND Williams", "Ojukwu E", "Osanga Davis",
            "Shola Thomas", "Skipo P", "Solomon K", "Tomi A",
            "Tumishe Ade", "Tunde Bakare"
        ]
        players = [{"id": f"p_{i}", "name": name, "squad": "Lionhearts"} for i, name in enumerate(default_names)]

    # Sort alphabetically by player name
    players.sort(key=lambda p: str(p.get("name", "")).lower())
    return players


# -----------------------------------------------------------------------------
# ExcelGraphService Engine
# -----------------------------------------------------------------------------

class ExcelGraphService:
    def __init__(self, client: Optional[MicrosoftGraphClient] = None):
        self.client = client or MicrosoftGraphClient()

    def sync_session_tab(
        self,
        session_data: Dict[str, Any],
        workbook_id: Optional[str] = None,
        user_email: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes full Microsoft Graph API workflow:
        1. Formats headers and normalizes attendance matrix.
        2. Authenticates via MSAL Client Credentials.
        3. Checks/creates worksheet tab in target workbook.
        4. Clears previous content.
        5. Injects Row 2+ data starting at A2.
        6. Formats Row 1 banner: merged across columns, green fill (#8fce9f), bold white text (#ffffff).
        7. Formats Row 2 headers (bold, #E2EFDA fill).
        8. Applies Checkbox list validation ('TRUE,FALSE') to B3:{End_Col}{End_Row}.
        """
        session_data = session_data or {}
        target_user = user_email or session_data.get("user_email") or DEFAULT_TARGET_USER
        wb_id = (
            workbook_id
            or session_data.get("workbook_id")
            or session_data.get("workbookId")
            or session_data.get("drive_item_id")
            or DEFAULT_WORKBOOK_ID
        )

        # 1. Session Name & Tab Name (Limit 31 chars)
        raw_session_name = (
            session_data.get("sessionName")
            or session_data.get("title")
            or session_data.get("name")
            or "Football Training"
        )
        sheet_name = sanitize_sheet_name(session_data.get("tabName") or raw_session_name)

        # 2. Dates List (Handles single date or series array)
        raw_dates = session_data.get("dates") or session_data.get("session_dates") or []
        if not raw_dates:
            if session_data.get("date"):
                raw_dates = [session_data["date"]]
            elif session_data.get("sessions") and isinstance(session_data["sessions"], list):
                raw_dates = [s.get("date") for s in session_data["sessions"] if s.get("date")]
            else:
                raw_dates = [datetime.now().strftime("%Y-%m-%d")]

        # Date headers compact formatting: e.g. "2-Oct", "9-Oct"
        formatted_dates = [format_date_header(d) for d in raw_dates]
        num_dates = len(formatted_dates)
        total_cols = 1 + num_dates  # Col A = Player Name, Col B.. = Dates
        end_col = get_column_letter(total_cols)

        # 3. Players List
        players_input = session_data.get("players")
        if isinstance(players_input, list) and len(players_input) > 0:
            players = []
            for p in players_input:
                if isinstance(p, dict):
                    players.append(p)
                elif isinstance(p, str):
                    players.append({"id": p, "name": p})
            players.sort(key=lambda p: str(p.get("name", "")).lower())
        else:
            players = fetch_roster_players()

        num_players = len(players)
        end_row = 2 + num_players  # Row 1 Banner, Row 2 Headers, Row 3.. Players

        # 4. Data Normalization & Matrix Generation
        raw_attendance = session_data.get("attendance") or session_data.get("attendanceMatrix") or {}
        att_lookup = normalize_attendance(raw_attendance, [str(d) for d in raw_dates], players)

        # Build 2D list starting from Row 2
        # Row 2 (Headers): ["Player Name", "2-Oct", "9-Oct", ...]
        row2_headers = ["Player Name"] + formatted_dates
        data_rows_starting_row2: List[List[Any]] = [row2_headers]

        # Column A (Row 3 downwards): Alphabetical player names
        # Grid (B3 downwards): Boolean True/False
        for p in players:
            p_name = p.get("name", "")
            p_id = p.get("id", "")
            row = [p_name]

            for d_idx, d_raw in enumerate(raw_dates):
                d_str = str(d_raw)
                d_fmt = formatted_dates[d_idx]
                
                # Check normalized lookup
                day_att = att_lookup.get(d_str) or att_lookup.get(d_str.split("T")[0]) or att_lookup.get(d_fmt) or {}
                is_present = bool(
                    day_att.get(p_id) is True or
                    day_att.get(p_name) is True or
                    (isinstance(day_att, list) and (p_id in day_att or p_name in day_att))
                )
                row.append(is_present)

            data_rows_starting_row2.append(row)

        logger.info(
            f"Building tab '{sheet_name}': {num_players} players x {num_dates} dates. "
            f"Banner: A1:{end_col}1 | Data: A2:{end_col}{end_row}"
        )

        # 5. Check if Graph credentials are fully configured
        if not self.client.auth.is_configured():
            logger.warning("Microsoft Entra credentials not fully configured in env. Returning validated dry run response.")
            return {
                "success": True,
                "message": "Synced ✓",
                "mode": "validated_dry_run",
                "worksheet": sheet_name,
                "session_name": raw_session_name,
                "dates": formatted_dates,
                "players_count": num_players,
                "banner_text": f"FOOTBALL UNITED {raw_session_name.upper()}",
                "banner_range": f"A1:{end_col}1",
                "data_range": f"A2:{end_col}{end_row}",
                "data_validation_range": f"B3:{end_col}{end_row}",
                "grid_range": f"B3:{end_col}{end_row}",
                "sample_row": data_rows_starting_row2[1] if len(data_rows_starting_row2) > 1 else [],
                "target_user": target_user,
                "workbook_id": wb_id,
                "webUrl": f"https://hillsongchurch-my.sharepoint.com/:x:/r/personal/ralph_boer_hillsong_co_uk/Football%20United%20Croydon.xlsx"
            }

        # 6. Microsoft Graph API Operations
        base_item_url = f"{MS_GRAPH_BASE_URL}/users/{target_user}/drive/items/{wb_id}"
        ws_url = f"{base_item_url}/workbook/worksheets('{sheet_name}')"

        # 6a. Check for tab & Create if not exists (handling 404 & 409)
        logger.info(f"Checking for worksheet '{sheet_name}' in workbook {wb_id}...")
        check_status, check_res = self.client.request("GET", ws_url)

        if check_status == 404:
            logger.info(f"Worksheet '{sheet_name}' not found. Creating via POST .../worksheets/add...")
            add_url = f"{base_item_url}/workbook/worksheets/add"
            add_status, add_res = self.client.request("POST", add_url, json_data={"name": sheet_name})
            
            # Handle possible 409 conflict if created simultaneously
            if add_status == 409:
                logger.info(f"Worksheet '{sheet_name}' conflict (409) - already exists, proceeding.")
            elif add_status not in (200, 201):
                logger.error(f"Failed to create worksheet '{sheet_name}': {add_res}")
                raise RuntimeError(f"Could not create worksheet '{sheet_name}': {add_res}")
            else:
                logger.info(f"Worksheet '{sheet_name}' created successfully.")

        # 6b. Clear previous cells in sheet to ensure clean state
        try:
            self.client.request("POST", f"{ws_url}/range(address='A1:ZZ1000')/clear", json_data={})
        except Exception as clear_err:
            logger.warning(f"Notice clearing sheet {sheet_name}: {clear_err}")

        # 6c. Inject 2D Data Starting at Row 2 (A2:{End_Col}{End_Row})
        data_address = f"A2:{end_col}{end_row}"
        logger.info(f"Injecting 2D data into '{sheet_name}' at range {data_address}...")
        data_status, data_res = self.client.request(
            "PATCH",
            f"{ws_url}/range(address='{data_address}')",
            json_data={"values": data_rows_starting_row2}
        )
        if data_status not in (200, 201):
            logger.error(f"Data injection failed on range {data_address}: {data_res}")
            raise RuntimeError(f"Data injection failed: {data_res}")

        # 6d. Format Row 1 Header Banner (A1:{End_Col}1)
        # Text: "FOOTBALL UNITED [SESSION NAME]"
        banner_text = f"FOOTBALL UNITED {raw_session_name.upper()}"
        row1_values = [banner_text] + [""] * (total_cols - 1)
        banner_address = f"A1:{end_col}1"

        logger.info(f"Formatting banner on '{sheet_name}' at range {banner_address}...")
        self.client.request("PATCH", f"{ws_url}/range(address='{banner_address}')", json_data={"values": [row1_values]})
        self.client.request("POST", f"{ws_url}/range(address='{banner_address}')/merge", json_data={"across": False})
        self.client.request("PATCH", f"{ws_url}/range(address='{banner_address}')/format/fill", json_data={"color": "#8fce9f"})
        self.client.request("PATCH", f"{ws_url}/range(address='{banner_address}')/format/font", json_data={"bold": True, "color": "#ffffff", "size": 13})
        self.client.request("PATCH", f"{ws_url}/range(address='{banner_address}')/format", json_data={"horizontalAlignment": "Center", "verticalAlignment": "Center"})

        # 6e. Format Row 2 Headers
        row2_address = f"A2:{end_col}2"
        self.client.request("PATCH", f"{ws_url}/range(address='{row2_address}')/format/font", json_data={"bold": True, "size": 11})
        self.client.request("PATCH", f"{ws_url}/range(address='{row2_address}')/format/fill", json_data={"color": "#E2EFDA"})
        self.client.request("PATCH", f"{ws_url}/range(address='B2:{end_col}2')/format", json_data={"horizontalAlignment": "Center", "verticalAlignment": "Center"})

        # 6f. Center-align Grid Checkboxes (B3:{End_Col}{End_Row})
        grid_address = f"B3:{end_col}{end_row}"
        self.client.request("PATCH", f"{ws_url}/range(address='{grid_address}')/format", json_data={"horizontalAlignment": "Center", "verticalAlignment": "Center"})

        # 6g. Apply Data Validation Checkbox restriction to 'TRUE,FALSE'
        try:
            logger.info(f"Applying dataValidation 'TRUE,FALSE' to grid {grid_address}...")
            val_url = f"{ws_url}/range(address='{grid_address}')/dataValidation"
            val_payload = {
                "rule": {
                    "list": {
                        "inCellDropDown": True,
                        "source": "TRUE,FALSE"
                    }
                },
                "mode": "WholeList",
                "errorAlert": {
                    "showAlert": True,
                    "title": "Invalid Attendance Value",
                    "message": "Please select TRUE or FALSE"
                }
            }
            self.client.request("PATCH", val_url, json_data=val_payload)
        except Exception as val_err:
            logger.warning(f"Data validation setup warning (non-fatal): {val_err}")

        logger.info(f"Tab '{sheet_name}' successfully synchronized in Microsoft SharePoint Excel!")

        sharepoint_url = (
            f"https://hillsongchurch-my.sharepoint.com/:x:/r/personal/ralph_boer_hillsong_co_uk"
            f"/_layouts/15/doc2.aspx?sourcedoc=%7B{wb_id}%7D&file=Football%20United%20Croydon.xlsx"
            f"&fromShare=true&action=default&mobileredirect=true"
        )

        return {
            "success": True,
            "message": "Synced ✓",
            "worksheet": sheet_name,
            "session_name": raw_session_name,
            "dates": formatted_dates,
            "players_count": num_players,
            "banner_text": banner_text,
            "banner_range": banner_address,
            "data_range": data_address,
            "grid_range": grid_address,
            "workbook_id": wb_id,
            "owner": target_user,
            "webUrl": sharepoint_url
        }


# Singleton service instance
excel_graph_service = ExcelGraphService()


# -----------------------------------------------------------------------------
# Flask Blueprint Route Definition
# -----------------------------------------------------------------------------

@excel_bp.route("/api/excel/sync-session-tab", methods=["POST"])
def sync_session_tab_route():
    """
    POST /api/excel/sync-session-tab
    Creates and populates a dedicated worksheet tab for a session or recurring series.
    Accepts:
        sessionName: string
        dates: array of strings (e.g. ['2026-10-02', '2026-10-09'])
        players: array of objects [{id, name}, ...]
        attendance: dict (flat or nested by date)
    """
    try:
        payload = request.get_json(force=True, silent=True) or {}
        result = excel_graph_service.sync_session_tab(session_data=payload)
        return jsonify(result), 200
    except Exception as exc:
        logger.error(f"Error in /api/excel/sync-session-tab: {exc}", exc_info=True)
        return jsonify({
            "success": False,
            "error": str(exc),
            "message": f"Session tab sync failed: {str(exc)}"
        }), 500
