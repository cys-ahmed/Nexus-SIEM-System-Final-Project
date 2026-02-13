const { Pool } = require('pg');
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const authPool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    options: '-c search_path=auth_schema',
});

authPool.on('connect', () => {
    console.log('Connected to PostgreSQL auth database');
});

authPool.on('error', (err) => {
    console.error('Unexpected error on idle auth client', err);
    process.exit(-1);
});

async function inspectSchema(pool) {
    try {
        const result = await pool.query(`
      SELECT 
        table_name,
        column_name,
        data_type,
        character_maximum_length,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'auth_schema'
      ORDER BY table_name, ordinal_position;
    `);

        console.log('\n=== Database Schema ===');
        const tables = {};

        result.rows.forEach(row => {
            if (!tables[row.table_name]) {
                tables[row.table_name] = [];
            }
            tables[row.table_name].push({
                column: row.column_name,
                type: row.data_type,
                maxLength: row.character_maximum_length,
                nullable: row.is_nullable
            });
        });

        Object.keys(tables).forEach(tableName => {
            console.log(`\nTable: ${tableName}`);
            tables[tableName].forEach(col => {
                const maxLengthStr = col.maxLength ? `(${col.maxLength})` : '';
                const notNullStr = col.nullable === 'NO' ? 'NOT NULL' : '';
                console.log(`  - ${col.column}: ${col.type}${maxLengthStr} ${notNullStr}`);
            });
        });

        return tables;
    } catch (err) {
        console.error('Error inspecting schema:', err);
        return {};
    }
}

async function inspectAuthSchema() {
    return inspectSchema(authPool);
}

async function testAuthConnection() {
    try {
        const result = await authPool.query('SELECT NOW()');
        console.log('Auth DB connection successful. Server time:', result.rows[0].now);
        return true;
    } catch (err) {
        console.error('Auth DB connection failed:', err.message);
        return false;
    }
}

module.exports = {
    query: (text, params) => authPool.query(text, params),
    pool: authPool,
    inspectSchema: () => inspectSchema(authPool),
    testConnection: testAuthConnection,
    authPool,
    inspectAuthSchema,
    testAuthConnection,
};
