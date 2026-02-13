/**
 * SSH Connections Health Check Script
 * Tests SSH connections to all configured log collectors
 * Run: npm run check:ssh
 */

const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { Client } = require('ssh2');

const COLORS = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

function log(msg, color = '') {
    console.log(`${color}${msg}${COLORS.reset}`);
}

function getSSHConfigs() {
    const configs = [];
    let i = 1;

    while (process.env[`SSH_HOST_${i}`]) {
        configs.push({
            name: `SSH Host ${i}`,
            host: process.env[`SSH_HOST_${i}`],
            username: process.env[`SSH_USER_${i}`],
            password: process.env[`SSH_PASS_${i}`],
            port: parseInt(process.env[`SSH_PORT_${i}`] || '22', 10)
        });
        i++;
    }

    return configs;
}

async function testSSHConnection(config) {
    return new Promise((resolve) => {
        const conn = new Client();
        const start = Date.now();

        const timeout = setTimeout(() => {
            conn.end();
            resolve({ success: false, error: 'Connection timeout (10s)' });
        }, 10000);

        conn.on('ready', () => {
            clearTimeout(timeout);
            const time = Date.now() - start;

            // Try to execute a simple command
            conn.exec('hostname', (err, stream) => {
                if (err) {
                    conn.end();
                    resolve({ success: true, time, hostname: 'unknown' });
                    return;
                }

                let hostname = '';
                stream.on('data', (data) => { hostname += data.toString().trim(); });
                stream.on('close', () => {
                    conn.end();
                    resolve({ success: true, time, hostname });
                });
            });
        });

        conn.on('error', (err) => {
            clearTimeout(timeout);
            resolve({ success: false, error: err.message });
        });

        conn.connect({
            host: config.host,
            port: config.port,
            username: config.username,
            password: config.password,
            readyTimeout: 10000
        });
    });
}

async function main() {
    log('\n' + '='.repeat(50), COLORS.bold);
    log('🔐 NEXUS SIEM - SSH Connections Health Check', COLORS.bold);
    log('='.repeat(50), COLORS.bold);

    const configs = getSSHConfigs();

    if (configs.length === 0) {
        log('\n⚠️  No SSH hosts configured in .env', COLORS.yellow);
        log('   Expected format: SSH_HOST_1, SSH_USER_1, SSH_PASS_1');
        process.exit(0);
    }

    log(`\n📋 Found ${configs.length} SSH host(s) configured\n`, COLORS.cyan);

    const results = [];

    for (const config of configs) {
        log(`🔌 Testing ${config.name} (${config.host})...`, COLORS.cyan);
        const result = await testSSHConnection(config);
        results.push({ ...config, ...result });

        if (result.success) {
            log(`   ✅ Connected in ${result.time}ms (hostname: ${result.hostname})`, COLORS.green);
        } else {
            log(`   ❌ Failed: ${result.error}`, COLORS.red);
        }
    }

    // Summary
    const passed = results.filter(r => r.success).length;
    const failed = results.length - passed;

    log('\n' + '='.repeat(50), COLORS.bold);
    log('📋 SUMMARY', COLORS.bold);
    log('='.repeat(50), COLORS.bold);
    log(`   ✅ Connected: ${passed}/${results.length}`, COLORS.green);
    if (failed > 0) {
        log(`   ❌ Failed: ${failed}/${results.length}`, COLORS.red);
    }

    const allSuccess = failed === 0;
    log('\n' + (allSuccess ? '✅ All SSH connections healthy!' : '❌ Some connections failed!'),
        allSuccess ? COLORS.green + COLORS.bold : COLORS.red + COLORS.bold);
    log('');

    process.exit(allSuccess ? 0 : 1);
}

main();
