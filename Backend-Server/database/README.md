# Database Modules

This directory contains database connection and interaction modules for the Nexus SIEM Backend.

## Unified Database

The system connects to a single PostgreSQL database named `nexus_siem` which houses three distinct schemas: `auth_schema`, `client_schema`, and `server_schema`.

## Files

- **authDb.js**: Manages connections to the Authentication schema (users, credentials).
- **clientDb.js**: Manages connections to the Client-side schema (devices, client configurations).
- **serverDb.js**: Manages connections to the Server-side schema (logs, events, analysis results).
- **logDatabase.js**: Specialized interface for log-related database operations.

## Usage

These modules export PostgreSQL connection pools (`pg` library) configured with the appropriate `search_path` for their respective schemas.
