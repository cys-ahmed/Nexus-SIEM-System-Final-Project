/**
 * API Health Check Script
 * Tests all API endpoints to verify they are working
 * Run: npm run check:api
 */

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

const BASE_URL = process.env.API_URL || 'http://localhost:3001';

const ENDPOINTS = [
    { method: 'GET', path: '/api/logs', name: 'Get Logs' },
    { method: 'GET', path: '/api/logs/sources', name: 'Get Log Sources' },
    { method: 'GET', path: '/api/logs/stats', name: 'Get Log Stats' },
    { method: 'GET', path: '/api/detections', name: 'Get Detections' },
    { method: 'GET', path: '/api/detections/stats', name: 'Get Detection Stats' },
    { method: 'GET', path: '/api/alerts', name: 'Get Alerts' },
    { method: 'GET', path: '/api/resolved-incidents', name: 'Get Resolved Incidents' },
    { method: 'GET', path: '/api/devices', name: 'Get Devices' },
    { method: 'GET', path: '/api/notifications', name: 'Get Notifications' },
    { method: 'GET', path: '/api/sync/status', name: 'Get Sync Status' },
];

async function testEndpoint(endpoint) {
    const url = `${BASE_URL}${endpoint.path}`;
    const start = Date.now();

    try {
        const response = await fetch(url, {
            method: endpoint.method,
            headers: { 'Content-Type': 'application/json' }
        });

        const time = Date.now() - start;
        const data = await response.json().catch(() => ({}));

        return {
            success: response.ok,
            status: response.status,
            time,
            hasData: data.success !== false
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            time: Date.now() - start
        };
    }
}

async function main() {
    log('\n' + '='.repeat(50), COLORS.bold);
    log('🔍 NEXUS SIEM - API Health Check', COLORS.bold);
    log(`   Base URL: ${BASE_URL}`, COLORS.cyan);
    log('='.repeat(50), COLORS.bold);

    const results = [];

    for (const endpoint of ENDPOINTS) {
        const result = await testEndpoint(endpoint);
        results.push({ ...endpoint, ...result });

        if (result.success) {
            log(`   ✅ ${endpoint.method} ${endpoint.path} (${result.time}ms)`, COLORS.green);
        } else if (result.error) {
            log(`   ❌ ${endpoint.method} ${endpoint.path}: ${result.error}`, COLORS.red);
        } else {
            log(`   ⚠️  ${endpoint.method} ${endpoint.path}: HTTP ${result.status}`, COLORS.yellow);
        }
    }

    // Summary
    const passed = results.filter(r => r.success).length;
    const failed = results.length - passed;

    log('\n' + '='.repeat(50), COLORS.bold);
    log('📋 SUMMARY', COLORS.bold);
    log('='.repeat(50), COLORS.bold);
    log(`   ✅ Passed: ${passed}/${results.length}`, COLORS.green);
    if (failed > 0) {
        log(`   ❌ Failed: ${failed}/${results.length}`, COLORS.red);
    }

    const avgTime = Math.round(results.reduce((a, r) => a + r.time, 0) / results.length);
    log(`   ⏱️  Avg response time: ${avgTime}ms`);

    const allSuccess = failed === 0;
    log('\n' + (allSuccess ? '✅ All API endpoints healthy!' : '❌ Some endpoints failed!'),
        allSuccess ? COLORS.green + COLORS.bold : COLORS.red + COLORS.bold);
    log('');

    process.exit(allSuccess ? 0 : 1);
}

main();
