# Nexus Backend Server

The backend server for the **Nexus SIEM System**, built with Node.js and Fastify. It handles log ingestion, normalization, rule-based threat detection, alerting, and data persistence via PostgreSQL.

## 🚀 Full Setup Guide

Follow these instructions to set up the backend server from scratch.

### 1. Prerequisites

Ensure you have the following installed on your system:
-   **Node.js** (v18 or higher)
-   **PostgreSQL** (v14 or higher)

### 2. Install Dependencies

Navigate to the backend directory and install the required packages:

```bash
cd backend
npm install
```

### 3. Environment Configuration

The application requires specific environment variables to function. Since `.env` files are excluded from the repository for security, you must create one manually.

1.  Create a file named `.env` in the `backend/` directory.
2.  Add the following configuration, replacing the placeholders with your actual values:

```ini
# Server Configuration
PORT=3001
HOST=0.0.0.0
NODE_ENV=development

# Database Configuration (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_postgres_user
DB_PASSWORD=your_postgres_password
DB_NAME=nexus_siem

# Authentication
JWT_SECRET=your_super_secret_jwt_key_here

# Email / SMTP Configuration (For Alerts)
# You can use a service like Gmail, SendGrid, or a local SMTP server.
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password
SMTP_FROM=alerts@nexus-siem.com
ALERT_RECIPIENT_EMAIL=admin@example.com
```

### 4. Database Setup

You need to initialize the PostgreSQL database schema. We have provided a script for this.

1.  **Ensure PostgreSQL is running.**
2.  **Create the Database**:
    If the database `nexus_siem` does not exist, creator it manually or let the script attempt it.
    
    ```bash
    # Optional: manual creation
    createdb nexus_siem
    ```

3.  **Run the Setup Script**:
    From the `backend/` directory, run:

    ```bash
    node "Schemas/create database/build_databases.js"
    ```

    *This script will create the necessary tables for logs, users, alerts, and devices.*

### 5. Start the Server

Once dependencies are installed, `.env` is configured, and the database is ready, start the server:

```bash
npm start
```

The server should start on `http://localhost:3001` (or your configured port).

## 📡 API Endpoints Overview

-   **Health Check**: `GET /health`
-   **Logs**: `GET /api/logs` (Retrieve logs), `POST /api/logs/analyze` (Trigger analysis)
-   **Alerts**: `GET /api/alerts`, `POST /api/alerts`
-   **Auth**: `POST /api/auth/login`, `POST /api/auth/register`
-   **Devices**: `GET /api/devices`

## 📁 Project Structure

-   `server.js`: Application entry point.
-   `config/`: Configuration files.
-   `database/`: Database connection and query modules.
-   `Schemas/`: SQL schema definitions.
-   `analysis/`: Log normalization and threat detection rules.
-   `alert/`: Alert management logic.
