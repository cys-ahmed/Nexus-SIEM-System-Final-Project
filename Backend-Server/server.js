require('dotenv').config();
const path = require('node:path');
const fs = require('node:fs');

const fastifyOptions = { logger: true };

if (process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH) {
  try {
    fastifyOptions.https = {
      key: fs.readFileSync(process.env.SSL_KEY_PATH),
      cert: fs.readFileSync(process.env.SSL_CERT_PATH)
    };
  } catch (e) {
    console.warn('Failed to load SSL certificates:', e.message);
  }
}

const fastify = require('fastify')(fastifyOptions);
const cors = require('@fastify/cors');
const jwt = require('@fastify/jwt');

const LogDatabase = require('./database/logDatabase');
const LogSourceDb = require('./log collector/logDb');
const LogIngestor = require('./log collector/logIngestor');
const alertModule = require('./alert/alert');
const alertDatabase = require('./alert/alertDatabase');
const clientDb = require('./database/clientDb');
const authDb = require('./database/authDb');
const authRoutes = require('./auth');
const SyncManager = require('./log collector/syncManager');
const RuleEngine = require('./analysis/rule-analysis/RuleEngine');
const ResolvedDatabase = require('./analysis/rule-analysis/ResolvedDatabase');
const escalationMonitor = require('./alert/escalationMonitor');


const logDatabase = new LogDatabase();
const logSourceDb = new LogSourceDb();
const syncManager = new SyncManager();
const logIngestor = new LogIngestor();
const ruleEngine = new RuleEngine();
const resolvedDb = new ResolvedDatabase();

fastify.register(cors, {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

async function initializeServices() {
  try {
    await syncManager.init();
    console.log('Sync manager initialized');
    await ruleEngine.init();
    console.log('Rule engine initialized');
  } catch (error) {
    console.error('Service initialization failed:', error);
    throw error;
  }
}

fastify.get('/api/logs', async (request, reply) => {
  try {
    const filters = {
      ip: request.query.ip || 'any',
      severity: request.query.severity || 'any',
      source: request.query.source || 'any',
      logType: request.query.logType || 'any',
      dateTime: request.query.dateTime || 'any',
      startDate: request.query.startDate,
      endDate: request.query.endDate,
      limit: request.query.limit ? Number.parseInt(request.query.limit) : 50,
      offset: request.query.offset ? Number.parseInt(request.query.offset) : 0
    };

    const logs = await syncManager.logDatabase.getLogs(filters);

    return {
      success: true,
      count: logs.length,
      logs: logs,
      filters: filters
    };
  } catch (error) {
    reply.code(500);
    return {
      success: false,
      error: error.message
    };
  }
});


fastify.get('/api/logs/filter-options', async (_request, reply) => {
  try {
    const options = await syncManager.logDatabase.getFilterOptions();

    return {
      success: true,
      options: options
    };
  } catch (error) {
    reply.code(500);
    return {
      success: false,
      error: error.message
    };
  }
});


fastify.get('/api/logs/stats', async (request, reply) => {
  try {
    const stats = await syncManager.logDatabase.getStats();

    return {
      success: true,
      stats: stats
    };
  } catch (error) {
    reply.code(500);
    return {
      success: false,
      error: error.message
    };
  }
});


fastify.post('/api/logs/analyze', async (_request, reply) => {
  try {
    const count = await syncManager.syncNow();

    return {
      success: true,
      message: `Analyzed ${count} log entries from database`,
      count: count
    };
  } catch (error) {
    reply.code(500);
    return {
      success: false,
      error: error.message
    };
  }
});


fastify.post('/api/rules/analyze', async (_request, reply) => {
  try {

    if (!ruleEngine.initialized) {
      await ruleEngine.init();
    }


    const detections = await ruleEngine.analyzeBatch([]);

    return {
      success: true,
      message: `Analysis complete. Found ${detections.length} threats.`,
      count: detections.length,
      detections: detections
    };
  } catch (error) {
    reply.code(500);
    return {
      success: false,
      error: error.message
    };
  }
});

fastify.post('/api/logs/ingest/ssh', async (request, reply) => {
  try {
    await logIngestor.collectRemoteLogs();
    return {
      success: true,
      message: 'SSH Log Ingestion Triggered Successfully'
    };
  } catch (error) {
    console.error('SSH Ingest Error:', error);
    reply.code(500);
    return {
      success: false,
      error: error.message
    };
  }
});




fastify.post('/api/sync/trigger', async (request, reply) => {
  try {
    const newEntries = await syncManager.syncNow();

    return {
      success: true,
      message: `Synced ${newEntries} new log entries`,
      newEntries: newEntries,
      lastSyncedId: syncManager.getLastSyncedId()
    };
  } catch (error) {
    reply.code(500);
    return {
      success: false,
      error: error.message
    };
  }
});


fastify.get('/api/sync/status', async (_request, reply) => {
  try {
    const status = syncManager.getStatus();

    return {
      success: true,
      status: status
    };
  } catch (error) {
    reply.code(500);
    return {
      success: false,
      error: error.message
    };
  }
});




fastify.get('/api/detections', async (request, reply) => {
  try {
    const filters = {
      severity: request.query.severity || null,
      category: request.query.category || null,
      status: request.query.status || null,
      srcIp: request.query.srcIp || null,
      startDate: request.query.startDate || null,
      endDate: request.query.endDate || null,
      limit: request.query.limit ? Number.parseInt(request.query.limit) : 100
    };


    Object.keys(filters).forEach(key => filters[key] === null && delete filters[key]);

    const detections = await ruleEngine.detectionDb.getDetections(filters);

    return {
      success: true,
      count: detections.length,
      detections: detections
    };
  } catch (error) {
    reply.code(500);
    return {
      success: false,
      error: error.message
    };
  }
});


fastify.get('/api/detections/stats', async (request, reply) => {
  try {
    const RuleEngine = require('./analysis/rule-analysis/RuleEngine');
    const ruleEngine = new RuleEngine();
    await ruleEngine.init();

    const timeRange = request.query.hours ? Number.parseInt(request.query.hours) : 24;
    const stats = await ruleEngine.detectionDb.getStats(timeRange);

    return {
      success: true,
      timeRange: timeRange,
      stats: stats
    };
  } catch (error) {
    reply.code(500);
    return {
      success: false,
      error: error.message
    };
  }
});


fastify.get('/api/detections/:id', async (request, reply) => {
  try {
    const RuleEngine = require('./analysis/rule-analysis/RuleEngine');
    const ruleEngine = new RuleEngine();
    await ruleEngine.init();

    const detectionId = Number.parseInt(request.params.id);
    const detection = await ruleEngine.detectionDb.getDetectionById(detectionId);

    if (!detection) {
      reply.code(404);
      return {
        success: false,
        error: 'Detection not found'
      };
    }

    return {
      success: true,
      detection: detection
    };
  } catch (error) {
    reply.code(500);
    return {
      success: false,
      error: error.message
    };
  }
});


fastify.put('/api/detections/:id/status', async (request, reply) => {
  try {
    const RuleEngine = require('./analysis/rule-analysis/RuleEngine');
    const ruleEngine = new RuleEngine();
    await ruleEngine.init();

    const detectionId = Number.parseInt(request.params.id);
    const { status } = request.body;

    if (!status || !['new', 'investigating', 'resolved', 'false_positive'].includes(status)) {
      reply.code(400);
      return {
        success: false,
        error: 'Invalid status. Must be: new, investigating, resolved, or false_positive'
      };
    }

    const updated = await ruleEngine.detectionDb.updateStatus(detectionId, status);

    if (!updated) {
      reply.code(404);
      return {
        success: false,
        error: 'Detection not found'
      };
    }

    return {
      success: true,
      detection: updated
    };
  } catch (error) {
    reply.code(500);
    return {
      success: false,
      error: error.message
    };
  }
});


fastify.get('/api/resolved-incidents', async (request, reply) => {
  try {
    const filters = {
      severity: request.query.severity || null,
      limit: request.query.limit ? Number.parseInt(request.query.limit) : 100,
      offset: request.query.offset ? Number.parseInt(request.query.offset) : 0
    };


    Object.keys(filters).forEach(key => filters[key] === null && delete filters[key]);

    const incidents = await resolvedDb.getResolvedIncidents(filters);
    return {
      success: true,
      count: incidents.length,
      incidents: incidents
    };
  } catch (error) {
    reply.code(500);
    return {
      success: false,
      error: error.message
    };
  }
});

fastify.delete('/api/resolved-incidents/:id', async (request, reply) => {
  try {
    const { id } = request.params;
    const result = await resolvedDb.deleteResolved(id);

    if (!result) {
      reply.code(404);
      return { success: false, error: "Resolved incident not found" };
    }

    return { success: true, message: "Resolved incident deleted successfully" };
  } catch (error) {
    reply.code(500);
    return { success: false, error: error.message };
  }
});

fastify.delete('/api/resolved-incidents', async (request, reply) => {
  try {
    const count = await resolvedDb.deleteAllResolved();
    return {
      success: true,
      count: count,
      message: `Deleted ${count} resolved incidents`
    };
  } catch (error) {
    reply.code(500);
    return {
      success: false,
      error: error.message
    };
  }
});

fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production'
});


fastify.register(authRoutes, { prefix: '/api/auth' });





fastify.get('/health', async (request, reply) => {
  return { status: 'ok', message: 'Nexus Backend is running' };
});


fastify.post('/api/alerts', async (request, reply) => {
  try {
    const { title, description, severity, source, status, eventId } = request.body;

    if (!title || !description || !severity || !source) {
      reply.code(400);
      return {
        success: false,
        error: 'All fields are required: title, description, severity, source'
      };
    }

    const result = await alertModule.createAlert({
      title,
      description,
      severity,
      source,
      status,
      eventId
    });

    return result;
  } catch (error) {
    reply.code(500);
    return {
      success: false,
      error: error.message
    };
  }
});


fastify.get('/api/alerts', async (request, reply) => {
  try {
    const { status, limit, offset } = request.query;
    const alerts = await alertModule.getAlerts({
      status,
      limit: limit ? Number.parseInt(limit) : 50,
      offset: offset ? Number.parseInt(offset) : 0
    });
    return {
      success: true,
      count: alerts.length,
      alerts: alerts
    };
  } catch (error) {
    reply.code(500);
    return {
      success: false,
      error: error.message
    };
  }
});


fastify.put('/api/alerts/:id/status', async (request, reply) => {
  try {
    const { id } = request.params;
    const { status } = request.body;
    console.log(`Received update request for alert ${id} to ${status}`);

    const result = await alertModule.updateAlertStatus(id, status);

    if (!result) {
      reply.code(404);
      return { success: false, error: "Alert not found" };
    }

    return { success: true, alert: result };
  } catch (error) {
    console.error('Update error:', error);
    reply.code(500);
    return { success: false, error: error.message };
  }
});

fastify.put('/api/alerts/:id/details', async (request, reply) => {
  try {
    const { id } = request.params;
    const { stageChecks, reviewNotes } = request.body;
    console.log(`Received update details request for alert ${id}`);

    const result = await alertModule.updateAlertDetails(id, stageChecks, reviewNotes);

    if (!result) {
      reply.code(404);
      return { success: false, error: "Alert not found" };
    }

    return { success: true, alert: result };
  } catch (error) {
    console.error('Update details error:', error);
    reply.code(500);
    return { success: false, error: error.message };
  }
});


fastify.delete('/api/alerts/:id', async (request, reply) => {
  try {
    const { id } = request.params;
    console.log(`Received delete request for alert ${id}`);

    const result = await alertModule.deleteAlert(id);

    if (!result) {
      reply.code(404);
      return { success: false, error: "Alert not found" };
    }

    return { success: true, message: "Alert deleted successfully" };
  } catch (error) {
    console.error('Delete error:', error);
    reply.code(500);
    return { success: false, error: error.message };
  }
});

fastify.delete('/api/alerts', async (request, reply) => {
  try {
    const { status } = request.query;
    console.log(`Received delete all alerts request (status: ${status || 'all'})`);
    const count = await alertModule.deleteAllAlerts(status);
    return { success: true, message: "Alerts deleted successfully", count };
  } catch (error) {
    console.error('Delete all error:', error);
    reply.code(500);
    return { success: false, error: error.message };
  }
});


fastify.post('/api/notifications', async (request, reply) => {
  try {
    const { message, type, title, source, severity, recovery, stage, alert_id } = request.body;
    const query = `
      INSERT INTO "Notifications" ("message", "type", "title", "source", "severity", "recovery", "stage", "created_at", "alert_id")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const result = await clientDb.query(query, [
      message,
      type || 'info',
      title || null,
      source || null,
      severity || null,
      recovery || 0,
      stage || null,
      new Date(),
      alert_id || null
    ]);
    return { success: true, notification: result.rows[0] };
  } catch (error) {
    reply.code(500);
    return { success: false, error: error.message };
  }
});


fastify.get('/api/notifications', async (request, reply) => {
  try {
    const query = `
      SELECT * FROM "Notifications"
      ORDER BY created_at DESC
    `;
    const result = await clientDb.query(query);
    return { success: true, notifications: result.rows };
  } catch (error) {
    reply.code(500);
    return { success: false, error: error.message };
  }
});


fastify.delete('/api/notifications', async (_request, reply) => {
  try {
    const query = `DELETE FROM "Notifications"`;
    const result = await clientDb.query(query);
    return { success: true, message: "All notifications deleted", count: result.rowCount };
  } catch (error) {
    reply.code(500);
    return { success: false, error: error.message };
  }
});


fastify.delete('/api/notifications/:id', async (request, reply) => {
  try {
    const { id } = request.params;
    const query = `
      DELETE FROM "Notifications"
      WHERE id = $1
      RETURNING *
    `;
    const result = await clientDb.query(query, [id]);

    if (result.rowCount === 0) {
      reply.code(404);
      return { success: false, error: "Notification not found" };
    }

    return { success: true, message: "Notification deleted" };
  } catch (error) {
    reply.code(500);
    return { success: false, error: error.message };
  }
});


fastify.get('/api/devices', async (request, reply) => {
  try {
    const result = await clientDb.query('SELECT "Device_Id", "Device_type", "Ip_Address", "Status" as status, "Hostname" FROM "Devices"');
    return {
      success: true,
      devices: result.rows
    };
  } catch (error) {
    reply.code(500);
    return {
      success: false,
      error: error.message
    };
  }
});


fastify.get('/api/users', async (_request, reply) => {
  try {
    const query = `
      SELECT 
        auth.user_id, 
        auth.username, 
        auth.email, 
        r.role_name, 
        auth.last_login,
        CASE 
          WHEN DATE(auth.last_login) = CURRENT_DATE THEN 'active' 
          ELSE 'inactive' 
        END AS current_state
      FROM authentication auth
      LEFT JOIN user_roles ur ON auth.user_id = ur.user_id
      LEFT JOIN role r ON ur.role_id = r.role_id
      ORDER BY auth.user_id
    `;
    const result = await authDb.query(query);
    return { success: true, users: result.rows };
  } catch (error) {
    reply.code(500);
    return {
      success: false,
      error: error.message
    };
  }
});


fastify.post('/api/ping', async (request, reply) => {
  try {
    const { ip } = request.body || {};
    if (!ip || !/^[0-9.]+$/.test(ip)) {
      reply.code(400);
      return { success: false, error: 'Invalid IP' };
    }
    const { spawn } = require('node:child_process');
    
    
    const PING_PATHS = ['/bin/ping', '/usr/bin/ping', '/sbin/ping', '/usr/sbin/ping'];
    const PING_CMD = PING_PATHS.find(path => fs.existsSync(path));
    
    if (!PING_CMD) {
      console.warn('Warning: Could not locate absolute path for ping. Defaulting to "ping" (less secure).');
    }

    const args = ['-c', '1', '-W', '1', ip];
    const proc = spawn(PING_CMD || 'ping', args);
    let out = '';
    let err = '';
    await new Promise((resolve) => {
      proc.stdout.on('data', (d) => (out += d.toString()));
      proc.stderr.on('data', (d) => (err += d.toString()));
      proc.on('close', () => resolve(null));
    });
    const ok = /1 packets transmitted, 1 (packets )?received/.test(out) || /time=([\d.]+)\s*ms/.test(out);
    const m = out.match(/time=([\d.]+)\s*ms/);
    const ms = m ? Math.round(Number(m[1])) : null;
    return { success: true, ok, ms, raw: out.trim() };
  } catch (error) {
    console.error('Ping endpoint error:', error);
    reply.code(500);
    return { success: false, error: 'Ping failed' };
  }
});


const start = async () => {
  try {

    const ingestRemoteLogs = async () => {
      try {
        console.log('Attempting to ingest remote logs...');
        await logIngestor.collectRemoteLogs();
        console.log('Startup log ingestion complete.');
      } catch (e) {
        console.error('Startup log ingestion failed (VM might be offline):', e.message);
      }
    };


    ingestRemoteLogs().catch(err => console.error('Background log ingestion error:', err));


    await initializeServices();


    syncManager.startPeriodicSync();


    escalationMonitor.startMonitor(60000);

    const logFiles = ['/var/log/auth.log', '/var/log/syslog'];
    logIngestor.startSyncManager(logFiles, 30);

    const port = process.env.PORT || 3001;
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    console.log(`🚀 Server running on http://${host}:${port}`);
    console.log(`📡 Auto sync enabled (${syncManager.intervalMs / 1000}s)`);

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  syncManager.stopPeriodicSync();
  logIngestor.stopSyncManager();
  escalationMonitor.stopMonitor();
  fastify.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down...');
  syncManager.stopPeriodicSync();
  logIngestor.stopSyncManager();
  escalationMonitor.stopMonitor();
  fastify.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

start();
