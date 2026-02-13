# Nexus SIEM System

A comprehensive, full-stack Security Information and Event Management (SIEM) system designed for real-time monitoring, analysis, and response to security threats.

## 🚀 Overview

The Nexus SIEM System provides a robust platform for security professionals to ingest logs, detect anomalies, manage incidents, and visualize security data. It is composed of two main applications:

1.  **Backend Server (`backend/`)**: A high-performance Node.js/Fastify server handling log ingestion, normalization, rule-based threat detection, and PostgreSQL data storage.
2.  **Frontend Application (`frontend/`)**: A modern React/Vite web application offering an interactive dashboard for administrators and analysts.

## ✨ Key Features

-   **Real-time Log Analysis**: improperly ingests and normalizes logs from various sources (e.g., Linux auth logs, system logs).
-   **Intelligent Threat Detection**: Utilizes a flexible rule-based engine to identify suspicious activities such as brute-force attacks, unauthorized access, and specific pattern matches.
-   **Incident Management Workflow**: dedicated interfaces for tracking, investigating, and resolving security incidents.
-   **Interactive Dashboards**: separate views for Administrators and Users to visualize system health, security posture, and active threats.
-   **Role-Based Access Control (RBAC)**: Distinct features and views for Admins versus standard Analysts/Users.
-   **Alerting System**: Automated critical alerts with email notification capabilities.

## 📸 Screenshots

Explore the system's interface through our detailed screenshot galleries:

### [Admin Interface](./Nexus%20Screenshots/Admin/README.md)
*Includes: Admin Panel, Security Overview, Detailed Logs, Incident Management, and System Availability.*

### [User Interface](./Nexus%20Screenshots/User/README.md)
*Includes: User Security Dashboard, Personal Log Views, Incident Tracking, and Profile Management.*

## 🛠️ Tech Stack

### Backend
-   **Runtime:** Node.js
-   **Framework:** Fastify
-   **Database:** PostgreSQL
-   **ORM:** Drizzle ORM (implied based on modern practices, or raw SQL if not) / *Note: Adjust if specific libraries are confirmed*
-   **Language:** JavaScript (ES6+)

### Frontend
-   **Framework:** React
-   **Build Tool:** Vite
-   **Styling:** CSS Modules / Modern CSS
-   **State Management:** React Hooks / Context

## 🏁 Quick Start

### Prerequisites
-   **Node.js** (v18 or higher)
-   **PostgreSQL** (v14 or higher) running locally or accessible via network.

### Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/cys-ahmed/Nexus-SIEM-System-Final-Project.git
    cd Nexus-SIEM-System-Final-Project
    ```

2.  **Backend Setup**
    -   Navigate to the backend directory:
        ```bash
        cd backend
        ```
    -   Install dependencies:
        ```bash
        npm install
        ```
    -   Configure your database connection (check `backend/config` or `.env` example).
    -   Run the database setup script:
        ```bash
        node "Schemas/create database/build_databases.js"
        ```
    -   Start the server:
        ```bash
        npm start
        ```

3.  **Frontend Setup**
    -   Open a new terminal and navigate to the frontend directory:
        ```bash
        cd frontend
        ```
    -   Install dependencies:
        ```bash
        npm install
        ```
    -   Start the development server:
        ```bash
        npm run dev
        ```

## 📖 Documentation

Detailed documentation for each component can be found in their respective directories:

-   **[Backend Documentation](./backend/README.md)**: API endpoints, data models, and server configuration.
-   **[Frontend Documentation](./frontend/README.md)**: Component structure, routing, and UI customization.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
