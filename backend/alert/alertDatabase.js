const clientDb = require('../database/clientDb');
const ResolvedDatabase = require('../analysis/rule-analysis/ResolvedDatabase');
const DetectionDatabase = require('../analysis/rule-analysis/DetectionDatabase');
const resolvedDb = new ResolvedDatabase();
const detectionDb = new DetectionDatabase();

function mapSeverityToNumber(severity) {
    const severityMap = {
        'critical': 4,
        'high': 3,
        'medium': 2,
        'low': 1
    };
    return severityMap[severity.toLowerCase()] || 2;
}

function mapNumberToSeverity(severityNum) {
    const severityMap = {
        4: 'critical',
        3: 'high',
        2: 'medium',
        1: 'low'
    };
    return severityMap[severityNum] || 'medium';
}

async function saveAlert(alertData) {
    const { severity, title, description, source, eventId, status } = alertData;

    try {
        const severityNum = mapSeverityToNumber(severity);
        
        const evtId = eventId || null;
        const alertStatus = status || 'active';
        let detectionId = null;

        
        if (severity.toLowerCase() === 'high' || severity.toLowerCase() === 'critical') {
            try {
                const detectionData = {
                    ruleName: title,
                    ruleCategory: source || 'Alert',
                    severity: severity,
                    description: description,
                    eventIds: evtId ? [evtId] : [],
                    srcIp: null,
                    username: null,
                    timestamp: new Date(),
                    metadata: { source: 'Alert System', originalEventId: evtId },
                    status: 'new'
                };
                detectionId = await detectionDb.insertDetection(detectionData);
                console.log('High/Critical Alert saved to Detections:', detectionId);
            } catch (detError) {
                console.error('Failed to save High/Critical alert to Detections:', detError);
            }
        }

        
        if (alertStatus === 'resolved') {
            const resolvedIncident = {
                originalDetectionId: detectionId, 
                ruleName: title,
                ruleCategory: source || 'Alert',
                severity: severity, 
                description: description,
                eventIds: evtId ? [evtId] : [],
                srcIp: null,
                username: null,
                detectionTimestamp: new Date(),
                metadata: { source: 'Log Incident', originalEventId: evtId },
                resolutionNotes: 'Resolved directly from logs',
                resolvedBy: 'User',
                resolvedAt: new Date()
            };

            const resolvedId = await resolvedDb.insertResolved(resolvedIncident);
            console.log('Log incident saved to Resolved table:', resolvedId);

            return {
                success: true,
                alertId: resolvedId, 
                isResolved: true
            };
        }

        const insertQuery = `
      INSERT INTO "Alert" ("Timestamp", "Severity", "Status", "Title", "Description", "Source", "Event_Id", "Detection_Id")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING "ALERT_ID"
    `;

        const result = await clientDb.query(insertQuery, [
            new Date(),
            severityNum,
            alertStatus,
            title,
            description,
            source,
            evtId,
            detectionId
        ]);

        console.log('Alert saved:', result.rows[0].ALERT_ID);

        return {
            success: true,
            alertId: result.rows[0].ALERT_ID
        };

    } catch (error) {
        console.error('Save alert failed:', error);
        throw error;
    }
}

async function getAlerts(options = {}) {
    try {
        const status = options.status || (typeof options === 'string' ? options : null);
        const limit = options.limit;
        const offset = options.offset;

        let query = `
      SELECT "ALERT_ID", "Event_Id", "Detection_Id", "Timestamp", CAST("Severity" AS INTEGER) as "Severity", "Status", "Title", "Description", "Source", "Stage_Checks", "Review_Notes"
      FROM "Alert"
    `;

        const params = [];
        if (status) {
            query += ` WHERE "Status" = $1`;
            params.push(status);
        }

        query += ` ORDER BY "Timestamp" DESC`;

        if (limit) {
            query += ` LIMIT $${params.length + 1}`;
            params.push(limit);
        }

        if (offset) {
            query += ` OFFSET $${params.length + 1}`;
            params.push(offset);
        }

        const result = await clientDb.query(query, params);
    
    return result.rows;
  } catch (error) {
        console.error('Fetch alerts failed:', error);
        throw error;
    }
}

async function updateAlertStatus(id, status) {
    try {
        console.log(`Updating alert ${id} to ${status}`);

        
        if (status === 'resolved') {
            
            const fetchQuery = `
                SELECT * FROM "Alert" WHERE "ALERT_ID" = $1
            `;
            const alertRes = await clientDb.query(fetchQuery, [id]);

            if (alertRes.rows.length > 0) {
                const alert = alertRes.rows[0];

                
                const resolvedIncident = {
                    originalDetectionId: alert.Detection_Id || null, 
                    ruleName: alert.Title,
                    ruleCategory: alert.Source || 'Alert',
                    severity: mapNumberToSeverity(alert.Severity), 
                    description: alert.Description,
                    eventIds: alert.Event_Id ? [alert.Event_Id] : [],
                    srcIp: null, 
                    username: null,
                    detectionTimestamp: alert.Timestamp,
                    metadata: { source: 'Alert System', originalAlertId: alert.ALERT_ID, stageChecks: alert.Stage_Checks, reviewNotes: alert.Review_Notes },
                    resolutionNotes: alert.Review_Notes || 'Resolved via Admin Panel',
                    resolvedBy: 'Admin', 
                    resolvedAt: new Date()
                };

                try {
                    await resolvedDb.insertResolved(resolvedIncident);
                    console.log(`Alert ${id} added to Resolved table`);

                    
                    const deleteQuery = `DELETE FROM "Alert" WHERE "ALERT_ID" = $1`;
                    await clientDb.query(deleteQuery, [id]);
                    console.log(`Alert ${id} deleted from Alert table`);

                    return { ALERT_ID: id, Status: 'resolved', movedToResolved: true };
                } catch (error_) {
                    console.error('Failed to move to Resolved table:', error_);
                    throw error_;
                }
            } else {
                console.log(`Alert ${id} not found`);
                return null;
            }
        }

        const query = `
            UPDATE "Alert"
            SET "Status" = $1
            WHERE "ALERT_ID" = $2
            RETURNING "ALERT_ID", "Status"
        `;
        const result = await clientDb.query(query, [status, id]);

        if (result.rows.length === 0) {
            console.log(`Alert ${id} not found`);
            return null;
        }

        console.log(`Alert ${id} updated`);
        return result.rows[0];
    } catch (error) {
        console.error('Update alert status failed:', error);
        throw error;
    }
}

async function updateAlertDetails(id, stageChecks, reviewNotes) {
    try {
        console.log(`Updating alert details for ${id}`);
        const query = `
            UPDATE "Alert"
            SET "Stage_Checks" = $1, "Review_Notes" = $2
            WHERE "ALERT_ID" = $3
            RETURNING "ALERT_ID", "Stage_Checks", "Review_Notes"
        `;

        
        const checks = Array.isArray(stageChecks) ? JSON.stringify(stageChecks) : stageChecks;

        const result = await clientDb.query(query, [checks, reviewNotes, id]);

        if (result.rows.length === 0) {
            console.log(`Alert ${id} not found`);
            return null;
        }

        console.log(`Alert details updated for ${id}`);
        return result.rows[0];
    } catch (error) {
        console.error('Update alert details failed:', error);
        throw error;
    }
}

async function deleteAlert(id) {
    try {
        console.log(`Deleting alert ${id}`);
        const query = `
            DELETE FROM "Alert"
            WHERE "ALERT_ID" = $1
            RETURNING "ALERT_ID"
        `;
        const result = await clientDb.query(query, [id]);

        if (result.rows.length === 0) {
            console.log(`Alert ${id} not found`);
            return null;
        }

        console.log(`Alert ${id} deleted`);
        return result.rows[0];
    } catch (error) {
        console.error('Delete alert failed:', error);
        throw error;
    }
}

async function deleteAllAlerts(status) {
    try {
        let query = `DELETE FROM "Alert"`;
        const params = [];

        if (status) {
            query += ` WHERE "Status" = $1`;
            params.push(status);
            console.log(`Deleting all alerts with status: ${status}`);
        } else {
            console.log('Deleting ALL alerts');
        }

        const result = await clientDb.query(query, params);
        console.log(`Deleted ${result.rowCount} alerts`);
        return result.rowCount;
    } catch (error) {
        console.error('Delete all alerts failed:', error);
        throw error;
    }
}

module.exports = {
    saveAlert,
    getAlerts,
    updateAlertStatus,
    updateAlertDetails,
    deleteAlert,
    deleteAllAlerts
};
