# Nexus Tagger Plugin

A custom Vite plugin for the Nexus SIEM System.

## Purpose

This plugin automatically adds metadata tags to React components during the build process. These tags are used for:

- **Security Compliance**: Marking components that handle sensitive data.
- **Monitoring**: enabling performance tracking for specific UI elements.
- **Auditing**: Tracking component usage and user interactions.

## Configuration

The plugin is configured via `nexus-config.json` and supports various modes for security and logging.
