# Log Normalization

This module handles the parsing and normalization of raw log data into a structured format suitable for analysis.

## Files

- **BaseNormalizer.js**: Base class for all log normalizers.
- **NormalizationManager.js**: Orchestrates the normalization process, selecting the appropriate normalizer for each log.
- **linux_auth.js**: Specific normalizer for Linux authentication logs (e.g., sshd, sudo).

## Purpose

Raw logs differ significantly between sources. Normalization ensures that the Analysis Engine receives data in a consistent format (e.g., standardizing timestamps, extracting IP addresses and usernames).
