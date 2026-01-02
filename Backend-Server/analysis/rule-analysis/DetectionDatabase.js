const clientDb = require('../../database/clientDb');
const ResolvedDatabase = require('./ResolvedDatabase');

class DetectionDatabase {
    tableName = 'Detections';

    constructor() {
        this.resolvedDb = new ResolvedDatabase();
    }

    
    async init() {
        try {
            
            await this.resolvedDb.init();

            
            await clientDb.query(`
                CREATE TABLE IF NOT EXISTS "${this.tableName}" (
                    "Detection_Id" BIGSERIAL PRIMARY KEY,
                    "Rule_Name" VARCHAR(255) NOT NULL,
                    "Rule_Category" VARCHAR(100) NOT NULL,
                    "Severity" VARCHAR(50) NOT NULL,
                    "Description" TEXT NOT NULL,
                    "Event_Ids" BIGINT[] NOT NULL,
                    "Src_Ip" INET,
                    "Username" VARCHAR(255),
                    "Timestamp" TIMESTAMP NOT NULL DEFAULT NOW(),
                    "Metadata" JSONB,
                    "Status" VARCHAR(50) DEFAULT 'new',
                    "Created_At" TIMESTAMP DEFAULT NOW()
                )
            `);

            
            await clientDb.query(`
                CREATE INDEX IF NOT EXISTS idx_detections_timestamp 
                ON "${this.tableName}" ("Timestamp" DESC)
            `);

            await clientDb.query(`
                CREATE INDEX IF NOT EXISTS idx_detections_severity 
                ON "${this.tableName}" ("Severity")
            `);

            await clientDb.query(`
                CREATE INDEX IF NOT EXISTS idx_detections_status 
                ON "${this.tableName}" ("Status")
            `);

            await clientDb.query(`
                CREATE INDEX IF NOT EXISTS idx_detections_src_ip 
                ON "${this.tableName}" ("Src_Ip")
            `);

            console.log('Detections table initialized successfully');
        } catch (error) {
            console.error('Error initializing Detections table:', error);
            throw error;
        }
    }

    
    async insertDetection(detection) {
        try {
            const query = `
                INSERT INTO "${this.tableName}" 
                ("Rule_Name", "Rule_Category", "Severity", "Description", 
                 "Event_Ids", "Src_Ip", "Username", "Timestamp", "Metadata", "Status")
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING "Detection_Id"
            `;

            const values = [
                detection.ruleName,
                detection.ruleCategory,
                detection.severity,
                detection.description,
                detection.eventIds,
                detection.srcIp || null,
                detection.username || null,
                detection.timestamp || new Date(),
                JSON.stringify(detection.metadata || {}),
                detection.status || 'new'
            ];

            const result = await clientDb.query(query, values);
            return result.rows[0].Detection_Id;
        } catch (error) {
            console.error('Insert detection failed:', error);
            throw error;
        }
    }

    
    async getDetections(filters = {}) {
        try {
            let query = `SELECT * FROM "${this.tableName}" WHERE 1=1`;
            const values = [];
            let paramCount = 1;

            
            if (filters.severity) {
                query += ` AND "Severity" = $${paramCount}`;
                values.push(filters.severity);
                paramCount++;
            }

            if (filters.category) {
                query += ` AND "Rule_Category" = $${paramCount}`;
                values.push(filters.category);
                paramCount++;
            }

            if (filters.status) {
                query += ` AND "Status" = $${paramCount}`;
                values.push(filters.status);
                paramCount++;
            }

            if (filters.srcIp) {
                query += ` AND "Src_Ip" = $${paramCount}`;
                values.push(filters.srcIp);
                paramCount++;
            }

            if (filters.startDate) {
                query += ` AND "Timestamp" >= $${paramCount}`;
                values.push(filters.startDate);
                paramCount++;
            }

            if (filters.endDate) {
                query += ` AND "Timestamp" <= $${paramCount}`;
                values.push(filters.endDate);
                paramCount++;
            }

            if (filters.eventIds) {
                values.push(filters.eventIds);
                query += ` AND "Event_Ids" && $${paramCount++}`;
            }

            query += ` ORDER BY "Timestamp" DESC`;

            if (filters.limit) {
                values.push(Number.parseInt(filters.limit));
                query += ` LIMIT $${paramCount++}`;
            }

            if (filters.offset) {
                values.push(Number.parseInt(filters.offset));
                query += ` OFFSET $${paramCount++}`;
            }

            const result = await clientDb.query(query, values);
            return result.rows;
        } catch (error) {
            console.error('Fetch detections failed:', error);
            return [];
        }
    }

    
    async getDetectionById(detectionId) {
        try {
            const query = `SELECT * FROM "${this.tableName}" WHERE "Detection_Id" = $1`;
            const result = await clientDb.query(query, [detectionId]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error getting detection by ID:', error);
            throw error;
        }
    }

    
    async updateStatus(detectionId, status) {
        try {
            
            if (status === 'resolved') {
                try {
                    const detection = await this.getDetectionById(detectionId);
                    if (detection) {
                        const resolvedIncident = {
                            originalDetectionId: detection.Detection_Id,
                            ruleName: detection.Rule_Name,
                            ruleCategory: detection.Rule_Category,
                            severity: detection.Severity,
                            description: detection.Description,
                            eventIds: detection.Event_Ids,
                            srcIp: detection.Src_Ip,
                            username: detection.Username,
                            detectionTimestamp: detection.Timestamp,
                            metadata: detection.Metadata,
                            resolutionNotes: 'Resolved via Dashboard',
                            resolvedBy: 'Admin', 
                            resolvedAt: new Date()
                        };
                        await this.resolvedDb.insertResolved(resolvedIncident);
                        console.log('Detection copied to Resolved table:', detectionId);
                    }
                } catch (resolveError) {
                    console.error('Failed to copy detection to Resolved table:', resolveError);
                    
                }
            }

            const query = `
                UPDATE "${this.tableName}" 
                SET "Status" = $1 
                WHERE "Detection_Id" = $2
                RETURNING *
            `;
            const result = await clientDb.query(query, [status, detectionId]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error updating detection status:', error);
            throw error;
        }
    }

    
    async getStats(timeRange = 24) {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_detections,
                    COUNT(CASE WHEN "Severity" = 'HIGH' THEN 1 END) as high_severity,
                    COUNT(CASE WHEN "Severity" = 'MEDIUM' THEN 1 END) as medium_severity,
                    COUNT(CASE WHEN "Severity" = 'LOW' THEN 1 END) as low_severity,
                    COUNT(CASE WHEN "Status" = 'new' THEN 1 END) as new_detections,
                    COUNT(CASE WHEN "Status" = 'investigating' THEN 1 END) as investigating,
                    COUNT(CASE WHEN "Status" = 'resolved' THEN 1 END) as resolved,
                    "Rule_Category",
                    COUNT(*) as category_count
                FROM "${this.tableName}"
                WHERE "Timestamp" >= NOW() - INTERVAL '${timeRange} hours'
                GROUP BY "Rule_Category"
            `;

            const result = await clientDb.query(query);

            
            const stats = {
                total: 0,
                high: 0,
                medium: 0,
                low: 0,
                new: 0,
                investigating: 0,
                resolved: 0,
                byCategory: {}
            };

            result.rows.forEach(row => {
                stats.total += Number.parseInt(row.total_detections);
                stats.high += Number.parseInt(row.high_severity);
                stats.medium += Number.parseInt(row.medium_severity);
                stats.low += Number.parseInt(row.low_severity);
                stats.new += Number.parseInt(row.new_detections);
                stats.investigating += Number.parseInt(row.investigating);
                stats.resolved += Number.parseInt(row.resolved);
                stats.byCategory[row.Rule_Category] = Number.parseInt(row.category_count);
            });

            return stats;
        } catch (error) {
            console.error('Error getting detection stats:', error);
            throw error;
        }
    }

    
    async deleteOldDetections(daysOld = 90) {
        try {
            const query = `
                DELETE FROM "${this.tableName}" 
                WHERE "Timestamp" < NOW() - INTERVAL '${daysOld} days'
                AND "Status" = 'resolved'
            `;
            const result = await clientDb.query(query);
            return result.rowCount;
        } catch (error) {
            console.error('Error deleting old detections:', error);
            throw error;
        }
    }
}

module.exports = DetectionDatabase;
