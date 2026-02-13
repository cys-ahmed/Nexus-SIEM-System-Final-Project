/**
 * Database Schema Inspector Script
 * Shows all tables and their structure across all schemas
 * Run: npm run inspect
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
    bold: '\x1b[1m',
    dim: '\x1b[2m'
};

function log(msg, color = '') {
    console.log(`${color}${msg}${COLORS.reset}`);
}

async function inspectSchema(pool, schemaName, displayName) {
    const client = await pool.connect();

    try {
        log(`\n${'═'.repeat(50)}`, COLORS.cyan);
        log(`📦 ${displayName} (${schemaName})`, COLORS.cyan + COLORS.bold);
        log('═'.repeat(50), COLORS.cyan);

        // Get all tables with columns
        const result = await client.query(`
      SELECT 
        c.table_name,
        c.column_name,
        c.data_type,
        c.character_maximum_length,
        c.is_nullable,
        c.column_default
      FROM information_schema.columns c
      WHERE c.table_schema = $1
      ORDER BY c.table_name, c.ordinal_position
    `, [schemaName]);

        if (result.rows.length === 0) {
            log('   (No tables found)', COLORS.yellow);
            return;
        }

        // Group by table
        const tables = {};
        for (const row of result.rows) {
            if (!tables[row.table_name]) {
                tables[row.table_name] = [];
            }
            tables[row.table_name].push(row);
        }

        // Display each table
        for (const [tableName, columns] of Object.entries(tables)) {
            // Get row count
            let count = 0;
            try {
                const countRes = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
                count = parseInt(countRes.rows[0].count, 10);
            } catch (e) { }

            log(`\n   📋 ${tableName}`, COLORS.bold);
            log(`      Rows: ${count}`, count > 0 ? COLORS.green : COLORS.dim);
            log(`      Columns:`, COLORS.dim);

            for (const col of columns) {
                const type = col.character_maximum_length
                    ? `${col.data_type}(${col.character_maximum_length})`
                    : col.data_type;
                const nullable = col.is_nullable === 'YES' ? '' : ' NOT NULL';
                const defaultVal = col.column_default ? ` DEFAULT ${col.column_default.substring(0, 20)}` : '';

                log(`         • ${col.column_name}: ${type}${nullable}${defaultVal}`, COLORS.dim);
            }
        }

        log(`\n   Total: ${Object.keys(tables).length} tables`, COLORS.bold);

    } finally {
        client.release();
    }
}

async function main() {
    log('\n' + '═'.repeat(50), COLORS.bold);
    log('🔍 NEXUS SIEM - Database Schema Inspector', COLORS.bold);
    log('═'.repeat(50), COLORS.bold);

    try {
        await inspectSchema(authDb.pool, 'auth_schema', 'Auth Schema');
        await inspectSchema(clientDb.pool, 'client_schema', 'Client Schema');
        await inspectSchema(serverDb.pool, 'server_schema', 'Server Schema');

        log('\n' + '═'.repeat(50), COLORS.bold);
        log('✅ Schema inspection complete!', COLORS.green + COLORS.bold);
        log('═'.repeat(50) + '\n', COLORS.bold);

    } catch (error) {
        log(`\n❌ Error: ${error.message}`, COLORS.red);
        process.exit(1);
    }

    process.exit(0);
}

main();
