const emailService = require('./emailService.js');
const alertDatabase = require('./alertDatabase');

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

        return {
            success: true,
            message: 'Alert created and email sent successfully',
            alertId: dbResult.alertId,
            emailId: emailResult.messageId
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
        return await alertDatabase.updateAlertDetails(id, stageChecks, reviewNotes);
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
    deleteAlert,
    deleteAllAlerts
};
