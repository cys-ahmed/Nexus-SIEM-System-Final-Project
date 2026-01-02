# Rule Analysis Engine

The Rule Analysis Engine matches normalized events against security rules to detect potential threats.

## Files

- **RuleEngine.js**: Core class that processes events and applies rules.
- **DetectionDatabase.js**: Interface for storing detection results.
- **ResolvedDatabase.js**: Interface for managing resolved incidents.
- **rules.json**: Configuration file defining the security rules (e.g., failed login attempts, sudo abuse).

## How it works

1. The engine loads rules from `rules.json`.
2. Normalized events are passed to the engine.
3. If an event matches a rule's criteria, a detection is triggered and stored.
