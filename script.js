const form = document.getElementById('votingForm');
const firstNameInput = document.getElementById('firstName');
const lastNameInput = document.getElementById('lastName');
const voterIdInput = document.getElementById('voterId');
const statusMessage = document.getElementById('statusMessage');
const statsCount = document.getElementById('statsCount');
const exportBtn = document.getElementById('exportBtn');
const managementStatus = document.getElementById('managementStatus');
const logoutBtn = document.getElementById('logoutBtn');
const loginSection = document.getElementById('loginSection');
const appContent = document.getElementById('appContent');
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

// New elements
const createSection = document.getElementById('createSection');
const showCreateBtn = document.getElementById('showCreateBtn');
const cancelCreateBtn = document.getElementById('cancelCreateBtn');
const createForm = document.getElementById('createForm');
const newUsernameInput = document.getElementById('newUsername');
const newPasswordInput = document.getElementById('newPassword');
const createMessage = document.getElementById('createMessage');
const showImportBtn = document.getElementById('showImportBtn');
const globalFileInput = document.getElementById('globalFileInput');

let SQL = null;
let db = null;
let currentElectionId = null;

// Initialize SQL.js and load DB from browser cache
async function init() {
    try {
        const sqlPromise = initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
        });
        SQL = await sqlPromise;
        loadDatabaseFromCache();
    } catch (e) {
        console.error("Failed to load SQL.js", e);
    }
}

function loadDatabaseFromCache() {
    const saved = localStorage.getItem('voteguard_sqlite_db');
    if (saved) {
        const binaryString = atob(saved);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        db = new SQL.Database(bytes);
    } else {
        db = new SQL.Database();
        db.run(`
            CREATE TABLE IF NOT EXISTS elections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS voters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                election_id INTEGER NOT NULL,
                first_name TEXT NOT NULL,
                last_name TEXT,
                voter_id TEXT,
                timestamp TEXT,
                FOREIGN KEY(election_id) REFERENCES elections(id)
            );
        `);
        saveDatabaseToCache();
    }
}

function saveDatabaseToCache() {
    if (!db) return;
    const data = db.export();
    let binary = '';
    for (let i = 0; i < data.length; i++) {
        binary += String.fromCharCode(data[i]);
    }
    localStorage.setItem('voteguard_sqlite_db', btoa(binary));
}

function updateStats() {
    if (!currentElectionId) return;
    const stmt = db.prepare("SELECT COUNT(*) as count FROM voters WHERE election_id = :id");
    const result = stmt.getAsObject({':id': currentElectionId});
    stmt.free();
    statsCount.textContent = result.count || 0;
}

function showMessage(element, msg, isError = false) {
    element.textContent = msg;
    element.className = 'message-box';
    element.classList.add(isError ? 'message-error' : 'message-success');
    element.style.display = 'block';

    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

// UI toggles
showCreateBtn.addEventListener('click', () => {
    loginSection.classList.add('hidden');
    createSection.classList.remove('hidden');
    createMessage.style.display = 'none';
});

cancelCreateBtn.addEventListener('click', () => {
    createSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
});

showImportBtn.addEventListener('click', () => {
    globalFileInput.click();
});

// Import Logic
globalFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        try {
            const importedData = JSON.parse(event.target.result);
            
            if (Array.isArray(importedData)) {
                showMessage(loginMessage, "Legacy export format detected. Please create a new election manually, then you can't import this directly as it lacks credentials.", true);
                globalFileInput.value = '';
                return;
            }

            if (!importedData.credentials || !importedData.voters) {
                throw new Error("Invalid format");
            }
            
            const username = importedData.credentials.username;
            const password = importedData.credentials.password;
            
            // Check existing election
            let stmt = db.prepare("SELECT id, password FROM elections WHERE username = :u");
            let row = stmt.getAsObject({':u': username});
            stmt.free();
            
            let electionId = null;
            if (row.id) {
                if (row.password !== password) {
                    showMessage(loginMessage, "Username exists with different password.", true);
                    globalFileInput.value = '';
                    return;
                }
                electionId = row.id;
            } else {
                db.run("INSERT INTO elections (username, password) VALUES (?, ?)", [username, password]);
                const res = db.exec("SELECT last_insert_rowid() as id");
                electionId = res[0].values[0][0];
            }
            
            let added = 0;
            let skipped = 0;
            
            importedData.voters.forEach(v => {
                const fn = (v.firstName || '').trim().toLowerCase();
                const ln = (v.lastName || '').trim();
                const vid = String(v.voterId || '').trim();
                const ts = v.timestamp || new Date().toISOString() + "Z";
                
                if (!fn || !/^[a-z]+$/.test(fn) || !vid || !/^\d{4}$/.test(vid)) {
                    skipped++;
                    return;
                }
                
                let checkStmt = db.prepare("SELECT id FROM voters WHERE election_id = :eid AND first_name = :fn AND voter_id = :vid");
                let checkRow = checkStmt.getAsObject({':eid': electionId, ':fn': fn, ':vid': vid});
                checkStmt.free();
                
                if (!checkRow.id) {
                    db.run("INSERT INTO voters (election_id, first_name, last_name, voter_id, timestamp) VALUES (?, ?, ?, ?, ?)",
                           [electionId, fn, ln, vid, ts]);
                    added++;
                } else {
                    skipped++;
                }
            });
            
            saveDatabaseToCache();
            showMessage(loginMessage, `Imported successfully. ${added} new records added, ${skipped} skipped. You can now log in.`, false);
            usernameInput.value = username;
            
        } catch (err) {
            console.error(err);
            showMessage(loginMessage, "Failed to import: Invalid JSON file format.", true);
        }
        globalFileInput.value = '';
    };
    reader.readAsText(file);
});

// Create Election Logic
createForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = newUsernameInput.value.trim();
    const password = newPasswordInput.value;

    try {
        let stmt = db.prepare("SELECT id FROM elections WHERE username = :u");
        let row = stmt.getAsObject({':u': username});
        stmt.free();
        
        if (row.id) {
            showMessage(createMessage, "Username already exists", true);
            return;
        }
        
        db.run("INSERT INTO elections (username, password) VALUES (?, ?)", [username, password]);
        saveDatabaseToCache();
        
        // Auto login
        const res = db.exec("SELECT last_insert_rowid() as id");
        currentElectionId = res[0].values[0][0];
        currentUsername = username;
        
        createSection.classList.add('hidden');
        appContent.classList.remove('hidden');
        newUsernameInput.value = '';
        newPasswordInput.value = '';
        updateStats();
        
    } catch (err) {
        showMessage(createMessage, "Error during creation.", true);
    }
});

// Login Logic
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    try {
        let stmt = db.prepare("SELECT id FROM elections WHERE username = :u AND password = :p");
        let row = stmt.getAsObject({':u': username, ':p': password});
        stmt.free();
        
        if (row.id) {
            currentElectionId = row.id;
            currentUsername = username;
            loginSection.classList.add('hidden');
            appContent.classList.remove('hidden');
            passwordInput.value = '';
            updateStats();
        } else {
            showMessage(loginMessage, "Invalid Credentials", true);
        }
    } catch (err) {
        showMessage(loginMessage, "Error during login.", true);
    }
});

// Voting Logic
form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!currentElectionId) {
        alert("Session expired. Please log in again.");
        logoutBtn.click();
        return;
    }

    const firstNameRaw = firstNameInput.value.trim();
    const firstName = firstNameRaw.toLowerCase();
    const lastName = lastNameInput.value.trim();
    const voterId = voterIdInput.value.trim();

    if (!firstNameRaw || !/^[A-Za-z]+$/.test(firstNameRaw)) {
        showMessage(statusMessage, "First name is mandatory and must contain only alphabets.", true);
        return;
    }
    
    if (!voterId || !/^\d{4}$/.test(voterId)) {
        showMessage(statusMessage, "Voter ID is mandatory and must strictly be 4 numeric digits.", true);
        return;
    }

    try {
        let checkStmt = db.prepare("SELECT id FROM voters WHERE election_id = :eid AND first_name = :fn AND voter_id = :vid");
        let checkRow = checkStmt.getAsObject({':eid': currentElectionId, ':fn': firstName, ':vid': voterId});
        checkStmt.free();
        
        if (checkRow.id) {
            showMessage(statusMessage, `Error: "${firstNameRaw}" with ID "${voterId}" has already voted!`, true);
            return;
        }
        
        const timestamp = new Date().toISOString() + "Z";
        db.run("INSERT INTO voters (election_id, first_name, last_name, voter_id, timestamp) VALUES (?, ?, ?, ?, ?)",
               [currentElectionId, firstName, lastName, voterId, timestamp]);
               
        saveDatabaseToCache();
        showMessage(statusMessage, "Vote Recorded Successfully", false);
        form.reset();
        updateStats();
        
    } catch (err) {
        showMessage(statusMessage, "Error recording vote.", true);
    }
});

// Export Logic
exportBtn.addEventListener('click', () => {
    if (!currentElectionId) {
        alert("Session expired. Please log in again.");
        logoutBtn.click();
        return;
    }

    try {
        let credStmt = db.prepare("SELECT username, password FROM elections WHERE id = :eid");
        let creds = credStmt.getAsObject({':eid': currentElectionId});
        credStmt.free();
        
        let records = [];
        let stmt = db.prepare("SELECT first_name, last_name, voter_id, timestamp FROM voters WHERE election_id = :eid");
        stmt.bind({':eid': currentElectionId});
        while (stmt.step()) {
            const row = stmt.getAsObject();
            records.push({
                firstName: row.first_name,
                lastName: row.last_name,
                voterId: row.voter_id,
                timestamp: row.timestamp
            });
        }
        stmt.free();
        
        if (records.length === 0) {
            showMessage(managementStatus, "No records to export. (Empty election)", false);
        }

        const data = {
            credentials: {
                username: creds.username,
                password: creds.password
            },
            voters: records
        };

        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        const electionName = creds.username || 'export';
        a.download = `voteguard_${electionName}_export.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        showMessage(managementStatus, "Failed to export data.", true);
    }
});

// Logout Logic
logoutBtn.addEventListener('click', () => {
    currentElectionId = null;
    currentUsername = null;
    appContent.classList.add('hidden');
    loginSection.classList.remove('hidden');
    usernameInput.value = '';
    passwordInput.value = '';
});

// Boot the app
init();
