
const clientDb = require('../database/clientDb');

const SEVERITY_THRESHOLDS = {
    4: 30 * 60 * 1000,
    3: 60 * 60 * 1000,
    2: 5 * 60 * 60 * 1000,
    1: 24 * 60 * 60 * 1000
};

const SEVERITY_MAP_INT_TO_STR = {
    4: 'critical',
    3: 'high',
    2: 'medium',
    1: 'low'
};

async function processAlert(alert, now) {
    const created = new Date(alert.Timestamp).getTime();
    const diff = now - created;
    const severity = alert.Severity;
    const threshold = SEVERITY_THRESHOLDS[severity] || SEVERITY_THRESHOLDS[2];

    if (diff <= threshold) return false;

    console.log(`Escalating alert ${alert.ALERT_ID}: Severity ${severity}, Age ${(diff / 60000).toFixed(1)}m > ${(threshold / 60000).toFixed(1)}m`);

    const recovery = calculateRecovery(alert.Stage_Checks);
    const severityStr = SEVERITY_MAP_INT_TO_STR[severity] || 'medium';

    await createEscalationNotification(alert, threshold, severityStr, recovery);
    await updateAlertEscalated(alert.ALERT_ID);

    return true;
}

function calculateRecovery(checks) {
    let recovery = 0;
    if (Array.isArray(checks)) {
        recovery = Math.min(100, checks.length * 25);
    } else if (typeof checks === 'string') {
        try {
            const parsed = JSON.parse(checks);
            if (Array.isArray(parsed)) recovery = Math.min(100, parsed.length * 25);
        } catch (e) {
            console.error('Error parsing checks:', e);
        }
    }
    return recovery;
}

async function createEscalationNotification(alert, threshold, severityStr, recovery) {
    const notifQuery = `
        INSERT INTO "Notifications" ("message", "type", "title", "source", "severity", "recovery", "created_at", "alert_id")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    await clientDb.query(notifQuery, [
        `Incident "${alert.Title}" has been active for over ${(threshold / 3600000).toFixed(1)} hours. Please investigate.`,
        'escalation',
        `Escalation: ${alert.Title}`,
        alert.Source || 'System',
        severityStr,
        recovery,
        new Date(),
        alert.ALERT_ID
    ]);
}

async function updateAlertEscalated(alertId) {
    await clientDb.query(`
        UPDATE "Alert" SET "last_escalated_at" = $1 WHERE "ALERT_ID" = $2
    `, [new Date(), alertId]);
}

async function monitorIncidents() {
    try {
        const query = `
            SELECT * FROM "Alert"
            WHERE "Status" != 'resolved'
            AND "last_escalated_at" IS NULL
        `;
        const result = await clientDb.query(query);
        const alerts = result.rows;

        if (alerts.length === 0) return;

        const now = Date.now();
        let escalatedCount = 0;

        for (const alert of alerts) {
            if (await processAlert(alert, now)) {
                escalatedCount++;
            }
        }

        if (escalatedCount > 0) {
            console.log(`Monitor: Escalated ${escalatedCount} incidents.`);
        }

    } catch (error) {
        console.error('Monitor incidents failed:', error);
    }
}

function startMonitor() {

    monitorIncidents();

    setInterval(monitorIncidents, 60 * 1000);
    console.log('Incident monitor started (interval: 60s)');
}

module.exports = { startMonitor };
