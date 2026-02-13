/**
 * Clean Data Script
 * Clears all data from the database EXCEPT auth tables (users, sessions)
 * Run: npm run clean
 */

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

async function cleanSchema(pool, schemaName, displayName) {
    const client = await pool.connect();

    try {
        log(`\n📦 Cleaning ${displayName}...`, COLORS.cyan);

        // Get all tables in schema
        const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = $1
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `, [schemaName]);

        if (tablesRes.rows.length === 0) {
            log(`   No tables found in ${schemaName}`, COLORS.yellow);
            return { cleared: 0, tables: [] };
        }

        const tables = tablesRes.rows.map(r => r.table_name);
        let totalCleared = 0;
        const clearedTables = [];

        for (const table of tables) {
            try {
                // Get count before
                const countRes = await client.query(`SELECT COUNT(*) as count FROM "${table}"`);
                const count = parseInt(countRes.rows[0].count, 10);

                if (count > 0) {
                    await client.query(`TRUNCATE "${table}" RESTART IDENTITY CASCADE`);
                    log(`   ✅ ${table}: cleared ${count} rows`, COLORS.green);
                    totalCleared += count;
                    clearedTables.push({ table, count });
                } else {
                    log(`   ⏭️  ${table}: already empty`);
                }
            } catch (err) {
                log(`   ❌ ${table}: ${err.message}`, COLORS.red);
            }
        }

        return { cleared: totalCleared, tables: clearedTables };

    } finally {
        client.release();
    }
}

async function main() {
    log('\n' + '='.repeat(50), COLORS.bold);
    log('🧹 NEXUS SIEM - Clean Data (Preserve Auth)', COLORS.bold);
    log('='.repeat(50), COLORS.bold);

    let totalCleared = 0;

    try {
        // Test connections first
        log('\n🔌 Testing database connections...', COLORS.cyan);
        await clientDb.testConnection();
        await serverDb.testConnection();

        // Clean client_schema (logs, events, alerts, detections)
        const clientResult = await cleanSchema(clientDb.pool, 'client_schema', 'Client Schema (Logs/Events)');
        totalCleared += clientResult.cleared;

        // Clean server_schema (if any non-auth data)
        const serverResult = await cleanSchema(serverDb.pool, 'server_schema', 'Server Schema');
        totalCleared += serverResult.cleared;

        // Summary
        log('\n' + '='.repeat(50), COLORS.bold);
        log(`✨ COMPLETE: Cleared ${totalCleared} total records`, COLORS.green + COLORS.bold);
        log('   Auth tables preserved (users, sessions)', COLORS.yellow);
        log('='.repeat(50) + '\n', COLORS.bold);

    } catch (error) {
        log(`\n❌ Error: ${error.message}`, COLORS.red);
        process.exit(1);
    }

    process.exit(0);
}

main();
