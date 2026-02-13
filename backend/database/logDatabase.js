const clientDb = require('./clientDb');

function isValidIP(str) {
  if (!str) return false;
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(str)) return false;
  const parts = str.split('.');
  return parts.every(part => {
    const num = Number.parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
}

class LogDatabase {
  async init() {
    try {
      await clientDb.testConnection();
      await clientDb.inspectSchema();
      console.log('Using existing EVENT table for log storage');
      await clientDb.inspectSchema();
    } catch (err) {
      console.error('Error initializing database:', err);
      throw err;
    }
  }

  _getSeverityNum(severity) {
    if (severity === 'ERROR' || severity === 'CRITICAL') return 3;
    if (severity === 'WARNING') return 2;
    return 1;
  }

  _prepareLogParams(log, id) {
    const severityNum = this._getSeverityNum(log.severity);
    const eventTimestamp = this._parseEventTimestamp(log.timestamp || log.event_time || log.time);
    let validSrcIp;
    if (isValidIP(log.src_ip)) {
      validSrcIp = log.src_ip;
    } else if (isValidIP(log.ip)) {
      validSrcIp = log.ip;
    } else {
      validSrcIp = '0.0.0.0';
    }
    const validDestIp = log.dest_ip && isValidIP(log.dest_ip) ? log.dest_ip : null;

    return [
      id,
      eventTimestamp,
      severityNum,
      log.message,
      log.event_type || log.source || 'system',
      validSrcIp,
      log.dev_id || 'default',
      log.log_id,
      new Date(),
      log.source_service || '',
      log.source_process || '',
      log.source_process_id || 0,
      log.source_module || '',
      log.hostname || null,
      validDestIp
    ];
  }

  _parseEventTimestamp(ts) {
    try {
      if (!ts) return new Date();
      if (typeof ts === 'string') {
        const isoLike = ts.trim();
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(isoLike)) {
          return new Date(isoLike);
        }
        if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(isoLike)) {
          return new Date(isoLike.replace(' ', 'T'));
        }
        const d = new Date(isoLike);
        if (!Number.isNaN(d.getTime())) return d;
        return new Date();
      }
      if (ts instanceof Date && !Number.isNaN(ts.getTime())) {
        return ts;
      }
      return new Date();
    } catch {
      return new Date();
    }
  }

  _getSeverityString(severity) {
    if (severity >= 3) return 'ERROR';
    if (severity >= 2) return 'WARNING';
    return 'INFO';
  }

  async insertLogs(logs) {
    if (!logs || logs.length === 0) return;

    const client = await clientDb.pool.connect();
    try {
      await client.query('BEGIN');

      const maxIdResult = await client.query('SELECT COALESCE(MAX("Event_Id"), 0) as max_id FROM "EVENT"');
      let nextId = Number.parseInt(maxIdResult.rows[0].max_id, 10) + 1;

      const queryText = `INSERT INTO "EVENT"("Event_Id", "Timestamp", "Severity", "Description ", "Event_type", "Src_ip", "Dev_id", "log_id", "ingestion_timestamp", "source_service", "source_process", "source_process_id", "source_module", "Hostname", "Dest_ip") 
                         VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`;

      for (const log of logs) {
        await client.query(queryText, this._prepareLogParams(log, nextId++));
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('Error inserting logs:', e);
      throw e;
    } finally {
      client.release();
    }
  }

  async replaceLogs(logs) {
    const client = await clientDb.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('TRUNCATE "EVENT" RESTART IDENTITY CASCADE');

      if (logs && logs.length > 0) {
        let eventId = 1;
        const queryText = `INSERT INTO "EVENT"("Event_Id", "Timestamp", "Severity", "Description ", "Event_type", "Src_ip", "Dev_id", "log_id", "ingestion_timestamp", "source_service", "source_process", "source_process_id", "source_module", "Hostname", "Dest_ip") 
                           VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`;

        for (const log of logs) {
          await client.query(queryText, this._prepareLogParams(log, eventId++));
        }
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('Error replacing logs:', e);
      throw e;
    } finally {
      client.release();
    }
  }

  _getDateTimeFilter(dateTime) {
    if (dateTime === 'realtime') return '1 minute';
    if (dateTime === '5m') return '5 minutes';
    if (dateTime === '30m') return '30 minutes';
    if (dateTime === '1h') return '60 minutes';
    return null;
  }

  _buildQuery(filters) {
    let query = `
      SELECT 
        e."Event_Id" as id, 
        e."Timestamp" as timestamp, 
        e."ingestion_timestamp" as ingestion_timestamp,
        e."Severity" as severity, 
        e."Hostname" as source, 
        e."Event_type" as log_type,
        e."Description " as message, 
        d."Ip_Address" as ip,
        EXTRACT(EPOCH FROM (NOW() - e."ingestion_timestamp")) as seconds_ago
      FROM "EVENT" e
      LEFT JOIN "Devices" d ON e."Dev_id" = d."Device_Id"
      WHERE 1=1
    `;
    const params = [];

    query = this._applyIpFilter(query, params, filters.ip);
    query = this._applyStandardFilters(query, params, filters);
    query = this._applyDateFilters(query, params, filters);

    query += ' ORDER BY e."ingestion_timestamp" DESC';
    query = this._applyPagination(query, params, filters);

    return { query, params };
  }

  _applyIpFilter(query, params, ip) {
    if (ip && ip !== 'any') {
      const pCount = params.length + 1;
      query += ` AND (d."Ip_Address" = $${pCount} OR e."Src_ip" = $${pCount + 1} OR e."Dest_ip" = $${pCount + 2} OR e."Description " LIKE $${pCount + 3})`;
      params.push(ip, ip, ip, `%${ip}%`);
    }
    return query;
  }

  _applyStandardFilters(query, params, filters) {
    if (filters.severity && filters.severity !== 'any') {
      query += ` AND e."Severity" = $${params.length + 1}`;
      params.push(this._getSeverityNum(filters.severity));
    }
    if (filters.source && filters.source !== 'any') {
      query += ` AND e."Hostname" = $${params.length + 1}`;
      params.push(filters.source);
    }
    if (filters.logType && filters.logType !== 'any') {
      query += ` AND e."Event_type" = $${params.length + 1}`;
      params.push(filters.logType);
    }
    return query;
  }

  _applyDateFilters(query, params, filters) {
    if (filters.dateTime && filters.dateTime !== 'any') {
      const interval = this._getDateTimeFilter(filters.dateTime);
      if (interval) {
        query += ` AND e."Timestamp" >= NOW() - INTERVAL '${interval}'`;
      }
    }
    if (filters.startDate) {
      query += ` AND e."Timestamp" >= $${params.length + 1}`;
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      query += ` AND e."Timestamp" <= $${params.length + 1}`;
      params.push(filters.endDate);
    }
    return query;
  }

  _applyPagination(query, params, filters) {
    if (filters.limit) {
      query += ` LIMIT $${params.length + 1}`;
      params.push(filters.limit);
    }
    if (filters.offset) {
      query += ` OFFSET $${params.length + 1}`;
      params.push(filters.offset);
    }
    return query;
  }

  async getLogs(filters = {}) {
    const { query, params } = this._buildQuery(filters);
    console.log('getLogs query:', query);
    console.log('getLogs params:', params);

    try {
      const res = await clientDb.query(query, params);

      return res.rows.map(r => ({
        ...r,
        severity: this._getSeverityString(r.severity)
      }));
    } catch (err) {
      console.error('Error fetching logs:', err);
      throw err;
    }
  }

  async getFilterOptions() {
    try {
      const sourcesRes = await clientDb.query('SELECT DISTINCT "Hostname" as hostname FROM "EVENT" WHERE "Hostname" IS NOT NULL ORDER BY "Hostname"');
      const ipsRes = await clientDb.query('SELECT DISTINCT d."Ip_Address" as ip_address FROM "Devices" d JOIN "EVENT" e ON d."Device_Id" = e."Dev_id" WHERE d."Ip_Address" IS NOT NULL ORDER BY d."Ip_Address"');
      const logTypesRes = await clientDb.query('SELECT DISTINCT "Event_type" as event_type FROM "EVENT" WHERE "Event_type" IS NOT NULL ORDER BY "Event_type"');

      return {
        sources: sourcesRes.rows.map(r => r.hostname).filter(s => s != null && String(s).trim() !== ''),
        severities: ['INFO', 'WARNING', 'ERROR'],
        ips: ipsRes.rows.map(r => r.ip_address).filter(ip => ip != null && String(ip).trim() !== ''),
        logTypes: logTypesRes.rows.map(r => r.event_type).filter(t => t != null && String(t).trim() !== '')
      };
    } catch (err) {
      console.error('Error getting filter options:', err);
      return { sources: [], severities: [], ips: [], logTypes: [] };
    }
  }

  async getStats() {
    try {
      const totalRes = await clientDb.query('SELECT COUNT(*) as count FROM "EVENT"');
      const severityRes = await clientDb.query('SELECT "Severity", COUNT(*) as count FROM "EVENT" GROUP BY "Severity"');
      const sourceRes = await clientDb.query('SELECT "Event_type", COUNT(*) as count FROM "EVENT" GROUP BY "Event_type"');
      const ipRes = await clientDb.query('SELECT "Src_ip", COUNT(*) as count FROM "EVENT" WHERE "Src_ip" IS NOT NULL GROUP BY "Src_ip"');

      const stats = {
        total: Number.parseInt(totalRes.rows[0].count, 10),
        bySeverity: {},
        bySource: {},
        byIP: {}
      };

      severityRes.rows.forEach(row => {
        const sevStr = this._getSeverityString(row.severity);
        stats.bySeverity[sevStr] = Number.parseInt(row.count, 10);
      });
      sourceRes.rows.forEach(row => stats.bySource[row.event_type] = Number.parseInt(row.count, 10));
      ipRes.rows.forEach(row => stats.byIP[row.src_ip] = Number.parseInt(row.count, 10));

      return stats;
    } catch (err) {
      console.error('Error getting stats:', err);
      return { total: 0, bySeverity: {}, bySource: {}, byIP: {} };
    }
  }

  async clear() {
    try {
      await clientDb.query('TRUNCATE "EVENT" RESTART IDENTITY CASCADE');
    } catch (err) {
      console.error('Error clearing logs:', err);
    }
  }
}

module.exports = LogDatabase;
