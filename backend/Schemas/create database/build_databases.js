const { Pool } = require('pg');
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });


const dbConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME, 
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
};

async function createDatabase() {
    
    const rootPool = new Pool({ ...dbConfig, database: 'postgres' });

    try {
        console.log('Checking if nexus_siem database exists...');
        const res = await rootPool.query("SELECT 1 FROM pg_database WHERE datname = 'nexus_siem'");

        if (res.rowCount === 0) {
            console.log('Creating nexus_siem database...');
            await rootPool.query('CREATE DATABASE nexus_siem');
            console.log('Database created successfully.');
        } else {
            console.log('nexus_siem database already exists.');
        }
    } catch (err) {
        console.error('Error checking/creating database:', err);
        process.exit(1);
    } finally {
        await rootPool.end();
    }
}

async function runSetupScript() {
    const fs = require('node:fs');
    const path = require('node:path');
    const sqlPath = path.join(__dirname, 'nexus_unified.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    const pool = new Pool(dbConfig);

    try {
        console.log('Running schema setup script...');
        await pool.query(sql);
        console.log('Schema setup completed successfully.');
    } catch (err) {
        console.error('Error running setup script:', err);
    } finally {
        await pool.end();
    }
}

async function main() {
    await createDatabase();
    await runSetupScript();
    process.exit(0);
}

await main();