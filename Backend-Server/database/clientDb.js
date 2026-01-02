const { Pool } = require('pg');
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const clientPool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    options: '-c search_path=client_schema',
});

clientPool.on('connect', () => {
    console.log('Connected to PostgreSQL client database');
});

clientPool.on('error', (err) => {
    console.error('Unexpected error on idle client-side DB client', err);
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
      WHERE table_schema = 'client_schema'
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

async function inspectClientSchema() {
    return inspectSchema(clientPool);
}

async function testClientConnection() {
    try {
        const result = await clientPool.query('SELECT NOW()');
        console.log('Client DB connection successful. Server time:', result.rows[0].now);
        return true;
    } catch (err) {
        console.error('Client DB connection failed:', err.message);
        return false;
    }
}

module.exports = {
    query: (text, params) => clientPool.query(text, params),
    pool: clientPool,
    inspectSchema: () => inspectSchema(clientPool),
    testConnection: testClientConnection,
    clientPool,
    inspectClientSchema,
    testClientConnection,
};
