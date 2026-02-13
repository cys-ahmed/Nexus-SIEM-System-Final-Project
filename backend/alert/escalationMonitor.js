const clientDb = require('../database/clientDb');


const THRESHOLDS = {
    4: 30 * 60 * 1000,
    3: 60 * 60 * 1000,
    2: 5 * 60 * 60 * 1000,
    1: 24 * 60 * 60 * 1000
};


const RE_ESCALATION_DELAY = 60 * 60 * 1000;

async function checkEscalations() {
    console.log('Running incident escalation check...');
    try {

        const query = `
            SELECT "ALERT_ID", "Title", "Severity", "Timestamp", "last_escalated_at", "Source", "Description"
            FROM "Alert"
            WHERE "Status" = 'active'
        `;
        const result = await clientDb.query(query);
        const alerts = result.rows;

        const now = new Date();

        for (const alert of alerts) {
            const severity = Number.parseInt(alert.Severity, 10);
            const threshold = THRESHOLDS[severity];

            if (!threshold) continue;

            const duration = now - new Date(alert.Timestamp);
            const lastEscalated = alert.last_escalated_at ? new Date(alert.last_escalated_at) : null;


            if (duration > threshold) {

                const shouldEscalate = !lastEscalated || (now - lastEscalated > RE_ESCALATION_DELAY);

                if (shouldEscalate) {
                    await escalateIncident(alert, duration);
                }
            }
        }
    } catch (error) {
        console.error('Escalation check failed:', error);
    }
}

async function escalateIncident(alert, durationMs) {
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const durationStr = `${hours}h ${minutes}m`;

    console.log(`Escalating incident ${alert.ALERT_ID} (${durationStr})`);

    try {

        const message = `Incident "${alert.Title}" has been active for ${durationStr}. Immediate attention required.`;

        await clientDb.query(`
            INSERT INTO "Notifications" 
            ("message", "type", "title", "source", "severity", "created_at", "alert_id", "stage")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            message,
            'escalation',
            `Escalation: ${alert.Title}`,
            'System Monitor',
            'critical',
            new Date(),
            alert.ALERT_ID,
            'Escalated'
        ]);


        await clientDb.query(`
            UPDATE "Alert"
            SET "last_escalated_at" = $1
            WHERE "ALERT_ID" = $2
        `, [new Date(), alert.ALERT_ID]);

    } catch (error) {
        console.error(`Failed to escalate incident ${alert.ALERT_ID}:`, error);
    }
}

let intervalId = null;

function startMonitor(intervalMs = 60000) {
    if (intervalId) return;
    checkEscalations();
    intervalId = setInterval(checkEscalations, intervalMs);
    console.log(`Escalation monitor started (interval: ${intervalMs}ms)`);
}

function stopMonitor() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        console.log('Escalation monitor stopped');
    }
}

module.exports = {
    startMonitor,
    stopMonitor,
    checkEscalations
};
