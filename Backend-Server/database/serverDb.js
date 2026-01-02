const { Pool } = require('pg');
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const serverPool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    options: '-c search_path=server_schema',
});

serverPool.on('connect', () => {
    console.log('Connected to server-side PostgreSQL database');
});

serverPool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

async function inspectSchema() {
    try {
        const result = await serverPool.query(`
      SELECT 
        table_name,
        column_name,
        data_type,
        character_maximum_length,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'server_schema'
      ORDER BY table_name, ordinal_position;
    `);

        console.log('\n=== Server-Side Database Schema ===');
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
                const lengthStr = col.maxLength ? `(${col.maxLength})` : '';
                const nullStr = col.nullable === 'NO' ? 'NOT NULL' : '';
                console.log(`  - ${col.column}: ${col.type}${lengthStr} ${nullStr}`);
            });
        });

        return tables;
    } catch (err) {
        console.error('Error inspecting schema:', err);
        return {};
    }
}

async function testConnection() {
    try {
        const result = await serverPool.query('SELECT NOW()');
        console.log('Server-side database connection successful. Server time:', result.rows[0].now);
        return true;
    } catch (err) {
        console.error('Server-side database connection failed:', err.message);
        return false;
    }
}

module.exports = {
    query: (text, params) => serverPool.query(text, params),
    pool: serverPool,
    inspectSchema: inspectSchema,
    testConnection: testConnection
};
