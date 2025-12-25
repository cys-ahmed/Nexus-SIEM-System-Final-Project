const { Pool } = require('pg');

// Unified Database Connection Configuration
const dbConfig = {
    user: 'postgres',
    host: 'localhost',
    database: 'nexus_siem', // Unified DB
    password: '123456',
    port: 5432,
};

async function createDatabase() {
    // Connect to postgres default DB to create the new one
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
    const fs = require('fs');
    const path = require('path');
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

main();
