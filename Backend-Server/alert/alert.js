const emailService = require('../utils/emailService.js');
const alertDatabase = require('./alertDatabase');
const clientDb = require('../database/clientDb');

async function createAlert(alertData) {
    const { title, description, severity, source, eventId, status } = alertData;

    try {
        const emailResult = await emailService.sendAlertEmail({
            title,
            description,
            severity,
            source
        });

        const dbResult = await alertDatabase.saveAlert({
            severity,
            title,
            description,
            source,
            eventId,
            status
        });


        try {
            const query = `
              INSERT INTO "Notifications" ("message", "type", "title", "source", "severity", "created_at", "alert_id")
              VALUES ($1, $2, $3, $4, $5, $6, $7)
            `;
            await clientDb.query(query, [
                description,
                'incident_report',
                title,
                source,
                severity,
                new Date(),
                dbResult.alertId
            ]);
            console.log('Notification created for alert:', dbResult.alertId);
        } catch (notifError) {
            console.error('Failed to create notification for alert:', notifError);
        }

        return {
            success: true,
            message: 'Alert created and email sent successfully',
            alertId: dbResult.alertId,
            emailId: emailResult.messageId,
            isResolved: dbResult.isResolved || false
        };

    } catch (error) {
        console.error('Alert creation failed:', error);
        throw error;
    }
}

async function getAlerts(status) {
    try {
        return await alertDatabase.getAlerts(status);
    } catch (error) {
        console.error('Fetch alerts failed:', error);
        throw error;
    }
}

async function updateAlertStatus(id, status) {
    try {
        return await alertDatabase.updateAlertStatus(id, status);
    } catch (error) {
        console.error('Update alert status failed:', error);
        throw error;
    }
}

async function updateAlertDetails(id, stageChecks, reviewNotes) {
    try {
        const result = await alertDatabase.updateAlertDetails(id, stageChecks, reviewNotes);


        if (result) {
            try {
                let recovery = 0;





                const checks = result.Stage_Checks;
                let checkCount = 0;

                if (Array.isArray(checks)) {
                    checkCount = checks.length;
                } else if (typeof checks === 'string') {
                    try {
                        const parsed = JSON.parse(checks);
                        if (Array.isArray(parsed)) checkCount = parsed.length;
                    } catch (e) {
                        console.error('Failed to parse checks JSON:', e);
                    }
                }


                recovery = Math.min(100, checkCount * 25);

                await clientDb.query(`
                    UPDATE "Notifications"
                    SET "recovery" = $1
                    WHERE "alert_id" = $2
                `, [recovery, id]);

                console.log(`Synced recovery (${recovery}%) to notifications for alert ${id}`);
            } catch (syncError) {
                console.error('Failed to sync notification recovery:', syncError);
            }
        }

        return result;
    } catch (error) {
        console.error('Update alert details failed:', error);
        throw error;
    }
}

async function deleteAlert(id) {
    try {
        return await alertDatabase.deleteAlert(id);
    } catch (error) {
        console.error('Delete alert failed:', error);
        throw error;
    }
}

async function deleteAllAlerts(status) {
    try {
        return await alertDatabase.deleteAllAlerts(status);
    } catch (error) {
        console.error('Delete all alerts failed:', error);
        throw error;
    }
}

module.exports = {
    createAlert,
    getAlerts,
    updateAlertStatus,
    updateAlertDetails,
    deleteAlert,
    deleteAllAlerts
};
