# 🔍 Nexus SIEM System

> A modern, open-source **Security Information and Event Management (SIEM)** system for real-time log monitoring, threat detection, and incident response — built with Node.js (Fastify) and React (Vite).

![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js)
![React](https://img.shields.io/badge/React-18%2B-blue?logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12%2B-orange?logo=postgresql)
![License](https://img.shields.io/badge/License-MIT-purple)

---

## 📌 Overview

**Nexus SIEM** empowers security teams to:
- 📥 Ingest and normalize logs (e.g., Linux `auth.log`, syslog)
- 🧠 Detect threats in real-time using a **rule-based engine**  
  *(e.g., brute-force SSH attempts, privilege escalation via `sudo`)*
- 🚨 Trigger email alerts for high-severity events
- 📊 Visualize security posture via an interactive dashboard
- 🛠 Manage incidents with a structured workflow (Open → Investigate → Resolve)

Built for scalability, extensibility, and ease of deployment — ideal for labs, red/blue teams, or small-to-mid enterprises.

## 🧩 System Architecture
```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                            🔍 Nexus SIEM System (v1.0)                       │
└──────────────────────────────────────────────────────────────────────────────┘
                                  ▲
                                  │ REST API / WebSocket
                                  ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                            🖥️  Frontend (React + Vite)                       │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌──────────────┐   │
│  │Dashboard    │    │Alerts       │    │Incidents    │    │Settings      │   │
│  │Charts       │    │Real-time    │    │Workflow     │    │Rules         │   │
│  │Metrics      │    │             │    │             │    │Notifications │   │
│  └─────────────┘    └─────────────┘    └─────────────┘    └──────────────┘   │
│         ▲                   ▲                   ▲                   ▲        │
│         └───────────────────┴───────────────────┴───────────────────┘        │
│                          📡 API Services (Axios/Fetch)                       │
└──────────────────────────────────────────────────────────────────────────────┘
                                  ▲
                                  │ HTTP / JSON
                                  ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          ⚙️  Backend (Node.js + Fastify)                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌────────────┐  │
│  │Log Ingest    │    │Rules Engine  │    │Database      │    │Alerts      │  │
│  │File/Syslog   │    │YAML Rules    │    │PostgreSQL    │    │Email       │  │
│  │Normalizer    │    │Real-time     │    │Prisma ORM    │    │Nodemailer  │  │
│  └───────┬──────┘    └───────┬──────┘    └───────┬──────┘    └───────┬────┘  │
│          └───────────────────┴───────────────────┴───────────────────┘       │
└──────────────────────────────────────────────────────────────────────────────┘
                                  ▲
                                  │ Logs (stdin/file/network)
                                  ▼
                       ┌──────────────────────────────┐
                       │ 🖥️  Data Sources             │
                       │ • Linux auth.log             │
                       │ • Syslog (UDP/TCP)           │
                       │ • Custom log files           │
                       └──────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js v18+  
- PostgreSQL v12+  
- `git`, `npm`/`yarn`

### Installation

```bash
# Clone the repo
git clone https://github.com/cys-ahmed/Nexus-SIEM-System-Final-Project.git
cd Nexus-SIEM-System-Final-Project

# Set up Backend
cd Backend-Server
cp .env.example .env              # Edit with your DB & email credentials
npm install
npm run migrate                   # Run DB migrations
npm run dev                       # Starts server on http://localhost:3000

# In a new terminal — Set up Frontend
cd ../Nexus-SIEM-System
cp .env.example .env              # Configure API base URL (e.g., VITE_API_BASE=http://localhost:3000)
npm install
npm run dev                       # Starts dashboard on http://localhost:5173
```
🛠 Configuration
Backend (.env)
```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/nexus_siem"
JWT_SECRET="your_strong_secret_here"
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_alerts@gmail.com
SMTP_PASS=app_password_here
```

Frontend (.env)
```bash
VITE_API_BASE=http://localhost:3000
```

## 📦 Features
| Feature       | Status | Notes |
|:--------------|:------:|:--------|
| ✅ Log Ingestion (Syslog, File, API) | ✅ Done |Supports JSON & plain-text formats |
| ✅ Rule Engine (YAML-based)      | ✅ Done |Easily extend with new detection rules |
| ✅ Real-time Alerts     | ✅ Done  |Via WebSocket + Email |
| ✅ Incident Workflow     | ✅ Done |Assign, comment, resolve|
| ✅ Dashboard (Charts, Tables)     | ✅ Done |Powered by Chart.js |
| 🟨 Threat Intelligence Feeds     | ⏳ Coming Soon |Planned for v1.1 |
| 🟨 REST API Documentation     | ⏳ Coming Soon |(OpenAPI/Swagger coming soon) |

## 🧪 Testing & Development
- Backend tests: npm test (Jest)
- Frontend linting: npm run lint
- DB migrations: Managed via prisma migrate dev or custom scripts

## 📜 License
Distributed under the MIT License.
See LICENSE for details.
