const { Client } = require('ssh2');
const serverDb = require('../database/serverDb');
const crypto = require('node:crypto');
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const MACHINES = [
    {
        ssh: {
            host: process.env.SSH_HOST_1,
            port: 22,
            username: process.env.SSH_USER_1,
            password: process.env.SSH_PASS_1,
            readyTimeout: 20000,
            deviceType: 'linux'

        },
        files: ['/var/log/auth.log', '/var/log/syslog']
    },
    {
        ssh: {
            host: process.env.SSH_HOST_2,
            port: 22,
            username: process.env.SSH_USER_2,
            password: process.env.SSH_PASS_2,
            readyTimeout: 20000,
            deviceType: 'linux'
        },
        files: ['/var/log/auth.log', '/var/log/syslog']
    }

];

let SYNC_INTERVAL = 30;

class LogIngestor {
    interval = null;
    isRunning = false;

    generateDeviceId(host) {
        return crypto.createHash('sha256').update(host).digest('hex');
    }

    async ensureDevice(deviceId, host, type = 'remote-server') {
        const exists = await serverDb.query('SELECT 1 FROM "Devices" WHERE "Device_id" = $1', [deviceId]);
        if (exists.rowCount === 0) {
            await serverDb.query(
                'INSERT INTO "Devices" ("Device_id", "Device_type", "Ip_Address", "Status") VALUES ($1, $2, $3, $4)',
                [deviceId, type, host, 'active']
            );
        }
    }

    async ingest(filename, buffer, deviceId) {
        const logType = filename.split('.')[0] || 'unknown';
        const logContent = buffer.toString('base64');

        const exists = await serverDb.query(
            'SELECT "log_id" FROM "Logs" WHERE "log_type" = $1 AND "Dev_id" = $2',
            [logType, deviceId]
        );

        if (exists.rowCount > 0) {
            await serverDb.query(
                'UPDATE "Logs" SET "logfile" = $1 WHERE "log_type" = $2 AND "Dev_id" = $3',
                [logContent, logType, deviceId]
            );
            console.log(`Log updated: ${filename}`);
        } else {
            const logId = (BigInt(Date.now()) * 1000n + BigInt(crypto.randomInt(0, 1000))).toString();
            await serverDb.query(
                'INSERT INTO "Logs" ("log_id", "log_type", "logfile", "Dev_id") VALUES ($1, $2, $3, $4)',
                [logId, logType, logContent, deviceId]
            );
            console.log(`Log ingested: ${filename}`);
        }
    }

    async processSftp(sftp, config, deviceId) {
        try {
            for (const path of config.files) {
                const chunks = [];
                await new Promise((res, rej) => {
                    sftp.createReadStream(path)
                        .on('data', c => chunks.push(c))
                        .on('end', res)
                        .on('error', rej);
                });
                await this.ingest(path.split('/').pop(), Buffer.concat(chunks), deviceId);
            }
            console.log(`Host processed: ${config.ssh.host}`);
        } catch (e) {
            console.error(`✗ ${config.ssh.host}: ${e.message}`);
        }
    }

    async collectFromMachine(config) {
        const deviceId = this.generateDeviceId(config.ssh.host);
        await this.ensureDevice(deviceId, config.ssh.host, config.ssh.deviceType);

        return new Promise((resolve, reject) => {
            const conn = new Client();
            conn.on('ready', () => {
                conn.sftp(async (err, sftp) => {
                    if (err) { conn.end(); return reject(err); }
                    await this.processSftp(sftp, config, deviceId);
                    conn.end();
                    resolve();
                });
            }).on('error', (err) => {
                console.error(`✗ ${config.ssh.host}: ${err.message}`);
                reject(err);
            }).connect(config.ssh);
        });
    }

    async collectRemoteLogs() {
        console.log(`[${new Date().toLocaleTimeString()}] Collecting from ${MACHINES.length} machine(s)...`);
        await Promise.all(
            MACHINES.map(m => this.collectFromMachine(m).catch(err =>
                console.error(`✗ ${m.ssh.host}: ${err.message}`)
            ))
        );
    }

    startSyncManager(_files, intervalSeconds = 30) {
        if (this.isRunning) return;

        if (intervalSeconds) SYNC_INTERVAL = intervalSeconds;

        this.isRunning = true;
        console.log(`\n🔄 Sync Manager Started - ${MACHINES.length} machine(s), every ${SYNC_INTERVAL}s\n`);

        this.collectRemoteLogs().catch(err => console.error('Initial collection error:', err));

        this.interval = setInterval(() => this.collectRemoteLogs(), SYNC_INTERVAL * 1000);
    }

    stopSyncManager() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            this.isRunning = false;
            console.log('🛑 Sync Manager Stopped');
        }
    }
}

module.exports = LogIngestor;
