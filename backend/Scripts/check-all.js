/**
 * Full System Health Check Script
 * Runs all health checks in sequence
 * Run: npm run check:all
 */

const { execSync } = require('node:child_process');
const path = require('node:path');

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

const CHECKS = [
    { name: 'Database', script: 'check-db.js' },
    { name: 'SSH Connections', script: 'check-ssh.js' },
    { name: 'Email/SMTP', script: 'check-email.js' },
    { name: 'API Endpoints', script: 'check-api.js' },
];

async function main() {
    log('\n' + '='.repeat(60), COLORS.bold);
    log('🔍 NEXUS SIEM - FULL SYSTEM HEALTH CHECK', COLORS.bold);
    log('='.repeat(60), COLORS.bold);

    const results = [];

    for (const check of CHECKS) {
        log(`\n${'─'.repeat(60)}`, COLORS.cyan);
        log(`▶ Running ${check.name} Check...`, COLORS.cyan + COLORS.bold);
        log('─'.repeat(60), COLORS.cyan);

        try {
            const scriptPath = path.join(__dirname, check.script);
            execSync(`node "${scriptPath}"`, {
                stdio: 'inherit',
                env: process.env
            });
            results.push({ name: check.name, success: true });
        } catch (error) {
            results.push({ name: check.name, success: false });
        }
    }

    // Final Summary
    log('\n' + '='.repeat(60), COLORS.bold);
    log('📊 FINAL SUMMARY', COLORS.bold);
    log('='.repeat(60), COLORS.bold);

    for (const result of results) {
        if (result.success) {
            log(`   ✅ ${result.name}: PASSED`, COLORS.green);
        } else {
            log(`   ❌ ${result.name}: FAILED`, COLORS.red);
        }
    }

    const passed = results.filter(r => r.success).length;
    const allSuccess = passed === results.length;

    log('\n' + '─'.repeat(60));
    log(`   Total: ${passed}/${results.length} checks passed`);
    log('─'.repeat(60));

    log('\n' + (allSuccess ? '✅ SYSTEM HEALTHY!' : '⚠️  SYSTEM HAS ISSUES'),
        allSuccess ? COLORS.green + COLORS.bold : COLORS.yellow + COLORS.bold);
    log('');

    process.exit(allSuccess ? 0 : 1);
}

main();
