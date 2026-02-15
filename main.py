from flask import Flask, request, jsonify, render_template, redirect, url_for, session
from flask_cors import CORS
from datetime import datetime
from functools import wraps
import math
import sqlite3
import os
import urllib.request
import urllib.parse
import json
import time
import re
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-change-in-production')
CORS(app, supports_credentials=True)

# Database setup
DATABASE = 'incident_reports.db'

def init_db():
    """Initialize or recreate the database. Create all tables and migrate if needed."""
    need_create = True
    if os.path.exists(DATABASE):
        try:
            conn = sqlite3.connect(DATABASE)
            c = conn.cursor()
            c.execute("SELECT 1 FROM incident_reports LIMIT 1")
            conn.close()
            need_create = False
        except (sqlite3.Error, sqlite3.OperationalError):
            try:
                os.remove(DATABASE)
                print(f"Removed corrupted {DATABASE}, recreating")
            except OSError as e:
                print(f"Could not remove {DATABASE}: {e}")

    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()

    if need_create:
        c.execute('''
            CREATE TABLE incident_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT,
                severity TEXT,
                location_latitude REAL,
                location_longitude REAL,
                location_accuracy REAL,
                details TEXT,
                status TEXT,
                created_at TEXT,
                verified INTEGER DEFAULT 0,
                reported_by_user_id INTEGER,
                location_address TEXT
            )
        ''')
    else:
        # Migration: add new columns if missing
        try:
            c.execute("ALTER TABLE incident_reports ADD COLUMN verified INTEGER DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        try:
            c.execute("ALTER TABLE incident_reports ADD COLUMN reported_by_user_id INTEGER")
        except sqlite3.OperationalError:
            pass
        try:
            c.execute("ALTER TABLE incident_reports ADD COLUMN location_address TEXT")
        except sqlite3.OperationalError:
            pass

    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            account_type TEXT NOT NULL CHECK(account_type IN ('admin', 'user')),
            created_at TEXT,
            email TEXT UNIQUE,
            email_verified INTEGER DEFAULT 0,
            verification_token TEXT
        )
    ''')
    # Migration: add email columns if missing (existing DBs)
    for col, sql in [
        ('email', 'ALTER TABLE users ADD COLUMN email TEXT'),
        ('email_verified', 'ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0'),
        ('verification_token', 'ALTER TABLE users ADD COLUMN verification_token TEXT'),
    ]:
        try:
            c.execute(sql)
            conn.commit()
        except sqlite3.OperationalError:
            pass
    c.execute('''
        CREATE TABLE IF NOT EXISTS report_votes (
            report_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            vote INTEGER NOT NULL CHECK(vote IN (1, -1)),
            PRIMARY KEY (report_id, user_id),
            FOREIGN KEY (report_id) REFERENCES incident_reports(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    conn.commit()

    # Ensure users without email are treated as verified (seeded / legacy)
    try:
        c.execute("UPDATE users SET email_verified = 1 WHERE email IS NULL")
        conn.commit()
    except sqlite3.OperationalError:
        pass
    # Seed default admin and user if no users exist
    c.execute("SELECT COUNT(*) FROM users")
    if c.fetchone()[0] == 0:
        c.execute("""INSERT INTO users (username, password_hash, account_type, created_at, email_verified)
                     VALUES (?, ?, ?, ?, 1)""",
                  ('admin', generate_password_hash('admin'), 'admin', datetime.utcnow().isoformat() + "Z"))
        c.execute("""INSERT INTO users (username, password_hash, account_type, created_at, email_verified)
                     VALUES (?, ?, ?, ?, 1)""",
                  ('user', generate_password_hash('user'), 'user', datetime.utcnow().isoformat() + "Z"))
        conn.commit()
        print("Seeded users: admin/admin, user/user")

    conn.close()
    print(f"Database {DATABASE} initialized")

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

init_db()

required_fields = ['date', 'severity', 'location', 'details']

def haversine_distance(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return c * 3959

def login_required(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        if 'user_id' not in session:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({"error": "Login required"}), 401
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return wrapped

def admin_required(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        if 'user_id' not in session:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({"error": "Login required"}), 401
            return redirect(url_for('login'))
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT account_type FROM users WHERE id = ?", (session['user_id'],))
        row = c.fetchone()
        conn.close()
        if not row or row[0] != 'admin':
            return jsonify({"error": "Admin required"}), 403
        return f(*args, **kwargs)
    return wrapped

def get_current_user():
    if 'user_id' not in session:
        return None
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id, username, account_type FROM users WHERE id = ?", (session['user_id'],))
    row = c.fetchone()
    conn.close()
    if not row:
        return None
    return {"id": row[0], "username": row[1], "account_type": row[2]}

# Reverse geocode: lat/lon -> closest address (Nominatim). Caches in DB.
_last_geocode_time = 0
def get_report_address(conn, report):
    keys = report.keys() if hasattr(report, 'keys') else []
    if 'location_address' in keys and report['location_address']:
        return report['location_address']
    lat = report['location_latitude']
    lon = report['location_longitude']
    if lat is None or lon is None:
        return None
    try:
        global _last_geocode_time
        now = time.time()
        if now - _last_geocode_time < 1.1:
            time.sleep(1.1 - (now - _last_geocode_time))
        url = "https://nominatim.openstreetmap.org/reverse?lat=%s&lon=%s&format=json" % (lat, lon)
        req = urllib.request.Request(url, headers={"User-Agent": "IncidentReportApp/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
        addr = data.get("address") or {}
        parts = [
            addr.get("road") or addr.get("footway"),
            addr.get("house_number"),
            addr.get("suburb") or addr.get("neighbourhood") or addr.get("village") or addr.get("town") or addr.get("city"),
            addr.get("state"),
            addr.get("country"),
        ]
        display = ", ".join(p for p in parts if p)
        if not display:
            display = data.get("display_name") or ("%.5f, %.5f" % (lat, lon))
        c = conn.cursor()
        c.execute("UPDATE incident_reports SET location_address = ? WHERE id = ?", (display, report['id']))
        conn.commit()
        _last_geocode_time = time.time()
        return display
    except Exception:
        return "%.5f, %.5f" % (lat, lon)

def report_row_to_dict(report, vote_score=None, user_vote=None, address=None, upvote_count=None, downvote_count=None):
    keys = report.keys() if hasattr(report, 'keys') else []
    verified = report['verified'] if 'verified' in keys else 0
    d = {
        "id": report['id'],
        "date": report['date'],
        "severity": report['severity'],
        "location": {
            "latitude": report['location_latitude'],
            "longitude": report['location_longitude'],
            "accuracyMeters": report['location_accuracy']
        },
        "details": report['details'],
        "status": report['status'],
        "created_at": report['created_at'],
        "verified": bool(verified),
    }
    if address is not None:
        d["address"] = address
    elif 'location_address' in keys and report['location_address']:
        d["address"] = report['location_address']
    else:
        d["address"] = None
    if vote_score is not None:
        d["vote_score"] = vote_score
    if user_vote is not None:
        d["user_vote"] = user_vote
    if upvote_count is not None:
        d["upvote_count"] = upvote_count
    if downvote_count is not None:
        d["downvote_count"] = downvote_count
    return d

# ---- Auth routes ----
def _email_valid(email):
    if not email or not isinstance(email, str):
        return False
    email = email.strip().lower()
    return bool(re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        if session.get('user_id'):
            return redirect(url_for('home'))
        return render_template("login.html")
    data = request.get_json(silent=True) or request.form
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''
    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id, password_hash, email_verified FROM users WHERE username = ?", (username,))
    row = c.fetchone()
    conn.close()
    if not row or not check_password_hash(row[1], password):
        return jsonify({"error": "Invalid username or password"}), 401
    # Require email verification when user has email (column may be missing in old DBs)
    try:
        verified = row[2]
        if verified is not None and verified != 1 and verified != True:
            return jsonify({"error": "Please verify your email. Check your inbox for the verification link."}), 403
    except (IndexError, TypeError):
        pass
    session['user_id'] = row[0]
    return jsonify({"message": "OK", "user": {"id": row[0], "username": username}})

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'GET':
        if session.get('user_id'):
            return redirect(url_for('home'))
        return render_template("signup.html")
    data = request.get_json(silent=True) or request.form
    username = (data.get('username') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    if not username or not email or not password:
        return jsonify({"error": "Username, email, and password required"}), 400
    if len(username) < 2:
        return jsonify({"error": "Username must be at least 2 characters"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    if not _email_valid(email):
        return jsonify({"error": "Invalid email address"}), 400
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id FROM users WHERE username = ?", (username,))
    if c.fetchone():
        conn.close()
        return jsonify({"error": "Username already taken"}), 409
    c.execute("SELECT id FROM users WHERE email = ?", (email,))
    if c.fetchone():
        conn.close()
        return jsonify({"error": "Email already registered"}), 409
    c.execute("""INSERT INTO users (username, password_hash, account_type, created_at, email, email_verified)
                 VALUES (?, ?, 'user', ?, ?, 1)""",
              (username, generate_password_hash(password), datetime.utcnow().isoformat() + "Z", email))
    conn.commit()
    user_id = c.lastrowid
    conn.close()
    return jsonify({
        "message": "Account created. You can sign in now.",
        "user_id": user_id
    }), 201

@app.route('/verify-email')
def verify_email():
    token = request.args.get('token') or ''
    if not token:
        return redirect(url_for('login') + '?error=missing_token')
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id, username FROM users WHERE verification_token = ?", (token,))
    row = c.fetchone()
    if not row:
        conn.close()
        return redirect(url_for('login') + '?error=invalid_token')
    c.execute("UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = ?", (row[0],))
    conn.commit()
    conn.close()
    return redirect(url_for('login') + '?verified=1')

@app.route('/logout', methods=['POST', 'GET'])
def logout():
    session.pop('user_id', None)
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify({"message": "Logged out"})
    return redirect(url_for('login'))

@app.route('/api/me')
def api_me():
    u = get_current_user()
    if not u:
        return jsonify({"user": None}), 200
    return jsonify({"user": u}), 200

# ---- Pages ----
@app.route('/')
@login_required
def home():
    return render_template("quickstart.html")

# ---- Report submit ----
@app.route('/report', methods=['POST'])
@login_required
def submit_report():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid or missing JSON body"}), 400
    missing = [f for f in required_fields if f not in data or data[f] in (None, "")]
    if missing:
        return jsonify({"error": "Missing required fields", "missing": missing}), 400
    location = data.get('location', {})
    if isinstance(location, dict):
        lat = location.get('latitude')
        lon = location.get('longitude')
        accuracy = location.get('accuracyMeters')
    else:
        lat = lon = accuracy = None
    status = data.get('status', 'Pending')
    user_id = session.get('user_id')
    conn = get_db()
    c = conn.cursor()
    c.execute('''
        INSERT INTO incident_reports 
        (date, severity, location_latitude, location_longitude, location_accuracy, details, status, created_at, verified, reported_by_user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    ''', (
        data['date'], data['severity'], lat, lon, accuracy, data['details'], status,
        datetime.utcnow().isoformat() + "Z", user_id
    ))
    conn.commit()
    report_id = c.lastrowid
    conn.close()
    location_out = location if isinstance(location, dict) else {}
    response_data = {
        "id": report_id, "date": data['date'], "severity": data['severity'],
        "location": location_out, "details": data['details'], "status": status,
        "created_at": datetime.utcnow().isoformat() + "Z", "verified": False
    }
    return jsonify({"message": "Report submitted successfully!", "report": response_data}), 201

# ---- Reports list (optional: ?latitude=&longitude= to order by distance) ----
@app.route('/reports', methods=['GET'])
@login_required
def get_reports():
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM incident_reports ORDER BY created_at DESC')
    db_reports = c.fetchall()
    user_lat = request.args.get('latitude', type=float)
    user_lon = request.args.get('longitude', type=float)
    reports = []
    for r in db_reports:
        addr = get_report_address(conn, r)
        d = report_row_to_dict(r, address=addr)
        if user_lat is not None and user_lon is not None and r['location_latitude'] is not None and r['location_longitude'] is not None:
            d['distance_miles'] = round(haversine_distance(user_lat, user_lon, r['location_latitude'], r['location_longitude']), 2)
        else:
            d['distance_miles'] = None
        reports.append(d)
    conn.close()
    if user_lat is not None and user_lon is not None:
        reports.sort(key=lambda x: (x['distance_miles'] is None, x['distance_miles'] or 0))
    return jsonify(reports), 200

# ---- Feed: reports within 0.5 miles with vote scores (for logged-in user location) ----
@app.route('/feed', methods=['POST'])
@login_required
def get_feed():
    data = request.get_json(silent=True)
    if not data or 'latitude' not in data or 'longitude' not in data:
        return jsonify({"error": "Missing latitude/longitude"}), 400
    radius = 0.5
    user_lat = float(data['latitude'])
    user_lon = float(data['longitude'])
    user_id = session.get('user_id')
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM incident_reports')
    db_reports = c.fetchall()
    # Get vote scores and per-type counts per report
    c.execute('SELECT report_id, SUM(vote) AS score FROM report_votes GROUP BY report_id')
    scores = {row[0]: row[1] for row in c.fetchall()}
    c.execute('SELECT report_id, vote, COUNT(*) FROM report_votes GROUP BY report_id, vote')
    upvotes = {}
    downvotes = {}
    for row in c.fetchall():
        rid, vote, cnt = row[0], row[1], row[2]
        if vote == 1:
            upvotes[rid] = cnt
        else:
            downvotes[rid] = cnt
    c.execute('SELECT report_id, vote FROM report_votes WHERE user_id = ?', (user_id,))
    user_votes = {row[0]: row[1] for row in c.fetchall()}
    feed = []
    for report in db_reports:
        report_lat = report['location_latitude']
        report_lon = report['location_longitude']
        if report_lat is None or report_lon is None:
            continue
        distance = haversine_distance(user_lat, user_lon, report_lat, report_lon)
        if distance > radius:
            continue
        rid = report['id']
        addr = get_report_address(conn, report)
        feed.append({
            "distance_miles": round(distance, 2),
            "report": report_row_to_dict(
                report,
                vote_score=scores.get(rid, 0),
                user_vote=user_votes.get(rid),
                address=addr,
                upvote_count=upvotes.get(rid, 0),
                downvote_count=downvotes.get(rid, 0)
            )
        })
    conn.close()
    feed.sort(key=lambda x: x['distance_miles'])
    return jsonify({"feed": feed}), 200

# ---- Vote on report ----
@app.route('/reports/<int:report_id>/vote', methods=['POST'])
@login_required
def vote_report(report_id):
    data = request.get_json(silent=True) or {}
    vote = data.get('vote')
    if vote not in (1, -1):
        return jsonify({"error": "vote must be 1 or -1"}), 400
    user_id = session.get('user_id')
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id FROM incident_reports WHERE id = ?", (report_id,))
    if not c.fetchone():
        conn.close()
        return jsonify({"error": "Report not found"}), 404
    c.execute("INSERT OR REPLACE INTO report_votes (report_id, user_id, vote) VALUES (?, ?, ?)",
              (report_id, user_id, vote))
    conn.commit()
    c.execute("SELECT COALESCE(SUM(vote), 0) FROM report_votes WHERE report_id = ?", (report_id,))
    score = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM report_votes WHERE report_id = ? AND vote = 1", (report_id,))
    upvote_count = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM report_votes WHERE report_id = ? AND vote = -1", (report_id,))
    downvote_count = c.fetchone()[0]
    conn.close()
    return jsonify({
        "vote_score": score,
        "user_vote": vote,
        "upvote_count": upvote_count,
        "downvote_count": downvote_count
    }), 200

# ---- Admin: verify report ----
@app.route('/reports/<int:report_id>/verify', methods=['POST'])
@admin_required
def verify_report(report_id):
    conn = get_db()
    c = conn.cursor()
    c.execute("UPDATE incident_reports SET verified = 1 WHERE id = ?", (report_id,))
    conn.commit()
    if c.rowcount == 0:
        conn.close()
        return jsonify({"error": "Report not found"}), 404
    conn.close()
    return jsonify({"message": "Report verified"}), 200

# ---- Nearby (for map alerts) ----
@app.route('/reports/nearby', methods=['POST'])
@login_required
def get_nearby_reports():
    data = request.get_json(silent=True)
    if not data or 'latitude' not in data or 'longitude' not in data:
        return jsonify({"error": "Missing latitude/longitude"}), 400
    radius = data.get('radius_miles', 0.5)
    user_lat = data['latitude']
    user_lon = data['longitude']
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM incident_reports')
    db_reports = c.fetchall()
    nearby = []
    for report in db_reports:
        try:
            report_lat = report['location_latitude']
            report_lon = report['location_longitude']
            if report_lat is None or report_lon is None:
                continue
            distance = haversine_distance(user_lat, user_lon, report_lat, report_lon)
            if distance <= radius:
                addr = get_report_address(conn, report)
                report_dict = report_row_to_dict(report, address=addr)
                nearby.append({"distance_miles": round(distance, 2), "report": report_dict})
        except (TypeError, ValueError):
            continue
    conn.close()
    nearby.sort(key=lambda x: x['distance_miles'])
    return jsonify({"nearby_reports": nearby}), 200

# ---- Admin: delete report ----
@app.route('/reports/<int:report_id>', methods=['DELETE'])
@admin_required
def delete_report(report_id):
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM report_votes WHERE report_id = ?", (report_id,))
    c.execute("DELETE FROM incident_reports WHERE id = ?", (report_id,))
    deleted = c.rowcount
    conn.commit()
    conn.close()
    if deleted == 0:
        return jsonify({"error": "Report not found"}), 404
    return jsonify({"message": "Report deleted"}), 200

# ---- Admin: list users ----
@app.route('/admin/users', methods=['GET'])
@admin_required
def admin_list_users():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id, username, account_type, created_at FROM users ORDER BY id")
    rows = c.fetchall()
    conn.close()
    users = [{"id": r[0], "username": r[1], "account_type": r[2], "created_at": r[3]} for r in rows]
    return jsonify({"users": users}), 200

# ---- Admin: delete user ----
@app.route('/admin/users/<int:user_id>', methods=['DELETE'])
@admin_required
def admin_delete_user(user_id):
    if user_id == session.get('user_id'):
        return jsonify({"error": "Cannot delete your own account"}), 400
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id FROM users WHERE id = ?", (user_id,))
    if not c.fetchone():
        conn.close()
        return jsonify({"error": "User not found"}), 404
    c.execute("UPDATE incident_reports SET reported_by_user_id = NULL WHERE reported_by_user_id = ?", (user_id,))
    c.execute("DELETE FROM report_votes WHERE user_id = ?", (user_id,))
    c.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "User deleted"}), 200

# ---- Admin: update user (set role / moderate) ----
@app.route('/admin/users/<int:user_id>', methods=['PATCH'])
@admin_required
def admin_update_user(user_id):
    if user_id == session.get('user_id'):
        return jsonify({"error": "Cannot change your own account type"}), 400
    data = request.get_json(silent=True) or {}
    account_type = data.get('account_type')
    if account_type not in ('admin', 'user'):
        return jsonify({"error": "account_type must be 'admin' or 'user'"}), 400
    conn = get_db()
    c = conn.cursor()
    c.execute("UPDATE users SET account_type = ? WHERE id = ?", (account_type, user_id))
    conn.commit()
    if c.rowcount == 0:
        conn.close()
        return jsonify({"error": "User not found"}), 404
    conn.close()
    return jsonify({"message": "User updated", "account_type": account_type}), 200

# ---- Admin page ----
@app.route('/admin')
@admin_required
def admin_page():
    return render_template("admin.html")

if __name__ == '__main__':
    app.run(debug=True)
