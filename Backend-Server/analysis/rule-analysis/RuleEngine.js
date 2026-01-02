const fs = require('node:fs');
const path = require('node:path');
const DetectionDatabase = require('./DetectionDatabase');
const clientDb = require('../../database/clientDb');
const alertService = require('../../alert/alert');

class RuleEngine {
    constructor() {
        this.rules = this.loadRules();
        this.detectionDb = new DetectionDatabase();
        this.initialized = false;
    }

    
    loadRules() {
        try {
            const rulesPath = path.join(__dirname, 'rules.json');
            const rulesData = fs.readFileSync(rulesPath, 'utf8');
            return JSON.parse(rulesData);
        } catch (error) {
            console.error('Error loading rules:', error);
            return {};
        }
    }

    
    async init() {
        if (this.initialized) return;

        try {
            await this.detectionDb.init();
            this.initialized = true;
            console.log('RuleEngine initialized');
        } catch (error) {
            console.error('RuleEngine init failed:', error);
            throw error;
        }
    }

    
    async analyzeBatch(events) {
        if (!this.initialized) {
            await this.init();
        }


        const detections = [];

        try {
            
            const results = await Promise.all([
                this.detectBruteForce(),
                this.detectPasswordSpraying(),
                this.detectSuccessfulAfterFailed(),
                this.detectSuspiciousSudo(),
                this.detectFailedPrivilegeEscalation(),
                this.detectUnusualRootAccess(),
                this.detectConcurrentSessions(),
                this.detectHighSeverityLogs()
            ]);

            results.forEach(result => {
                if (result && Array.isArray(result)) {
                    detections.push(...result);
                }
            });

            
            for (const detection of detections) {
                await this.detectionDb.insertDetection(detection);

                
                if (detection.severity === 'HIGH' || detection.severity === 'CRITICAL') {
                    try {
                        await alertService.createAlert({
                            title: detection.ruleName,
                            description: detection.description,
                            severity: detection.severity,
                            source: detection.srcIp || 'Unknown',
                            eventId: detection.eventIds && detection.eventIds.length > 0 ? detection.eventIds[0] : 0
                        });
                        console.log(`Alert created: ${detection.ruleName}`);
                    } catch (alertError) {
                        console.error('Alert creation failed:', alertError);
                    }
                }
            }

            if (detections.length > 0) {
                console.log(`Threats detected: ${detections.length}`);
            }

            return detections;
        } catch (error) {
            console.error('Batch analysis failed:', error);
            return detections;
        }
    }

    
    async detectBruteForce() {
        const rule = this.rules.authentication_attacks?.brute_force;
        if (!rule || !rule.enabled) return [];

        const detections = [];

        try {
            
            const query = `
                SELECT "Src_ip", COUNT(*) as attempt_count, 
                       array_agg("Event_Id") as event_ids,
                       MAX("Timestamp") as last_attempt
                FROM "EVENT"
                WHERE "Event_type" = 'authentication'
                  AND "Timestamp" >= NOW() - INTERVAL '${rule.timeWindow} seconds'
                  AND (
                    LOWER("Description ") LIKE '%failed%' OR
                    LOWER("Description ") LIKE '%invalid%' OR
                    LOWER("Description ") LIKE '%incorrect password%' OR
                    LOWER("Description ") LIKE '%authentication failure%'
                  )
                GROUP BY "Src_ip"
                HAVING COUNT(*) >= ${rule.threshold}
            `;

            const result = await clientDb.query(query);

            for (const row of result.rows) {
                detections.push({
                    ruleName: rule.name,
                    ruleCategory: 'authentication_attacks',
                    severity: rule.severity,
                    description: `${rule.description}: ${row.attempt_count} failed attempts from ${row.Src_ip}`,
                    eventIds: row.event_ids,
                    srcIp: row.Src_ip,
                    timestamp: new Date(row.last_attempt),
                    metadata: {
                        attempt_count: Number.parseInt(row.attempt_count, 10),
                        time_window: rule.timeWindow
                    }
                });
            }
        } catch (error) {
            console.error('Error detecting brute force:', error);
        }

        return detections;
    }

    
    async detectPasswordSpraying() {
        const rule = this.rules.authentication_attacks?.password_spraying;
        if (!rule || !rule.enabled) return [];

        const detections = [];

        try {
            
            const query = `
                SELECT "Src_ip", 
                       COUNT(DISTINCT "Description ") as unique_attempts,
                       COUNT(*) as total_attempts,
                       array_agg(DISTINCT "Event_Id") as event_ids,
                       MAX("Timestamp") as last_attempt
                FROM "EVENT"
                WHERE "Event_type" = 'authentication'
                  AND "Timestamp" >= NOW() - INTERVAL '${rule.timeWindow} seconds'
                  AND (
                    LOWER("Description ") LIKE '%failed%' OR
                    LOWER("Description ") LIKE '%invalid%'
                  )
                GROUP BY "Src_ip"
                HAVING COUNT(DISTINCT "Description ") >= ${rule.threshold}
            `;

            const result = await clientDb.query(query);

            for (const row of result.rows) {
                detections.push({
                    ruleName: rule.name,
                    ruleCategory: 'authentication_attacks',
                    severity: rule.severity,
                    description: `${rule.description}: ${row.unique_attempts} different login attempts from ${row.Src_ip}`,
                    eventIds: row.event_ids,
                    srcIp: row.Src_ip,
                    timestamp: new Date(row.last_attempt),
                    metadata: {
                        unique_attempts: Number.parseInt(row.unique_attempts, 10),
                        total_attempts: Number.parseInt(row.total_attempts, 10),
                        time_window: rule.timeWindow
                    }
                });
            }
        } catch (error) {
            console.error('Error detecting password spraying:', error);
        }

        return detections;
    }

    
    async detectSuccessfulAfterFailed() {
        const rule = this.rules.authentication_attacks?.successful_after_failed;
        if (!rule || !rule.enabled) return [];

        const detections = [];

        try {
            
            const query = `
                WITH failed_logins AS (
                    SELECT "Src_ip", "Timestamp", "Event_Id"
                    FROM "EVENT"
                    WHERE "Event_type" = 'authentication'
                      AND "Timestamp" >= NOW() - INTERVAL '${rule.timeWindow} seconds'
                      AND LOWER("Description ") LIKE '%failed%'
                ),
                successful_logins AS (
                    SELECT "Src_ip", "Timestamp", "Event_Id"
                    FROM "EVENT"
                    WHERE "Event_type" = 'authentication'
                      AND "Timestamp" >= NOW() - INTERVAL '${rule.timeWindow} seconds'
                      AND (
                        LOWER("Description ") LIKE '%accepted%' OR
                        LOWER("Description ") LIKE '%successful%'
                      )
                )
                SELECT f."Src_ip",
                       COUNT(DISTINCT f."Event_Id") as failed_count,
                       array_agg(DISTINCT f."Event_Id") || array_agg(DISTINCT s."Event_Id") as event_ids,
                       MAX(s."Timestamp") as success_time
                FROM failed_logins f
                JOIN successful_logins s ON f."Src_ip" = s."Src_ip"
                WHERE s."Timestamp" > f."Timestamp"
                GROUP BY f."Src_ip"
                HAVING COUNT(DISTINCT f."Event_Id") >= ${rule.threshold}
            `;

            const result = await clientDb.query(query);

            for (const row of result.rows) {
                detections.push({
                    ruleName: rule.name,
                    ruleCategory: 'authentication_attacks',
                    severity: rule.severity,
                    description: `${rule.description}: ${row.failed_count} failed attempts followed by success from ${row.Src_ip}`,
                    eventIds: row.event_ids,
                    srcIp: row.Src_ip,
                    timestamp: new Date(row.success_time),
                    metadata: {
                        failed_count: Number.parseInt(row.failed_count, 10),
                        time_window: rule.timeWindow
                    }
                });
            }
        } catch (error) {
            console.error('Error detecting successful after failed:', error);
        }

        return detections;
    }

    
    async detectSuspiciousSudo() {
        const rule = this.rules.privilege_escalation?.suspicious_sudo;
        if (!rule || !rule.enabled) return [];

        const detections = [];

        try {
            const query = `
                SELECT "Hostname", "Src_ip",
                       COUNT(*) as sudo_count,
                       array_agg("Event_Id") as event_ids,
                       MAX("Timestamp") as last_command
                FROM "EVENT"
                WHERE "source_service" = 'sudo'
                  AND "Timestamp" >= NOW() - INTERVAL '${rule.timeWindow} seconds'
                  AND LOWER("Description ") LIKE '%command%'
                GROUP BY "Hostname", "Src_ip"
                HAVING COUNT(*) >= ${rule.threshold}
            `;

            const result = await clientDb.query(query);

            for (const row of result.rows) {
                detections.push({
                    ruleName: rule.name,
                    ruleCategory: 'privilege_escalation',
                    severity: rule.severity,
                    description: `${rule.description}: ${row.sudo_count} sudo commands in ${rule.timeWindow} seconds on ${row.Hostname}`,
                    eventIds: row.event_ids,
                    srcIp: row.Src_ip,
                    username: row.Hostname,
                    timestamp: new Date(row.last_command),
                    metadata: {
                        sudo_count: Number.parseInt(row.sudo_count, 10),
                        time_window: rule.timeWindow
                    }
                });
            }
        } catch (error) {
            console.error('Error detecting suspicious sudo:', error);
        }

        return detections;
    }

    
    async detectFailedPrivilegeEscalation(events) {
        const rule = this.rules.privilege_escalation?.failed_su;
        if (!rule || !rule.enabled) return [];

        const detections = [];

        try {
            const query = `
                SELECT "Hostname", "Src_ip",
                       COUNT(*) as failed_count,
                       array_agg("Event_Id") as event_ids,
                       MAX("Timestamp") as last_attempt
                FROM "EVENT"
                WHERE "Event_type" = 'authentication'
                  AND "Timestamp" >= NOW() - INTERVAL '${rule.timeWindow} seconds'
                  AND LOWER("Description ") LIKE '%su:%'
                  AND LOWER("Description ") LIKE '%failed%'
                GROUP BY "Hostname", "Src_ip"
                HAVING COUNT(*) >= ${rule.threshold}
            `;

            const result = await clientDb.query(query);

            for (const row of result.rows) {
                detections.push({
                    ruleName: rule.name,
                    ruleCategory: 'privilege_escalation',
                    severity: rule.severity,
                    description: `${rule.description}: ${row.failed_count} failed su attempts on ${row.Hostname}`,
                    eventIds: row.event_ids,
                    srcIp: row.Src_ip,
                    username: row.Hostname,
                    timestamp: new Date(row.last_attempt),
                    metadata: {
                        failed_count: Number.parseInt(row.failed_count, 10),
                        time_window: rule.timeWindow
                    }
                });
            }
        } catch (error) {
            console.error('Error detecting failed privilege escalation:', error);
        }

        return detections;
    }

    
    async detectUnusualRootAccess(events) {
        const rule = this.rules.privilege_escalation?.unusual_root_access;
        if (!rule || !rule.enabled) return [];

        const detections = [];

        try {
            
            const query = `
                SELECT "Src_ip", "Hostname",
                       COUNT(*) as access_count,
                       array_agg("Event_Id") as event_ids,
                       MAX("Timestamp") as last_access
                FROM "EVENT"
                WHERE "Event_type" = 'authentication'
                  AND "Timestamp" >= NOW() - INTERVAL '${rule.timeWindow} seconds'
                  AND LOWER("Description ") LIKE '%accepted%'
                  AND LOWER("Description ") LIKE '%root%'
                  AND "Src_ip" NOT IN ('127.0.0.1', '::1')
                GROUP BY "Src_ip", "Hostname"
            `;

            const result = await clientDb.query(query);

            for (const row of result.rows) {
                detections.push({
                    ruleName: rule.name,
                    ruleCategory: 'privilege_escalation',
                    severity: rule.severity,
                    description: `${rule.description}: Root login from external IP ${row.Src_ip}`,
                    eventIds: row.event_ids,
                    srcIp: row.Src_ip,
                    username: 'root',
                    timestamp: new Date(row.last_access),
                    metadata: {
                        access_count: Number.parseInt(row.access_count, 10)
                    }
                });
            }
        } catch (error) {
            console.error('Error detecting unusual root access:', error);
        }

        return detections;
    }

    
    async detectConcurrentSessions() {
        const rule = this.rules.suspicious_behavior?.concurrent_sessions;
        if (!rule || !rule.enabled) return [];

        const detections = [];

        try {
            const query = `
                SELECT "Description ", 
                       COUNT(DISTINCT "Src_ip") as ip_count,
                       array_agg(DISTINCT "Src_ip") as ips,
                       array_agg("Event_Id") as event_ids,
                       MAX("Timestamp") as last_login
                FROM "EVENT"
                WHERE "Event_type" = 'authentication'
                  AND "Timestamp" >= NOW() - INTERVAL '${rule.timeWindow} seconds'
                  AND LOWER("Description ") LIKE '%accepted%'
                GROUP BY "Description "
                HAVING COUNT(DISTINCT "Src_ip") >= ${rule.threshold}
            `;

            const result = await clientDb.query(query);

            for (const row of result.rows) {
                
                const username = row["Description "];

                detections.push({
                    ruleName: rule.name,
                    ruleCategory: 'suspicious_behavior',
                    severity: rule.severity,
                    description: `${rule.description}: User logged in from ${row.ip_count} different IPs concurrently`,
                    eventIds: row.event_ids,
                    srcIp: row.ips[0], 
                    username: username,
                    timestamp: new Date(row.last_login),
                    metadata: {
                        ip_count: Number.parseInt(row.ip_count),
                        ips: row.ips,
                        time_window: rule.timeWindow
                    }
                });
            }
        } catch (error) {
            console.error('Error detecting concurrent sessions:', error);
        }

        return detections;
    }

    
    async detectHighSeverityLogs() {
        const criticalRule = this.rules.log_severity?.critical_error_log;
        const highRule = this.rules.log_severity?.high_severity_log;

        const detections = [];

        try {
            if (criticalRule && criticalRule.enabled) {
                const query = `
                    SELECT "Event_Id", "Timestamp", "Severity", "Description ", "Src_ip", "Hostname"
                    FROM "EVENT"
                    WHERE "Severity" >= 4
                    AND "Timestamp" >= NOW() - INTERVAL '1 minute'
                 `;

                const result = await clientDb.query(query);
                console.log(`[RuleEngine] Critical logs found: ${result.rows.length}`);
                for (const row of result.rows) {
                    detections.push({
                        ruleName: criticalRule.name,
                        ruleCategory: 'log_severity',
                        severity: criticalRule.severity,
                        description: `${criticalRule.description}: ${row["Description "]}`,
                        eventIds: [row.Event_Id],
                        srcIp: row.Src_ip,
                        timestamp: new Date(row.Timestamp),
                        metadata: {
                            original_severity: row.Severity
                        }
                    });
                }
            }

            if (highRule && highRule.enabled) {
                const query = `
                    SELECT "Event_Id", "Timestamp", "Severity", "Description ", "Src_ip", "Hostname"
                    FROM "EVENT"
                    WHERE "Severity" = 3
                    AND "Timestamp" >= NOW() - INTERVAL '1 minute'
                 `;

                const result = await clientDb.query(query);
                for (const row of result.rows) {
                    detections.push({
                        ruleName: highRule.name,
                        ruleCategory: 'log_severity',
                        severity: highRule.severity,
                        description: `${highRule.description}: ${row["Description "]}`,
                        eventIds: [row.Event_Id],
                        srcIp: row.Src_ip,
                        timestamp: new Date(row.Timestamp),
                        metadata: {
                            original_severity: row.Severity
                        }
                    });
                }
            }

        } catch (error) {
            console.error('Error detecting high severity logs:', error);
        }

        return detections;
    }
}

module.exports = RuleEngine;
