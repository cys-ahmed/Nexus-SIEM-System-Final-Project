const NormalizationManager = require('../analysis/normalization/NormalizationManager');
const RuleEngine = require('../analysis/rule-analysis/RuleEngine');
const LogDatabase = require('../database/logDatabase');
const LogSourceDb = require('./logDb');
const clientDb = require('../database/clientDb');

class SyncManager {
    constructor() {
        this.logDatabase = new LogDatabase();
        this.logSourceDb = new LogSourceDb();
        this.ruleEngine = new RuleEngine();
        this.syncInterval = null;
        this.lastSyncedId = null;
        this.lastSyncTime = null;
        this.isRunning = false;
        this.intervalMs = process.env.SYNC_INTERVAL_MS || 30000; 
    }

    
    async init() {
        try {
            await this.logDatabase.init();
            await this.ruleEngine.init();
            console.log('SyncManager initialized');
        } catch (error) {
            console.error('Init failed:', error);
            throw error;
        }
    }

    
    startPeriodicSync(intervalMs = null) {
        if (this.isRunning) {
            console.log('Sync already running');
            return;
        }

        if (intervalMs) {
            this.intervalMs = intervalMs;
        }

        console.log(`Sync started (${this.intervalMs}ms)`);

        
        this.syncNow().catch(err => {
            console.error('Initial sync failed:', err);
        });

        
        this.syncInterval = setInterval(() => {
            this.syncNow().catch(err => {
                console.error('Periodic sync failed:', err);
            });
        }, this.intervalMs);

        this.isRunning = true;
    }

    
    stopPeriodicSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            this.isRunning = false;
            console.log('Sync stopped');
        }
    }

    async syncDevice(log) {
        const deviceId = log.Dev_id;
        if (!deviceId) return;

        try {
            const deviceCheck = await clientDb.query(
                'SELECT "Device_Id" FROM "Devices" WHERE "Device_Id" = $1',
                [deviceId]
            );

            if (deviceCheck.rows.length === 0) {
                console.log(`Syncing new device: ${deviceId}`);
                await clientDb.query(
                    `INSERT INTO "Devices" ("Device_Id", "Device_type", "Ip_Address", "Status") 
                     VALUES ($1, $2, $3, $4)`,
                    [
                        deviceId,
                        log.Device_type || 'server',
                        log.Ip_Address || '127.0.0.1',
                        log.Device_Status || 'active'
                    ]
                );
            }
        } catch (error_) {
            console.error(`Error syncing device ${deviceId}:`, error_);
        }
    }

    async syncLogEntry(log) {
        const clientLogId = log.log_id;
        try {
            const logCheck = await clientDb.query(
                'SELECT "Log_ID" FROM "Logs" WHERE "Log_ID" = $1',
                [clientLogId]
            );

            if (logCheck.rows.length === 0) {
                console.log(`Inserting log ${clientLogId} into Logs table...`);
                await clientDb.query(
                    `INSERT INTO "Logs" ("Log_ID", "Log_Type", "Status", "Timestamp") 
                     VALUES ($1, $2, $3, $4)`,
                    [
                        clientLogId,
                        log.log_type || 'syslog',
                        null,
                        new Date()
                    ]
                );
            }
        } catch (error_) {
            console.error(`Error inserting into client Logs table:`, error_);
        }
    }

    processLogContent(log) {
        const content = log.logfile;
        if (!content) {
            console.warn(`No content found in log record: ${log.log_id}`);
            return [];
        }

        try {
            const decoded = this.logSourceDb.decodeLogfile(content);
            const clientLogId = log.log_id;
            const deviceId = log.Dev_id;

            
            let deviceType = log.Device_type;
            if (deviceType === 'localhost' || deviceType === 'remote-server') {
                deviceType = 'linux';
            }

            const normalizer = NormalizationManager.getNormalizer(log.log_type, deviceType);

            let parsedLogs = [];

            if (normalizer) {
                
                const lines = decoded.split('\n');
                for (const line of lines) {
                    const parsed = normalizer.normalize(line);
                    if (parsed) {
                        parsedLogs.push(parsed);
                    }
                }
            } else {
                console.warn(`No normalizer found for ${log.log_type}/${log.Device_type}. Skipping.`);
            }

            
            parsedLogs.forEach(p => {
                p.log_id = clientLogId;
                p.dev_id = deviceId;
            });

            console.log(`✓ Parsed ${parsedLogs.length} entries from log file (ID: ${clientLogId})`);
            return parsedLogs;

        } catch (error) {
            console.error(`Error processing log file ${log.log_id}:`, error);
            return [];
        }
    }

    
    async syncNow() {
        try {
            console.log('Sync starting...');

            
            const sourceLogs = await this.logSourceDb.getAllLogs();

            if (!sourceLogs || sourceLogs.length === 0) {
                console.log('No logs found');
                return 0;
            }

            console.log(`Logs found: ${sourceLogs.length}`);

            const allParsedLogs = [];
            let processedCount = 0;

            for (const log of sourceLogs) {
                await this.syncDevice(log);
                await this.syncLogEntry(log);

                const parsedLogs = this.processLogContent(log);
                if (parsedLogs.length > 0) {
                    allParsedLogs.push(...parsedLogs);
                    processedCount++;

                    
                    if (log.log_id > (this.lastSyncedId || 0)) {
                        this.lastSyncedId = log.log_id;
                    }
                }
            }

            
            if (allParsedLogs.length > 0) {
                console.log(`📝 Inserting ${allParsedLogs.length} parsed log entries into EVENT table...`);
                await this.logDatabase.replaceLogs(allParsedLogs);

                
                try {
                    const detections = await this.ruleEngine.analyzeBatch(allParsedLogs);
                    if (detections.length > 0) {
                        console.log(`🚨 Rule Engine: Detected ${detections.length} security threats`);
                    }
                } catch (ruleError) {
                    console.error('⚠️  Error running rule analysis:', ruleError.message);
                }

                this.lastSyncTime = new Date();
                console.log(`✅ Sync complete! Processed ${processedCount} log files, ${allParsedLogs.length} total entries`);
                return allParsedLogs.length;
            }

            this.lastSyncTime = new Date();
            console.log(`✅ Sync complete! Processed ${processedCount} log files, no new entries to insert`);
            return 0;
        } catch (error) {
            console.error('❌ Error in syncNow:', error);
            throw error;
        }
    }

    
    getStatus() {
        return {
            isRunning: this.isRunning,
            intervalMs: this.intervalMs,
            lastSyncedId: this.lastSyncedId,
            lastSyncTime: this.lastSyncTime
        };
    }

    
    getLastSyncedId() {
        return this.lastSyncedId;
    }
}

module.exports = SyncManager;
