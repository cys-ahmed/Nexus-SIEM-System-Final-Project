# Database Creation

Scripts to initialize the Nexus SIEM database.

## Files

- **build_databases.js**: The main setup script.
  - Checks if the `nexus_siem` database exists.
  - Creates it if it doesn't.
  - Runs the schema setup script (`nexus_unified.sql`).
- **nexus_unified.sql**: The complete SQL schema definition.
  - Defines schemas: `auth_schema`, `client_schema`, `server_schema`.
  - Creates tables for users, logs, alerts, devices, etc.

## Usage

Run the build script to set up your local database:

```bash
node build_databases.js
```
