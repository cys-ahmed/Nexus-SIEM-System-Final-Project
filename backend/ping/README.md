# Ping Service

This module is responsible for monitoring the availability of registered devices in the network.

## Functionality

- Retrieves the list of devices from the database.
- Pings each device to check its reachability.
- Updates the device status (`active` or `inactive`) in the database based on the ping result.
- Logs the latency (ms) if the device is reachable.

## Files

- **ping_devices.js**: Main script that executes the ping logic and updates the database.
