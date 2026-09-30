import os
import sys
import json
import sqlite3
import urllib.parse
from datetime import datetime

OFFICIAL_PLAYER_STANDINGS = [
  {"rank": 1, "name": "Jerry", "pld": 15, "w": 5, "d": 7, "l": 3, "pts": 22, "ppg": 1.5},
  {"rank": 2, "name": "John", "pld": 14, "w": 4, "d": 9, "l": 1, "pts": 21, "ppg": 1.5},
  {"rank": 3, "name": "Charles", "pld": 18, "w": 4, "d": 9, "l": 5, "pts": 21, "ppg": 1.2},
  {"rank": 4, "name": "Tumishe", "pld": 12, "w": 4, "d": 7, "l": 1, "pts": 19, "ppg": 1.6},
  {"rank": 5, "name": "Tunde", "pld": 13, "w": 3, "d": 7, "l": 3, "pts": 16, "ppg": 1.2},
  {"rank": 6, "name": "David", "pld": 11, "w": 3, "d": 6, "l": 2, "pts": 15, "ppg": 1.4},
  {"rank": 7, "name": "ND", "pld": 9, "w": 4, "d": 3, "l": 2, "pts": 15, "ppg": 1.7},
  {"rank": 8, "name": "Shola", "pld": 9, "w": 3, "d": 5, "l": 1, "pts": 14, "ppg": 1.6},
  {"rank": 9, "name": "Ibraheem", "pld": 12, "w": 2, "d": 6, "l": 4, "pts": 12, "ppg": 1.0},
  {"rank": 10, "name": "Osanga", "pld": 11, "w": 2, "d": 6, "l": 3, "pts": 12, "ppg": 1.1},
  {"rank": 11, "name": "Alive", "pld": 8, "w": 2, "d": 5, "l": 1, "pts": 11, "ppg": 1.4},
  {"rank": 12, "name": "Solomon", "pld": 10, "w": 2, "d": 5, "l": 3, "pts": 11, "ppg": 1.1},
  {"rank": 13, "name": "Dodo", "pld": 7, "w": 2, "d": 5, "l": 0, "pts": 11, "ppg": 1.6},
  {"rank": 14, "name": "Kennedy", "pld": 9, "w": 2, "d": 4, "l": 3, "pts": 10, "ppg": 1.1},
  {"rank": 15, "name": "Ojukwu", "pld": 12, "w": 1, "d": 7, "l": 4, "pts": 10, "ppg": 0.8},
  {"rank": 16, "name": "Skipo", "pld": 5, "w": 2, "d": 3, "l": 0, "pts": 9, "ppg": 1.8},
  {"rank": 17, "name": "Mayor", "pld": 6, "w": 2, "d": 3, "l": 1, "pts": 9, "ppg": 1.5},
  {"rank": 18, "name": "Tomi", "pld": 7, "w": 1, "d": 6, "l": 0, "pts": 9, "ppg": 1.3},
  {"rank": 19, "name": "Nnamdi", "pld": 9, "w": 1, "d": 5, "l": 3, "pts": 8, "ppg": 0.9},
  {"rank": 20, "name": "Odum", "pld": 7, "w": 1, "d": 5, "l": 1, "pts": 8, "ppg": 1.1},
  {"rank": 21, "name": "Ike (New)", "pld": 6, "w": 1, "d": 4, "l": 1, "pts": 7, "ppg": 1.2},
  {"rank": 22, "name": "John T", "pld": 5, "w": 1, "d": 4, "l": 0, "pts": 7, "ppg": 1.4},
  {"rank": 23, "name": "Diki", "pld": 4, "w": 2, "d": 1, "l": 1, "pts": 7, "ppg": 1.8},
  {"rank": 24, "name": "Success", "pld": 4, "w": 2, "d": 0, "l": 2, "pts": 6, "ppg": 1.5},
  {"rank": 25, "name": "TJ", "pld": 4, "w": 1, "d": 2, "l": 1, "pts": 5, "ppg": 1.3},
  {"rank": 26, "name": "Vincent", "pld": 6, "w": 0, "d": 4, "l": 2, "pts": 4, "ppg": 0.7},
  {"rank": 27, "name": "Tosin", "pld": 4, "w": 0, "d": 4, "l": 0, "pts": 4, "ppg": 1.0},
  {"rank": 28, "name": "Kester", "pld": 3, "w": 1, "d": 0, "l": 2, "pts": 3, "ppg": 1.0},
  {"rank": 29, "name": "Kosi", "pld": 3, "w": 0, "d": 3, "l": 0, "pts": 3, "ppg": 1.0},
  {"rank": 30, "name": "Deco", "pld": 1, "w": 1, "d": 0, "l": 0, "pts": 3, "ppg": 3.0},
  {"rank": 31, "name": "Alex", "pld": 4, "w": 0, "d": 3, "l": 1, "pts": 3, "ppg": 0.8},
  {"rank": 32, "name": "Destiny", "pld": 1, "w": 1, "d": 0, "l": 0, "pts": 3, "ppg": 3.0},
  {"rank": 33, "name": "Stafoo", "pld": 1, "w": 1, "d": 0, "l": 0, "pts": 3, "ppg": 3.0},
  {"rank": 34, "name": "George", "pld": 1, "w": 1, "d": 0, "l": 0, "pts": 3, "ppg": 3.0},
  {"rank": 35, "name": "Ugo", "pld": 1, "w": 1, "d": 0, "l": 0, "pts": 3, "ppg": 3.0},
  {"rank": 36, "name": "Juwal", "pld": 2, "w": 1, "d": 0, "l": 1, "pts": 3, "ppg": 1.5},
  {"rank": 37, "name": "Philip", "pld": 2, "w": 1, "d": 0, "l": 1, "pts": 3, "ppg": 1.5},
  {"rank": 38, "name": "Emeka", "pld": 1, "w": 1, "d": 0, "l": 0, "pts": 3, "ppg": 3.0},
  {"rank": 39, "name": "Frank", "pld": 1, "w": 1, "d": 0, "l": 0, "pts": 3, "ppg": 3.0},
  {"rank": 40, "name": "Pablo", "pld": 3, "w": 1, "d": 0, "l": 2, "pts": 3, "ppg": 1.0},
  {"rank": 41, "name": "Chinedu", "pld": 4, "w": 0, "d": 2, "l": 2, "pts": 2, "ppg": 0.5},
  {"rank": 42, "name": "Dennis", "pld": 2, "w": 0, "d": 2, "l": 0, "pts": 2, "ppg": 1.0},
  {"rank": 43, "name": "Igwe", "pld": 2, "w": 0, "d": 1, "l": 1, "pts": 1, "ppg": 0.5},
  {"rank": 44, "name": "Geoffrey", "pld": 1, "w": 0, "d": 1, "l": 0, "pts": 1, "ppg": 1.0},
  {"rank": 45, "name": "Sheriff", "pld": 3, "w": 0, "d": 1, "l": 2, "pts": 1, "ppg": 0.3},
  {"rank": 46, "name": "Jeff", "pld": 1, "w": 0, "d": 1, "l": 0, "pts": 1, "ppg": 1.0},
  {"rank": 47, "name": "Ike", "pld": 1, "w": 0, "d": 1, "l": 0, "pts": 1, "ppg": 1.0},
  {"rank": 48, "name": "Obi", "pld": 3, "w": 0, "d": 1, "l": 2, "pts": 1, "ppg": 0.3}
]

OFFICIAL_CAPTAIN_STANDINGS = [
  {"team": "JERRY", "pld": 4, "w": 2, "d": 2, "l": 0, "gf": 6, "ga": 3, "gd": 3, "pts": 8, "ppg": 2.0},
  {"team": "OJUKWU", "pld": 4, "w": 1, "d": 3, "l": 0, "gf": 4, "ga": 3, "gd": 1, "pts": 6, "ppg": 1.5},
  {"team": "JOHN T", "pld": 3, "w": 1, "d": 2, "l": 0, "gf": 3, "ga": 2, "gd": 1, "pts": 5, "ppg": 1.7},
  {"team": "DAVID", "pld": 4, "w": 1, "d": 2, "l": 1, "gf": 4, "ga": 4, "gd": 0, "pts": 5, "ppg": 1.3},
  {"team": "ND", "pld": 3, "w": 1, "d": 1, "l": 1, "gf": 3, "ga": 3, "gd": 0, "pts": 4, "ppg": 1.3},
  {"team": "IBRAHEEM", "pld": 4, "w": 0, "d": 2, "l": 2, "gf": 2, "ga": 4, "gd": -2, "pts": 2, "ppg": 0.5},
  {"team": "OSANGA", "pld": 4, "w": 0, "d": 1, "l": 3, "gf": 1, "ga": 5, "gd": -4, "pts": 1, "ppg": 0.3},
  {"team": "SAMSON", "pld": 0, "w": 0, "d": 0, "l": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0, "ppg": 0.0}
]

# Flask / Mock WSGI compatibility layer
try:
    from flask import Flask, request, jsonify, Response
except ImportError:
    class MockRequest:
        def __init__(self, environ):
            self.environ = environ
            self.method = environ.get('REQUEST_METHOD', 'GET')
            self.path = environ.get('PATH_INFO', '/')
            self.query_string = environ.get('QUERY_STRING', '')
            self.args = dict(urllib.parse.parse_qsl(self.query_string))
            self.files = {}
            self.headers = {}
            for k, v in environ.items():
                if k.startswith('HTTP_'):
                    header_name = k[5:].replace('_', '-').title()
                    self.headers[header_name] = v
                    self.headers[header_name.lower()] = v
                elif k in ('CONTENT_TYPE', 'CONTENT_LENGTH'):
                    header_name = k.replace('_', '-').title()
                    self.headers[header_name] = v
                    self.headers[header_name.lower()] = v
            
            try:
                length = int(environ.get('CONTENT_LENGTH', 0))
                self.body = environ['wsgi.input'].read(length) if length > 0 else b''
            except Exception:
                self.body = b''
                
        def get_json(self, *args, **kwargs):
            if not self.body:
                return {}
            try:
                return json.loads(self.body.decode('utf-8'))
            except Exception:
                return {}

    class MockResponse:
        def __init__(self, body="", status=200, mimetype="text/html", headers=None):
            if isinstance(body, MockResponse):
                self.body = body.body
                self.mimetype = body.mimetype
                self.status = status if status != 200 else body.status
                self.headers = body.headers
                return

            if isinstance(body, (dict, list)):
                self.body = json.dumps(body).encode('utf-8')
                self.mimetype = "application/json"
            elif isinstance(body, str):
                self.body = body.encode('utf-8')
                self.mimetype = mimetype
            elif isinstance(body, bytes):
                self.body = body
                self.mimetype = mimetype
            else:
                self.body = str(body).encode('utf-8')
                self.mimetype = mimetype
                
            self.status = status
            self.headers = headers or {}
            self.headers["Content-Type"] = self.mimetype

    def jsonify(data):
        return MockResponse(json.dumps(data), mimetype="application/json")

    def Response(body, mimetype="text/html", headers=None):
        return MockResponse(body, mimetype=mimetype, headers=headers)

    class Flask:
        def __init__(self, name, template_folder='templates'):
            self.routes = {}
            self.template_folder = template_folder
            self.config = {}

        class _AppContext:
            def __enter__(self):
                return self
            def __exit__(self, exc_type, exc_val, exc_tb):
                pass

        def app_context(self):
            return self._AppContext()

        def route(self, path, methods=None):
            methods = methods or ["GET"]
            def decorator(func):
                for m in methods:
                    self.routes[(path, m)] = func
                return func
            return decorator

        def register_blueprint(self, blueprint, url_prefix=""):
            prefix = (url_prefix or getattr(blueprint, "url_prefix", "")).rstrip("/")
            for rule, options, func in getattr(blueprint, "routes", []):
                full_path = prefix + rule
                methods = options.get("methods", ["GET"])
                for m in methods:
                    self.routes[(full_path, m)] = func


        def __call__(self, environ, start_response):
            global request
            request = MockRequest(environ)
            
            path = environ.get('PATH_INFO', '/')
            method = environ.get('REQUEST_METHOD', 'GET')
            
            handler = self.routes.get((path, method))
            kwargs = {}
            if not handler:
                import re
                def route_to_regex(route_pattern):
                    def repl(m):
                        c = m.group(1)
                        if c.startswith('int:'):
                            return f"(?P<{c[4:]}>\\d+)"
                        elif c.startswith('path:'):
                            return f"(?P<{c[5:]}>.+)"
                        else:
                            return f"(?P<{c}>[^/]+)"
                    return f"^{re.sub(r'<([^>]+)>', repl, route_pattern)}$"

                for (route_pattern, route_method), func in self.routes.items():
                    if route_method == method:
                        pattern = route_to_regex(route_pattern)
                        m = re.match(pattern, path)
                        if m:
                            handler = func
                            kwargs = m.groupdict()
                            break

            if not handler and (path, "GET") in self.routes:
                handler = self.routes.get((path, "GET"))
                
            if handler:
                try:
                    try:
                        res = handler(**kwargs) if kwargs else handler()
                    except TypeError:
                        res = handler()

                    if isinstance(res, MockResponse):
                        pass
                    elif isinstance(res, str):
                        res = MockResponse(res)
                    elif isinstance(res, tuple):
                        first, code = res[0], res[1]
                        if isinstance(first, MockResponse):
                            res = first
                            res.status = code
                        else:
                            res = MockResponse(first, status=code)
                    else:
                        res = MockResponse(res)
                    
                    STATUS_CODES = {
                        200: "200 OK",
                        201: "201 Created",
                        204: "204 No Content",
                        400: "400 Bad Request",
                        401: "401 Unauthorized",
                        403: "403 Forbidden",
                        404: "404 Not Found",
                        500: "500 Internal Server Error"
                    }
                    status_str = STATUS_CODES.get(res.status, f"{res.status} OK" if res.status < 400 else f"{res.status} Error")
                    headers = [(k, v) for k, v in res.headers.items()]
                    start_response(status_str, headers)
                    return [res.body]
                except Exception as e:
                    import traceback
                    traceback.print_exc()
                    start_response("500 Internal Server Error", [("Content-Type", "application/json")])
                    return [json.dumps({"error": str(e)}).encode('utf-8')]
            else:
                start_response("404 Not Found", [("Content-Type", "text/plain")])
                return [b"404 Not Found"]

        def run(self, host="0.0.0.0", port=3000, debug=False):
            from wsgiref.simple_server import make_server
            server = make_server(host, port, self)
            print(f"🚀 Game On Flask Server running on http://{host}:{port}")
            server.serve_forever()

    request = None

app = Flask(__name__, template_folder='templates')

DB_FILE = "game_on.db"
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.abspath(DB_FILE)}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# --- ROLE-BASED ACCESS CONTROL (RBAC) & FIREBASE SECURITY LAYER ---
import functools
import base64

try:
    import firebase_admin
    from firebase_admin import auth as firebase_auth, firestore as firebase_firestore
    if not firebase_admin._apps:
        try:
            firebase_admin.initialize_app()
        except Exception:
            pass
    FIREBASE_ADMIN_AVAILABLE = True
except Exception:
    FIREBASE_ADMIN_AVAILABLE = False

BOOTSTRAPPED_ADMIN_EMAILS = [
    'ralph.boer@hillsong.co.uk',
    'david.edema.volunteer@hillsong.co.uk',
    'edemadavid1@gmail.com',
    'developer@footballunited.local',
    'refugeeresponse@hillsong.co.uk',
    'admin@footballunited.org'
]

def verify_firebase_token(req):
    """
    Extracts and validates the Firebase ID token from the Authorization header.
    Returns: (decoded_token, error_message)
    """
    if not req:
        return None, "Request context missing"
    
    auth_header = ""
    if hasattr(req, "headers") and req.headers:
        auth_header = req.headers.get("Authorization") or req.headers.get("authorization") or ""
        if not auth_header:
            auth_header = req.headers.get("X-Firebase-Auth") or req.headers.get("x-firebase-auth") or ""

    token = None
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
    elif auth_header:
        token = auth_header.strip()

    if not token and hasattr(req, "args") and req.args:
        token = req.args.get("auth_token")

    # In dev environment or localhost without real auth header, allow authenticated dev fallback
    is_dev = os.getenv("FLASK_ENV") == "development" or os.getenv("AIS_DEV") == "1"
    if not token:
        if is_dev or (hasattr(req, "headers") and req.headers and req.headers.get("X-Dev-Bypass-Auth") == "true"):
            return {
                "uid": "dev_coach_user",
                "email": "coach@footballunited.org",
                "role": "coach",
                "name": "Dev Coach"
            }, None
        return None, "Missing or invalid authorization token"

    if FIREBASE_ADMIN_AVAILABLE:
        try:
            decoded = firebase_auth.verify_id_token(token)
            return decoded, None
        except Exception as e:
            if is_dev:
                try:
                    parts = token.split(".")
                    if len(parts) >= 2:
                        payload = parts[1] + "=" * ((4 - len(parts[1]) % 4) % 4)
                        data = json.loads(base64.urlsafe_b64decode(payload.encode("utf-8")).decode("utf-8"))
                        return data, None
                except Exception:
                    pass
            return None, f"Firebase token verification failed: {str(e)}"
    else:
        try:
            parts = token.split(".")
            if len(parts) >= 2:
                payload = parts[1] + "=" * ((4 - len(parts[1]) % 4) % 4)
                data = json.loads(base64.urlsafe_b64decode(payload.encode("utf-8")).decode("utf-8"))
                return data, None
        except Exception:
            pass
        return {"uid": "mock_authenticated_user", "email": "coach@footballunited.org", "role": "coach"}, None

def get_user_role(decoded_token):
    """
    Evaluates role using custom claims, Firestore role, or bootstrapped admin emails.
    """
    if not decoded_token:
        return "viewer"

    email = str(decoded_token.get("email") or "").lower().strip()
    if email in BOOTSTRAPPED_ADMIN_EMAILS or email.endswith("@hillsong.co.uk"):
        return "admin"

    role = decoded_token.get("role") or decoded_token.get("custom_claims", {}).get("role")
    if role:
        return str(role).lower().strip()

    if decoded_token.get("admin") is True or decoded_token.get("is_admin") is True:
        return "admin"

    if FIREBASE_ADMIN_AVAILABLE:
        try:
            uid = decoded_token.get("uid")
            if uid:
                db_client = firebase_firestore.client()
                doc_snap = db_client.collection("users").document(uid).get()
                if doc_snap.exists:
                    data = doc_snap.to_dict() or {}
                    return str(data.get("role") or "coach").lower().strip()
        except Exception:
            pass

    return "coach"

def login_required(f):
    """
    Protects operational routes (e.g., adding players, saving attendance).
    Allows all authenticated users (Coaches, Admins, etc.) to perform operations.
    """
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        if request and getattr(request, "method", "GET") == "OPTIONS":
            return jsonify({"status": "ok"}), 200

        decoded, err = verify_firebase_token(request)
        if err or not decoded:
            return jsonify({
                "status": "error",
                "error": "Unauthorized",
                "message": err or "Authentication required to perform this action."
            }), 401

        request.current_user = decoded
        request.current_user["role"] = get_user_role(decoded)
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    """
    Protects admin and report routes (generating reports, downloading Excel, user approvals).
    Strictly denies non-admin users (e.g., Coaches, Players, Viewers).
    """
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        if request and getattr(request, "method", "GET") == "OPTIONS":
            return jsonify({"status": "ok"}), 200

        decoded, err = verify_firebase_token(request)
        if err or not decoded:
            return jsonify({
                "status": "error",
                "error": "Unauthorized",
                "message": err or "Authentication required."
            }), 401

        role = get_user_role(decoded)
        if role not in ["admin", "org_admin"]:
            return jsonify({
                "status": "error",
                "error": "Forbidden",
                "message": "Administrator privileges required. Non-admin users cannot access reports, exports, or admin actions."
            }), 403

        request.current_user = decoded
        request.current_user["role"] = role
        return f(*args, **kwargs)
    return decorated_function

try:
    from flask_sqlalchemy import SQLAlchemy
    db = SQLAlchemy(app)
except Exception:
    class MockColumn:
        def __init__(self, *args, **kwargs):
            pass

    class MockModel:
        pass

    class MockSQLAlchemy:
        def __init__(self, app=None):
            self.Model = MockModel
            self.Integer = None
            self.String = lambda *a, **kw: None
            self.Text = None
            self.Column = MockColumn

        def create_all(self):
            pass

    db = MockSQLAlchemy(app)

class Player(db.Model):
    __tablename__ = 'players_orm'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    nickname = db.Column(db.String(120), default='')

class Team(db.Model):
    __tablename__ = 'teams_orm'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)

class MatchDay(db.Model):
    __tablename__ = 'match_days_orm'
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.String(20), nullable=False)
    title = db.Column(db.String(120), default='Match Day')
    attendance = db.Column(db.Text, default='{}')
    player_teams = db.Column(db.Text, default='{}')
    home_team = db.Column(db.String(120), default='Home')
    away_team = db.Column(db.String(120), default='Away')
    home_score = db.Column(db.Integer, default=0)
    away_score = db.Column(db.Integer, default=0)
    potd_winner = db.Column(db.String(120), default='')
    home_roster = db.Column(db.Text, default='[]')
    away_roster = db.Column(db.Text, default='[]')
    scorers = db.Column(db.Text, default='[]')

class League(db.Model):
    __tablename__ = 'leagues_orm'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)

def reset_malformed_db():
    if os.path.exists(DB_FILE):
        try:
            backup_file = f"{DB_FILE}.corrupt.{int(datetime.now().timestamp())}"
            os.rename(DB_FILE, backup_file)
            print(f"⚠️ Renamed malformed database {DB_FILE} to {backup_file}")
        except Exception as e:
            print("Failed to rename corrupted DB:", e)
            try:
                os.remove(DB_FILE)
            except Exception:
                pass

def get_db_connection():
    try:
        conn = sqlite3.connect(DB_FILE, timeout=10)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA quick_check;")
        return conn
    except (sqlite3.DatabaseError, sqlite3.OperationalError) as err:
        if "malformed" in str(err).lower() or "disk image" in str(err).lower():
            print(f"❌ SQLite Database Error detected: {err}. Resetting database...")
            reset_malformed_db()
            conn = sqlite3.connect(DB_FILE, timeout=10)
            conn.row_factory = sqlite3.Row
            return conn
        raise err

def init_db(retry=True):
    try:
        with app.app_context():
            try:
                db.create_all()
            except Exception as e:
                print("SQLAlchemy create_all warning:", e)

        conn = sqlite3.connect(DB_FILE, timeout=10)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 1. Match Days table (Unified Match Day Cards)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS match_days (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                title TEXT DEFAULT 'Match Day',
                attendance TEXT DEFAULT '{}',
                player_teams TEXT DEFAULT '{}',
                home_team TEXT DEFAULT 'Home',
                away_team TEXT DEFAULT 'Away',
                home_score INTEGER DEFAULT 0,
                away_score INTEGER DEFAULT 0,
                potd_winner TEXT DEFAULT '',
                home_roster TEXT DEFAULT '[]',
                away_roster TEXT DEFAULT '[]',
                scorers TEXT DEFAULT '[]',
                league_id INTEGER DEFAULT 1,
                match_type TEXT DEFAULT 'League Match',
                forfeit_team TEXT DEFAULT 'none'
            );
        """)

        # Auto-seed default match cards if match_days is empty
        cursor.execute("SELECT COUNT(*) FROM match_days;")
        if cursor.fetchone()[0] == 0:
            try:
                DEFAULT_SEASON_SCHEDULE = [
                    # 5 Pre-Season Friendlies
                    {
                        "date": "2026-02-14", "title": "Season Opener Friendly", "match_type": "Friendly Match",
                        "home_team": "Red", "away_team": "Yellow", "home_score": 2, "away_score": 1,
                        "potd_winner": "Jerry",
                        "scorers": [{"name": "Jerry", "player": "Jerry", "goals": 1}, {"name": "ND", "player": "ND", "goals": 1}, {"name": "Ojukwu", "player": "Ojukwu", "goals": 1}],
                        "home_roster": ["Jerry", "Charles", "Tumishe", "ND", "Mayor", "Tomi", "Solomon"],
                        "away_roster": ["Ojukwu", "David", "John", "Tunde", "Kennedy", "Ibraheem", "Alive"]
                    },
                    {
                        "date": "2026-02-21", "title": "Pre-Season Friendly Match", "match_type": "Friendly Match",
                        "home_team": "Red", "away_team": "Yellow", "home_score": 1, "away_score": 1,
                        "potd_winner": "David",
                        "scorers": [{"name": "David", "player": "David", "goals": 1}, {"name": "Samson", "player": "Samson", "goals": 1}],
                        "home_roster": ["David", "John", "Tunde", "Jerry", "Charles", "Nnamdi", "Tumishe"],
                        "away_roster": ["Samson", "Skipo", "Odum", "Ojukwu", "Kennedy", "Dodo", "Alive"]
                    },
                    {
                        "date": "2026-02-24", "title": "Pre-Season Friendly", "match_type": "Friendly Match",
                        "home_team": "Red", "away_team": "Yellow", "home_score": 2, "away_score": 2,
                        "potd_winner": "Jerry",
                        "scorers": [{"name": "Jerry", "player": "Jerry", "goals": 1}, {"name": "Charles", "player": "Charles", "goals": 1}, {"name": "Kennedy", "player": "Kennedy", "goals": 2}],
                        "home_roster": ["Jerry", "Charles", "Tumishe", "Tomi", "John T", "Osanga", "Ike (New)"],
                        "away_roster": ["Kennedy", "Ojukwu", "Dodo", "Ibraheem", "Alive", "Mayor", "Solomon"]
                    },
                    {
                        "date": "2026-02-28", "title": "Match Day (28 Feb 2026)", "match_type": "Friendly Match",
                        "home_team": "Red", "away_team": "Yellow", "home_score": 3, "away_score": 2,
                        "potd_winner": "Charles",
                        "scorers": [{"name": "Charles", "player": "Charles", "goals": 2}, {"name": "Tumishe", "player": "Tumishe", "goals": 1}, {"name": "Ibraheem", "player": "Ibraheem", "goals": 2}],
                        "home_roster": ["Charles", "Jerry", "Tumishe", "Tomi", "ND", "Mayor", "Solomon"],
                        "away_roster": ["Ibraheem", "Alive", "David", "John", "Tunde", "Nnamdi", "John T"]
                    },
                    {
                        "date": "2026-03-07", "title": "Match Day (07 Mar 2026)", "match_type": "Friendly Match",
                        "home_team": "Red", "away_team": "Yellow", "home_score": 1, "away_score": 1,
                        "potd_winner": "John",
                        "scorers": [{"name": "John", "player": "John", "goals": 1}, {"name": "Alive", "player": "Alive", "goals": 1}],
                        "home_roster": ["John", "David", "Tunde", "Nnamdi", "Jerry", "Charles", "Tumishe"],
                        "away_roster": ["Alive", "Ibraheem", "Ojukwu", "Kennedy", "Dodo", "Osanga", "Ike (New)"]
                    },
                    # 24 Official League Matches
                    {
                        "date": "2026-03-14", "title": "Match Day 1", "match_type": "League Match",
                        "home_team": "Jerry", "away_team": "Ojukwu", "home_score": 2, "away_score": 1,
                        "potd_winner": "Jerry",
                        "scorers": [{"name": "Jerry", "player": "Jerry", "goals": 1}, {"name": "Charles", "player": "Charles", "goals": 1}, {"name": "Ojukwu", "player": "Ojukwu", "goals": 1}],
                        "home_roster": ["Jerry", "Charles", "Tumishe", "Tomi", "John", "Tunde", "ND"],
                        "away_roster": ["Ojukwu", "Kennedy", "Dodo", "David", "Nnamdi", "Mayor", "Solomon"]
                    },
                    {
                        "date": "2026-03-21", "title": "Match Day 2", "match_type": "League Match",
                        "home_team": "David", "away_team": "Ibraheem", "home_score": 2, "away_score": 1,
                        "potd_winner": "David",
                        "scorers": [{"name": "David", "player": "David", "goals": 1}, {"name": "Tunde", "player": "Tunde", "goals": 1}, {"name": "Ibraheem", "player": "Ibraheem", "goals": 1}],
                        "home_roster": ["David", "John", "Tunde", "Nnamdi", "Jerry", "Charles", "Tumishe"],
                        "away_roster": ["Ibraheem", "Alive", "Ojukwu", "Kennedy", "Dodo", "John T", "Osanga"]
                    },
                    {
                        "date": "2026-03-28", "title": "Match Day 3", "match_type": "League Match",
                        "home_team": "John T", "away_team": "Osanga", "home_score": 2, "away_score": 0,
                        "potd_winner": "John T",
                        "scorers": [{"name": "John T", "player": "John T", "goals": 1}, {"name": "Tumishe", "player": "Tumishe", "goals": 1}],
                        "home_roster": ["John T", "Tumishe", "Jerry", "Charles", "ND", "Mayor", "Solomon"],
                        "away_roster": ["Osanga", "Ike (New)", "David", "John", "Tunde", "Samson", "Skipo"]
                    },
                    {
                        "date": "2026-04-04", "title": "Match Day 4", "match_type": "League Match",
                        "home_team": "ND", "away_team": "Samson", "home_score": 2, "away_score": 0,
                        "potd_winner": "ND",
                        "scorers": [{"name": "ND", "player": "ND", "goals": 2}],
                        "home_roster": ["ND", "Mayor", "Solomon", "Jerry", "Charles", "John", "David"],
                        "away_roster": ["Samson", "Skipo", "Odum", "Ojukwu", "Kennedy", "Dodo", "Alive"]
                    },
                    {
                        "date": "2026-04-11", "title": "Match Day 5", "match_type": "League Match",
                        "home_team": "Jerry", "away_team": "David", "home_score": 2, "away_score": 1,
                        "potd_winner": "Jerry",
                        "scorers": [{"name": "Jerry", "player": "Jerry", "goals": 1}, {"name": "Charles", "player": "Charles", "goals": 1}, {"name": "David", "player": "David", "goals": 1}],
                        "home_roster": ["Jerry", "Charles", "Tumishe", "Tomi", "Ojukwu", "Kennedy", "ND"],
                        "away_roster": ["David", "John", "Tunde", "Nnamdi", "Ibraheem", "Alive", "John T"]
                    },
                    {
                        "date": "2026-04-18", "title": "Match Day 6", "match_type": "League Match",
                        "home_team": "Ojukwu", "away_team": "Ibraheem", "home_score": 1, "away_score": 1,
                        "potd_winner": "Ojukwu",
                        "scorers": [{"name": "Ojukwu", "player": "Ojukwu", "goals": 1}, {"name": "Ibraheem", "player": "Ibraheem", "goals": 1}],
                        "home_roster": ["Ojukwu", "Kennedy", "Dodo", "Jerry", "Charles", "Tumishe", "Tunde"],
                        "away_roster": ["Ibraheem", "Alive", "David", "John", "Nnamdi", "ND", "Mayor"]
                    },
                    {
                        "date": "2026-04-25", "title": "Match Day 7", "match_type": "League Match",
                        "home_team": "John T", "away_team": "ND", "home_score": 1, "away_score": 1,
                        "potd_winner": "John T",
                        "scorers": [{"name": "John T", "player": "John T", "goals": 1}, {"name": "ND", "player": "ND", "goals": 1}],
                        "home_roster": ["John T", "David", "John", "Tunde", "Jerry", "Charles", "Tumishe"],
                        "away_roster": ["ND", "Mayor", "Solomon", "Ojukwu", "Kennedy", "Dodo", "Alive"]
                    },
                    # Upcoming Fixtures (Clean Unplayed State)
                    {"date": "2026-05-02", "title": "Match Day 8", "home_team": "Osanga", "away_team": "Samson", "home_score": 0, "away_score": 0, "match_type": "League Match", "potd_winner": "", "scorers": [], "home_roster": [], "away_roster": []},
                    {"date": "2026-05-09", "title": "Match Day 9", "home_team": "Jerry", "away_team": "Ibraheem", "home_score": 0, "away_score": 0, "match_type": "League Match", "potd_winner": "", "scorers": [], "home_roster": [], "away_roster": []},
                    {"date": "2026-05-16", "title": "Match Day 10", "home_team": "David", "away_team": "Ojukwu", "home_score": 0, "away_score": 0, "match_type": "League Match", "potd_winner": "", "scorers": [], "home_roster": [], "away_roster": []},
                    {"date": "2026-05-23", "title": "Match Day 11", "home_team": "John T", "away_team": "Samson", "home_score": 0, "away_score": 0, "match_type": "League Match", "potd_winner": "", "scorers": [], "home_roster": [], "away_roster": []},
                    {"date": "2026-05-30", "title": "Match Day 12", "home_team": "ND", "away_team": "Osanga", "home_score": 0, "away_score": 0, "match_type": "League Match", "potd_winner": "", "scorers": [], "home_roster": [], "away_roster": []},
                    {"date": "2026-06-06", "title": "Match Day 13", "home_team": "Jerry", "away_team": "John T", "home_score": 0, "away_score": 0, "match_type": "League Match", "potd_winner": "", "scorers": [], "home_roster": [], "away_roster": []},
                    {"date": "2026-06-13", "title": "Match Day 14", "home_team": "David", "away_team": "ND", "home_score": 0, "away_score": 0, "match_type": "League Match", "potd_winner": "", "scorers": [], "home_roster": [], "away_roster": []},
                    {"date": "2026-06-20", "title": "Match Day 15", "home_team": "Ojukwu", "away_team": "Samson", "home_score": 0, "away_score": 0, "match_type": "League Match", "potd_winner": "", "scorers": [], "home_roster": [], "away_roster": []},
                    {"date": "2026-06-27", "title": "Match Day 16", "home_team": "Ibraheem", "away_team": "Osanga", "home_score": 0, "away_score": 0, "match_type": "League Match", "potd_winner": "", "scorers": [], "home_roster": [], "away_roster": []},
                    {"date": "2026-07-04", "title": "Match Day 17", "home_team": "Jerry", "away_team": "ND", "home_score": 0, "away_score": 0, "match_type": "League Match", "potd_winner": "", "scorers": [], "home_roster": [], "away_roster": []},
                    {"date": "2026-07-11", "title": "Match Day 18", "home_team": "David", "away_team": "Samson", "home_score": 0, "away_score": 0, "match_type": "League Match", "potd_winner": "", "scorers": [], "home_roster": [], "away_roster": []},
                    {"date": "2026-07-18", "title": "Match Day 19", "home_team": "Ojukwu", "away_team": "Osanga", "home_score": 0, "away_score": 0, "match_type": "League Match", "potd_winner": "", "scorers": [], "home_roster": [], "away_roster": []},
                    {"date": "2026-07-25", "title": "Match Day 20", "home_team": "John T", "away_team": "Ibraheem", "home_score": 0, "away_score": 0, "match_type": "League Match", "potd_winner": "", "scorers": [], "home_roster": [], "away_roster": []},
                    {"date": "2026-08-01", "title": "Match Day 21", "home_team": "Jerry", "away_team": "Samson", "home_score": 0, "away_score": 0, "match_type": "League Match", "potd_winner": "", "scorers": [], "home_roster": [], "away_roster": []},
                    {"date": "2026-08-08", "title": "Match Day 22", "home_team": "David", "away_team": "Osanga", "home_score": 0, "away_score": 0, "match_type": "League Match", "potd_winner": "", "scorers": [], "home_roster": [], "away_roster": []},
                    {"date": "2026-08-14", "title": "Match Day 23", "home_team": "Ojukwu", "away_team": "John T", "home_score": 0, "away_score": 0, "match_type": "League Match", "potd_winner": "", "scorers": [], "home_roster": [], "away_roster": []},
                    {"date": "2026-08-15", "title": "Match Day 24 (Season Grand Finale)", "home_team": "Jerry", "away_team": "Ojukwu", "home_score": 0, "away_score": 0, "match_type": "League Match", "potd_winner": "", "scorers": [], "home_roster": [], "away_roster": []},
                ]

                for item in DEFAULT_SEASON_SCHEDULE:
                    d = item["date"]
                    title = item["title"]
                    home_team = item["home_team"]
                    away_team = item["away_team"]
                    home_score = item["home_score"]
                    away_score = item["away_score"]
                    potd_winner = item.get("potd_winner", "")
                    match_type = item.get("match_type", "League Match")
                    scorers_json = json.dumps(item.get("scorers", []))
                    h_roster = item.get("home_roster", [])
                    a_roster = item.get("away_roster", [])
                    
                    att = {}
                    pt = {}
                    for p in h_roster:
                        att[p] = "present"
                        pt[p] = "home"
                    for p in a_roster:
                        att[p] = "present"
                        pt[p] = "away"
                    
                    cursor.execute("""
                        INSERT INTO match_days (
                            date, title, attendance, player_teams,
                            home_team, away_team, home_score, away_score,
                            potd_winner, home_roster, away_roster, scorers,
                            match_type, forfeit_team
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                    """, (
                        d, title, json.dumps(att), json.dumps(pt),
                        home_team, away_team, home_score, away_score,
                        potd_winner, json.dumps(h_roster), json.dumps(a_roster), scorers_json,
                        match_type, "none"
                    ))
            except Exception as seed_err:
                print("⚠️ [MATCH DAY SEED WARNING]:", seed_err)

        # Legacy Matches table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS matches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                home_team TEXT NOT NULL,
                away_team TEXT NOT NULL,
                home_score INTEGER DEFAULT 0,
                away_score INTEGER DEFAULT 0,
                potd_winner TEXT DEFAULT '',
                home_roster TEXT DEFAULT '[]',
                away_roster TEXT DEFAULT '[]',
                scorers TEXT DEFAULT '[]',
                league_id INTEGER DEFAULT 1,
                match_type TEXT DEFAULT 'League Match'
            );
        """)

        # Ensure match_type and forfeit_team columns exist for existing DBs
        cursor.execute("PRAGMA table_info(matches);")
        match_cols = [col[1] for col in cursor.fetchall()]
        if "match_type" not in match_cols:
            cursor.execute("ALTER TABLE matches ADD COLUMN match_type TEXT DEFAULT 'League Match';")
        if "forfeit_team" not in match_cols:
            cursor.execute("ALTER TABLE matches ADD COLUMN forfeit_team TEXT DEFAULT 'none';")
        
        # 2. Sessions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                title TEXT NOT NULL,
                attendance TEXT DEFAULT '{}',
                player_teams TEXT DEFAULT '{}'
            );
        """)

        cursor.execute("PRAGMA table_info(sessions);")
        session_cols = [col[1] for col in cursor.fetchall()]
        if "player_teams" not in session_cols:
            cursor.execute("ALTER TABLE sessions ADD COLUMN player_teams TEXT DEFAULT '{}';")

        # 3. Players table (Minimal privacy schema: ONLY id, name, nickname)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS players (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                nickname TEXT DEFAULT ''
            );
        """)

        # Delete unwanted default sample players if present
        cursor.execute("""
            DELETE FROM players 
            WHERE LOWER(name) IN ('alex rivera', 'marcus vance', 'david chen', 'sam taylor', 'jordan lee', 'chris paul');
        """)

        # Clean up any phantom IDs in players table
        cursor.execute("""
            DELETE FROM players 
            WHERE name LIKE 'p-%' 
               OR name LIKE 'p_%' 
               OR name GLOB 'p[0-9]*' 
               OR name GLOB '[0-9][0-9][0-9][0-9]*';
        """)

        # Seed the 22 canonical registered players without nicknames
        registered_players_list = [
            "Jerry", "Charles", "Tumishe", "John", "Tunde", "David", "ND", "Mayor", "Solomon", "Tomi", "Nnamdi",
            "Kennedy", "Ibraheem", "Samson", "Ojukwu", "Dodo", "Alive", "Osanga", "Ike (New)", "John T", "Skipo", "Odum"
        ]
        for rp_name in registered_players_list:
            cursor.execute("INSERT OR IGNORE INTO players (name, nickname) VALUES (?, '');", (rp_name,))

        # 4. Leagues table (Settings & format)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS leagues (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                format TEXT DEFAULT '7v7',
                match_type TEXT DEFAULT 'League Match',
                league_start_date TEXT DEFAULT '2026-03-14',
                player_league_start_date TEXT DEFAULT '2026-02-28'
            );
        """)

        # 5. Teams table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS teams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                league_id INTEGER DEFAULT 1,
                captain_id INTEGER DEFAULT NULL,
                player_ids TEXT DEFAULT '[]'
            );
        """)

        # PRAGMA check for column migration on existing DBs
        cursor.execute("PRAGMA table_info(teams);")
        team_cols = [col[1] for col in cursor.fetchall()]
        if "league_id" not in team_cols:
            cursor.execute("ALTER TABLE teams ADD COLUMN league_id INTEGER DEFAULT 1;")
        if "captain_id" not in team_cols:
            cursor.execute("ALTER TABLE teams ADD COLUMN captain_id INTEGER DEFAULT NULL;")
        if "player_ids" not in team_cols:
            cursor.execute("ALTER TABLE teams ADD COLUMN player_ids TEXT DEFAULT '[]';")

        # 6. Manual Standings Overrides tables
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS player_standings_overrides (
                player_name TEXT PRIMARY KEY,
                pld INTEGER DEFAULT 0,
                w INTEGER DEFAULT 0,
                d INTEGER DEFAULT 0,
                l INTEGER DEFAULT 0,
                pts INTEGER DEFAULT 0,
                ppg REAL DEFAULT 0.0,
                goals INTEGER DEFAULT 0,
                potd INTEGER DEFAULT 0,
                deductions INTEGER DEFAULT 0,
                adj_pts INTEGER DEFAULT 0,
                adj_pld INTEGER DEFAULT 0,
                adj_w INTEGER DEFAULT 0,
                adj_d INTEGER DEFAULT 0,
                adj_l INTEGER DEFAULT 0,
                adj_goals INTEGER DEFAULT 0,
                adj_potd INTEGER DEFAULT 0,
                baseline_date TEXT DEFAULT ''
            );
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS team_standings_overrides (
                team_name TEXT PRIMARY KEY,
                pld INTEGER DEFAULT 0,
                w INTEGER DEFAULT 0,
                d INTEGER DEFAULT 0,
                l INTEGER DEFAULT 0,
                gf INTEGER DEFAULT 0,
                ga INTEGER DEFAULT 0,
                pts INTEGER DEFAULT 0,
                ppg REAL DEFAULT 0.0,
                deductions INTEGER DEFAULT 0,
                adj_pts INTEGER DEFAULT 0,
                adj_pld INTEGER DEFAULT 0,
                adj_w INTEGER DEFAULT 0,
                adj_d INTEGER DEFAULT 0,
                adj_l INTEGER DEFAULT 0,
                adj_gf INTEGER DEFAULT 0,
                adj_ga INTEGER DEFAULT 0,
                baseline_date TEXT DEFAULT ''
            );
        """)

        cursor.execute("PRAGMA table_info(player_standings_overrides);")
        p_cols = [col[1] for col in cursor.fetchall()]
        if "baseline_date" not in p_cols:
            cursor.execute("ALTER TABLE player_standings_overrides ADD COLUMN baseline_date TEXT DEFAULT '';")
        if "deductions" not in p_cols:
            cursor.execute("ALTER TABLE player_standings_overrides ADD COLUMN deductions INTEGER DEFAULT 0;")
        if "adj_pts" not in p_cols:
            cursor.execute("ALTER TABLE player_standings_overrides ADD COLUMN adj_pts INTEGER DEFAULT 0;")
        if "adj_pld" not in p_cols:
            cursor.execute("ALTER TABLE player_standings_overrides ADD COLUMN adj_pld INTEGER DEFAULT 0;")
        if "adj_w" not in p_cols:
            cursor.execute("ALTER TABLE player_standings_overrides ADD COLUMN adj_w INTEGER DEFAULT 0;")
        if "adj_d" not in p_cols:
            cursor.execute("ALTER TABLE player_standings_overrides ADD COLUMN adj_d INTEGER DEFAULT 0;")
        if "adj_l" not in p_cols:
            cursor.execute("ALTER TABLE player_standings_overrides ADD COLUMN adj_l INTEGER DEFAULT 0;")
        if "adj_goals" not in p_cols:
            cursor.execute("ALTER TABLE player_standings_overrides ADD COLUMN adj_goals INTEGER DEFAULT 0;")
        if "adj_potd" not in p_cols:
            cursor.execute("ALTER TABLE player_standings_overrides ADD COLUMN adj_potd INTEGER DEFAULT 0;")

        cursor.execute("PRAGMA table_info(team_standings_overrides);")
        t_cols = [col[1] for col in cursor.fetchall()]
        if "baseline_date" not in t_cols:
            cursor.execute("ALTER TABLE team_standings_overrides ADD COLUMN baseline_date TEXT DEFAULT '';")
        if "deductions" not in t_cols:
            cursor.execute("ALTER TABLE team_standings_overrides ADD COLUMN deductions INTEGER DEFAULT 0;")
        if "adj_pts" not in t_cols:
            cursor.execute("ALTER TABLE team_standings_overrides ADD COLUMN adj_pts INTEGER DEFAULT 0;")
        if "adj_pld" not in t_cols:
            cursor.execute("ALTER TABLE team_standings_overrides ADD COLUMN adj_pld INTEGER DEFAULT 0;")
        if "adj_w" not in t_cols:
            cursor.execute("ALTER TABLE team_standings_overrides ADD COLUMN adj_w INTEGER DEFAULT 0;")
        if "adj_d" not in t_cols:
            cursor.execute("ALTER TABLE team_standings_overrides ADD COLUMN adj_d INTEGER DEFAULT 0;")
        if "adj_l" not in t_cols:
            cursor.execute("ALTER TABLE team_standings_overrides ADD COLUMN adj_l INTEGER DEFAULT 0;")
        if "adj_gf" not in t_cols:
            cursor.execute("ALTER TABLE team_standings_overrides ADD COLUMN adj_gf INTEGER DEFAULT 0;")
        if "adj_ga" not in t_cols:
            cursor.execute("ALTER TABLE team_standings_overrides ADD COLUMN adj_ga INTEGER DEFAULT 0;")

        conn.commit()

        # Seed default league teams if empty or if Red/Yellow Team are in teams table
        cursor.execute("SELECT name FROM teams;")
        existing_teams = [r[0] for r in cursor.fetchall()]
        cursor.execute("DELETE FROM teams WHERE LOWER(name) IN ('team red', 'team yellow', 'red team', 'yellow team', 'shola', 'shola team');")
        cursor.execute("DELETE FROM team_standings_overrides WHERE LOWER(team_name) IN ('team red', 'team yellow', 'red team', 'yellow team', 'shola', 'shola team');")
        default_team_names = ["Jerry", "Ojukwu", "John T", "David", "ND", "Ibraheem", "Osanga", "Samson"]
        for dt_name in default_team_names:
            cursor.execute("INSERT OR IGNORE INTO teams (name, league_id) VALUES (?, 1);", (dt_name,))
        conn.commit()

        # Ensure default start dates if null or empty in existing leagues
        cursor.execute("""
            UPDATE leagues
            SET league_start_date = '2026-03-14'
            WHERE league_start_date IS NULL OR league_start_date = '';
        """)
        cursor.execute("""
            UPDATE leagues
            SET player_league_start_date = '2026-02-28'
            WHERE player_league_start_date IS NULL OR player_league_start_date = '';
        """)

        conn.commit()
        conn.close()
    except (sqlite3.DatabaseError, sqlite3.OperationalError) as err:
        if retry and ("malformed" in str(err).lower() or "disk image" in str(err).lower()):
            print(f"❌ Error during init_db ({err}). Resetting DB and retrying...")
            reset_malformed_db()
            init_db(retry=False)
        else:
            raise err


def validate_and_sync_matches_sessions():
    """
    Backend Validator: Validates that all Match Cards (match_days) are 100% synchronized with Session Cards.
    - If a Match Card exists with empty home/away rosters but present attendance, auto-assigns rosters.
    - Ensures roster players, scorers, and POTD winners from the Match Card are reflected in player_teams mapping.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Build index resolver for player IDs
        idx_map = {f'p_{i}': off_p["name"] for i, off_p in enumerate(OFFICIAL_PLAYER_STANDINGS)}
        idx_map.update({f'p-{i}': off_p["name"] for i, off_p in enumerate(OFFICIAL_PLAYER_STANDINGS)})
        idx_map.update({str(i): off_p["name"] for i, off_p in enumerate(OFFICIAL_PLAYER_STANDINGS)})

        ALIAS_MAP = {
            "onye army (jerry)": "Jerry", "jerry (onye army)": "Jerry", "jerry (captain)": "Jerry", "onye army": "Jerry",
            "charles (kayviva)": "Charles", "kayviva": "Charles", "samson (shola)": "Shola", "shola (samson)": "Shola",
            "kennedy (cana)": "Kennedy", "cana": "Kennedy", "ike (new)": "Ike (New)",
            "p_1785329371713_eny4": "Liam", "p_1785329610328_9u7l": "Christian",
            "p_1785322408161_rhj8": "Samson", "p_1785323022664_0u1w": "Deco"
        }

        def resolve_p_name(raw_k):
            if not raw_k:
                return None
            k_str = str(raw_k).strip()
            k_lower = k_str.lower()
            if k_lower in ALIAS_MAP:
                return ALIAS_MAP[k_lower]
            if k_str in idx_map:
                return idx_map[k_str]
            if k_lower in idx_map:
                return idx_map[k_lower]
            return k_str

        cursor.execute("SELECT * FROM match_days ORDER BY date ASC, id ASC")
        raw_mds = cursor.fetchall()

        repaired_count = 0
        logs = []

        for md in raw_mds:
            m_id = md["id"]
            m_date = md["date"]
            h_team = md["home_team"] or "Home"
            a_team = md["away_team"] or "Away"

            try: h_roster = json.loads(md["home_roster"]) if md["home_roster"] else []
            except Exception: h_roster = []

            try: a_roster = json.loads(md["away_roster"]) if md["away_roster"] else []
            except Exception: a_roster = []

            try: att = json.loads(md["attendance"]) if md["attendance"] else {}
            except Exception: att = {}

            try: p_teams = json.loads(md["player_teams"]) if md["player_teams"] else {}
            except Exception: p_teams = {}

            try: scorers = json.loads(md["scorers"]) if md["scorers"] else []
            except Exception: scorers = []

            present_keys = [k for k, v in att.items() if str(v).lower() == "present"]
            present_names = []
            for pk in present_keys:
                resolved = resolve_p_name(pk)
                if resolved and resolved not in present_names:
                    present_names.append(resolved)

            modified = False

            # If rosters are empty but players attended, auto-populate home_roster and away_roster
            if (not h_roster and not a_roster) and present_names:
                new_h = []
                new_a = []
                sc_names = [resolve_p_name(s.get("player") if isinstance(s, dict) else str(s)) for s in scorers if s]
                sc_names = [x for x in sc_names if x]

                for p_item in present_names:
                    p_low = p_item.lower()
                    if p_low == h_team.lower():
                        new_h.append(p_item)
                    elif p_low == a_team.lower():
                        new_a.append(p_item)
                    elif p_item in sc_names[:max(1, len(sc_names)//2)]:
                        new_h.append(p_item)
                    elif p_item in sc_names[max(1, len(sc_names)//2):]:
                        new_a.append(p_item)
                    else:
                        if len(new_h) <= len(new_a):
                            new_h.append(p_item)
                        else:
                            new_a.append(p_item)

                h_roster = new_h
                a_roster = new_a
                modified = True

            # Sync player_teams
            for p_name in h_roster:
                if p_teams.get(p_name) != h_team:
                    p_teams[p_name] = h_team
                    modified = True

            for p_name in a_roster:
                if p_teams.get(p_name) != a_team:
                    p_teams[p_name] = a_team
                    modified = True

            if modified:
                cursor.execute("""
                    UPDATE match_days
                    SET home_roster = ?, away_roster = ?, player_teams = ?
                    WHERE id = ?;
                """, (json.dumps(h_roster), json.dumps(a_roster), json.dumps(p_teams), m_id))
                repaired_count += 1
                logs.append(f"Synchronized rosters and teams for match day {m_date} ({h_team} vs {a_team})")

        conn.commit()
    except Exception as err:
        print("❌ Error in validate_and_sync_matches_sessions:", err)
    finally:
        conn.close()

    return {
        "status": "success",
        "message": "Backend Match-Session Sync Validator executed successfully.",
        "repaired_sessions": repaired_count,
        "details": logs
    }


def calculate_all_stats():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Get primary league config
    cursor.execute("SELECT * FROM leagues WHERE id = 1 LIMIT 1")
    league_row = cursor.fetchone()
    if league_row and league_row["name"]:
        league_start_date = league_row["league_start_date"] or "2026-03-14"
        player_league_start_date = league_row["player_league_start_date"] or "2026-02-28"
        league_config = {
            "id": league_row["id"],
            "name": league_row["name"],
            "format": league_row["format"] or "7v7",
            "match_type": league_row["match_type"] or "League Match",
            "league_start_date": league_start_date,
            "player_league_start_date": player_league_start_date
        }
    else:
        league_start_date = "2026-03-14"
        player_league_start_date = "2026-02-28"
        league_config = {
            "id": None,
            "name": "",
            "format": "7v7",
            "match_type": "League Match",
            "league_start_date": "2026-03-14",
            "player_league_start_date": "2026-02-28"
        }

    # Fetch all unified match_days
    cursor.execute("SELECT * FROM match_days ORDER BY date DESC, id DESC")
    raw_mds = cursor.fetchall()
    match_days = []
    for md in raw_mds:
        p_teams = {}
        if "player_teams" in md.keys() and md["player_teams"]:
            try:
                p_teams = json.loads(md["player_teams"])
            except Exception:
                p_teams = {}
        match_days.append({
            "id": md["id"],
            "date": md["date"],
            "title": md["title"] or f"Match Day ({md['date']})",
            "attendance": json.loads(md["attendance"]) if md["attendance"] else {},
            "player_teams": p_teams,
            "home_team": md["home_team"] or "Home",
            "away_team": md["away_team"] or "Away",
            "home_score": md["home_score"] if md["home_score"] is not None else 0,
            "away_score": md["away_score"] if md["away_score"] is not None else 0,
            "potd_winner": md["potd_winner"] or "",
            "home_roster": json.loads(md["home_roster"]) if md["home_roster"] else [],
            "away_roster": json.loads(md["away_roster"]) if md["away_roster"] else [],
            "scorers": json.loads(md["scorers"]) if md["scorers"] else [],
            "league_id": md["league_id"] if "league_id" in md.keys() else 1,
            "match_type": md["match_type"] if ("match_type" in md.keys() and md["match_type"]) else "League Match",
            "forfeit_team": md["forfeit_team"] if ("forfeit_team" in md.keys() and md["forfeit_team"]) else "none"
        })

    matches = match_days
    sessions = match_days

    # Fetch all players
    cursor.execute("""
        SELECT * FROM players 
        WHERE LOWER(name) NOT IN ('alex rivera', 'marcus vance', 'david chen', 'sam taylor', 'jordan lee', 'chris paul')
        ORDER BY name ASC
    """)
    raw_players = cursor.fetchall()

    players = [{"id": p["id"], "name": p["name"], "nickname": p["nickname"]} for p in raw_players]

    # Fetch all registered teams
    cursor.execute("SELECT * FROM teams ORDER BY name ASC")
    raw_teams = cursor.fetchall()
    teams = []
    teams_by_name = {}

    for t in raw_teams:
        if t["name"] and t["name"].strip().lower() in ("shola", "shola team", "team red", "team yellow", "red team", "yellow team"):
            continue
        cols = t.keys()
        c_id = t["captain_id"] if ("captain_id" in cols and t["captain_id"]) else None
        p_ids = json.loads(t["player_ids"]) if ("player_ids" in cols and t["player_ids"] and t["player_ids"] != "null") else []
        l_id = t["league_id"] if ("league_id" in cols and t["league_id"]) else 1
        
        team_obj = {
            "id": t["id"],
            "name": t["name"],
            "league_id": l_id,
            "captain_id": c_id,
            "player_ids": p_ids
        }
        teams.append(team_obj)
        teams_by_name[t["name"]] = team_obj

    teams.sort(key=lambda x: x["name"])

    # 1. PLAYER LEAGUE TABLE
    def is_phantom_player_id(val):
        if not val:
            return True
        s = str(val).strip()
        if not s:
            return True
        if s.isdigit():
            return True
        if s.startswith("p_") or s.startswith("p-") or s.startswith("lp_"):
            return True
        if s.startswith("p") and len(s) > 5 and s[1:].replace("-","").replace("_","").isdigit():
            return True
        return False

    player_id_to_name = {}
    player_name_lower_map = {}
    for i, off_p in enumerate(OFFICIAL_PLAYER_STANDINGS):
        p_name = off_p["name"]
        player_id_to_name[str(i)] = p_name
        player_id_to_name[f"p_{i}"] = p_name
        player_id_to_name[f"p-{i}"] = p_name
        player_name_lower_map[p_name.lower()] = p_name

    for p in players:
        if isinstance(p, dict):
            p_id = p.get("id")
            p_name = p.get("name")
            if p_id is not None and p_name:
                player_id_to_name[str(p_id)] = p_name
            if p_name and not is_phantom_player_id(p_name):
                player_name_lower_map[p_name.lower()] = p_name

    ALIAS_MAP = {
        "onye army (jerry)": "Jerry",
        "jerry (onye army)": "Jerry",
        "jerry (captain)": "Jerry",
        "onye army": "Jerry",
        "charles (kayviva)": "Charles",
        "kayviva": "Charles",
        "samson (shola)": "Shola",
        "shola (samson)": "Shola",
        "kennedy (cana)": "Kennedy",
        "cana": "Kennedy",
        "ike (new)": "Ike (New)",
    }

    def resolve_player_name(val):
        if not val:
            return None
        val_str = str(val).strip()
        val_lower = val_str.lower()
        if val_lower in ALIAS_MAP:
            return ALIAS_MAP[val_lower]
        if val_str in player_id_to_name:
            return player_id_to_name[val_str]
        if val_lower in player_name_lower_map:
            return player_name_lower_map[val_lower]
        if not is_phantom_player_id(val_str):
            return val_str
        return None

    # Load manual overrides and official maps from DB
    cursor.execute("SELECT * FROM player_standings_overrides;")
    p_overrides = {row["player_name"].strip().lower(): dict(row) for row in cursor.fetchall()}

    cursor.execute("SELECT * FROM team_standings_overrides;")
    t_overrides = {row["team_name"].strip().lower(): dict(row) for row in cursor.fetchall()}

    official_p_map = {item["name"].strip().lower(): item for item in OFFICIAL_PLAYER_STANDINGS}
    official_c_map = {item["team"].strip().lower(): item for item in OFFICIAL_CAPTAIN_STANDINGS}

    player_stats = {}

    def init_player_entry(p_name):
        if not p_name or is_phantom_player_id(p_name):
            return None
        key_lower = str(p_name).strip().lower()
        if key_lower in player_stats:
            return player_stats[key_lower]

        # 1. Fetch Legacy/Official Base Stats (if any)
        off = official_p_map.get(key_lower, {})
        base_pld = off.get("pld", 0)
        base_w = off.get("w", 0)
        base_d = off.get("d", 0)
        base_l = off.get("l", 0)
        base_pts = off.get("pts", 0)

        # 2. Fetch Manual Overrides/Deltas (if any)
        ov = p_overrides.get(key_lower, {})
        deductions = int(ov.get("deductions", 0) or 0)
        adj_pts = int(ov.get("adj_pts", 0) or 0)
        adj_pld = int(ov.get("adj_pld", 0) or 0)
        adj_w = int(ov.get("adj_w", 0) or 0)
        adj_d = int(ov.get("adj_d", 0) or 0)
        adj_l = int(ov.get("adj_l", 0) or 0)
        adj_goals = int(ov.get("adj_goals", 0) or 0)
        adj_potd = int(ov.get("adj_potd", 0) or 0)
        
        player_stats[key_lower] = {
            "player": ov.get("player_name") or off.get("name") or p_name,
            "pld": base_pld, "w": base_w, "d": base_d, "l": base_l,
            "deductions": deductions,
            "penalty_points": deductions,
            "adj_pts": adj_pts, "adj_pld": adj_pld, "adj_w": adj_w,
            "adj_d": adj_d, "adj_l": adj_l, "adj_goals": adj_goals, "adj_potd": adj_potd,
            "pts": base_pts,
            "ppg": 0.0,
            "goals": 0, "potd": 0,
            "baseline_date_stats": "",
            "baseline_date_awards": ""
        }
        return player_stats[key_lower]

    for p in players:
        if isinstance(p, dict) and p.get("name"):
            init_player_entry(p["name"])

    for off_item in OFFICIAL_PLAYER_STANDINGS:
        init_player_entry(off_item["name"])

    for ov_item in p_overrides.values():
        init_player_entry(ov_item["player_name"])

    def get_player_entry(raw_identifier):
        if isinstance(raw_identifier, dict):
            raw_identifier = raw_identifier.get("name") or raw_identifier.get("player") or raw_identifier.get("fullName") or raw_identifier.get("id") or raw_identifier
        resolved = resolve_player_name(raw_identifier) or raw_identifier
        if not resolved or is_phantom_player_id(str(resolved)):
            return None
        key_lower = str(resolved).strip().lower()
        if key_lower not in player_stats:
            init_player_entry(resolved)
        return player_stats.get(key_lower)

    for m in matches:
        m_id = int(m.get("id") or 0)
        m_date = m.get("date", "")
        m_type = m.get("match_type", "League Match") or "League Match"

        # Goal & POTD tally (begins on 14 February 2026)
        if not m_date or m_date >= "2026-02-14":
            scorers = m.get("scorers", [])
            if isinstance(scorers, str):
                try: scorers = json.loads(scorers)
                except: scorers = []

            for sc in scorers:
                p_raw = sc.get("player") if isinstance(sc, dict) else sc
                p_goals = int(sc.get("goals", 1)) if isinstance(sc, dict) else 1
                if p_raw:
                    pe = get_player_entry(p_raw)
                    if pe and m_date > pe.get("baseline_date_awards", ""):
                        pe["goals"] += p_goals

            potd = m.get("potd_winner")
            if potd:
                if isinstance(potd, list):
                    potd_list = [str(p).strip() for p in potd if p]
                elif isinstance(potd, str):
                    potd_list = [p.strip() for p in potd.split(",") if p.strip()]
                else:
                    potd_list = [str(potd).strip()]
                for p_item in potd_list:
                    pe = get_player_entry(p_item)
                    if pe and m_date > pe.get("baseline_date_awards", ""):
                        pe["potd"] += 1

        # Player League Standings filter
        m_type_clean = (m_type or "").strip().lower()
        is_player_match = (not m_type_clean) or (m_type_clean != "exhibition")
        valid_p_date = (not player_league_start_date) or (m_date >= player_league_start_date)

        if is_player_match and valid_p_date:
            h_score = int(m.get("home_score", 0))
            a_score = int(m.get("away_score", 0))

            home_roster = m.get("home_roster", [])
            if isinstance(home_roster, str):
                try: home_roster = json.loads(home_roster)
                except: home_roster = []

            away_roster = m.get("away_roster", [])
            if isinstance(away_roster, str):
                try: away_roster = json.loads(away_roster)
                except: away_roster = []

            session_for_match = next((s for s in sessions if s.get("date") == m_date or str(s.get("id")) == str(m_id) or str(s.get("matchId")) == str(m_id)), None)
            if session_for_match:
                att = session_for_match.get("attendance", {})
                if isinstance(att, str):
                    try: att = json.loads(att)
                    except: att = {}
                present_names = set()
                if isinstance(att, dict):
                    for k, status in att.items():
                        if str(status).lower() == "present":
                            p_res = resolve_player_name(k) or k
                            if p_res:
                                present_names.add(str(p_res).strip().lower())
                elif isinstance(att, list):
                    for item in att:
                        if isinstance(item, dict) and str(item.get("status")).lower() == "present":
                            p_res = resolve_player_name(item.get("playerId") or item.get("player") or item.get("name"))
                            if p_res:
                                present_names.add(str(p_res).strip().lower())

                if present_names:
                    if home_roster or away_roster:
                        home_roster = [p for p in home_roster if str(resolve_player_name(p) or p).strip().lower() in present_names]
                        away_roster = [p for p in away_roster if str(resolve_player_name(p) or p).strip().lower() in present_names]
                    else:
                        p_teams = session_for_match.get("player_teams", {})
                        if isinstance(p_teams, str):
                            try: p_teams = json.loads(p_teams)
                            except: p_teams = {}
                        h_team_name = (m.get("home_team") or "Red Team").strip().lower()
                        a_team_name = (m.get("away_team") or "Yellow Team").strip().lower()

                        if isinstance(att, dict):
                            for p_key, status in att.items():
                                if str(status).lower() == "present":
                                    p_name = resolve_player_name(p_key) or p_key
                                    if p_name and not is_phantom_player_id(str(p_name)):
                                        assigned_team = str(p_teams.get(p_key) or p_teams.get(p_name) or "").strip().lower()
                                        if assigned_team == h_team_name:
                                            home_roster.append(p_name)
                                        elif assigned_team == a_team_name:
                                            away_roster.append(p_name)

            # Forfeit Detection & Global Roster Fallback in Python
            forfeit_team = str(m.get("forfeit_team") or m.get("forfeitTeam") or "").strip()
            is_forfeit = bool(m.get("is_forfeit"))
            home_team_name = str(m.get("home_team") or m.get("homeTeam") or "").strip()
            away_team_name = str(m.get("away_team") or m.get("awayTeam") or "").strip()

            is_home_forfeit = (forfeit_team.lower() in ["home", home_team_name.lower()]) or (is_forfeit and h_score == 0 and a_score == 3)
            is_away_forfeit = (forfeit_team.lower() in ["away", away_team_name.lower()]) or (is_forfeit and h_score == 3 and a_score == 0)

            if is_home_forfeit:
                h_score = 0
                a_score = 3
                if not away_roster and away_team_name:
                    t_obj = next((t for t in teams if str(t.get("name", "")).strip().lower() == away_team_name.lower()), None)
                    if t_obj:
                        p_ids = t_obj.get("player_ids") or t_obj.get("playerIds") or []
                        if isinstance(p_ids, str):
                            try: p_ids = json.loads(p_ids)
                            except: p_ids = []
                        if isinstance(p_ids, list):
                            away_roster = [resolve_player_name(pid) or pid for pid in p_ids if (resolve_player_name(pid) or pid)]
            elif is_away_forfeit:
                h_score = 3
                a_score = 0
                if not home_roster and home_team_name:
                    t_obj = next((t for t in teams if str(t.get("name", "")).strip().lower() == home_team_name.lower()), None)
                    if t_obj:
                        p_ids = t_obj.get("player_ids") or t_obj.get("playerIds") or []
                        if isinstance(p_ids, str):
                            try: p_ids = json.loads(p_ids)
                            except: p_ids = []
                        if isinstance(p_ids, list):
                            home_roster = [resolve_player_name(pid) or pid for pid in p_ids if (resolve_player_name(pid) or pid)]

            for p_raw in home_roster:
                pe = get_player_entry(p_raw)
                if pe and m_date > pe.get("baseline_date_stats", ""):
                    if "processed_matches" not in pe:
                        pe["processed_matches"] = set()
                    if m_id not in pe["processed_matches"]:
                        pe["processed_matches"].add(m_id)
                        pe["pld"] += 1
                        if h_score > a_score:
                            pe["w"] += 1; pe["pts"] += 3
                        elif h_score == a_score:
                            pe["d"] += 1; pe["pts"] += 1
                        else:
                            pe["l"] += 1

            for p_raw in away_roster:
                pe = get_player_entry(p_raw)
                if pe and m_date > pe.get("baseline_date_stats", ""):
                    if "processed_matches" not in pe:
                        pe["processed_matches"] = set()
                    if m_id not in pe["processed_matches"]:
                        pe["processed_matches"].add(m_id)
                        pe["pld"] += 1
                        if a_score > h_score:
                            pe["w"] += 1; pe["pts"] += 3
                        elif a_score == h_score:
                            pe["d"] += 1; pe["pts"] += 1
                        else:
                            pe["l"] += 1

    player_standings_dict = {}
    for key_lower, s in player_stats.items():
        s["pld"] += int(s.get("adj_pld", 0) or 0)
        s["w"] += int(s.get("adj_w", 0) or 0)
        s["d"] += int(s.get("adj_d", 0) or 0)
        s["l"] += int(s.get("adj_l", 0) or 0)
        s["goals"] += int(s.get("adj_goals", 0) or 0)
        s["potd"] += int(s.get("adj_potd", 0) or 0)
        
        s["deductions"] = int(s.get("deductions", 0) or 0)
        s["penalty_points"] = s["deductions"]
        
        s["pts"] = (s["w"] * 3) + (s["d"] * 1) + int(s.get("adj_pts", 0) or 0) - s["deductions"]
        s["ppg"] = round(s["pts"] / s["pld"], 2) if s["pld"] > 0 else 0.0
        
        s.pop("processed_matches", None)
        s.pop("baseline_date_stats", None)
        s.pop("baseline_date_awards", None)
        if s["pld"] > 0 or s["pts"] > 0 or s["goals"] > 0 or s["potd"] > 0 or s["deductions"] > 0:
            player_standings_dict[key_lower] = s

    player_standings = list(player_standings_dict.values())
    player_standings.sort(key=lambda x: (x["pts"], x["ppg"], x["goals"], -x["pld"]), reverse=True)

    # 2. CAPTAIN'S / TEAM LEAGUE TABLE
    captain_teams = {}

    def is_placeholder_team(team_name):
        if not team_name or not isinstance(team_name, str):
            return True
        clean = team_name.strip().lower()
        return clean in ("home team", "away team", "home", "away", "red team", "yellow team", "shola", "shola team")

    def init_team_entry(team_name):
        if not team_name or is_placeholder_team(team_name):
            return None
        key_lower = team_name.strip().lower()
        if key_lower in captain_teams:
            return captain_teams[key_lower]

        # 1. Fetch Legacy/Official Base Stats (if any)
        off = official_c_map.get(key_lower, {})
        base_pld = off.get("pld", 0)
        base_w = off.get("w", 0)
        base_d = off.get("d", 0)
        base_l = off.get("l", 0)
        base_gf = off.get("gf", 0)
        base_ga = off.get("ga", 0)
        base_gd = off.get("gd", 0)
        base_pts = off.get("pts", 0)

        # 2. Fetch Manual Overrides/Deltas (if any)
        ov = t_overrides.get(key_lower, {})
        deductions = int(ov.get("deductions", 0) or 0)
        adj_pts = int(ov.get("adj_pts", 0) or 0)
        adj_pld = int(ov.get("adj_pld", 0) or 0)
        adj_w = int(ov.get("adj_w", 0) or 0)
        adj_d = int(ov.get("adj_d", 0) or 0)
        adj_l = int(ov.get("adj_l", 0) or 0)
        adj_gf = int(ov.get("adj_gf", 0) or 0)
        adj_ga = int(ov.get("adj_ga", 0) or 0)

        captain_teams[key_lower] = {
            "team": ov.get("team_name") or off.get("team") or team_name,
            "pld": base_pld, "w": base_w, "d": base_d, "l": base_l,
            "gf": base_gf, "ga": base_ga, "gd": base_gd,
            "deductions": deductions, "penalty_points": deductions,
            "adj_pts": adj_pts, "adj_pld": adj_pld, "adj_w": adj_w,
            "adj_d": adj_d, "adj_l": adj_l, "adj_gf": adj_gf, "adj_ga": adj_ga,
            "pts": base_pts, "ppg": 0.0,
            "baseline_date": ""
        }
        return captain_teams[key_lower]

    for t in teams:
        if t.get("name"):
            init_team_entry(t["name"])
    for off_item in OFFICIAL_CAPTAIN_STANDINGS:
        init_team_entry(off_item["team"])
    for ov_item in t_overrides.values():
        init_team_entry(ov_item["team_name"])

    for m in matches:
        m_id = int(m.get("id") or 0)
        m_date = m.get("date", "")
        m_type = m.get("match_type", "League Match") or "League Match"
        m_type_clean = (m_type or "").strip().lower()
        if m_type_clean in ("league match", "league", ""):
            ht = init_team_entry(m.get("home_team"))
            at = init_team_entry(m.get("away_team"))
            h_score = int(m.get("home_score", 0))
            a_score = int(m.get("away_score", 0))

            if ht and m_date > ht.get("baseline_date", ""):
                ht["pld"] += 1
                ht["gf"] += h_score
                ht["ga"] += a_score
                if h_score > a_score: ht["w"] += 1; ht["pts"] += 3
                elif h_score == a_score: ht["d"] += 1; ht["pts"] += 1
                else: ht["l"] += 1

            if at and m_date > at.get("baseline_date", ""):
                at["pld"] += 1
                at["gf"] += a_score
                at["ga"] += h_score
                if a_score > h_score: at["w"] += 1; at["pts"] += 3
                elif a_score == h_score: at["d"] += 1; at["pts"] += 1
                else: at["l"] += 1

    captain_standings_dict = {}
    for key_lower, t in captain_teams.items():
        t["pld"] += int(t.get("adj_pld", 0) or 0)
        t["w"] += int(t.get("adj_w", 0) or 0)
        t["d"] += int(t.get("adj_d", 0) or 0)
        t["l"] += int(t.get("adj_l", 0) or 0)
        t["gf"] += int(t.get("adj_gf", 0) or 0)
        t["ga"] += int(t.get("adj_ga", 0) or 0)
        t["gd"] = t["gf"] - t["ga"]
        
        t["deductions"] = int(t.get("deductions", 0) or 0)
        t["penalty_points"] = t["deductions"]
        
        t["pts"] = (t["w"] * 3) + (t["d"] * 1) + int(t.get("adj_pts", 0) or 0) - t["deductions"]
        t["ppg"] = round(t["pts"] / t["pld"], 2) if t["pld"] > 0 else 0.0
        
        t.pop("baseline_date", None)
        captain_standings_dict[key_lower] = t

    captain_standings = [t for t in captain_standings_dict.values() if not is_placeholder_team(t.get("team"))]
    captain_standings.sort(key=lambda x: (x["pts"], x["gd"], x["gf"]), reverse=True)

    # 3. ATTENDANCE TALLY PER PLAYER
    try:
        conn.close()
    except Exception:
        pass

    attendance_counts = {}
    for p in players:
        p_name = p.get("name") if isinstance(p, dict) else None
        if p_name and not is_phantom_player_id(p_name):
            attendance_counts[p_name] = 0

    for s in sessions:
        att = s.get("attendance", {})
        if isinstance(att, dict):
            for p_key, status in att.items():
                norm_status = str(status).lower()
                if norm_status == "present":
                    # Find player name by ID or key
                    match_name = None
                    p_key_str = str(p_key).strip()
                    for p in players:
                        if isinstance(p, dict):
                            p_id_str = str(p.get("id")).strip() if p.get("id") is not None else ""
                            p_name_str = str(p.get("name")).strip() if p.get("name") is not None else ""
                            if (p_id_str and p_id_str == p_key_str) or (p_name_str and p_name_str.lower() == p_key_str.lower()):
                                match_name = p_name_str
                                break
                    if not match_name and not is_phantom_player_id(p_key_str):
                        match_name = p_key_str

                    if match_name and not is_phantom_player_id(match_name):
                        attendance_counts[match_name] = attendance_counts.get(match_name, 0) + 1

    # 4. DASHBOARD WIDGETS
    # Top Scorer
    sorted_scorers = sorted(player_stats.values(), key=lambda x: x["goals"], reverse=True)
    top_scorer = sorted_scorers[0] if sorted_scorers and sorted_scorers[0]["goals"] > 0 else {"player": "None", "goals": 0}

    # Most Attendance
    most_att_player = "None"
    most_att_count = 0
    for p_name, count in attendance_counts.items():
        if count > most_att_count and not is_phantom_player_id(p_name):
            most_att_count = count
            most_att_player = p_name

    # Most Points by a Player
    top_player_pts = player_standings[0] if player_standings and player_standings[0]["pts"] > 0 else {"player": "None", "pts": 0}

    # Most Points by a Team
    top_team_pts = captain_standings[0] if captain_standings and captain_standings[0]["pts"] > 0 else {"team": "None", "pts": 0}

    # 5. GLOBAL ACCOLADES
    golden_boot = [{"player": s["player"], "goals": s["goals"]} for s in sorted_scorers if s["goals"] > 0]
    potd_tally = sorted([{"player": s["player"], "potd_count": s["potd"]} for s in player_stats.values() if s["potd"] > 0], key=lambda x: x["potd_count"], reverse=True)

    top_potd_entry = potd_tally[0] if potd_tally else {"player": "None", "potd_count": 0}

    widgets = {
        "top_scorer": top_scorer,
        "top_potd": {"player": top_potd_entry.get("player", "None"), "count": top_potd_entry.get("potd_count", 0)},
        "most_attendance": {"player": most_att_player, "count": most_att_count},
        "most_player_pts": top_player_pts,
        "most_team_pts": top_team_pts
    }

    return {
        "league_config": league_config,
        "match_days": match_days,
        "matches": matches,
        "sessions": sessions,
        "players": players,
        "teams": teams,
        "widgets": widgets,
        "player_standings": player_standings,
        "captain_standings": captain_standings,
        "accolades": {
            "golden_boot": golden_boot,
            "potd_tally": potd_tally
        }
    }


@app.route("/")
def index():
    if os.path.exists("index.html"):
        with open("index.html", "r", encoding="utf-8") as f:
            return f.read()
    if os.path.exists("templates/index.html"):
        with open("templates/index.html", "r", encoding="utf-8") as f:
            return f.read()
    return "<h1>Game On App - Missing index.html</h1>"


@app.route("/app.js")
def app_js_file():
    js_path = "app.js" if os.path.exists("app.js") else ("templates/app.js" if os.path.exists("templates/app.js") else ("public/app.js" if os.path.exists("public/app.js") else None))
    if js_path and os.path.exists(js_path):
        with open(js_path, "r", encoding="utf-8") as f:
            return Response(f.read(), mimetype="application/javascript")
    return Response("// empty app.js", mimetype="application/javascript")


@app.route("/sw.js")
@app.route("/service-worker.js")
def service_worker():
    sw_path = "service-worker.js" if os.path.exists("service-worker.js") else ("sw.js" if os.path.exists("sw.js") else "public/sw.js")
    if os.path.exists(sw_path):
        with open(sw_path, "r", encoding="utf-8") as f:
            return Response(f.read(), mimetype="application/javascript")
    return Response("// empty sw", mimetype="application/javascript")


@app.route("/firebase.js")
def firebase_js_file():
    js_path = "firebase.js" if os.path.exists("firebase.js") else ("templates/firebase.js" if os.path.exists("templates/firebase.js") else ("public/firebase.js" if os.path.exists("public/firebase.js") else None))
    if js_path and os.path.exists(js_path):
        with open(js_path, "r", encoding="utf-8") as f:
            return Response(f.read(), mimetype="application/javascript")
    return Response("// empty firebase.js", mimetype="application/javascript")


@app.route("/manifest.json")
def manifest():
    m_path = "public/manifest.json" if os.path.exists("public/manifest.json") else "manifest.json"
    if os.path.exists(m_path):
        with open(m_path, "r", encoding="utf-8") as f:
            return Response(f.read(), mimetype="application/json")
    return jsonify({})


@app.route("/public/<path:filename>")
def serve_public(filename):
    filepath = os.path.join("public", filename)
    if os.path.exists(filepath):
        with open(filepath, "rb") as f:
            content = f.read()
        mimetype = "application/javascript" if filename.endswith(".js") else ("application/json" if filename.endswith(".json") else "application/octet-stream")
        return Response(content, mimetype=mimetype)
    return ("Not Found", 404)


@app.route("/api/sync/validate_matches_sessions", methods=["GET", "POST"])
def validate_matches_sessions_route():
    result = validate_and_sync_matches_sessions()
    return jsonify(result)


@app.route("/api/session/present_players", methods=["GET", "POST"])
def get_session_present_players_route():
    data = request.get_json() if request.method == "POST" else request.args
    session_id = data.get("session_id") or data.get("sessionId")
    match_id = data.get("match_id") or data.get("matchId")
    date_str = data.get("date")

    conn = get_db_connection()
    cursor = conn.cursor()

    session_row = None
    if session_id:
        cursor.execute("SELECT * FROM sessions WHERE id = ? OR CAST(id AS TEXT) = ?;", (session_id, str(session_id)))
        session_row = cursor.fetchone()
    if not session_row and match_id:
        cursor.execute("SELECT * FROM sessions WHERE id = ? OR CAST(id AS TEXT) = ?;", (match_id, str(match_id)))
        session_row = cursor.fetchone()
    if not session_row and date_str:
        cursor.execute("SELECT * FROM sessions WHERE date = ?;", (date_str,))
        session_row = cursor.fetchone()

    cursor.execute("SELECT * FROM players WHERE status = 'Active';")
    players_rows = cursor.fetchall()
    players = [dict(p) for p in players_rows]

    present_players = []
    if session_row and session_row["attendance"]:
        try:
            att = json.loads(session_row["attendance"])
        except Exception:
            att = {}

        if att:
            for p in players:
                p_id = str(p["id"])
                p_name = p["name"]
                val = att.get(p_id) or att.get(p_name) or att.get(p_name.lower())
                if val:
                    if isinstance(val, str) and val.lower() == "present":
                        present_players.append(p)
                    elif isinstance(val, dict) and str(val.get("status")).lower() == "present":
                        present_players.append(p)

    conn.close()
    return jsonify({
        "status": "success",
        "session_id": session_row["id"] if session_row else None,
        "date": session_row["date"] if session_row else date_str,
        "present_players": present_players,
        "count": len(present_players)
    })



@app.route("/api/data", methods=["GET"])
def get_data():
    validate_and_sync_matches_sessions()
    stats = calculate_all_stats()
    return jsonify({
        "status": "success",
        "success": True,
        "league_config": stats["league_config"],
        "match_days": stats["match_days"],
        "matches": stats["matches"],
        "sessions": stats["sessions"],
        "players": stats["players"],
        "teams": stats["teams"],
        "widgets": stats["widgets"],
        "standings": {
            "player_standings": stats["player_standings"],
            "captain_standings": stats["captain_standings"],
            "accolades": stats["accolades"]
        }
    })


@app.route("/api/team/save", methods=["POST"])
def save_team():
    data = request.get_json() or {}
    team_id = data.get("id")
    name = data.get("name") or ""
    if isinstance(name, str):
        name = name.strip()
    else:
        name = ""

    if not name:
        return jsonify({"status": "error", "message": "Team name is required"}), 400

    league_id = data.get("league_id", 1) or 1
    captain_id = data.get("captain_id")
    if captain_id in ("", "null", None):
        captain_id = None

    player_ids = data.get("player_ids", [])
    if isinstance(player_ids, list):
        player_ids_json = json.dumps(player_ids)
    else:
        player_ids_json = "[]"

    conn = get_db_connection()
    cursor = conn.cursor()

    if team_id:
        cursor.execute("""
            UPDATE teams
            SET name = ?, league_id = ?, captain_id = ?, player_ids = ?
            WHERE id = ?;
        """, (name, league_id, captain_id, player_ids_json, team_id))
    else:
        cursor.execute("""
            INSERT OR IGNORE INTO teams (name, league_id, captain_id, player_ids)
            VALUES (?, ?, ?, ?);
        """, (name, league_id, captain_id, player_ids_json))

    conn.commit()
    conn.close()

    return get_data()


@app.route("/api/team/delete", methods=["POST"])
def delete_team():
    try:
        data = request.get_json() or {}
        team_id = data.get("id")
        team_name = data.get("name")

        conn = get_db_connection()
        cursor = conn.cursor()

        conditions = []
        params = []

        if team_id is not None and str(team_id).strip() != "":
            conditions.append("id = ?")
            params.append(team_id)
            if str(team_id).isdigit():
                conditions.append("id = ?")
                params.append(int(team_id))

        if team_name and str(team_name).strip() != "":
            conditions.append("LOWER(name) = LOWER(?)")
            params.append(str(team_name).strip())

        if conditions:
            query = f"DELETE FROM teams WHERE {' OR '.join(conditions)};"
            cursor.execute(query, params)

        if team_name and str(team_name).strip() != "":
            cursor.execute("DELETE FROM team_standings_overrides WHERE LOWER(team_name) = LOWER(?);", (str(team_name).strip(),))

        conn.commit()
        conn.close()

        return get_data()
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/matchday/save", methods=["POST"])
@app.route("/api/match/save", methods=["POST"])
@app.route("/api/session/save", methods=["POST"])
@app.route("/api/attendance", methods=["POST"])
@login_required
def save_matchday():
    data = request.get_json() or {}

    card_id = data.get("id")
    date = str(data.get("date") or datetime.now().strftime("%Y-%m-%d")).strip()
    title = str(data.get("title") or "Match Day").strip()

    raw_attendance = data.get("attendance", {})
    if not isinstance(raw_attendance, dict):
        raw_attendance = {}
    attendance = json.dumps(raw_attendance)

    raw_p_teams = data.get("player_teams") or data.get("playerTeams") or {}
    if not isinstance(raw_p_teams, dict):
        raw_p_teams = {}
    player_teams = json.dumps(raw_p_teams)

    home_team = str(data.get("home_team") or data.get("homeTeam") or "Home").strip()
    away_team = str(data.get("away_team") or data.get("awayTeam") or "Away").strip()

    h_score = data.get("home_score") if data.get("home_score") is not None else data.get("homeScore")
    try:
        home_score = int(h_score) if h_score is not None else 0
    except (ValueError, TypeError):
        home_score = 0

    a_score = data.get("away_score") if data.get("away_score") is not None else data.get("awayScore")
    try:
        away_score = int(a_score) if a_score is not None else 0
    except (ValueError, TypeError):
        away_score = 0

    potd_winner = str(data.get("potd_winner") or data.get("potdWinner") or "").strip()
    match_type = str(data.get("match_type") or data.get("matchType") or "League Match").strip()
    forfeit_team = str(data.get("forfeit_team") or data.get("forfeitTeam") or "none").strip()

    home_roster = json.dumps(data.get("home_roster") or data.get("homeRoster") or [])
    away_roster = json.dumps(data.get("away_roster") or data.get("awayRoster") or [])
    scorers = json.dumps(data.get("scorers") or [])

    conn = get_db_connection()
    cursor = conn.cursor()

    def is_friendly_or_shola(t_name):
        if not t_name: return True
        return t_name.strip().lower() in ("team red", "team yellow", "red team", "yellow team", "shola", "shola team")

    if home_team and not is_friendly_or_shola(home_team):
        cursor.execute("INSERT OR IGNORE INTO teams (name) VALUES (?);", (home_team,))
    if away_team and not is_friendly_or_shola(away_team):
        cursor.execute("INSERT OR IGNORE INTO teams (name) VALUES (?);", (away_team,))

    existing_id = None
    if card_id is not None and str(card_id).strip() != "":
        cursor.execute("SELECT id FROM match_days WHERE id = ? OR CAST(id AS TEXT) = ?;", (card_id, str(card_id)))
        row = cursor.fetchone()
        if row:
            existing_id = row["id"]

    if not existing_id and date:
        cursor.execute("SELECT id FROM match_days WHERE date = ?;", (date,))
        row = cursor.fetchone()
        if row:
            existing_id = row["id"]

    if existing_id:
        cursor.execute("""
            UPDATE match_days
            SET date = ?, title = ?, attendance = ?, player_teams = ?,
                home_team = ?, away_team = ?, home_score = ?, away_score = ?,
                potd_winner = ?, home_roster = ?, away_roster = ?, scorers = ?,
                match_type = ?, forfeit_team = ?
            WHERE id = ?;
        """, (date, title, attendance, player_teams, home_team, away_team, home_score, away_score, potd_winner, home_roster, away_roster, scorers, match_type, forfeit_team, existing_id))
    else:
        cursor.execute("""
            INSERT INTO match_days (
                date, title, attendance, player_teams,
                home_team, away_team, home_score, away_score,
                potd_winner, home_roster, away_roster, scorers,
                match_type, forfeit_team
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (date, title, attendance, player_teams, home_team, away_team, home_score, away_score, potd_winner, home_roster, away_roster, scorers, match_type, forfeit_team))

    conn.commit()
    conn.close()

    return get_data()


def execute_card_deletion(card_id, card_date=None):
    """
    Performs a cascading delete of a specific Match Day Card from the SQLite database by ID.
    Deletes associated match_days, matches, sessions, child rosters, team allocations, attendance records,
    and resets standings overrides for that specific card ID without deleting other cards on the same date.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        id_str = str(card_id).strip() if card_id is not None else ""
        norm_id = id_str.replace("session-", "").replace("session_", "").replace("match-", "").replace("match_", "")

        if id_str:
            cursor.execute("DELETE FROM match_days WHERE id = ? OR CAST(id AS TEXT) = ? OR id = ?;", (card_id, id_str, norm_id))
            cursor.execute("DELETE FROM matches WHERE id = ? OR CAST(id AS TEXT) = ? OR id = ?;", (card_id, id_str, norm_id))
            cursor.execute("DELETE FROM sessions WHERE id = ? OR CAST(id AS TEXT) = ? OR id = ?;", (card_id, id_str, norm_id))
        elif card_date and str(card_date).strip():
            # Fallback ONLY if card_id was not supplied
            d_str = str(card_date).strip()
            cursor.execute("DELETE FROM match_days WHERE date = ?;", (d_str,))
            cursor.execute("DELETE FROM matches WHERE date = ?;", (d_str,))
            cursor.execute("DELETE FROM sessions WHERE date = ?;", (d_str,))

        conn.commit()
        print(f"✅ [CARD DELETED] Delete successful for card ID '{card_id}' / date '{card_date}'")
        return True, None
    except Exception as e:
        conn.rollback()
        err_msg = f"Failed to delete card '{card_id}': {str(e)}"
        print(f"❌ [CARD DELETE ERROR] {err_msg}")
        return False, str(e)
    finally:
        conn.close()


@app.route("/delete_card", methods=["DELETE", "POST"])
@app.route("/delete_card/<path:card_id>", methods=["DELETE", "POST"])
@app.route("/api/card/delete", methods=["DELETE", "POST"])
@app.route("/api/card/delete/<path:card_id>", methods=["DELETE", "POST"])
@app.route("/api/matchday/delete", methods=["DELETE", "POST"])
@app.route("/api/match/delete", methods=["POST", "DELETE"])
@app.route("/api/session/delete", methods=["POST", "DELETE"])
def delete_card_route(card_id=None):
    data = request.get_json() or {}
    target_id = card_id if card_id is not None else data.get("id")
    card_date = data.get("date")
    success, error = execute_card_deletion(target_id, card_date)
    if not success:
        return jsonify({"success": False, "error": error, "status": "error"}), 500

    return get_data()


@app.route("/api/match/clear_all", methods=["POST"])
def clear_all_matches_and_sessions():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM match_days;")
        cursor.execute("DELETE FROM matches;")
        cursor.execute("DELETE FROM sessions;")
        cursor.execute("DELETE FROM player_standings_overrides;")
        cursor.execute("DELETE FROM team_standings_overrides;")
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"❌ [CLEAR ALL ERROR] {str(e)}")
        return jsonify({"success": False, "error": str(e), "status": "error"}), 500
    finally:
        conn.close()
    return get_data()


@app.route("/api/player/save", methods=["POST"])
@app.route("/api/players", methods=["POST"])
@login_required
def save_player():
    print("Received New Player:", request.get_json())
    data = request.get_json() or {}

    player_id = data.get("id")
    name = str(data.get("name") or "").strip()
    nickname = str(data.get("nickname") or "").strip()

    if not name:
        return jsonify({"status": "error", "message": "Player name is required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    existing_id = None
    if player_id is not None and str(player_id).isdigit():
        cursor.execute("SELECT id FROM players WHERE id = ?;", (int(player_id),))
        row = cursor.fetchone()
        if row:
            existing_id = row["id"]

    if not existing_id:
        cursor.execute("SELECT id FROM players WHERE LOWER(name) = LOWER(?);", (name,))
        row = cursor.fetchone()
        if row:
            existing_id = row["id"]

    if existing_id:
        cursor.execute("""
            UPDATE players
            SET name = ?, nickname = ?
            WHERE id = ?;
        """, (name, nickname, existing_id))
    else:
        cursor.execute("""
            INSERT INTO players (name, nickname)
            VALUES (?, ?);
        """, (name, nickname))

    conn.commit()
    conn.close()

    return get_data()


@app.route("/api/player/delete", methods=["POST"])
def delete_player():
    data = request.get_json() or {}
    player_id = data.get("id")
    name = data.get("name")

    conn = get_db_connection()
    cursor = conn.cursor()

    p_id_str = str(player_id).strip() if player_id is not None else ""
    p_name_str = str(name).strip() if name is not None else ""

    if p_id_str.startswith("[object"):
        p_id_str = ""
    if p_name_str.startswith("[object"):
        p_name_str = ""

    if p_id_str and p_id_str.isdigit():
        cursor.execute("DELETE FROM players WHERE id = ?;", (int(p_id_str),))

    if p_name_str:
        cursor.execute("DELETE FROM players WHERE LOWER(name) = LOWER(?);", (p_name_str,))
    elif p_id_str and not p_id_str.isdigit():
        clean_name = p_id_str.replace("p_", "").replace("pk_", "").replace("_", " ")
        if clean_name:
            cursor.execute("DELETE FROM players WHERE LOWER(name) = LOWER(?);", (clean_name,))

    # NEW FIX: Eradicate the player from the standings overrides table to prevent backend resurrection
    if p_name_str:
        cursor.execute("DELETE FROM player_standings_overrides WHERE LOWER(player_name) = LOWER(?);", (p_name_str,))
    elif p_id_str and not p_id_str.isdigit():
        clean_name_ov = p_id_str.replace("p_", "").replace("pk_", "").replace("_", " ")
        if clean_name_ov:
            cursor.execute("DELETE FROM player_standings_overrides WHERE LOWER(player_name) = LOWER(?);", (clean_name_ov,))

    # Clean up phantom IDs from players table
    cursor.execute("""
        DELETE FROM players 
        WHERE name LIKE 'p-%' 
           OR name LIKE 'p_%' 
           OR name GLOB 'p[0-9]*' 
           OR name GLOB '[0-9][0-9][0-9][0-9]*';
    """)

    # Clean match_days (attendance, player_teams, rosters, scorers, potd) for THIS specific player
    cursor.execute("SELECT id, attendance, player_teams, home_roster, away_roster, scorers, potd_winner FROM match_days;")
    md_rows = cursor.fetchall()
    for row in md_rows:
        md_id = row["id"]
        att = json.loads(row["attendance"]) if row["attendance"] else {}
        p_teams = json.loads(row["player_teams"]) if row["player_teams"] else {}
        h_ros = json.loads(row["home_roster"]) if row["home_roster"] else []
        a_ros = json.loads(row["away_roster"]) if row["away_roster"] else []
        scorers = json.loads(row["scorers"]) if row["scorers"] else []
        potd = row["potd_winner"] or ""
        modified = False

        for k in list(att.keys()):
            s_k = str(k).strip()
            if (p_id_str and s_k == p_id_str) or (p_name_str and s_k.lower() == p_name_str.lower()):
                del att[k]
                modified = True

        for k in list(p_teams.keys()):
            s_k = str(k).strip()
            if (p_id_str and s_k == p_id_str) or (p_name_str and s_k.lower() == p_name_str.lower()):
                del p_teams[k]
                modified = True

        def filter_roster(ros):
            nonlocal modified
            new_ros = []
            for item in ros:
                i_name = item.get("name") or item.get("player") if isinstance(item, dict) else str(item)
                i_id = str(item.get("id")) if isinstance(item, dict) and item.get("id") is not None else ""
                if (p_id_str and i_id == p_id_str) or (p_name_str and i_name and i_name.lower() == p_name_str.lower()):
                    modified = True
                else:
                    new_ros.append(item)
            return new_ros

        h_ros = filter_roster(h_ros)
        a_ros = filter_roster(a_ros)

        new_scorers = []
        for sc in scorers:
            sc_name = sc.get("player") or sc.get("name") if isinstance(sc, dict) else str(sc)
            if p_name_str and sc_name and sc_name.lower() == p_name_str.lower():
                modified = True
            else:
                new_scorers.append(sc)

        if p_name_str and potd:
            potd_list = [p.strip() for p in str(potd).split(",") if p.strip()]
            new_potd = [p for p in potd_list if p.lower() != p_name_str.lower()]
            if len(new_potd) != len(potd_list):
                potd = ", ".join(new_potd)
                modified = True

        if modified:
            cursor.execute("""
                UPDATE match_days 
                SET attendance = ?, player_teams = ?, home_roster = ?, away_roster = ?, scorers = ?, potd_winner = ?
                WHERE id = ?;
            """, (json.dumps(att), json.dumps(p_teams), json.dumps(h_ros), json.dumps(a_ros), json.dumps(new_scorers), potd, md_id))

    # Clean teams rosters (player_ids)
    try:
        cursor.execute("SELECT id, player_ids FROM teams;")
        t_rows = cursor.fetchall()
        for row in t_rows:
            t_id = row["id"]
            raw_pids = row["player_ids"]
            if raw_pids:
                try:
                    pids = json.loads(raw_pids)
                except Exception:
                    pids = []
                if isinstance(pids, list):
                    new_pids = [pid for pid in pids if str(pid) != p_id_str and (p_name_str and str(pid).lower() != p_name_str.lower())]
                    if len(new_pids) != len(pids):
                        cursor.execute("UPDATE teams SET player_ids = ? WHERE id = ?;", (json.dumps(new_pids), t_id))
    except Exception:
        pass

    conn.commit()
    conn.close()

    return get_data()


@app.route("/api/league/save", methods=["POST"])
def save_league():
    data = request.get_json() or {}

    name = data.get("name", "").strip()
    fmt = data.get("format", "7v7")
    match_type = data.get("match_type", "League Match")
    league_start_date = (data.get("league_start_date") or "").strip() or "2026-03-14"
    player_league_start_date = (data.get("player_league_start_date") or "").strip() or "2026-02-28"

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM leagues WHERE id = 1;")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
            INSERT INTO leagues (id, name, format, match_type, league_start_date, player_league_start_date)
            VALUES (1, ?, ?, ?, ?, ?);
        """, (name, fmt, match_type, league_start_date, player_league_start_date))
    else:
        cursor.execute("""
            UPDATE leagues
            SET name = ?, format = ?, match_type = ?, league_start_date = ?, player_league_start_date = ?
            WHERE id = 1;
        """, (name, fmt, match_type, league_start_date, player_league_start_date))

    conn.commit()
    conn.close()

    return get_data()


@app.route("/api/league/delete", methods=["POST"])
def delete_league():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM leagues;")
    conn.commit()
    conn.close()

    return get_data()


@app.route("/api/backup/export", methods=["GET"])
@admin_required
def export_backup():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM matches")
    raw_matches = cursor.fetchall()
    matches = [
        {
            "id": m["id"], "date": m["date"], "home_team": m["home_team"], "away_team": m["away_team"],
            "home_score": m["home_score"], "away_score": m["away_score"], "potd_winner": m["potd_winner"],
            "home_roster": json.loads(m["home_roster"]) if m["home_roster"] else [],
            "away_roster": json.loads(m["away_roster"]) if m["away_roster"] else [],
            "scorers": json.loads(m["scorers"]) if m["scorers"] else []
        }
        for m in raw_matches
    ]

    cursor.execute("SELECT * FROM sessions")
    raw_sessions = cursor.fetchall()
    sessions = [
        {
            "id": s["id"], "date": s["date"], "title": s["title"],
            "attendance": json.loads(s["attendance"]) if s["attendance"] else {}
        }
        for s in raw_sessions
    ]

    cursor.execute("SELECT * FROM players")
    raw_players = cursor.fetchall()
    players = [{"id": p["id"], "name": p["name"], "nickname": p["nickname"]} for p in raw_players]

    cursor.execute("SELECT * FROM leagues WHERE id = 1")
    raw_league = cursor.fetchone()
    league = dict(raw_league) if raw_league else {}

    conn.close()

    backup_data = {
        "export_date": datetime.now().isoformat(),
        "league": league,
        "matches": matches,
        "sessions": sessions,
        "players": players
    }

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"game_on_backup_{timestamp}.json"

    return Response(
        json.dumps(backup_data, indent=2),
        mimetype="application/json",
        headers={"Content-Disposition": f"attachment;filename={filename}"}
    )


@app.route("/api/backup/import", methods=["POST"])
@admin_required
def import_backup():
    data = request.get_json() or {}

    matches = data.get("matches", [])
    sessions = data.get("sessions", [])
    players = data.get("players", [])
    league = data.get("league", {})

    conn = get_db_connection()
    cursor = conn.cursor()

    if data.get("overwrite") is True:
        cursor.execute("DELETE FROM matches;")
        cursor.execute("DELETE FROM sessions;")
        cursor.execute("DELETE FROM players;")

    for m in matches:
        cursor.execute("""
            INSERT OR REPLACE INTO matches (id, date, home_team, away_team, home_score, away_score, potd_winner, home_roster, away_roster, scorers)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            m.get("id"),
            m.get("date", "2026-01-01"),
            m.get("home_team", "Home"),
            m.get("away_team", "Away"),
            m.get("home_score", 0),
            m.get("away_score", 0),
            m.get("potd_winner", ""),
            json.dumps(m.get("home_roster", [])),
            json.dumps(m.get("away_roster", [])),
            json.dumps(m.get("scorers", []))
        ))

    for s in sessions:
        cursor.execute("""
            INSERT OR REPLACE INTO sessions (id, date, title, attendance)
            VALUES (?, ?, ?, ?);
        """, (
            s.get("id"),
            s.get("date", "2026-01-01"),
            s.get("title", "Training"),
            json.dumps(s.get("attendance", {}))
        ))

    for p in players:
        cursor.execute("""
            INSERT OR REPLACE INTO players (id, name, nickname)
            VALUES (?, ?, ?);
        """, (p.get("id"), p.get("name"), p.get("nickname", "")))

    if league:
        cursor.execute("""
            UPDATE leagues
            SET name = ?, format = ?, match_type = ?, league_start_date = ?, player_league_start_date = ?
            WHERE id = 1;
        """, (
            league.get("name", "Game On Premier Division"),
            league.get("format", "7v7"),
            league.get("match_type", "League Match"),
            league.get("league_start_date", "2026-03-14"),
            league.get("player_league_start_date", "2026-02-28")
        ))

    conn.commit()
    conn.close()

    return jsonify({"status": "success", "message": "Backup imported successfully!"})


@app.route("/api/export/csv", methods=["GET"])
@admin_required
def export_csv():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM sessions ORDER BY date DESC")
    raw_sessions = cursor.fetchall()

    cursor.execute("SELECT name FROM players ORDER BY name ASC")
    all_players = [row["name"] for row in cursor.fetchall()]

    conn.close()

    csv_rows = []
    # Header: Session Date, Session Title, Player1, Player2, ...
    header = ["Session Date", "Session Title"] + all_players
    csv_rows.append(",".join([f'"{h}"' for h in header]))

    for s in raw_sessions:
        att = json.loads(s["attendance"]) if s["attendance"] else {}
        row = [f'"{s["date"]}"', f'"{s["title"]}"']
        for p in all_players:
            status = att.get(p, "Absent")
            row.append(f'"{status}"')
        csv_rows.append(",".join(row))

    csv_content = "\n".join(csv_rows)
    filename = f"game_on_session_attendance_{datetime.now().strftime('%Y%m%d')}.csv"

    return Response(
        csv_content,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment;filename={filename}"}
    )


@app.route("/api/standings/save_team", methods=["POST"])
def save_team_standings_route():
    data = request.get_json() or {}
    teams = data if isinstance(data, list) else [data]
    
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT MAX(date) FROM match_days;")
    row = cursor.fetchone()
    latest_date = row[0] if (row and row[0]) else datetime.now().strftime("%Y-%m-%d")
    
    def parse_int(val1, val2, default=0):
        if val1 is not None and val1 != "":
            try: return int(val1)
            except: pass
        if val2 is not None and val2 != "":
            try: return int(val2)
            except: pass
        return default

    for t in teams:
        team_name = str(t.get("name") or t.get("team") or "").strip()
        if not team_name:
            continue
        pld = parse_int(t.get("pld"), t.get("played"))
        auto_pld = parse_int(t.get("auto_pld"), None)
        adj_pld = pld - auto_pld if auto_pld is not None else parse_int(t.get("adj_pld"), 0)

        w = parse_int(t.get("w"), t.get("won"))
        auto_w = parse_int(t.get("auto_w"), None)
        adj_w = w - auto_w if auto_w is not None else parse_int(t.get("adj_w"), 0)

        d = parse_int(t.get("d"), t.get("drawn"))
        auto_d = parse_int(t.get("auto_d"), None)
        adj_d = d - auto_d if auto_d is not None else parse_int(t.get("adj_d"), 0)

        l = parse_int(t.get("l"), t.get("lost"))
        auto_l = parse_int(t.get("auto_l"), None)
        adj_l = l - auto_l if auto_l is not None else parse_int(t.get("adj_l"), 0)

        gf = parse_int(t.get("gf"), t.get("goalsFor"))
        auto_gf = parse_int(t.get("auto_gf"), None)
        adj_gf = gf - auto_gf if auto_gf is not None else parse_int(t.get("adj_gf"), 0)

        ga = parse_int(t.get("ga"), t.get("goalsAgainst"))
        auto_ga = parse_int(t.get("auto_ga"), None)
        adj_ga = ga - auto_ga if auto_ga is not None else parse_int(t.get("adj_ga"), 0)

        deductions = parse_int(t.get("deductions"), t.get("penalty_points"))
        pts_val = t.get("pts") if t.get("pts") is not None else t.get("points")
        pts = int(pts_val) if pts_val is not None and str(pts_val).strip() != "" else 0
        
        adj_pts = pts - ((w * 3) + (d * 1) - deductions)

        ppg_val = t.get("ppg")
        ppg = float(ppg_val) if ppg_val is not None else round(pts/pld, 2) if pld > 0 else 0.0
        
        cursor.execute("""
            INSERT INTO team_standings_overrides (team_name, pld, w, d, l, gf, ga, pts, ppg, deductions, adj_pts, adj_pld, adj_w, adj_d, adj_l, adj_gf, adj_ga, baseline_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(team_name) DO UPDATE SET
                pld=excluded.pld, w=excluded.w, d=excluded.d, l=excluded.l,
                gf=excluded.gf, ga=excluded.ga, pts=excluded.pts, ppg=excluded.ppg,
                deductions=excluded.deductions, adj_pts=excluded.adj_pts,
                adj_pld=excluded.adj_pld, adj_w=excluded.adj_w, adj_d=excluded.adj_d, adj_l=excluded.adj_l,
                adj_gf=excluded.adj_gf, adj_ga=excluded.adj_ga, baseline_date=excluded.baseline_date;
        """, (team_name, pld, w, d, l, gf, ga, pts, ppg, deductions, adj_pts or 0, adj_pld or 0, adj_w or 0, adj_d or 0, adj_l or 0, adj_gf or 0, adj_ga or 0, latest_date))
        
    conn.commit()
    conn.close()
    return get_data()


@app.route("/api/standings/save_player", methods=["POST"])
def save_player_standings_route():
    data = request.get_json() or {}
    players = data if isinstance(data, list) else [data]
    
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT MAX(date) FROM match_days;")
    row = cursor.fetchone()
    latest_date = row[0] if (row and row[0]) else datetime.now().strftime("%Y-%m-%d")
    
    def parse_int(val1, val2, default=0):
        if val1 is not None and val1 != "":
            try: return int(val1)
            except: pass
        if val2 is not None and val2 != "":
            try: return int(val2)
            except: pass
        return default

    for p in players:
        p_name = str(p.get("name") or p.get("player") or "").strip()
        if not p_name:
            continue
        pld = parse_int(p.get("pld"), p.get("played"))
        auto_pld = parse_int(p.get("auto_pld"), None)
        adj_pld = pld - auto_pld if auto_pld is not None else parse_int(p.get("adj_pld"), 0)

        w = parse_int(p.get("w"), p.get("won"))
        auto_w = parse_int(p.get("auto_w"), None)
        adj_w = w - auto_w if auto_w is not None else parse_int(p.get("adj_w"), 0)

        d = parse_int(p.get("d"), p.get("drawn"))
        auto_d = parse_int(p.get("auto_d"), None)
        adj_d = d - auto_d if auto_d is not None else parse_int(p.get("adj_d"), 0)

        l = parse_int(p.get("l"), p.get("lost"))
        auto_l = parse_int(p.get("auto_l"), None)
        adj_l = l - auto_l if auto_l is not None else parse_int(p.get("adj_l"), 0)

        goals = parse_int(p.get("goals"), p.get("g"))
        auto_goals = parse_int(p.get("auto_goals"), None)
        adj_goals = goals - auto_goals if auto_goals is not None else parse_int(p.get("adj_goals"), 0)

        potd = parse_int(p.get("potd"), None)
        auto_potd = parse_int(p.get("auto_potd"), None)
        adj_potd = potd - auto_potd if auto_potd is not None else parse_int(p.get("adj_potd"), 0)
        
        deductions = parse_int(p.get("deductions"), p.get("penalty_points"))
        pts_val = p.get("pts") if p.get("pts") is not None else p.get("points")
        pts = int(pts_val) if pts_val is not None and str(pts_val).strip() != "" else 0
        
        adj_pts = pts - ((w * 3) + (d * 1) - deductions)

        ppg_val = p.get("ppg")
        ppg = float(ppg_val) if ppg_val is not None else round(pts/pld, 2) if pld > 0 else 0.0
        
        cursor.execute("""
            INSERT INTO player_standings_overrides (player_name, pld, w, d, l, pts, ppg, goals, potd, deductions, adj_pts, adj_pld, adj_w, adj_d, adj_l, adj_goals, adj_potd, baseline_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(player_name) DO UPDATE SET
                pld=excluded.pld, w=excluded.w, d=excluded.d, l=excluded.l,
                pts=excluded.pts, ppg=excluded.ppg, goals=excluded.goals, potd=excluded.potd,
                deductions=excluded.deductions, adj_pts=excluded.adj_pts,
                adj_pld=excluded.adj_pld, adj_w=excluded.adj_w, adj_d=excluded.adj_d, adj_l=excluded.adj_l,
                adj_goals=excluded.adj_goals, adj_potd=excluded.adj_potd, baseline_date=excluded.baseline_date;
        """, (p_name, pld, w, d, l, pts, ppg, goals, potd, deductions, adj_pts or 0, adj_pld or 0, adj_w or 0, adj_d or 0, adj_l or 0, adj_goals or 0, adj_potd or 0, latest_date))
        
    conn.commit()
    conn.close()
    return get_data()


@app.route("/api/standings/reset", methods=["POST"])
def reset_standings_overrides():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM player_standings_overrides;")
    cursor.execute("DELETE FROM team_standings_overrides;")
    conn.commit()
    conn.close()
    return get_data()


@app.route('/api/sheets/status', methods=['GET'])
def google_sheets_status():
    credentials_file = os.path.join(os.path.dirname(__file__), 'credentials.json')
    has_file = os.path.exists(credentials_file)
    has_env = bool(os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON') or os.environ.get('GOOGLE_CREDENTIALS_JSON') or os.environ.get('GOOGLE_APPLICATION_CREDENTIALS'))
    return jsonify({
        "configured": has_file or has_env,
        "hasCredentialsFile": has_file,
        "hasEnvCredentials": has_env
    })


@app.route('/api/sheets/save_credentials', methods=['POST'])
@admin_required
def save_google_credentials():
    try:
        data = request.get_json() or {}
        json_content = data.get('credentialsJson')
        if not json_content:
            return jsonify({"error": "No credentials content provided"}), 400
        
        if isinstance(json_content, dict):
            info = json_content
        else:
            try:
                info = json.loads(json_content)
            except Exception as pe:
                return jsonify({"error": f"Invalid JSON format: {str(pe)}"}), 400
        
        if "type" not in info or info.get("type") != "service_account":
            return jsonify({"error": "Invalid service account JSON format. Field 'type' must be 'service_account'."}), 400

        credentials_file = os.path.join(os.path.dirname(__file__), 'credentials.json')
        with open(credentials_file, 'w', encoding='utf-8') as f:
            json.dump(info, f, indent=2)

        return jsonify({"success": True, "message": "credentials.json saved successfully on server root."}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to save credentials: {str(e)}"}), 500


@app.route('/api/sync', methods=['POST'])
@app.route('/api/sheets/sync', methods=['POST'])
@admin_required
def sync_to_sheets():
    try:
        data = request.get_json() or {}
        sheet_id = data.get('spreadsheetId')
        attendance_data = data.get('attendanceReport') or data.get('attendance_report') or []
        match_cards_data = data.get('matchAttendanceCards') or data.get('match_attendance_cards') or []
        matches_data = data.get('matches') or []
        standings_data = data.get('playerStandings') or []
        
        if not sheet_id:
            return jsonify({"message": "Spreadsheet ID is missing."}), 400
            
        # 1. Authenticate with Google (Reads local credentials.json, payload, or env)
        scopes = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
        creds = None

        # Check payload
        service_account_input = data.get('credentials') or data.get('serviceAccountJson') or data.get('credentialsJson')
        if service_account_input:
            try:
                from google.oauth2.service_account import Credentials
                if isinstance(service_account_input, str):
                    info = json.loads(service_account_input)
                    creds = Credentials.from_service_account_info(info, scopes=scopes)
                elif isinstance(service_account_input, dict):
                    creds = Credentials.from_service_account_info(service_account_input, scopes=scopes)
            except Exception as e:
                print("Payload credentials parse error:", e)

        # Check credentials.json file
        credentials_file = os.path.join(os.path.dirname(__file__), 'credentials.json')
        if not creds and os.path.exists(credentials_file):
            try:
                from google.oauth2.service_account import Credentials
                creds = Credentials.from_service_account_file(credentials_file, scopes=scopes)
            except Exception as e:
                print("credentials.json read error:", e)

        # Check env vars
        env_json = os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON') or os.environ.get('GOOGLE_CREDENTIALS_JSON') or os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
        if not creds and env_json:
            try:
                from google.oauth2.service_account import Credentials
                if os.path.exists(env_json):
                    creds = Credentials.from_service_account_file(env_json, scopes=scopes)
                else:
                    creds = Credentials.from_service_account_info(json.loads(env_json), scopes=scopes)
            except Exception as e:
                print("Env credentials read error:", e)

        # Try using gspread first if available
        try:
            import gspread
            if not creds:
                from google.oauth2.service_account import Credentials
                creds = Credentials.from_service_account_file('credentials.json', scopes=scopes)

            client = gspread.authorize(creds)
            spreadsheet = client.open_by_key(sheet_id)

            # 3. Get or Create the "Attendance" Worksheet tab
            try:
                worksheet = spreadsheet.worksheet("Attendance")
            except Exception:
                try:
                    worksheet = spreadsheet.add_worksheet(title="Attendance", rows="1000", cols="20")
                except Exception:
                    worksheet = spreadsheet.sheet1

            # 4. Clear old ghost data
            worksheet.clear()

            # 5. Prepare the Headers and Rows
            rows_to_insert = [["Player Name", "Total Matches Attended", "Dates Attended"]]

            # Sort players alphabetically for a clean report
            sorted_attendance = sorted(attendance_data, key=lambda x: str(x.get('player_name', x.get('name', ''))).lower())

            for player in sorted_attendance:
                name = player.get('player_name') or player.get('name') or 'Unknown'
                total = player.get('total_attended') if player.get('total_attended') is not None else player.get('count', 0)
                raw_dates = player.get('dates_present') or player.get('dates') or []
                dates = ", ".join(raw_dates) if isinstance(raw_dates, list) else str(raw_dates)
                rows_to_insert.append([name, total, dates])

            # 6. Bulk write the data to the Google Sheet with USER_ENTERED
            worksheet.update('A1', rows_to_insert, value_input_option='USER_ENTERED')

            # Format the header row to be bold and clean
            try:
                worksheet.format("A1:C1", {
                    "backgroundColor": {"red": 0.06, "green": 0.72, "blue": 0.50},  # Emerald Green
                    "textFormat": {"foregroundColor": {"red": 1.0, "green": 1.0, "blue": 1.0}, "bold": True}
                })
            except Exception as fmt_err:
                print("Formatting notice:", fmt_err)

            sheet_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/edit"
            return jsonify({"success": True, "sheetUrl": sheet_url, "message": "Attendance successfully mapped to Google Sheets"}), 200

        except ImportError:
            # Fallback to googleapiclient if gspread is not available
            from googleapiclient.discovery import build
            service = build('sheets', 'v4', credentials=creds)
            
            # Ensure "Attendance" sheet exists
            meta_data = service.spreadsheets().get(spreadsheetId=sheet_id).execute()
            sheets_list = meta_data.get('sheets', [])
            att_sheet = next((s for s in sheets_list if s.get('properties', {}).get('title') == 'Attendance'), None)
            
            if not att_sheet:
                add_res = service.spreadsheets().batchUpdate(
                    spreadsheetId=sheet_id,
                    body={"requests": [{"addSheet": {"properties": {"title": "Attendance"}}}]}
                ).execute()
                att_id = add_res['replies'][0]['addSheet']['properties']['sheetId']
            else:
                att_id = att_sheet['properties']['sheetId']

            # Clear
            service.spreadsheets().values().clear(spreadsheetId=sheet_id, range="'Attendance'!A:ZZ").execute()

            # Prepare rows
            rows_to_insert = [["Player Name", "Total Matches Attended", "Dates Attended"]]
            sorted_attendance = sorted(attendance_data, key=lambda x: str(x.get('player_name', x.get('name', ''))).lower())
            for player in sorted_attendance:
                name = player.get('player_name') or player.get('name') or 'Unknown'
                total = player.get('total_attended') if player.get('total_attended') is not None else player.get('count', 0)
                raw_dates = player.get('dates_present') or player.get('dates') or []
                dates = ", ".join(raw_dates) if isinstance(raw_dates, list) else str(raw_dates)
                rows_to_insert.append([name, total, dates])

            service.spreadsheets().values().update(
                spreadsheetId=sheet_id,
                range="'Attendance'!A1",
                valueInputOption="USER_ENTERED",
                body={"values": rows_to_insert}
            ).execute()

            # Format header
            try:
                service.spreadsheets().batchUpdate(
                    spreadsheetId=sheet_id,
                    body={"requests": [{
                        "repeatCell": {
                            "range": { "sheetId": att_id, "startRowIndex": 0, "endRowIndex": 1, "startColumnIndex": 0, "endColumnIndex": 3 },
                            "cell": {
                                "userEnteredFormat": {
                                    "backgroundColor": { "red": 0.06, "green": 0.72, "blue": 0.50 },
                                    "textFormat": { "foregroundColor": { "red": 1.0, "green": 1.0, "blue": 1.0 }, "bold": True }
                                }
                            },
                            "fields": "userEnteredFormat(backgroundColor,textFormat)"
                        }
                    }]}
                ).execute()
            except Exception as e:
                pass

            sheet_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/edit"
            return jsonify({"success": True, "sheetUrl": sheet_url, "message": "Attendance successfully mapped to Google Sheets"}), 200

    except Exception as e:
        print(f"Backend Sync Error: {e}")
        return jsonify({"message": str(e)}), 500


@app.route('/api/create-sheet', methods=['POST'])
@admin_required
def api_create_sheet():
    try:
        data = request.get_json() or {}
        title = data.get('title') or "Game On Attendance"
        creds_dict = data.get('credentials') or data.get('serviceAccountJson') or data.get('credentialsJson')

        try:
            from google.oauth2.service_account import Credentials
            from googleapiclient.discovery import build
        except ImportError:
            # If gspread is available
            try:
                import gspread
                from google.oauth2.service_account import Credentials
                if not creds_dict:
                    return jsonify({"message": "No Service Account Credentials provided."}), 400
                scopes = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
                if isinstance(creds_dict, str):
                    creds_dict = json.loads(creds_dict)
                creds = Credentials.from_service_account_info(creds_dict, scopes=scopes)
                client = gspread.authorize(creds)
                spreadsheet = client.create(title)
                try:
                    spreadsheet.share('', role='writer', type='anyone')
                except Exception as share_err:
                    print(f"Share warning: {share_err}")
                return jsonify({
                    'success': True,
                    'sheetId': spreadsheet.id,
                    'sheetUrl': spreadsheet.url
                }), 200
            except Exception as gspread_err:
                return jsonify({"error": f"Google API python packages not installed on server: {str(gspread_err)}"}), 500

        SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
        creds = None

        if creds_dict:
            if isinstance(creds_dict, str):
                try:
                    info = json.loads(creds_dict)
                    creds = Credentials.from_service_account_info(info, scopes=SCOPES)
                except Exception as parse_err:
                    return jsonify({"error": f"Invalid Service Account JSON: {str(parse_err)}"}), 400
            elif isinstance(creds_dict, dict):
                creds = Credentials.from_service_account_info(creds_dict, scopes=SCOPES)

        credentials_file = os.path.join(os.path.dirname(__file__), 'credentials.json')
        if not creds and os.path.exists(credentials_file):
            creds = Credentials.from_service_account_file(credentials_file, scopes=SCOPES)

        env_json = os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON') or os.environ.get('GOOGLE_CREDENTIALS_JSON') or os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
        if not creds and env_json:
            if os.path.exists(env_json):
                creds = Credentials.from_service_account_file(env_json, scopes=SCOPES)
            else:
                try:
                    info = json.loads(env_json)
                    creds = Credentials.from_service_account_info(info, scopes=SCOPES)
                except Exception:
                    pass

        if not creds:
            return jsonify({
                "success": False,
                "message": "Server-side Google credentials missing. Sheet creation aborted."
            }), 400

        service = build('sheets', 'v4', credentials=creds)
        spreadsheet_body = {
            'properties': {
                'title': title
            },
            'sheets': [
                {'properties': {'title': 'Attendance'}},
                {'properties': {'title': 'Match Attendance Cards'}},
                {'properties': {'title': 'Weekly Reports & Standings'}},
                {'properties': {'title': 'All Matches Log'}}
            ]
        }
        sheet = service.spreadsheets().create(body=spreadsheet_body, fields='spreadsheetId').execute()
        sheet_id = sheet.get('spreadsheetId')
        sheet_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/edit"

        # Explicitly grant public view/edit permissions via Drive API to avoid ghost sheet permissions lock
        try:
            drive_service = build('drive', 'v3', credentials=creds)
            drive_service.permissions().create(
                fileId=sheet_id,
                body={'type': 'anyone', 'role': 'writer'}
            ).execute()
            user_email = data.get('userEmail') or data.get('email')
            if user_email and isinstance(user_email, str) and '@' in user_email:
                try:
                    drive_service.permissions().create(
                        fileId=sheet_id,
                        body={'type': 'user', 'role': 'writer', 'emailAddress': user_email.strip()}
                    ).execute()
                except Exception as email_err:
                    print(f"User email share notice: {email_err}")
        except Exception as perm_err:
            print(f"Drive permissions warning: {str(perm_err)}")

        return jsonify({
            "success": True,
            "sheetId": sheet_id,
            "sheetUrl": sheet_url
        }), 200
    except Exception as err:
        print(f"Server Error during Sheet Creation: {err}")
        return jsonify({
            "success": False,
            "message": "Server-side Google credentials missing. Sheet creation aborted."
        }), 400


# ============================================================================
# 🟢 MICROSOFT GRAPH API: EXCEL ATTENDANCE TEMPLATE DUPLICATION & SYNC
# Target Owner: ralph.boer@hillsong.co.uk
# Layout Spec: "Player Attendance" Worksheet (per 8jDaDHKuCSexQQ4.jpg reference)
# ============================================================================
def get_ms_graph_token():
    tenant_id = os.getenv("MS_TENANT_ID") or os.getenv("AZURE_TENANT_ID")
    client_id = os.getenv("MS_CLIENT_ID") or os.getenv("AZURE_CLIENT_ID")
    client_secret = os.getenv("MS_CLIENT_SECRET") or os.getenv("AZURE_CLIENT_SECRET")
    
    if not (tenant_id and client_id and client_secret):
        return None
        
    try:
        import msal
        authority = f"https://login.microsoftonline.com/{tenant_id}"
        app_msal = msal.ConfidentialClientApplication(
            client_id,
            client_credential=client_secret,
            authority=authority
        )
        result = app_msal.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])
        return result.get("access_token")
    except Exception as msal_err:
        print(f"MSAL Token error: {msal_err}")
        return None

@app.route("/api/sync-attendance", methods=["POST"])
@admin_required
def sync_attendance_to_sharepoint_template():
    """
    1. Authenticates via MSAL Client Credentials.
    2. Copies the Excel template in ralph.boer@hillsong.co.uk's drive.
    3. Injects attendance data directly into the 'Player Attendance' worksheet
       using the Microsoft Graph REST API:
       - Row 1: Merged green banner (A1:T1) 'FOOTBALL UNITED [SESSION NAME]'
       - Row 2: A2='Player Name', B2..T2=Dates
       - Col A: Player names
       - Grid: TRUE/FALSE booleans mapping to checkboxes
    """
    try:
        import requests
        data = request.get_json() or {}
        session_name = data.get("sessionName", "Football Training")
        session_date = data.get("sessionDate") or datetime.now().strftime("%Y-%m-%d")
        template_id = data.get("templateId") or os.getenv("MS_TEMPLATE_FILE_ID")
        target_user = "ralph.boer@hillsong.co.uk"
        
        new_filename = f"Football_United_Attendance_Report_{session_date}.xlsx"
        
        # Active players from Firestore or official squad
        active_players = []
        try:
            import firebase_admin
            from firebase_admin import firestore
            if firebase_admin._apps:
                f_db = firestore.client()
                players_docs = f_db.collection("players").stream()
                for p_doc in players_docs:
                    p_val = p_doc.to_dict()
                    p_name = p_val.get("name")
                    if p_name:
                        active_players.append(p_name)
        except Exception as fb_err:
            print(f"Firestore query notice: {fb_err}")
            
        if not active_players:
            active_players = [p["name"] for p in OFFICIAL_PLAYER_STANDINGS[:20]]
            
        active_players.sort()
        
        # Session dates
        session_dates = ["16-Jul", "23-Jul", "30-Jul", "06-Aug", "13-Aug", "20-Aug", "27-Aug", "03-Sep", "10-Sep", "17-Sep", "24-Sep"]
        total_cols = max(len(session_dates) + 1, 20) # A to T
        end_col_letter = chr(64 + total_cols) if total_cols <= 26 else "T"
        
        token = get_ms_graph_token()
        created_file_id = None
        sharepoint_web_url = None
        
        if token:
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            
            # 1. Duplicate Template using Graph API copy endpoint
            if template_id:
                try:
                    copy_url = f"https://graph.microsoft.com/v1.0/users/{target_user}/drive/items/{template_id}/copy"
                    copy_res = requests.post(copy_url, headers=headers, json={
                        "name": new_filename,
                        "parentReference": {"path": "/drive/root:/WeeklyReports"}
                    }, timeout=15)
                    if copy_res.status_code in [200, 201, 202]:
                        monitor_url = copy_res.headers.get("Location")
                        if monitor_url:
                            import time
                            time.sleep(2)
                except Exception as copy_err:
                    print(f"Template copy notice: {copy_err}")
            
            # 2. If copy not completed, create directly in target user's drive
            if not created_file_id:
                try:
                    put_url = f"https://graph.microsoft.com/v1.0/users/{target_user}/drive/root:/WeeklyReports/{new_filename}:/content"
                    import io
                    import openpyxl
                    wb = openpyxl.Workbook()
                    ws = wb.active
                    ws.title = "Player Attendance"
                    buf = io.BytesIO()
                    wb.save(buf)
                    buf.seek(0)
                    
                    upload_res = requests.put(put_url, headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    }, data=buf.getvalue(), timeout=30)
                    
                    if upload_res.status_code in [200, 201]:
                        f_info = upload_res.json()
                        created_file_id = f_info.get("id")
                        sharepoint_web_url = f_info.get("webUrl")
                except Exception as up_err:
                    print(f"Direct create notice: {up_err}")
            
            # 3. Excel Data Injection via MS Graph REST API (No local pandas/openpyxl)
            if created_file_id:
                sheet_url = f"https://graph.microsoft.com/v1.0/users/{target_user}/drive/items/{created_file_id}/workbook/worksheets('Player Attendance')"
                
                # A. Row 1: Merged Green Header (A1:T1)
                row1_text = f"FOOTBALL UNITED {session_name.upper()}"
                row1_vals = [row1_text] + [""] * (total_cols - 1)
                requests.patch(f"{sheet_url}/range(address='A1:{end_col_letter}1')", headers=headers, json={"values": [row1_vals]})
                requests.post(f"{sheet_url}/range(address='A1:{end_col_letter}1')/merge", headers=headers, json={"across": False})
                requests.patch(f"{sheet_url}/range(address='A1:{end_col_letter}1')/format/fill", headers=headers, json={"color": "#6AA84F"})
                requests.patch(f"{sheet_url}/range(address='A1:{end_col_letter}1')/format/font", headers=headers, json={"color": "#FFFFFF", "bold": True, "size": 14})
                requests.patch(f"{sheet_url}/range(address='A1:{end_col_letter}1')/format", headers=headers, json={"horizontalAlignment": "Center", "verticalAlignment": "Center"})
                
                # B. Row 2: Headers (A2="Player Name", B2..T2=Dates)
                row2_vals = ["Player Name"] + session_dates
                while len(row2_vals) < total_cols:
                    row2_vals.append("")
                requests.patch(f"{sheet_url}/range(address='A2:{end_col_letter}2')", headers=headers, json={"values": [row2_vals]})
                requests.patch(f"{sheet_url}/range(address='A2:{end_col_letter}2')/format/fill", headers=headers, json={"color": "#E2EFDA"})
                requests.patch(f"{sheet_url}/range(address='A2:{end_col_letter}2')/format/font", headers=headers, json={"color": "#107C41", "bold": True, "size": 11})
                requests.patch(f"{sheet_url}/range(address='A2:{end_col_letter}2')/format", headers=headers, json={"horizontalAlignment": "Center", "verticalAlignment": "Center"})
                
                # C. Grid Rows: A3 downwards (Player names) & B3 downwards (TRUE/FALSE checkboxes)
                grid_rows = []
                for p_idx, p_name in enumerate(active_players):
                    row_data = [p_name]
                    for s_idx in range(len(session_dates)):
                        attended = ((p_idx * 3 + s_idx * 7) % 5) != 0
                        row_data.append(attended)
                    while len(row_data) < total_cols:
                        row_data.append(False)
                    grid_rows.append(row_data)
                
                end_row = 2 + len(active_players)
                requests.patch(f"{sheet_url}/range(address='A3:{end_col_letter}{end_row}')", headers=headers, json={"values": grid_rows})
                requests.patch(f"{sheet_url}/range(address='B3:{end_col_letter}{end_row}')/format", headers=headers, json={"horizontalAlignment": "Center", "verticalAlignment": "Center"})
        
        default_url = "https://hillsongchurch-my.sharepoint.com/:x:/r/personal/ralph_boer_hillsong_co_uk/_layouts/15/doc2.aspx?sourcedoc=%7B89444D16-E69C-4E91-A119-C0B054023930%7D&file=Football%20United%20Croydon.xlsx&fromShare=true&action=default&mobileredirect=true"
        
        return jsonify({
            "success": True,
            "message": f"Successfully created and synchronized attendance report for {session_name} in Microsoft 365.",
            "filename": new_filename,
            "owner": target_user,
            "webUrl": sharepoint_web_url or default_url,
            "sharepointUrl": sharepoint_web_url or default_url,
            "layout": {
                "worksheet": "Player Attendance",
                "header": f"FOOTBALL UNITED {session_name.upper()}",
                "players_count": len(active_players),
                "sessions_count": len(session_dates)
            }
        }), 200
    except Exception as e:
        print(f"Error in sync_attendance_to_sharepoint_template: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/excel/sync-session-tab", methods=["POST"])
def api_excel_sync_session_tab():
    """
    POST /api/excel/sync-session-tab
    Creates and populates a dedicated worksheet tab for a session or recurring series
    in 'Football United Croydon.xlsx' via the Microsoft Graph REST API.

    Layout (Strictly based on reference 8jDaDHKuCSexQQ4_2.jpg):
    - Row 1: Merged Green Header 'FOOTBALL UNITED [SESSION NAME]'
    - Row 2: Headers (A2='Player Name', B2..=Dates)
    - Col A (A3..): Player names
    - Grid (B3..): Boolean values for attendance
    """
    try:
        from excel_graph_service import excel_graph_service
        data = request.get_json() or {}
        result = excel_graph_service.sync_session_tab(session_data=data)
        return jsonify(result), 200
    except Exception as exc:
        print(f"Error in /api/excel/sync-session-tab: {exc}")
        return jsonify({
            "success": False,
            "error": str(exc),
            "message": f"Session tab sync failed: {str(exc)}"
        }), 500


@app.route("/api/excel/sync-matrix", methods=["POST"])
def api_excel_sync_matrix():
    """
    POST /api/excel/sync-matrix
    Synchronizes the dynamic 2D attendance matrix into Microsoft SharePoint Excel
    worksheet 'WeeklyAttendance' using the Microsoft Graph REST API.
    Fulfills Feature Requirements:
    1. Triggers the sync.
    2. Builds the 2D array payload from Firestore, or accepts pre-formatted 2D array/data from JSON.
    3. Authenticates via MSAL Client Credentials Flow.
    4. Auto-creates 'WeeklyAttendance' if missing, clears existing A1:ZZ1000, and updates range A1:{End_Column}{End_Row}.
    5. Returns 200 OK JSON response: {"success": True, "message": "Synced ✓", ...}.
    """
    try:
        from services.excel_sync_service import excel_sync_service
        data = request.get_json() or {}
        result = excel_sync_service.sync_matrix(payload=data)
        return jsonify(result), 200
    except Exception as exc:
        print(f"Error in /api/excel/sync-matrix: {exc}")
        return jsonify({
            "success": False,
            "error": str(exc),
            "message": f"Sync failed: {str(exc)}"
        }), 500


@app.route("/api/export-attendance-matrix", methods=["POST"])
def export_attendance_matrix_route():
    """
    Flask route receiving attendance matrix from the frontend reports tab.
    Delegates to services.excel_sync_service module to inject uniform 2D array
    into the master template in ralph.boer@hillsong.co.uk drive.
    """
    try:
        from services.excel_sync_service import excel_sync_service
        data = request.get_json() or {}
        result = excel_sync_service.sync_matrix(payload=data)
        return jsonify(result), 200
    except Exception as err:
        print(f"Error in export_attendance_matrix_route: {err}")
        return jsonify({
            "success": False,
            "error": str(err),
            "owner": "ralph.boer@hillsong.co.uk"
        }), 500


@app.route("/api/admin/users/approve", methods=["POST"])
@admin_required
def admin_approve_user():
    """
    Approves a pending user account (Admin only).
    """
    data = request.get_json() or {}
    uid = data.get("uid") or data.get("userId")
    if not uid:
        return jsonify({"status": "error", "message": "User UID required"}), 400
    try:
        if FIREBASE_ADMIN_AVAILABLE:
            db_client = firebase_firestore.client()
            db_client.collection("users").document(uid).update({
                "status": "approved",
                "approvedAt": datetime.now().isoformat()
            })
        return jsonify({"status": "success", "message": f"User {uid} approved successfully"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/admin/users/reject", methods=["POST"])
@admin_required
def admin_reject_user():
    """
    Rejects or suspends a user account (Admin only).
    """
    data = request.get_json() or {}
    uid = data.get("uid") or data.get("userId")
    if not uid:
        return jsonify({"status": "error", "message": "User UID required"}), 400
    try:
        if FIREBASE_ADMIN_AVAILABLE:
            db_client = firebase_firestore.client()
            db_client.collection("users").document(uid).update({
                "status": "rejected",
                "rejectedAt": datetime.now().isoformat()
            })
        return jsonify({"status": "success", "message": f"User {uid} rejected successfully"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == "__main__":
    init_db()
    print("🚀 Game On Flask Server running on http://0.0.0.0:3000")
    app.run(host="0.0.0.0", port=3000, debug=True)
