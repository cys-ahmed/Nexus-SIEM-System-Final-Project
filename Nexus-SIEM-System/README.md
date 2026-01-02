# Nexus SIEM Frontend

The React-based frontend application for the Nexus SIEM System. Built with Vite, TypeScript, and Tailwind CSS.

## Features

- **Dashboard**: Real-time overview of system status, alerts, and recent activities.
- **Log Monitoring**: Live feed of security logs with advanced filtering capabilities.
- **Alert Management**: Interface for viewing and managing security alerts.
- **Incident Response**: Tools for tracking and resolving security incidents.
- **Device Management**: Monitor connected devices and their status.
- **User Management**: Admin interface for managing users and roles.

## Tech Stack

- **Framework**: React (Vite)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Routing**: React Router
- **State Management**: Custom Hooks

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

   The app will run on `http://localhost:8080` (or similar, check console output).

## Project Structure

- **src/components/**: Reusable UI components.
- **src/pages/**: Application pages (routes).
- **src/lib/**: Utilities and helper functions.
- **src/hook/**: Custom React hooks.
- **public/**: Static assets.

## Scripts

- `npm run dev`: Start dev server.
- `npm run build`: Build for production.
- `npm run preview`: Preview production build.
