# Utilities

General utility modules shared across the backend application.

## Files

- **emailService.js**: A reusable email service built with `nodemailer`.
  - Handles sending emails for alerts, password resets, and MFA pins.
  - Configurable via environment variables (`SMTP_HOST`, `SMTP_USER`, etc.).
  - Includes HTML templates for professional-looking emails.
