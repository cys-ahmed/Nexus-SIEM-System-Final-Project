# Nexus SIEM Scripts

Utility scripts for testing and managing the Nexus SIEM system.

## Available Scripts

### Data Management
| Script | Command | Description |
|--------|---------|-------------|
| `clean-data.js` | `npm run clean` | Clears all data EXCEPT auth tables (users, sessions) |
| `clean-all.js` | `npm run clean:all` | Clears ALL data including auth tables |

### Health Checks
| Script | Command | Description |
|--------|---------|-------------|
| `check-db.js` | `npm run check:db` | Tests all database connections |
| `check-api.js` | `npm run check:api` | Tests all API endpoints |
| `check-email.js` | `npm run check:email` | Tests email/SMTP configuration |
| `check-ssh.js` | `npm run check:ssh` | Tests SSH connections to log collectors |
| `check-all.js` | `npm run check:all` | Runs all health checks |

### Utilities
| Script | Command | Description |
|--------|---------|-------------|
| `inspect-schema.js` | `npm run inspect` | Shows all database schemas and tables |

## Quick Start

```bash
# Run all health checks
npm run check:all

# Clean data (preserves auth)
npm run clean

# Inspect database schema
npm run inspect
```
