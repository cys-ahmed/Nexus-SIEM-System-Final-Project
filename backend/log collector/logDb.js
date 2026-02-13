const serverDb = require('../database/serverDb');

class LogDb {
    async getAllLogs() {
        try {
            const query = `
                SELECT l.*, d."Device_type", d."Ip_Address", d."Status" as "Device_Status"
                FROM "Logs" l
                LEFT JOIN "Devices" d ON l."Dev_id" = d."Device_id"
            `;
            const result = await serverDb.query(query);

            console.log(`Logs retrieved: ${result.rows.length}`);
            return result.rows;
        } catch (error) {
            console.error('Fetch logs failed:', error);
            throw error;
        }
    }

    decodeLogfile(base64String) {
        try {
            if (!base64String) {
                throw new Error('No logfile content provided');
            }

            const decodedBuffer = Buffer.from(base64String, 'base64');
            const decodedText = decodedBuffer.toString('utf-8');

            return decodedText;
        } catch (error) {
            console.error('Decode log failed:', error);
            throw error;
        }
    }
}

module.exports = LogDb;
