import sqlite3
import os

DB_FILE = os.getenv("DATABASE_PATH", "voteguard.db")

def migrate():
    if not os.path.exists(DB_FILE):
        return
        
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    # 1. Add duplicate_attempts column to elections
    try:
        c.execute('ALTER TABLE elections ADD COLUMN duplicate_attempts INTEGER DEFAULT 0')
    except sqlite3.OperationalError:
        pass # Column already exists
        
    # 2. Add UNIQUE constraint to votes table
    # SQLite does not support adding UNIQUE constraints directly via ALTER TABLE
    c.execute('''
        CREATE TABLE IF NOT EXISTS votes_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            election_id INTEGER, 
            first_name TEXT, 
            last_name TEXT, 
            aadhaar_4 TEXT,
            UNIQUE(election_id, first_name, aadhaar_4),
            FOREIGN KEY(election_id) REFERENCES elections(id)
        )
    ''')
    
    # Copy data, ignoring existing duplicates
    c.execute('''
        INSERT OR IGNORE INTO votes_new (id, election_id, first_name, last_name, aadhaar_4)
        SELECT id, election_id, first_name, last_name, aadhaar_4 FROM votes
    ''')
    
    c.execute('DROP TABLE votes')
    c.execute('ALTER TABLE votes_new RENAME TO votes')
    
    conn.commit()
    conn.close()
    print("Database migrated successfully.")

if __name__ == '__main__':
    migrate()
