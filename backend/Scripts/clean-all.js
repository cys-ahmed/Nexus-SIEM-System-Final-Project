/**
 * Clean All Data Script
 * Clears ALL data from the database INCLUDING auth tables
 * WARNING: This will delete users and sessions!
 * Run: npm run clean:all
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

async function cleanSchema(pool, schemaName, displayName) {
    const client = await pool.connect();

    try {
        log(`\n📦 Cleaning ${displayName}...`, COLORS.cyan);

        const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = $1
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `, [schemaName]);

        if (tablesRes.rows.length === 0) {
            log(`   No tables found in ${schemaName}`, COLORS.yellow);
            return 0;
        }

        const tables = tablesRes.rows.map(r => r.table_name);
        let totalCleared = 0;

        for (const table of tables) {
            try {
                const countRes = await client.query(`SELECT COUNT(*) as count FROM "${table}"`);
                const count = parseInt(countRes.rows[0].count, 10);

                if (count > 0) {
                    await client.query(`TRUNCATE "${table}" RESTART IDENTITY CASCADE`);
                    log(`   ✅ ${table}: cleared ${count} rows`, COLORS.green);
                    totalCleared += count;
                } else {
                    log(`   ⏭️  ${table}: already empty`);
                }
            } catch (err) {
                log(`   ❌ ${table}: ${err.message}`, COLORS.red);
            }
        }

        return totalCleared;

    } finally {
        client.release();
    }
}

async function main() {
    log('\n' + '='.repeat(50), COLORS.bold);
    log('🧹 NEXUS SIEM - Clean ALL Data', COLORS.bold);
    log('⚠️  WARNING: This includes auth tables!', COLORS.red);
    log('='.repeat(50), COLORS.bold);

    let totalCleared = 0;

    try {
        log('\n🔌 Testing database connections...', COLORS.cyan);
        await authDb.testConnection();
        await clientDb.testConnection();
        await serverDb.testConnection();

        // Clean all schemas including auth
        totalCleared += await cleanSchema(authDb.pool, 'auth_schema', 'Auth Schema (Users/Sessions)');
        totalCleared += await cleanSchema(clientDb.pool, 'client_schema', 'Client Schema (Logs/Events)');
        totalCleared += await cleanSchema(serverDb.pool, 'server_schema', 'Server Schema');

        log('\n' + '='.repeat(50), COLORS.bold);
        log(`✨ COMPLETE: Cleared ${totalCleared} total records`, COLORS.green + COLORS.bold);
        log('='.repeat(50) + '\n', COLORS.bold);

    } catch (error) {
        log(`\n❌ Error: ${error.message}`, COLORS.red);
        process.exit(1);
    }

    process.exit(0);
}

main();
