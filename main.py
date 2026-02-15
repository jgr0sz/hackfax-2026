from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from datetime import datetime
import math
import sqlite3
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Database setup
DATABASE = 'incident_reports.db'

def init_db():
    """Initialize the database with the reports table."""
    if not os.path.exists(DATABASE):
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
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
                created_at TEXT
            )
        ''')
        conn.commit()
        conn.close()
        print(f"Database {DATABASE} initialized")

def get_db():
    """Get a database connection."""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

# Initialize database on startup
init_db()

incident_reports = []
required_fields = ['date', 'severity', 'location', 'details']

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    Returns distance in miles
    """
    # Convert to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    r = 3959  # Radius of earth in miles
    return c * r

@app.route('/')
def home():
    """
    Renders the default page of the app.
    """
    return render_template("quickstart.html")

@app.route('/report', methods=['POST'])
def submit_report():
    """
    Stores incident report in the database when the user submits the form.
    """
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"error": "Invalid or missing JSON body"}), 400

    # Check required fields
    missing = [f for f in required_fields if f not in data or data[f] in (None, "")]
    if missing:
        return jsonify({"error": "Missing required fields", "missing": missing}), 400

    # Extract location data
    location = data.get('location', {})
    if isinstance(location, dict):
        lat = location.get('latitude')
        lon = location.get('longitude')
        accuracy = location.get('accuracyMeters')
    else:
        lat = lon = accuracy = None

    # Set initial status if not provided
    status = data.get('status', 'Pending')


    # Insert into database
    conn = get_db()
    c = conn.cursor()
    print(f"DEBUG: Inserting report with severity='{data['severity']}'")
    c.execute('''
        INSERT INTO incident_reports 
        (date, severity, location_latitude, location_longitude, location_accuracy, details, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data['date'],
        data['severity'],
        lat,
        lon,
        accuracy,
        data['details'],
        status,
        datetime.utcnow().isoformat() + "Z"
    ))
    conn.commit()
    report_id = c.lastrowid
    conn.close()

    # Return the submitted report
    response_data = {
        "id": report_id,
        "date": data['date'],
        "severity": data['severity'],
        "location": location,
        "details": data['details'],
        "status": status,
        "created_at": datetime.utcnow().isoformat() + "Z"
    }
    
    # Also keep in memory for backward compatibility
    incident_reports.append(response_data)

    return jsonify({"message": "Report submitted successfully!", "report": response_data}), 201

@app.route('/reports', methods=['GET'])
def get_reports():
    """
    Lists all incident reports from the database.
    """
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM incident_reports ORDER BY created_at DESC')
    db_reports = c.fetchall()
    conn.close()
    
    reports = []
    for report in db_reports:
        report_dict = {
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
            "created_at": report['created_at']
        }
        reports.append(report_dict)
    
    return jsonify(reports), 200

@app.route('/reports/nearby', methods=['POST'])
def get_nearby_reports():
    """
    Get reports within a specified radius (in miles) of a location from the database.
    Expects JSON: { "latitude": float, "longitude": float, "radius_miles": float }
    """
    data = request.get_json(silent=True)
    
    if not data or 'latitude' not in data or 'longitude' not in data:
        return jsonify({"error": "Missing latitude/longitude"}), 400
    
    radius = data.get('radius_miles', 0.5)
    user_lat = data['latitude']
    user_lon = data['longitude']
    
    # Query all reports from database
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM incident_reports')
    db_reports = c.fetchall()
    conn.close()
    
    nearby = []
    for report in db_reports:
        try:
            report_lat = report['location_latitude']
            report_lon = report['location_longitude']
            
            if report_lat is None or report_lon is None:
                continue
            
            distance = haversine_distance(user_lat, user_lon, report_lat, report_lon)
            if distance <= radius:
                print(f"DEBUG: Found nearby report ID {report['id']}, severity from DB: '{report['severity']}'")
                
                report_dict = {
                    "id": report['id'],
                    "date": report['date'],
                    "severity": report['severity'],
                    "location": {
                        "latitude": report_lat,
                        "longitude": report_lon,
                        "accuracyMeters": report['location_accuracy']
                    },
                    "details": report['details'],
                    "status": report['status'],
                    "created_at": report['created_at']
                }
                
                nearby.append({
                    "distance_miles": round(distance, 2),
                    "report": report_dict
                })
        except (TypeError, ValueError) as e:
            print(f"Error processing report: {e}")
            continue
    
    # Sort by distance (closest first)
    nearby.sort(key=lambda x: x['distance_miles'])
    
    return jsonify({"nearby_reports": nearby}), 200

if __name__ == '__main__':
    app.run(debug=True)
