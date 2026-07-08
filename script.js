const form = document.getElementById('votingForm');
const firstNameInput = document.getElementById('firstName');
const lastNameInput = document.getElementById('lastName');
const voterIdInput = document.getElementById('voterId');
const statusMessage = document.getElementById('statusMessage');
const statsCount = document.getElementById('statsCount');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const fileInput = document.getElementById('fileInput');
const importStatus = document.getElementById('importStatus');
const logoutBtn = document.getElementById('logoutBtn');
const loginSection = document.getElementById('loginSection');
const appContent = document.getElementById('appContent');
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

const API_BASE = '/api';

async function updateStats() {
    try {
        const res = await fetch(`${API_BASE}/stats`);
        const data = await res.json();
        statsCount.textContent = data.count;
    } catch (err) {
        console.error("Error fetching stats", err);
    }
}

function showMessage(element, msg, isError = false) {
    element.textContent = msg;
    element.className = 'message-box';
    element.classList.add(isError ? 'message-error' : 'message-success');
    element.style.display = 'block';

    setTimeout(() => {
        element.style.display = 'none';
    }, 3000);
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    const voterId = voterIdInput.value.trim();

    if (!firstName) {
        showMessage(statusMessage, "First name is required.", true);
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName, lastName, voterId })
        });
        
        const data = await res.json();
        
        if (data.success) {
            showMessage(statusMessage, data.message, false);
            form.reset();
            updateStats();
        } else {
            showMessage(statusMessage, data.message, true);
        }
    } catch (err) {
        showMessage(statusMessage, "Server error. Please try again.", true);
    }
});

exportBtn.addEventListener('click', async () => {
    try {
        const res = await fetch(`${API_BASE}/export`);
        const data = await res.json();
        
        if (data.length === 0) {
            showMessage(importStatus, "No data to export.", true);
            return;
        }

        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = "voteguard_export.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        showMessage(importStatus, "Failed to export data.", true);
    }
});

importBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async function (event) {
        try {
            const importedData = JSON.parse(event.target.result);

            if (!Array.isArray(importedData)) {
                throw new Error("Invalid format");
            }

            const res = await fetch(`${API_BASE}/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(importedData)
            });
            
            const data = await res.json();
            
            if (data.success) {
                showMessage(importStatus, data.message, false);
                updateStats();
            } else {
                showMessage(importStatus, data.message, true);
            }

        } catch (err) {
            console.error(err);
            showMessage(importStatus, "Failed to import: Invalid JSON file.", true);
        }

        fileInput.value = '';
    };

    reader.readAsText(file);
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = usernameInput.value;
    const password = passwordInput.value;

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await res.json();
        
        if (data.success) {
            loginSection.classList.add('hidden');
            appContent.classList.remove('hidden');
            passwordInput.value = '';
            updateStats();
        } else {
            showMessage(loginMessage, data.message || "Invalid Credentials", true);
        }
    } catch (err) {
        showMessage(loginMessage, "Server error during login.", true);
    }
});

logoutBtn.addEventListener('click', () => {
    appContent.classList.add('hidden');
    loginSection.classList.remove('hidden');
    usernameInput.value = '';
    passwordInput.value = '';
});
