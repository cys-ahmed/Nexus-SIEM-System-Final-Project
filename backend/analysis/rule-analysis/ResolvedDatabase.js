const clientDb = require('../../database/clientDb');

class ResolvedDatabase {
    tableName = 'Resolved';

    
    async init() {
        try {
            
            await clientDb.query(`
                CREATE TABLE IF NOT EXISTS "${this.tableName}" (
                    "Resolved_Id" BIGSERIAL PRIMARY KEY,
                    "Original_Detection_Id" BIGINT,
                    "Rule_Name" VARCHAR(255) NOT NULL,
                    "Rule_Category" VARCHAR(100) NOT NULL,
                    "Severity" VARCHAR(50) NOT NULL,
                    "Description" TEXT NOT NULL,
                    "Event_Ids" BIGINT[] NOT NULL,
                    "Src_Ip" INET,
                    "Username" VARCHAR(255),
                    "Detection_Timestamp" TIMESTAMP NOT NULL,
                    "Metadata" JSONB,
                    "Resolved_At" TIMESTAMP DEFAULT NOW(),
                    "Resolution_Notes" TEXT,
                    "Resolved_By" VARCHAR(255)
                )
            `);

            
            await clientDb.query(`
                CREATE INDEX IF NOT EXISTS idx_resolved_timestamp 
                ON "${this.tableName}" ("Resolved_At" DESC)
            `);

            await clientDb.query(`
                CREATE INDEX IF NOT EXISTS idx_resolved_severity 
                ON "${this.tableName}" ("Severity")
            `);

            console.log('Resolved table initialized successfully');
        } catch (error) {
            console.error('Error initializing Resolved table:', error);
            throw error;
        }
    }

    
    async insertResolved(incident) {
        try {
            const query = `
                INSERT INTO "${this.tableName}" 
                ("Original_Detection_Id", "Rule_Name", "Rule_Category", "Severity", "Description", 
                 "Event_Ids", "Src_Ip", "Username", "Detection_Timestamp", "Metadata", 
                 "Resolution_Notes", "Resolved_By", "Resolved_At")
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING "Resolved_Id"
            `;

            const values = [
                incident.originalDetectionId || null,
                incident.ruleName,
                incident.ruleCategory,
                incident.severity,
                incident.description,
                incident.eventIds || [],
                incident.srcIp || null,
                incident.username || null,
                incident.detectionTimestamp || new Date(),
                JSON.stringify(incident.metadata || {}),
                incident.resolutionNotes || null,
                incident.resolvedBy || 'System',
                incident.resolvedAt || new Date()
            ];

            const result = await clientDb.query(query, values);
            return result.rows[0].Resolved_Id;
        } catch (error) {
            console.error('Insert resolved incident failed:', error);
            throw error;
        }
    }

    
    async getResolvedIncidents(filters = {}) {
        try {
            let query = `SELECT * FROM "${this.tableName}" WHERE 1=1`;
            const values = [];
            let paramCount = 1;

            if (filters.severity) {
                query += ` AND "Severity" = $${paramCount++}`;
                values.push(filters.severity);
            }

            if (filters.srcIp) {
                query += ` AND "Src_Ip" = $${paramCount++}`;
                values.push(filters.srcIp);
            }

            if (filters.limit) {
                query += ` LIMIT $${paramCount++}`;
                values.push(filters.limit);
            }

            if (filters.offset) {
                query += ` OFFSET $${paramCount++}`;
                values.push(filters.offset);
            }

            const result = await clientDb.query(query, values);
            return result.rows;
        } catch (error) {
            console.error('Get resolved incidents failed:', error);
            throw error;
        }
    }

    
    async deleteResolved(id) {
        try {
            const query = `DELETE FROM "${this.tableName}" WHERE "Resolved_Id" = $1 RETURNING "Resolved_Id"`;
            const result = await clientDb.query(query, [id]);
            return result.rowCount > 0;
        } catch (error) {
            console.error('Delete resolved incident failed:', error);
            throw error;
        }
    }

    
    async deleteAllResolved() {
        try {
            const query = `DELETE FROM "${this.tableName}"`;
            const result = await clientDb.query(query);
            return result.rowCount;
        } catch (error) {
            console.error('Delete all resolved incidents failed:', error);
            throw error;
        }
    }
}

module.exports = ResolvedDatabase;
