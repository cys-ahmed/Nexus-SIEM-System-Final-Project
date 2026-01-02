# Log Collector

The Log Collector is responsible for ingesting logs from remote sources.

## Functionality

- **SSH Ingestion**: Connects to remote Linux servers via SSH.
- **Log Tailing**: Reads log files (like `/var/log/auth.log`) in real-time.
- **Syncing**: Pushes collected logs to the central database for analysis.
- **Device Management**: Ensures source devices are registered in the system.

## Files

- **logIngestor.js**: Main logic for SSH connection and log reading.
- **logDb.js**: Database interface for storing raw logs.
- **syncManager.js**: Manages the synchronization intervals and state.
