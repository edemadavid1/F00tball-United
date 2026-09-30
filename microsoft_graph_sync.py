"""
microsoft_graph_sync.py

Microsoft Graph API & SharePoint Excel Attendance Synchronization Service
Target Tenant & Drive Owner: ralph.boer@hillsong.co.uk
=============================================================================
This module provides a production-ready integration between a Flask backend,
Firestore/local sports data, and Microsoft 365 (SharePoint / OneDrive).

Key Capabilities:
1. MSAL Client Credentials Flow authentication using Azure AD / Entra ID.
2. Robust HTTP request handling with automatic retry & exponential backoff for rate limits (HTTP 429).
3. Asynchronous SharePoint template duplication using the Graph API Copy endpoint with polling.
4. Excel workbook manipulation via Microsoft Graph REST endpoints:
   - Updates worksheet "Player Attendance"
   - Writes session title and date into A1
   - Writes session dates in row 2 (B2 onwards)
   - Writes player list in Column A (A3 downwards)
   - Injects 2D boolean array (True/False) for attendance checkboxes into the grid (B3 onwards)
5. Flask Blueprint exposing POST /api/sync-attendance
"""

import os
import time
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import json

try:
    import requests
except ImportError:
    requests = None

try:
    import msal
except ImportError:
    msal = None

try:
    from flask import Blueprint, request, jsonify, current_app
except ImportError:
    class MockBlueprint:
        def __init__(self, name, import_name):
            self.name = name
            self.import_name = import_name
            self.routes = {}

        def route(self, rule, **options):
            def decorator(f):
                self.routes[rule] = f
                return f
            return decorator

    Blueprint = MockBlueprint
    request = None
    def jsonify(*args, **kwargs):
        return args[0] if args else kwargs
    current_app = None

# Set up dedicated logger
logger = logging.getLogger("microsoft_graph_sync")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] [MSGraphSync] %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
logger.setLevel(logging.INFO)

# ============================================================================
# CONFIGURATION & CONSTANTS
# ============================================================================
TARGET_USER_EMAIL = os.getenv("TARGET_USER_EMAIL", "ralph.boer@hillsong.co.uk")
MS_GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0"
DEFAULT_WORKSHEET_NAME = "Player Attendance"
DEFAULT_TARGET_FOLDER = "WeeklyReports"

# Create Flask Blueprint
sync_bp = Blueprint("microsoft_graph_sync", __name__)


# ============================================================================
# 1. AUTHENTICATION SERVICE (MSAL)
# ============================================================================
class MicrosoftGraphAuth:
    """
    Manages OAuth2 Client Credentials token acquisition via MSAL.
    Supports in-memory token caching and automatic expiration tracking.
    """
    def __init__(self):
        self.client_id = os.getenv("MS_CLIENT_ID") or os.getenv("AZURE_CLIENT_ID")
        self.client_secret = os.getenv("MS_CLIENT_SECRET") or os.getenv("AZURE_CLIENT_SECRET")
        self.tenant_id = os.getenv("MS_TENANT_ID") or os.getenv("AZURE_TENANT_ID")
        
        self.authority = f"https://login.microsoftonline.com/{self.tenant_id}" if self.tenant_id else None
        self.scopes = ["https://graph.microsoft.com/.default"]
        
        self._cached_token: Optional[str] = None
        self._token_expires_at: float = 0.0

    def is_configured(self) -> bool:
        """Checks if all required Azure AD / Entra ID environment variables exist."""
        return bool(self.client_id and self.client_secret and self.tenant_id)

    def get_access_token(self) -> str:
        """
        Acquires an app-only access token for Microsoft Graph.
        Caches the token in memory until 5 minutes before expiration.
        """
        now = time.time()
        # Return valid cached token if within validity window (buffered by 300s)
        if self._cached_token and now < (self._token_expires_at - 300):
            return self._cached_token

        if not self.is_configured():
            missing = [k for k in ["MS_CLIENT_ID", "MS_CLIENT_SECRET", "MS_TENANT_ID"] if not os.getenv(k)]
            raise ValueError(f"Missing required Microsoft Entra ID credentials in environment: {', '.join(missing)}")

        logger.info(f"Acquiring new Microsoft Graph access token for Tenant: {self.tenant_id}")
        
        app = msal.ConfidentialClientApplication(
            self.client_id,
            client_credential=self.client_secret,
            authority=self.authority
        )

        result = app.acquire_token_for_client(scopes=self.scopes)

        if "access_token" in result:
            self._cached_token = result["access_token"]
            expires_in = result.get("expires_in", 3600)
            self._token_expires_at = now + expires_in
            logger.info("Successfully acquired Microsoft Graph access token.")
            return self._cached_token
        else:
            error_code = result.get("error", "unknown_error")
            error_desc = result.get("error_description", "No description provided by MSAL")
            logger.error(f"MSAL authentication failed: {error_code} - {error_desc}")
            raise PermissionError(f"Failed to authenticate with Microsoft Graph API: {error_code} ({error_desc})")


# Singleton Auth Manager
auth_service = MicrosoftGraphAuth()


# ============================================================================
# 2. RESILIENT GRAPH API HTTP CLIENT (Rate Limits & Retries)
# ============================================================================
class MicrosoftGraphClient:
    """
    HTTP Wrapper for Microsoft Graph API requests with built-in:
    - Bearer authorization header injection
    - Automatic exponential backoff on HTTP 429 (Rate Limit) and 503/504
    - Timeout handling
    """
    def __init__(self, auth: MicrosoftGraphAuth, user_email: str = TARGET_USER_EMAIL):
        self.auth = auth
        self.user_email = user_email
        self.base_url = MS_GRAPH_BASE_URL
        self.user_drive_url = f"{self.base_url}/users/{self.user_email}/drive"

    def request(
        self,
        method: str,
        url: str,
        json_data: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        max_retries: int = 4,
        timeout: int = 30
    ) -> Any:
        """
        Executes an HTTP request to Microsoft Graph with 429 rate limit backoff.
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
                response = requests.request(
                    method=method,
                    url=url,
                    json=json_data,
                    headers=req_headers,
                    timeout=timeout
                )

                # Rate Limit (429) or Transient Server Error (503, 504)
                if response.status_code == 429 or response.status_code in [503, 504]:
                    retry_after_header = response.headers.get("Retry-After")
                    sleep_time = int(retry_after_header) if (retry_after_header and retry_after_header.isdigit()) else backoff_delay
                    logger.warning(
                        f"Graph API rate limited/transient status {response.status_code} on {method} {url}. "
                        f"Backing off for {sleep_time} seconds (attempt {attempt}/{max_retries})."
                    )
                    time.sleep(sleep_time)
                    backoff_delay *= 2
                    continue

                return response

            except requests.exceptions.RequestException as req_err:
                logger.warning(f"Network error on {method} {url}: {req_err}. Attempt {attempt}/{max_retries}")
                if attempt > max_retries:
                    raise
                time.sleep(backoff_delay)
                backoff_delay *= 2

        raise RuntimeError(f"Exceeded max retries ({max_retries}) for Graph API call to {url}")


# Singleton Graph Client
graph_client = MicrosoftGraphClient(auth_service)


# ============================================================================
# 3. GRAPH API FILE OPERATIONS (COPY TEMPLATE & ASYNC MONITORING)
# ============================================================================
def copy_sharepoint_template(
    template_file_id: str,
    target_filename: str,
    target_folder: str = DEFAULT_TARGET_FOLDER,
    client: MicrosoftGraphClient = graph_client,
    max_wait_seconds: int = 45
) -> Tuple[str, str]:
    """
    Duplicates an existing template Excel workbook located in ralph.boer@hillsong.co.uk's drive.
    
    1. Sends POST /users/{user}/drive/items/{template_id}/copy
    2. Receives HTTP 202 Accepted with a 'Location' header pointing to the async job monitor.
    3. Polls the monitor URL until the operation status is 'completed'.
    4. Extracts and returns (new_file_id, web_url).
    """
    logger.info(f"Initiating copy of template '{template_file_id}' to '{target_filename}' in folder '{target_folder}'...")

    # Ensure destination folder exists or resolve reference
    folder_ref = {"path": f"/drive/root:/{target_folder}"}
    
    copy_url = f"{client.user_drive_url}/items/{template_file_id}/copy"
    payload = {
        "name": target_filename,
        "parentReference": folder_ref
    }

    res = client.request("POST", copy_url, json_data=payload)

    if res.status_code not in [200, 201, 202]:
        logger.error(f"Copy request failed with status {res.status_code}: {res.text}")
        raise RuntimeError(f"Graph API copy request failed ({res.status_code}): {res.text}")

    # Synchronous copy response (rare, but supported)
    if res.status_code in [200, 201]:
        item_info = res.json()
        new_id = item_info.get("id")
        web_url = item_info.get("webUrl", "")
        logger.info(f"Template copied synchronously. New File ID: {new_id}")
        return new_id, web_url

    # Asynchronous copy: Graph returns 202 Accepted with a Location header monitor URL
    monitor_url = res.headers.get("Location")
    if not monitor_url:
        raise RuntimeError("Graph API returned 202 Accepted for copy, but missing 'Location' header.")

    logger.info(f"Asynchronous copy started. Polling monitor: {monitor_url}")

    start_time = time.time()
    poll_interval = 2.0

    while (time.time() - start_time) < max_wait_seconds:
        time.sleep(poll_interval)
        monitor_res = client.request("GET", monitor_url)

        if monitor_res.status_code != 200:
            logger.warning(f"Polling monitor returned status {monitor_res.status_code}, retrying...")
            continue

        job_status = monitor_res.json()
        status_val = job_status.get("status", "").lower()
        percentage = job_status.get("percentageComplete", 0)
        logger.info(f"Copy job status: '{status_val}' ({percentage}% complete)")

        if status_val == "completed":
            # The job result contains the resourceId of the copied drive item
            new_file_id = job_status.get("resourceId")
            if not new_file_id:
                # Some Graph responses nest the target item inside 'item'
                new_file_id = job_status.get("item", {}).get("id")

            if not new_file_id:
                # Fallback: Query target item by filename in destination folder
                logger.info(f"Copy reported completed without resourceId. Resolving item path: /{target_folder}/{target_filename}")
                lookup_url = f"{client.user_drive_url}/root:/{target_folder}/{target_filename}"
                item_lookup = client.request("GET", lookup_url)
                if item_lookup.status_code == 200:
                    info = item_lookup.json()
                    return info["id"], info.get("webUrl", "")
                raise RuntimeError("Copy job completed but could not extract new item ID from Graph API.")

            # Retrieve complete item details to obtain webUrl
            item_details_res = client.request("GET", f"{client.user_drive_url}/items/{new_file_id}")
            web_url = ""
            if item_details_res.status_code == 200:
                web_url = item_details_res.json().get("webUrl", "")

            logger.info(f"Copy successfully completed! New File ID: {new_file_id}, WebUrl: {web_url}")
            return new_file_id, web_url

        elif status_val in ["failed", "canceled"]:
            error_details = job_status.get("error", "No error details provided")
            raise RuntimeError(f"Asynchronous copy job {status_val}: {error_details}")

    raise TimeoutError(f"Copy operation timed out after {max_wait_seconds} seconds waiting for {target_filename}.")


def rename_drive_file(
    file_id: str,
    new_name: str,
    client: MicrosoftGraphClient = graph_client
) -> str:
    """
    Renames a drive item via PATCH /users/{user}/drive/items/{file_id}.
    Returns the updated name.
    """
    logger.info(f"Renaming file ID '{file_id}' to '{new_name}'...")
    url = f"{client.user_drive_url}/items/{file_id}"
    res = client.request("PATCH", url, json_data={"name": new_name})
    if res.status_code not in [200, 201]:
        raise RuntimeError(f"Failed to rename file {file_id} to {new_name}: {res.text}")
    return res.json().get("name", new_name)


# ============================================================================
# 4. EXCEL WORKBOOK REST MANIPULATION
# ============================================================================
def _get_column_letter(col_idx: int) -> str:
    """
    Converts 1-indexed column number to Excel column letters (1 -> 'A', 2 -> 'B', 27 -> 'AA').
    """
    result = ""
    while col_idx > 0:
        col_idx, remainder = divmod(col_idx - 1, 26)
        result = chr(65 + remainder) + result
    return result


def sync_attendance_to_excel_workbook(
    file_id: str,
    session_name: str,
    session_date: str,
    players: List[Dict[str, Any]],
    all_session_dates: Optional[List[str]] = None,
    sheet_name: str = DEFAULT_WORKSHEET_NAME,
    client: MicrosoftGraphClient = graph_client
) -> Dict[str, Any]:
    """
    Populates attendance records into the 'Player Attendance' worksheet of the duplicated file
    using Microsoft Graph Excel Workbook REST endpoints.

    Target Layout Specification:
    --------------------------------------------------------------------------------------
    - Row 1 (A1:T1): Merged Green Banner: "FOOTBALL UNITED [SESSION NAME] - [DATE]"
    - Row 2:
      * Cell A2: "Player Name"
      * Cells B2 onwards (e.g., B2, C2, D2...): Session dates (e.g., "2-Oct", "9-Oct")
    - Column A (A3 downwards): Player names from the players list
    - Grid (B3 onwards): 2D array of booleans (True/False) representing attendance checkboxes
    --------------------------------------------------------------------------------------
    """
    logger.info(f"Beginning Excel workbook injection for file '{file_id}' on worksheet '{sheet_name}'...")

    # Standardize session dates columns
    if not all_session_dates:
        # Default schedule of dates or use session_date
        all_session_dates = ["16-Jul", "23-Jul", "30-Jul", "06-Aug", "13-Aug", "20-Aug", "27-Aug", "03-Sep", "10-Sep", "17-Sep", "24-Sep"]
        # Format input session_date (e.g. 2026-10-02 -> 02-Oct)
        try:
            parsed_dt = datetime.strptime(session_date[:10], "%Y-%m-%d")
            formatted_date_col = parsed_dt.strftime("%d-%b")
            if formatted_date_col not in all_session_dates:
                all_session_dates.append(formatted_date_col)
        except Exception:
            if session_date not in all_session_dates:
                all_session_dates.append(session_date)

    # Calculate column dimensions
    total_cols = max(len(all_session_dates) + 1, 20)  # Standard template covers up to Column T (20 cols)
    end_col_letter = _get_column_letter(total_cols)

    ws_base = f"{client.user_drive_url}/items/{file_id}/workbook/worksheets('{sheet_name}')"

    # Step 1: Update Row 1 Header Banner (A1:{end_col_letter}1)
    banner_text = f"FOOTBALL UNITED {session_name.upper()} - {session_date}"
    row1_values = [banner_text] + [""] * (total_cols - 1)
    range_r1 = f"A1:{end_col_letter}1"
    
    logger.info(f"Writing header banner into {range_r1}")
    client.request("PATCH", f"{ws_base}/range(address='{range_r1}')", json_data={"values": [row1_values]})
    
    # Merge & format banner row
    try:
        client.request("POST", f"{ws_base}/range(address='{range_r1}')/merge", json_data={"across": False})
        client.request("PATCH", f"{ws_base}/range(address='{range_r1}')/format/fill", json_data={"color": "#6AA84F"})  # Soft Green
        client.request("PATCH", f"{ws_base}/range(address='{range_r1}')/format/font", json_data={
            "color": "#FFFFFF",
            "bold": True,
            "size": 13
        })
        client.request("PATCH", f"{ws_base}/range(address='{range_r1}')/format", json_data={
            "horizontalAlignment": "Center",
            "verticalAlignment": "Center"
        })
    except Exception as fmt_err:
        logger.warning(f"Row 1 styling notice (non-fatal): {fmt_err}")

    # Step 2: Update Row 2 Subheaders (A2: Player Name, B2 onwards: Session Dates)
    row2_values = ["Player Name"] + all_session_dates
    while len(row2_values) < total_cols:
        row2_values.append("")
    
    range_r2 = f"A2:{end_col_letter}2"
    logger.info(f"Writing column headers into {range_r2}")
    client.request("PATCH", f"{ws_base}/range(address='{range_r2}')", json_data={"values": [row2_values]})
    
    try:
        client.request("PATCH", f"{ws_base}/range(address='{range_r2}')/format/fill", json_data={"color": "#E2EFDA"})
        client.request("PATCH", f"{ws_base}/range(address='{range_r2}')/format/font", json_data={
            "color": "#107C41",
            "bold": True,
            "size": 11
        })
        client.request("PATCH", f"{ws_base}/range(address='{range_r2}')/format", json_data={
            "horizontalAlignment": "Center",
            "verticalAlignment": "Center"
        })
    except Exception as fmt_err2:
        logger.warning(f"Row 2 styling notice (non-fatal): {fmt_err2}")

    # Step 3: Populate Player Names & Boolean Attendance Grid
    num_players = len(players)
    if num_players == 0:
        logger.info("No players provided in payload; template structure initialized successfully.")
        return {
            "status": "success",
            "players_synced": 0,
            "session_dates": all_session_dates
        }

    start_row = 3
    end_row = start_row + num_players - 1

    # Active session column index in the date list
    active_date_idx = len(all_session_dates) - 1
    try:
        parsed_dt = datetime.strptime(session_date[:10], "%Y-%m-%d")
        f_dt = parsed_dt.strftime("%d-%b")
        if f_dt in all_session_dates:
            active_date_idx = all_session_dates.index(f_dt)
    except Exception:
        pass

    # Build 2D values grid: Column A = name, Columns B.. = boolean True/False
    grid_matrix: List[List[Any]] = []
    player_names_col: List[List[str]] = []

    for p in players:
        p_name = p.get("name", "Unknown Player")
        p_attended = bool(p.get("attended", p.get("isPresent", False)))

        player_names_col.append([p_name])

        # Construct row booleans
        row_bools: List[Any] = []
        for d_idx in range(len(all_session_dates)):
            if d_idx == active_date_idx:
                row_bools.append(p_attended)
            else:
                # Keep other dates default or as provided
                row_bools.append(bool(p.get(f"date_{d_idx}", False)))

        while len(row_bools) < (total_cols - 1):
            row_bools.append(False)

        grid_matrix.append(row_bools)

    # Inject Column A (Player Names)
    range_names = f"A{start_row}:A{end_row}"
    logger.info(f"Injecting {num_players} player names into {range_names}...")
    client.request("PATCH", f"{ws_base}/range(address='{range_names}')", json_data={"values": player_names_col})

    # Inject Grid B3:end_col_end_row (Attendance booleans mapping to checkboxes)
    grid_end_col = _get_column_letter(total_cols)
    range_grid = f"B{start_row}:{grid_end_col}{end_row}"
    logger.info(f"Injecting attendance booleans into {range_grid}...")
    client.request("PATCH", f"{ws_base}/range(address='{range_grid}')", json_data={"values": grid_matrix})

    # Center-align checkboxes
    try:
        client.request("PATCH", f"{ws_base}/range(address='{range_grid}')/format", json_data={
            "horizontalAlignment": "Center",
            "verticalAlignment": "Center"
        })
    except Exception as fmt_err3:
        logger.warning(f"Grid formatting notice: {fmt_err3}")

    logger.info(f"Excel attendance sync completed successfully for {num_players} players.")
    return {
        "status": "success",
        "players_synced": num_players,
        "session_dates_count": len(all_session_dates),
        "range_names": range_names,
        "range_grid": range_grid
    }


# ============================================================================
# 5. FLASK API ENDPOINT: POST /api/sync-attendance
# ============================================================================
@sync_bp.route("/api/sync-attendance", methods=["POST"])
def sync_attendance_endpoint():
    """
    Flask route called by frontend (e.g. syncSessionAttendanceToSharepoint()).

    Expected JSON Request Body:
    {
        "session_id": "sess_102",
        "session_date": "2026-10-02",
        "session_name": "Friday Youth Training",
        "players": [
            {"name": "Jerry Smith", "attended": true},
            {"name": "John Doe", "attended": false}
        ],
        "template_file_id": "optional_existing_template_id"
    }

    Response:
    {
        "success": true,
        "message": "...",
        "filename": "Football_United_Attendance_2026-10-02.xlsx",
        "file_id": "...",
        "webUrl": "https://hillsongchurch-my.sharepoint.com/...",
        "owner": "ralph.boer@hillsong.co.uk"
    }
    """
    try:
        payload = request.get_json(silent=True) or {}

        session_id = payload.get("session_id") or payload.get("id") or "sess_default"
        session_date = payload.get("session_date") or payload.get("date") or datetime.now().strftime("%Y-%m-%d")
        session_name = payload.get("session_name") or payload.get("sessionName") or "Football Training"
        players = payload.get("players", [])

        # Format standardized filename: "Football_United_Attendance_[Date].xlsx"
        clean_date = session_date.replace("/", "-").replace(" ", "_")
        target_filename = f"Football_United_Attendance_{clean_date}.xlsx"

        # Template ID from payload, environment, or default fallback
        template_file_id = (
            payload.get("template_file_id")
            or payload.get("templateId")
            or os.getenv("MS_TEMPLATE_FILE_ID")
        )

        logger.info(
            f"Received sync request for Session: '{session_name}' ({session_date}) - "
            f"{len(players)} players provided. Target File: {target_filename}"
        )

        # 1. Verification of Microsoft Entra ID Credentials
        if not auth_service.is_configured():
            logger.warning("Microsoft Entra ID credentials missing. Providing guidance.")
            return jsonify({
                "success": False,
                "error": "Microsoft 365 Entra ID credentials are not configured.",
                "missing_vars": ["MS_CLIENT_ID", "MS_CLIENT_SECRET", "MS_TENANT_ID"],
                "owner": TARGET_USER_EMAIL,
                "message": "Set MS_CLIENT_ID, MS_CLIENT_SECRET, and MS_TENANT_ID in .env to enable SharePoint synchronization."
            }), 400

        # 2. Duplicate or Resolve SharePoint Template
        created_file_id = None
        sharepoint_web_url = None

        if template_file_id:
            try:
                created_file_id, sharepoint_web_url = copy_sharepoint_template(
                    template_file_id=template_file_id,
                    target_filename=target_filename,
                    target_folder=DEFAULT_TARGET_FOLDER,
                    client=graph_client
                )
            except Exception as copy_err:
                logger.error(f"Copy operation failed: {copy_err}. Attempting direct file creation fallback.")

        # If no template ID provided or copy failed, create workbook directly in target user's OneDrive
        if not created_file_id:
            import io
            import openpyxl
            
            logger.info(f"Creating workbook directly in ralph.boer's drive: /WeeklyReports/{target_filename}")
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = DEFAULT_WORKSHEET_NAME
            
            stream = io.BytesIO()
            wb.save(stream)
            stream.seek(0)

            upload_url = f"{graph_client.user_drive_url}/root:/{DEFAULT_TARGET_FOLDER}/{target_filename}:/content"
            upload_res = requests.put(
                upload_url,
                headers={
                    "Authorization": f"Bearer {auth_service.get_access_token()}",
                    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                },
                data=stream.getvalue(),
                timeout=40
            )

            if upload_res.status_code in [200, 201]:
                info = upload_res.json()
                created_file_id = info["id"]
                sharepoint_web_url = info.get("webUrl")
                logger.info(f"Direct workbook created successfully with ID: {created_file_id}")
            else:
                raise RuntimeError(f"Could not create file in SharePoint ({upload_res.status_code}): {upload_res.text}")

        # 3. Rename file if required to ensure exact filename convention
        try:
            rename_drive_file(created_file_id, target_filename, client=graph_client)
        except Exception as rename_err:
            logger.warning(f"File rename notice (already correct or permission): {rename_err}")

        # 4. Inject Attendance Data via Microsoft Graph REST API
        sync_result = sync_attendance_to_excel_workbook(
            file_id=created_file_id,
            session_name=session_name,
            session_date=session_date,
            players=players,
            sheet_name=DEFAULT_WORKSHEET_NAME,
            client=graph_client
        )

        default_sharepoint_url = (
            f"https://hillsongchurch-my.sharepoint.com/:x:/r/personal/ralph_boer_hillsong_co_uk"
            f"/_layouts/15/doc2.aspx?file={target_filename}"
        )

        return jsonify({
            "success": True,
            "message": f"Successfully synchronized attendance to SharePoint Excel file for {session_name}.",
            "filename": target_filename,
            "file_id": created_file_id,
            "webUrl": sharepoint_web_url or default_sharepoint_url,
            "owner": TARGET_USER_EMAIL,
            "sync_details": sync_result
        }), 200

    except Exception as e:
        logger.exception(f"Unhandled error in /api/sync-attendance: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "owner": TARGET_USER_EMAIL
        }), 500


# ============================================================================
# 6. ATTENDANCE MATRIX TRANSFORMATION & SHAREPOINT EXCEL EXPORT
# ============================================================================
def calculate_excel_range(start_col: int, start_row: int, num_cols: int, num_rows: int) -> str:
    """
    Dynamically computes an Excel range string given dimensions.
    e.g. start_col=1, start_row=1, num_cols=7, num_rows=25 -> 'A1:G25'
    """
    if num_cols < 1 or num_rows < 1:
        return "A1:A1"
    start_letter = _get_column_letter(start_col)
    end_letter = _get_column_letter(start_col + num_cols - 1)
    end_row = start_row + num_rows - 1
    return f"{start_letter}{start_row}:{end_letter}{end_row}"


def transform_attendance_matrix_to_2d_array(
    session_dates: List[str],
    attendance_data: List[Dict[str, Any]],
    boolean_format: str = "Yes/No"
) -> List[List[Any]]:
    """
    Transforms matrix JSON payload into a strict 2D array (list of lists)
    required by the Microsoft Graph API Excel endpoint:
    - Row 1 (Headers): ["Player Name", "Squad", "Consent"] + session_dates
    - Rows 2+ (Data): [player['name'], player['squad'], player['consent']] + [attendance_booleans]
    - Attendance booleans: Converted to "Yes"/"No" (default) or "1"/"0"
    - Strict uniformity: Every row is guaranteed to be perfectly equal in length.
    """
    if not isinstance(session_dates, list):
        session_dates = []

    # Clean header dates
    clean_session_dates = [str(d).strip() for d in session_dates]
    header_row = ["Player Name", "Squad", "Consent"] + clean_session_dates
    expected_col_count = len(header_row)

    matrix_2d: List[List[Any]] = [header_row]

    if not isinstance(attendance_data, list):
        attendance_data = []

    is_numeric_format = boolean_format.strip().lower() in ["1/0", "numeric", "number", "binary"]
    is_raw_boolean = boolean_format.strip().lower() in ["true/false", "boolean", "bool"]

    for player in attendance_data:
        if not isinstance(player, dict):
            continue

        p_name = str(
            player.get("name")
            or player.get("player_name")
            or player.get("playerName")
            or player.get("player")
            or "Unknown Player"
        ).strip()

        p_squad = str(
            player.get("squad")
            or player.get("team")
            or player.get("squad_name")
            or "Croydon Squad"
        ).strip()

        raw_consent = player.get("consent")
        if raw_consent is None:
            raw_consent = player.get("consentStatus") or player.get("consent_status")

        # Standardize consent status
        if isinstance(raw_consent, bool):
            p_consent = "Verified" if raw_consent else "Pending"
        elif isinstance(raw_consent, str):
            p_consent = "Verified" if raw_consent.strip().lower() in ["verified", "yes", "true", "approved"] else raw_consent.strip().title()
        else:
            p_consent = "Pending"

        # Resolve attendance statuses matching the dates
        raw_att = player.get("attendance")
        if raw_att is None:
            raw_att = (
                player.get("attendance_statuses")
                or player.get("statuses")
                or player.get("sessionPresence")
                or player.get("presence")
            )

        att_cells = []
        for idx, date_str in enumerate(clean_session_dates):
            is_present = False

            if isinstance(raw_att, dict):
                # Look up by date string or column index
                val = raw_att.get(date_str)
                if val is None:
                    val = raw_att.get(str(idx))
                is_present = bool(val)

            elif isinstance(raw_att, list):
                if idx < len(raw_att):
                    item = raw_att[idx]
                    if isinstance(item, dict):
                        is_present = bool(
                            item.get("isPresent",
                            item.get("attended",
                            item.get("present", False)))
                        )
                    else:
                        is_present = bool(item)

            else:
                # Direct attribute lookup on player dict
                is_present = bool(player.get(date_str, False))

            # Convert boolean value to required representation
            if is_numeric_format:
                att_cells.append(1 if is_present else 0)
            elif is_raw_boolean:
                att_cells.append(True if is_present else False)
            else:
                att_cells.append("Yes" if is_present else "No")

        row = [p_name, p_squad, p_consent] + att_cells

        # Ensure strict uniform length across all rows
        if len(row) < expected_col_count:
            pad_val = 0 if is_numeric_format else (False if is_raw_boolean else "No")
            row.extend([pad_val] * (expected_col_count - len(row)))
        elif len(row) > expected_col_count:
            row = row[:expected_col_count]

        matrix_2d.append(row)

    return matrix_2d


def export_attendance_matrix_to_sharepoint_excel(
    session_dates: List[str],
    attendance_data: List[Dict[str, Any]],
    template_file_id: Optional[str] = None,
    sheet_name: str = DEFAULT_WORKSHEET_NAME,
    filename_prefix: str = "Football_United_Croydon_Attendance_Matrix",
    boolean_format: str = "Yes/No",
    target_folder: str = DEFAULT_TARGET_FOLDER,
    client: MicrosoftGraphClient = graph_client
) -> Dict[str, Any]:
    """
    Complete Microsoft Graph API attendance matrix export pipeline:
    1. Authenticates via Client Credentials Flow (MSAL).
    2. Duplicates master template in ralph.boer@hillsong.co.uk drive (or creates fallback workbook).
    3. Transforms JSON payload into strict 2D array.
    4. Dynamically calculates Excel range (e.g. A1:G25).
    5. Makes PATCH request to workbook/worksheets/{sheet_name}/range(address='{calculated_range}').
    6. Formats header banner and grid styling.
    """
    logger.info(
        f"Exporting attendance matrix to SharePoint for {len(attendance_data)} players "
        f"across {len(session_dates)} dates..."
    )

    # 1. Transform matrix into strict 2D array
    matrix_2d = transform_attendance_matrix_to_2d_array(
        session_dates=session_dates,
        attendance_data=attendance_data,
        boolean_format=boolean_format
    )

    num_rows = len(matrix_2d)
    num_cols = len(matrix_2d[0]) if num_rows > 0 else 0

    if num_rows == 0 or num_cols == 0:
        raise ValueError("Cannot export empty attendance matrix: 0 rows or columns.")

    # 2. Dynamically calculate Excel range address
    calculated_range = calculate_excel_range(
        start_col=1,
        start_row=1,
        num_cols=num_cols,
        num_rows=num_rows
    )
    logger.info(f"Dynamically calculated Excel range: {calculated_range} ({num_rows} rows x {num_cols} cols)")

    # 3. Prepare target filename
    today_str = datetime.now().strftime("%Y-%m-%d")
    target_filename = f"{filename_prefix}_{today_str}.xlsx"

    # 4. Resolve Template File & Duplicate to ralph.boer@hillsong.co.uk drive
    created_file_id = None
    sharepoint_web_url = None

    if template_file_id:
        try:
            created_file_id, sharepoint_web_url = copy_sharepoint_template(
                template_file_id=template_file_id,
                target_filename=target_filename,
                target_folder=target_folder,
                client=client
            )
        except Exception as copy_err:
            logger.warning(f"Template copy notice: {copy_err}. Initializing direct workbook creation.")

    if not created_file_id:
        import io
        import openpyxl

        logger.info(f"Creating direct Excel workbook in ralph.boer's drive: /{target_folder}/{target_filename}")
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = sheet_name

        stream = io.BytesIO()
        wb.save(stream)
        stream.seek(0)

        upload_url = f"{client.user_drive_url}/root:/{target_folder}/{target_filename}:/content"
        upload_res = client.request(
            method="PUT",
            url=upload_url,
            headers={
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            }
        )

        # Requests PUT with data stream
        token = client.auth.get_access_token()
        upload_res = requests.put(
            upload_url,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            },
            data=stream.getvalue(),
            timeout=40
        )

        if upload_res.status_code in [200, 201]:
            info = upload_res.json()
            created_file_id = info["id"]
            sharepoint_web_url = info.get("webUrl")
            logger.info(f"Direct Excel workbook created successfully with ID: {created_file_id}")
        else:
            raise RuntimeError(
                f"Failed to create Excel file in ralph.boer drive ({upload_res.status_code}): {upload_res.text}"
            )

    # 5. Check and resolve worksheet
    worksheets_url = f"{client.user_drive_url}/items/{created_file_id}/workbook/worksheets"
    ws_res = client.request("GET", worksheets_url)
    resolved_sheet_name = sheet_name

    if ws_res.status_code == 200:
        sheets_list = ws_res.json().get("value", [])
        sheet_names = [s.get("name") for s in sheets_list if s.get("name")]
        if sheet_name in sheet_names:
            resolved_sheet_name = sheet_name
        elif sheet_names:
            resolved_sheet_name = sheet_names[0]
            logger.info(f"Target worksheet '{sheet_name}' not found; using existing sheet '{resolved_sheet_name}'")
        else:
            # Create the worksheet
            add_sheet_res = client.request("POST", worksheets_url, json_data={"name": sheet_name})
            if add_sheet_res.status_code in [200, 201]:
                resolved_sheet_name = sheet_name

    # 6. Inject 2D Matrix Values via Microsoft Graph PATCH endpoint
    range_endpoint = (
        f"{client.user_drive_url}/items/{created_file_id}/workbook/"
        f"worksheets('{resolved_sheet_name}')/range(address='{calculated_range}')"
    )

    logger.info(f"Injecting 2D attendance matrix into {range_endpoint}...")
    patch_res = client.request(
        method="PATCH",
        url=range_endpoint,
        json_data={"values": matrix_2d}
    )

    if patch_res.status_code not in [200, 201]:
        raise RuntimeError(
            f"Microsoft Graph range update failed ({patch_res.status_code}): {patch_res.text}"
        )

    # 7. Apply Professional Styling
    try:
        # Header Row (Row 1): Dark Green Fill (#107C41), Bold White text
        end_col_letter = _get_column_letter(num_cols)
        header_range = f"A1:{end_col_letter}1"
        header_endpoint = (
            f"{client.user_drive_url}/items/{created_file_id}/workbook/"
            f"worksheets('{resolved_sheet_name}')/range(address='{header_range}')"
        )
        client.request("PATCH", f"{header_endpoint}/format/fill", json_data={"color": "#107C41"})
        client.request("PATCH", f"{header_endpoint}/format/font", json_data={
            "color": "#FFFFFF",
            "bold": True,
            "size": 11
        })
        client.request("PATCH", f"{header_endpoint}/format", json_data={
            "horizontalAlignment": "Center",
            "verticalAlignment": "Center"
        })

        # Center-align attendance columns (D1:end_col_end_row)
        if num_cols > 3:
            grid_body_range = f"D2:{end_col_letter}{num_rows}"
            grid_endpoint = (
                f"{client.user_drive_url}/items/{created_file_id}/workbook/"
                f"worksheets('{resolved_sheet_name}')/range(address='{grid_body_range}')"
            )
            client.request("PATCH", f"{grid_endpoint}/format", json_data={
                "horizontalAlignment": "Center",
                "verticalAlignment": "Center"
            })
    except Exception as fmt_err:
        logger.warning(f"Excel matrix formatting notice (non-fatal): {fmt_err}")

    default_web_url = (
        f"https://hillsongchurch-my.sharepoint.com/:x:/r/personal/ralph_boer_hillsong_co_uk"
        f"/_layouts/15/doc2.aspx?file={target_filename}"
    )

    return {
        "success": True,
        "message": "Successfully exported attendance matrix to SharePoint Excel workbook.",
        "filename": target_filename,
        "file_id": created_file_id,
        "webUrl": sharepoint_web_url or default_web_url,
        "range": calculated_range,
        "sheet_name": resolved_sheet_name,
        "rows_count": num_rows,
        "cols_count": num_cols,
        "players_count": len(attendance_data),
        "session_dates_count": len(session_dates),
        "owner": TARGET_USER_EMAIL
    }


# ============================================================================
# 7. FLASK API ENDPOINT: POST /api/export-attendance-matrix
# ============================================================================
@sync_bp.route("/api/export-attendance-matrix", methods=["POST"])
def export_attendance_matrix_endpoint():
    """
    Flask route receiving attendance matrix from the frontend reports tab:
    Expected JSON Request Body:
    {
        "session_dates": ["16-Jul", "23-Jul", "30-Jul", "06-Aug", "13-Aug"],
        "attendance_data": [
            {
                "name": "Jerry Smith",
                "squad": "Croydon A",
                "consent": "Verified",
                "attendance": [true, true, false, true, true]
            }
        ],
        "template_file_id": "optional_template_id",
        "sheet_name": "Player Attendance",
        "boolean_format": "Yes/No"
    }
    """
    try:
        payload = request.get_json(silent=True) or {}

        session_dates = payload.get("session_dates")
        if not session_dates or not isinstance(session_dates, list):
            # Fallback default dates if none supplied
            session_dates = ["16-Jul", "23-Jul", "30-Jul", "06-Aug", "13-Aug", "20-Aug", "27-Aug", "03-Sep", "10-Sep", "17-Sep"]

        attendance_data = payload.get("attendance_data")
        if attendance_data is None or not isinstance(attendance_data, list):
            attendance_data = []

        template_file_id = (
            payload.get("template_file_id")
            or payload.get("templateId")
            or os.getenv("MS_TEMPLATE_FILE_ID")
        )

        sheet_name = payload.get("sheet_name") or DEFAULT_WORKSHEET_NAME
        boolean_format = payload.get("boolean_format") or "Yes/No"
        filename_prefix = payload.get("filename_prefix") or "Football_United_Croydon_Attendance_Matrix"

        logger.info(
            f"Processing POST /api/export-attendance-matrix: {len(attendance_data)} players, "
            f"{len(session_dates)} dates. Format: {boolean_format}"
        )

        # Verify Azure AD / MSAL Credentials
        if not auth_service.is_configured():
            logger.warning("Microsoft 365 Entra ID credentials missing for matrix export.")
            return jsonify({
                "success": False,
                "error": "Microsoft 365 Entra ID credentials are not configured.",
                "missing_vars": ["MS_CLIENT_ID", "MS_CLIENT_SECRET", "MS_TENANT_ID"],
                "owner": TARGET_USER_EMAIL,
                "message": "Set MS_CLIENT_ID, MS_CLIENT_SECRET, and MS_TENANT_ID in .env to enable SharePoint synchronization."
            }), 400

        # Execute export pipeline
        result = export_attendance_matrix_to_sharepoint_excel(
            session_dates=session_dates,
            attendance_data=attendance_data,
            template_file_id=template_file_id,
            sheet_name=sheet_name,
            filename_prefix=filename_prefix,
            boolean_format=boolean_format,
            target_folder=DEFAULT_TARGET_FOLDER,
            client=graph_client
        )

        return jsonify(result), 200

    except Exception as e:
        logger.exception(f"Unhandled error in /api/export-attendance-matrix: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "owner": TARGET_USER_EMAIL
        }), 500


# ============================================================================
# STANDALONE EXECUTION FOR TESTING & VALIDATION
# ============================================================================
if __name__ == "__main__":
    from flask import Flask
    app = Flask(__name__)
    app.register_blueprint(sync_bp)
    print("🚀 Microsoft Graph Sync Service Initialized. Register sync_bp with your main Flask app.")
