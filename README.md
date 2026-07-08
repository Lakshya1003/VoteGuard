# VoteGuard

VoteGuard is a secure, lightweight full-stack web application designed for verifying and storing voting records. It strictly prevents duplicate entries and ensures robust data integrity through a Python Flask backend and an SQLite database, accessible via a fast, Single-Page Application (SPA) frontend.

## Features

- **Operator Authentication**: Simple session gateway to prevent unauthorized access.
- **Robust Persistence**: Data is securely stored in a local SQLite database (`votes.db`), ensuring it survives server restarts.
- **Duplicate Prevention**: Mathematically prevents double-voting by validating the **First Name + Voter ID** combination at the database query level (case-insensitive).
- **Data Export**: Instantly backup the entire voting database to a `.json` file using HTML5 Blob APIs without server-side file generation overhead.
- **Data Import (Upsert)**: Restore or merge voting data from a `.json` file. The backend intelligently ignores duplicates during import, preventing data corruption.
- **Real-time Stats**: Always shows the total count of unique stored records dynamically.
- **Modern UI**: Features a "Mobile-First", glassmorphism dark UI using Vanilla CSS.

## Architecture & Tech Stack

VoteGuard is built with a classic 3-Tier Architecture prioritizing zero heavy dependencies:

- **Frontend (Presentation)**: HTML5, CSS3, Vanilla JavaScript (ES6+). Uses the `fetch` API for asynchronous communication, making it feel like a modern SPA without React or Vue.
- **Backend (API Layer)**: Python 3 with **Flask**. Serves static files and provides RESTful API endpoints (`/api/vote`, `/api/import`, etc.).
- **Database (Data Layer)**: **SQLite3**. A zero-configuration SQL database engine perfect for local-first applications.

## How it Works

### 1. The Voting Process
1. Enter the voter's details (First Name, Last Name, Voter ID).
2. Click **Submit Vote**.
3. The JavaScript frontend sends an asynchronous JSON POST request to the Flask server.
4. Flask sanitizes the input and executes a parameterized SQL query to check if the combination exists.
5. If the exact combination exists, an HTTP 400 error is returned ("Already voted!"). Otherwise, the vote is inserted and a success message is shown.

### 2. Exporting Data
Clicking **Export Data** fetches the latest records from the backend API. The frontend then dynamically generates a `voteguard_export.json` file entirely in the browser and triggers a download.

### 3. Importing Data
When a `.json` file is uploaded, the frontend reads it via the `FileReader` API and posts the array to the backend. The server loops through the array, inserting valid new records while cleanly skipping existing duplicates.

## Setup & Run

1. Ensure you have **Python 3.x** installed.
2. Install Flask:
   ```bash
   pip install -r requirements.txt
   ```
   *(Or simply `pip install flask`)*
3. Run the application:
   ```bash
   python app.py
   ```
4. Open your browser and navigate to `http://localhost:5000`.

**Default Login:**
- Username: `admin`
- Password: `admin123`

## Disclaimer
This project is intended for small-scale verification drives and local use. For production deployment, the hardcoded authentication should be replaced with hashed passwords and JWT session management, and the Flask server should be run behind a WSGI server like Gunicorn.
