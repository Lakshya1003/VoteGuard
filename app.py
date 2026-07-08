from flask import Flask, request, jsonify, send_from_directory
import sqlite3
import os
from datetime import datetime

app = Flask(__name__, static_folder='.')

DB_FILE = 'votes.db'

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS voters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            last_name TEXT,
            voter_id TEXT,
            timestamp TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_db()

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    if data.get('username') == 'admin' and data.get('password') == 'admin123':
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Invalid Credentials"}), 401

@app.route('/api/stats', methods=['GET'])
def stats():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM voters')
    count = cursor.fetchone()[0]
    conn.close()
    return jsonify({"count": count})

@app.route('/api/vote', methods=['POST'])
def vote():
    data = request.json
    first_name = data.get('firstName', '').strip().lower()
    last_name = data.get('lastName', '').strip()
    voter_id = data.get('voterId', '').strip().lower()

    if not first_name:
        return jsonify({"success": False, "message": "First name is required"}), 400

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Check duplicate
    cursor.execute('SELECT * FROM voters WHERE LOWER(first_name) = ? AND LOWER(voter_id) = ?', (first_name, voter_id))
    if cursor.fetchone():
        conn.close()
        return jsonify({"success": False, "message": f'Error: "{first_name}" with ID "{voter_id}" has already voted!'}), 400
    
    timestamp = datetime.utcnow().isoformat() + "Z"
    cursor.execute('''
        INSERT INTO voters (first_name, last_name, voter_id, timestamp)
        VALUES (?, ?, ?, ?)
    ''', (first_name, last_name, voter_id, timestamp))
    conn.commit()
    conn.close()
    
    return jsonify({"success": True, "message": "Vote Recorded Successfully"})

@app.route('/api/export', methods=['GET'])
def export_data():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('SELECT first_name, last_name, voter_id, timestamp FROM voters')
    rows = cursor.fetchall()
    conn.close()
    
    records = []
    for row in rows:
        records.append({
            "firstName": row[0],
            "lastName": row[1],
            "voterId": row[2],
            "timestamp": row[3]
        })
    return jsonify(records)

@app.route('/api/import', methods=['POST'])
def import_data():
    data = request.json
    if not isinstance(data, list):
        return jsonify({"success": False, "message": "Invalid format"}), 400

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    added_count = 0
    skipped_count = 0
    
    for record in data:
        first_name = record.get('firstName', '').strip().lower()
        if not first_name:
            continue
            
        last_name = record.get('lastName', '').strip()
        voter_id = record.get('voterId', '').strip().lower()
        timestamp = record.get('timestamp', datetime.utcnow().isoformat() + "Z")
        
        cursor.execute('SELECT * FROM voters WHERE LOWER(first_name) = ? AND LOWER(voter_id) = ?', (first_name, voter_id))
        if cursor.fetchone():
            skipped_count += 1
        else:
            cursor.execute('''
                INSERT INTO voters (first_name, last_name, voter_id, timestamp)
                VALUES (?, ?, ?, ?)
            ''', (first_name, last_name, voter_id, timestamp))
            added_count += 1
            
    conn.commit()
    conn.close()
    
    return jsonify({
        "success": True, 
        "message": f"Imported {added_count} records. Skipped {skipped_count} duplicates."
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
