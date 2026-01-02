# Nexus SIEM System

A comprehensive Security Information and Event Management (SIEM) system designed for monitoring, analyzing, and responding to security threats.

## Overview

The Nexus SIEM System consists of two main components:

1. **Backend Server (`Backend-Server/`)**: A Node.js/Fastify server that handles log ingestion, normalization, rule-based analysis, and data storage.
2. **Frontend Application (`Nexus-SIEM-System/`)**: A React/Vite web application that provides a dashboard for monitoring logs, managing alerts, and handling incidents.

## Key Features

- **Real-time Log Analysis**: Ingests logs from various sources (e.g., Linux auth logs) and analyzes them in real-time.
- **Threat Detection**: Uses a rule-based engine to detect suspicious activities like brute-force attacks and sudo abuse.
- **Incident Management**: Workflow for tracking and resolving security incidents.
- **Dashboard**: Interactive visualizations of system health and security posture.
- **Alerting**: Email notifications for high-severity alerts.

## Quick Start

### Prerequisites

- Node.js (v18+)
- PostgreSQL

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd Nexus-SIEM-System-main
   ```

2. **Setup Backend**:
   Navigate to `Backend-Server/` and follow the instructions in [Backend-Server/README.md](./Backend-Server/README.md).

3. **Setup Frontend**:
   Navigate to `Nexus-SIEM-System/` and follow the instructions in [Nexus-SIEM-System/README.md](./Nexus-SIEM-System/README.md).

## Documentation

- [Backend Documentation](./Backend-Server/README.md)
- [Frontend Documentation](./Nexus-SIEM-System/README.md)

## License

[License Information]
