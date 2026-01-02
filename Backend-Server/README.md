# Nexus Backend Server

Backend server for the Nexus SIEM System. This server provides API endpoints for log analysis, storage, and retrieval, as well as managing alerts and device monitoring.

## Structure

- **alert/**: Alert management system (creation, storage, notification).
- **analysis/**: Core log analysis engine (normalization, rule matching).
- **database/**: Database connection modules and interfaces.
- **log collector/**: Modules for ingesting and syncing logs from remote sources.
- **ping/**: Service for monitoring device availability.
- **Schemas/**: SQL database schemas, queries, and setup scripts.
- **Scripts/**: Maintenance and utility scripts (seeding, cleanup, inspection).
- **Tests/**: Test scripts for verifying backend functionality.
- **utils/**: General utility modules (e.g., email service).
- **server.js**: Main Fastify server entry point.

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Database Setup**:
   Ensure you have PostgreSQL installed and running.
   Run the database creation script:
   ```bash
   node Backend-Server/Schemas/create\ database/build_databases.js
   ```

3. **Start the server**:
   ```bash
   npm start
   ```

   The server will start on `http://localhost:3001` by default.

## API Endpoints

### Health Check
- `GET /health`: Check if server is running.

### Logs
- `GET /api/logs`: Retrieve logs with optional filters (ip, dateTime, etc.).
- `GET /api/logs/filter-options`: Get available filter values.
- `GET /api/logs/stats`: Get log statistics.
- `POST /api/logs/analyze`: Trigger manual log analysis.

### Authentication
- `POST /auth/login`: User login.
- `POST /auth/signup`: User registration.

### Alerts
- `GET /api/alerts`: Retrieve alerts.

## Environment Variables

Create a `.env` file with the following:

- `PORT`: Server port (default: 3001)
- `HOST`: Server host (default: 0.0.0.0)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: Email configuration for alerts.

## Log Format

The server supports Linux syslog format:
`Month Day HH:MM:SS hostname service[PID]: message`
