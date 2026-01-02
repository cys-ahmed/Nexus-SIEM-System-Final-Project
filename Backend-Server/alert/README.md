# Alert System

This directory manages the creation, storage, and notification of security alerts.

## Files

- **alert.js**: Service for creating alerts and triggering notifications.
- **alertDatabase.js**: Database interactions for storing and retrieving alerts.
- **emailService.js**: Helper for sending alert emails (likely a re-export or specific usage of the main email service).

## Features

- **Alert Creation**: Saves alerts to the database with severity, source, and description.
- **Notifications**: Integrates with the Email Service to notify administrators of high-severity events.
- **Management**: Functions to update alert status (e.g., Open, Resolved).
