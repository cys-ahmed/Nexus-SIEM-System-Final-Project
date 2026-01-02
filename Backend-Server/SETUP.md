# Setup Instructions

## Quick Start

1. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Start the backend server:**
   ```bash
   npm start
   ```
   The server will start on `http://localhost:3001`

3. **Start the frontend (in a separate terminal):**
   ```bash
   cd Nexus-SIEM-System-main
   npm install  # if not already installed
   npm run dev
   ```
   The frontend will start on `http://localhost:8080`

4. **Access the application:**
   - Open `http://localhost:8080` in your browser
   - Navigate to the "Logs" page to see the analyzed logs from `Linux_2k.log`

## What Was Created

### Backend Structure:
- ✅ `analysis/` folder with `logAnalyzer.js` - Parses Linux syslog format
- ✅ `log collector/` folder with `logCollector.js` - Log collection module
- ✅ `database/` folder with `logDatabase.js` - In-memory database for logs
- ✅ `server.js` - Fastify server with API endpoints
- ✅ `package.json` - Dependencies configuration

### Features:
- ✅ Log analysis automatically runs on server startup
- ✅ API endpoints for fetching logs with filters
- ✅ Source and severity filters are available but don't actually filter (as requested)
- ✅ Only IP and DateTime filters actually filter the results
- ✅ Frontend integrated with backend API using React Query

## API Endpoints

- `GET /health` - Health check
- `GET /api/logs` - Get logs (supports `ip` and `dateTime` filters)
- `GET /api/logs/filter-options` - Get available filter options
- `GET /api/logs/stats` - Get log statistics
- `POST /api/logs/analyze` - Re-analyze log file

## Notes

- The sample log file `Linux_2k.log` is automatically analyzed when the server starts
- Logs are stored in memory (will reset on server restart)
- Source and severity dropdowns are available but don't filter results - they're for informational purposes only
