/**
 * Database Health Check Script
 * Tests connections to all database schemas and shows table counts
 * Run: npm run check:db
 */

const authDb = require('../database/authDb');
const clientDb = require('../database/clientDb');
const serverDb = require('../database/serverDb');

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

async function checkSchema(pool, schemaName, displayName) {
    const client = await pool.connect();

    try {
        log(`\n📊 ${displayName}`, COLORS.cyan + COLORS.bold);

        // Test connection
        const timeRes = await client.query('SELECT NOW() as time');
        log(`   ✅ Connected: ${timeRes.rows[0].time}`, COLORS.green);

        // Get tables and counts
        const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = $1
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `, [schemaName]);

        if (tablesRes.rows.length === 0) {
            log(`   ⚠️  No tables found`, COLORS.yellow);
            return { success: true, tables: 0, records: 0 };
        }

        let totalRecords = 0;
        log(`   📋 Tables (${tablesRes.rows.length}):`, COLORS.cyan);

        for (const row of tablesRes.rows) {
            try {
                const countRes = await client.query(`SELECT COUNT(*) as count FROM "${row.table_name}"`);
                const count = parseInt(countRes.rows[0].count, 10);
                totalRecords += count;
                const countStr = count > 0 ? `${count} rows` : 'empty';
                log(`      • ${row.table_name}: ${countStr}`);
            } catch (err) {
                log(`      • ${row.table_name}: ❌ ${err.message}`, COLORS.red);
            }
        }

        log(`   📈 Total records: ${totalRecords}`, COLORS.bold);

        return { success: true, tables: tablesRes.rows.length, records: totalRecords };

    } catch (err) {
        log(`   ❌ Connection failed: ${err.message}`, COLORS.red);
        return { success: false, error: err.message };
    } finally {
        client.release();
    }
}

async function main() {
    log('\n' + '='.repeat(50), COLORS.bold);
    log('🔍 NEXUS SIEM - Database Health Check', COLORS.bold);
    log('='.repeat(50), COLORS.bold);

    const results = {
        auth: await checkSchema(authDb.pool, 'auth_schema', 'Auth Schema'),
        client: await checkSchema(clientDb.pool, 'client_schema', 'Client Schema'),
        server: await checkSchema(serverDb.pool, 'server_schema', 'Server Schema')
    };

    // Summary
    log('\n' + '='.repeat(50), COLORS.bold);
    log('📋 SUMMARY', COLORS.bold);
    log('='.repeat(50), COLORS.bold);

    const allSuccess = Object.values(results).every(r => r.success);

    for (const [name, result] of Object.entries(results)) {
        if (result.success) {
            log(`   ✅ ${name}: ${result.tables} tables, ${result.records} records`, COLORS.green);
        } else {
            log(`   ❌ ${name}: ${result.error}`, COLORS.red);
        }
    }

    log('\n' + (allSuccess ? '✅ All databases healthy!' : '❌ Some databases failed!'),
        allSuccess ? COLORS.green + COLORS.bold : COLORS.red + COLORS.bold);
    log('');

    process.exit(allSuccess ? 0 : 1);
}

main();
