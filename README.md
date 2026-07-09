<div align="center">
  <img src="./static/logo.png" alt="VoteGuard Logo" width="100" />
  <h1>VoteGuard</h1>
  <p><strong>Secure Vote Verification Platform</strong></p>

  <!-- Badges -->
  <p>
    <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
    <img src="https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white" alt="Flask" />
    <img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
    <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5" />
    <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
  </p>

  <p>
    <a href="https://github.com/lakshyarajmalviya/Voting-verification"><strong>View Source Code</strong></a> ·
    <a href="https://voteguard-u0k0.onrender.com"><strong>View Live Demo</strong></a>
  </p>
</div>

---

## 📌 Overview

**VoteGuard** is a secure, lightweight full-stack web application designed for verifying and storing voting records. 

Elections, particularly at the local or community level, often suffer from logistical challenges regarding data integrity and the prevention of multiple voting attempts. VoteGuard solves this by acting as a strict verification layer. By processing user identities through composite keys (combining a voter's First Name and the last 4 digits of their Aadhaar card), the application instantly detects and blocks duplicate voting attempts, ensuring a fair and transparent democratic process.

## 🏆 Real-World Deployment

VoteGuard is not just a theoretical project—it is **production-tested**. 

The software was successfully deployed during a **live local community election**. During its operation, the system effectively processed voter entries and successfully identified and prevented several duplicate voting attempts, directly safeguarding the integrity of the election results.

<div align="center">
  <img src="./Screenshot/proofOfwork.png" alt="Proof of Work" width="600" />
  <p><em>Email verification of the system's deployment in a live community election.</em></p>
</div>

## ✨ Features

- **Operator Authentication**: Secure login portal to ensure only authorized personnel can enter data.
- **Duplicate Vote Prevention**: Strict database-level constraints that block repeated entries using composite identities.
- **SQLite Persistence**: Reliable on-disk data storage with file-based architecture.
- **JSON Export & Import**: Robust data backup and restoration pipelines (supports merging or completely replacing election states).
- **Real-Time Stats**: Live dashboard tracking total verified votes and caught duplicates.
- **Modern Responsive UI**: A mobile-first, glassmorphism light/dark theme providing an excellent user experience.
- **Lightweight Architecture**: Zero-bloat design utilizing Flask and Vanilla JS.

## 📸 Screenshots

> **Note:** Please refer to the `./Screenshot` directory for additional visual documentation.

| Login / Operator Access | Main Dashboard & Vote Entry |
| :---: | :---: |
| ![Login Screen](./Screenshot/[ADD_LOGIN_SCREENSHOT].png) | ![Dashboard](./Screenshot/[ADD_DASHBOARD_SCREENSHOT].png) |
| *Secure operator authentication interface.* | *The primary dashboard for entering data.* |

| Duplicate Vote Error | Data Management (Import/Export) |
| :---: | :---: |
| ![Duplicate Detection](./Screenshot/[ADD_DUPLICATE_ERROR_SCREENSHOT].png) | ![Import Export](./Screenshot/[ADD_IMPORT_EXPORT_SCREENSHOT].png) |
| *System immediately rejecting a duplicate attempt.* | *JSON-based pipeline for backing up sessions.* |

## ⚙️ Engineering Highlights

- **Database-Level Duplicate Detection**: Validation was shifted from Python logic strictly into the SQLite schema using `UNIQUE(election_id, first_name, aadhaar_4)`. This guarantees data integrity even if race conditions occur.
- **CSRF Protection**: All form submissions and asynchronous Fetch API requests are heavily secured using `Flask-WTF` CSRF tokens.
- **Case-Insensitive Validation**: Data sanitization occurs prior to database insertion, ensuring "John" and "john" are recognized as the exact same identity.
- **JSON Pipeline**: Custom serialization and deserialization allowing entire database states to be packaged securely into JSON files.
- **Application Context DB Management**: Utilizes Flask's application context (`g.db`) to ensure efficient database connection pooling and automatic cleanup post-request.

## 🏗 Architecture / Workflow

VoteGuard operates on a robust 3-tier architecture. Here is the operational data flow:

<div align="center">
  <img src="./Screenshot/architecture.png" alt="Architecture Diagram" width="800" />
  <p><em>3-Tier Software Architecture: Client, Flask Server, SQLite Database</em></p>
</div>

<div align="center">
  <img src="./Screenshot/workflow.png" alt="User Workflow Diagram" width="800" />
  <p><em>Operator Workflow: Entering data and receiving validation feedback</em></p>
</div>

### Sequential Data Flow


```mermaid
sequenceDiagram
    participant User as Operator
    participant Frontend as Vanilla JS (Client)
    participant Backend as Flask (Server)
    participant DB as SQLite

    User->>Frontend: Enters Vote (Name, Aadhaar)
    Frontend->>Backend: POST /submit_vote (with CSRF)
    Backend->>Backend: Sanitize & Validate Input
    Backend->>DB: INSERT INTO votes
    
    alt Vote is Unique
        DB-->>Backend: Success
        Backend-->>Frontend: JSON {success: true}
        Frontend-->>User: Show Success & Update DOM
    else Vote is Duplicate (IntegrityError)
        DB--xBackend: SQLite Integrity Error
        Backend->>DB: UPDATE duplicate_attempts + 1
        Backend-->>Frontend: JSON {success: false, message: 'Duplicate'}
        Frontend-->>User: Show Error Alert & Shake Animation
    end
```

## 📁 Folder Structure

```text
Voting-verification/
├── app.py                # Core Flask backend, business logic, and routing
├── migration.py          # SQLite schema migration and setup script
├── requirements.txt      # Python dependencies (Flask, Flask-WTF, gunicorn)
├── render.yaml           # Deployment blueprint for Render.com
├── README.md             # Project documentation
├── static/               
│   ├── logo.png          # VoteGuard application logo
│   └── style.css         # UI styling (Mobile-responsive, glassmorphism)
└── templates/            
    ├── landing.html      # Gateway/landing screen
    ├── auth.html         # Login / Election Setup / Import screen
    ├── dashboard.html    # Main voting interface and live statistics
    ├── 404.html          # Custom Not Found error page
    └── 500.html          # Custom Server Error page
```

## 🔐 Demo Credentials

If you are accessing the live demo at [https://voteguard-u0k0.onrender.com](https://voteguard-u0k0.onrender.com), you can test the application using the following operator credentials:

- **Username:** `admin`
- **Password:** `admin123`

## 🚀 Setup & Run Locally

### Prerequisites
- Python 3.8+
- pip (Python package installer)

### Installation
1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Voting-verification
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application**
   ```bash
   python app.py
   ```

4. **Access the platform**
   Open your browser and navigate to: `http://127.0.0.1:5000`

## 🔮 Future Improvements

While highly effective for its current scope, future iterations of VoteGuard could benefit from:
- **JWT Authentication:** Transitioning from session-based auth for better stateless scaling.
- **Role-Based Access Control (RBAC):** Separating permissions between standard data-entry operators and system administrators.
- **Audit Logs:** Immutable tracking of exactly which operator recorded or deleted specific entries.
- **Cloud Database Migration:** Moving from SQLite to PostgreSQL for high-concurrency enterprise deployments.
- **OTP Verification:** Adding SMS or Email OTPs for voters to confirm their identity directly.

## ⚠️ Disclaimer

This project was built for localized, small-scale community verification use. While it implements standard web security practices (CSRF, Password Hashing, DB constraints), deploying this for large-scale or high-stakes government elections would require significantly stronger infrastructure, compliance audits, and advanced cryptographic security protocols.

## 👨‍💻 Author

**Lakshya Raj Malviya**
- **LinkedIn:** [https://www.linkedin.com/in/lakshya-raj-malviya/](https://www.linkedin.com/in/lakshya-raj-malviya/)
