import os
import sqlite3
import json
import io
import secrets
from datetime import timedelta
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_file, g
from werkzeug.security import generate_password_hash, check_password_hash
from flask_wtf.csrf import CSRFProtect

app = Flask(__name__)

# 2. Remove Hardcoded Flask Secret Key
app.secret_key = os.getenv("SECRET_KEY", secrets.token_hex(32))

# 4. Add CSRF Protection
csrf = CSRFProtect(app)

# 10. Session Expiration
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=30)

DB_FILE = 'voteguard.db'

# 8. Improve Database Connection Management
def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DB_FILE)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db():
    conn = get_db()
    c = conn.cursor()
    # 5. Make Duplicate Counter Persistent
    c.execute('''CREATE TABLE IF NOT EXISTS elections
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                  user_id TEXT UNIQUE, 
                  password_hash TEXT,
                  duplicate_attempts INTEGER DEFAULT 0)''')
    # 1. Enforce Duplicate Protection at Database Level
    c.execute('''CREATE TABLE IF NOT EXISTS votes
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                  election_id INTEGER, 
                  first_name TEXT, 
                  last_name TEXT, 
                  aadhaar_4 TEXT,
                  UNIQUE(election_id, first_name, aadhaar_4),
                  FOREIGN KEY(election_id) REFERENCES elections(id))''')
    conn.commit()

# Application startup initialization
with app.app_context():
    if not os.path.exists(DB_FILE):
        init_db()

@app.before_request
def refresh_session():
    # Refresh session timeout on activity
    session.modified = True

# 9. Custom Error Pages
@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_server_error(e):
    return render_template('500.html'), 500

@app.route('/')
def landing():
    return render_template('landing.html')

@app.route('/new_election', methods=['GET', 'POST'])
def new_election():
    if request.method == 'POST':
        user_id = request.form.get('user_id', '').strip()
        password = request.form.get('password', '')
        if not user_id or not password:
            return render_template('auth.html', mode='new', error="User ID and Password are required.")
        
        conn = get_db()
        c = conn.cursor()
        c.execute('SELECT id FROM elections WHERE user_id = ?', (user_id,))
        if c.fetchone():
            return render_template('auth.html', mode='new', error="User ID already exists.")
        
        pw_hash = generate_password_hash(password)
        c.execute('INSERT INTO elections (user_id, password_hash) VALUES (?, ?)', (user_id, pw_hash))
        election_id = c.lastrowid
        conn.commit()
        
        session.permanent = True
        session['election_id'] = election_id
        session['user_id'] = user_id
        return redirect(url_for('dashboard'))
        
    return render_template('auth.html', mode='new')

@app.route('/import_data', methods=['GET', 'POST'])
def import_data():
    if request.method == 'POST':
        user_id = request.form.get('user_id', '').strip()
        password = request.form.get('password', '')
        import_mode = request.form.get('import_mode', 'merge') # 'merge' or 'replace'
        file = request.files.get('file')
        
        if not user_id or not password or not file:
            return render_template('auth.html', mode='import', error="All fields (User ID, Password, and JSON file) are required.")
            
        try:
            data = json.load(file)
            if 'auth' not in data or 'votes' not in data:
                return render_template('auth.html', mode='import', error="Invalid JSON structure.")
            
            json_user = data['auth'].get('user_id')
            json_pw_hash = data['auth'].get('password_hash')
            
            if user_id != json_user or not check_password_hash(json_pw_hash, password):
                return render_template('auth.html', mode='import', error="Authentication failed for this import file.")
                
            conn = get_db()
            c = conn.cursor()
            
            # Check if exists in DB
            c.execute('SELECT id FROM elections WHERE user_id = ?', (user_id,))
            row = c.fetchone()
            if row:
                election_id = row['id']
                c.execute('UPDATE elections SET password_hash = ? WHERE id = ?', (json_pw_hash, election_id))
            else:
                c.execute('INSERT INTO elections (user_id, password_hash) VALUES (?, ?)', (user_id, json_pw_hash))
                election_id = c.lastrowid
                
            # 7. Improve Import Behaviour (Replace Mode)
            if import_mode == 'replace':
                c.execute('DELETE FROM votes WHERE election_id = ?', (election_id,))
                c.execute('UPDATE elections SET duplicate_attempts = 0 WHERE id = ?', (election_id,))
                
            # Insert votes ignoring duplicates
            votes = data.get('votes', [])
            for v in votes:
                fn = v.get('first_name', '')
                ln = v.get('last_name', '')
                a4 = v.get('aadhaar_4', '')
                
                try:
                    c.execute('INSERT INTO votes (election_id, first_name, last_name, aadhaar_4) VALUES (?, ?, ?, ?)',
                              (election_id, fn, ln, a4))
                except sqlite3.IntegrityError:
                    pass # Ignore if duplicate during merge
            
            conn.commit()
            
            session.permanent = True
            session['election_id'] = election_id
            session['user_id'] = user_id
            return redirect(url_for('dashboard'))
            
        except Exception as e:
            return render_template('auth.html', mode='import', error=f"Error importing file: {str(e)}")
            
    return render_template('auth.html', mode='import')

@app.route('/dashboard')
def dashboard():
    if 'election_id' not in session:
        return redirect(url_for('landing'))
        
    conn = get_db()
    c = conn.cursor()
    
    # 6. Calculate Vote Count Using SQL
    c.execute('SELECT COUNT(*) as count FROM votes WHERE election_id = ?', (session['election_id'],))
    vote_count = c.fetchone()['count']
    
    c.execute('SELECT duplicate_attempts FROM elections WHERE id = ?', (session['election_id'],))
    dup_row = c.fetchone()
    duplicate_attempts = dup_row['duplicate_attempts'] if dup_row else 0
    
    c.execute('SELECT * FROM votes WHERE election_id = ? ORDER BY id DESC', (session['election_id'],))
    recent_votes = c.fetchall()
    
    return render_template('dashboard.html', 
                           recent_votes=recent_votes, 
                           vote_count=vote_count,
                           duplicate_attempts=duplicate_attempts,
                           user_id=session['user_id'])

@app.route('/submit_vote', methods=['POST'])
def submit_vote():
    if 'election_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        
    first_name = request.form.get('first_name', '').strip().lower()
    last_name = request.form.get('last_name', '').strip().lower()
    aadhaar_4 = request.form.get('aadhaar_4', '').strip()
    
    if not first_name or not first_name.isalpha():
        return jsonify({'success': False, 'message': 'First Name is mandatory and must contain only alphabets.'})
        
    if last_name and not last_name.isalpha():
        return jsonify({'success': False, 'message': 'Last Name must contain only alphabets if provided.'})
        
    if not aadhaar_4 or not aadhaar_4.isdigit() or len(aadhaar_4) != 4:
        return jsonify({'success': False, 'message': 'Last 4 Digits of Aadhaar is mandatory and must be exactly 4 numeric digits.'})
    
    conn = get_db()
    c = conn.cursor()
    
    try:
        # 1. Enforce Duplicate Protection at Database Level (IntegrityError will be raised if duplicate)
        c.execute('INSERT INTO votes (election_id, first_name, last_name, aadhaar_4) VALUES (?, ?, ?, ?)',
                  (session['election_id'], first_name, last_name, aadhaar_4))
        conn.commit()
    except sqlite3.IntegrityError:
        # 5. Make Duplicate Counter Persistent
        c.execute('UPDATE elections SET duplicate_attempts = duplicate_attempts + 1 WHERE id = ?', (session['election_id'],))
        conn.commit()
        return jsonify({'success': False, 'message': 'DUPLICATE DETECTED: This First Name + Aadhaar combination already voted.'})
    
    return jsonify({'success': True, 'message': 'Vote successfully recorded!'})

@app.route('/export')
def export():
    if 'election_id' not in session:
        return redirect(url_for('landing'))
        
    conn = get_db()
    c = conn.cursor()
    
    c.execute('SELECT user_id, password_hash FROM elections WHERE id = ?', (session['election_id'],))
    auth = dict(c.fetchone())
    
    c.execute('SELECT first_name, last_name, aadhaar_4 FROM votes WHERE election_id = ?', (session['election_id'],))
    votes = [dict(row) for row in c.fetchall()]
    
    data = {
        'auth': auth,
        'votes': votes
    }
    
    json_data = json.dumps(data, indent=2)
    return send_file(
        io.BytesIO(json_data.encode('utf-8')),
        mimetype='application/json',
        as_attachment=True,
        download_name=f"voteguard_{session['user_id']}_export.json"
    )

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('landing'))

if __name__ == '__main__':
    # 3. Disable Debug Mode for Production
    debug_mode = os.getenv("FLASK_DEBUG") == "1"
    app.run(debug=debug_mode, port=5000)
