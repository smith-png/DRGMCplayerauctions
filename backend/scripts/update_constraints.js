
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function updateConstraints() {
    console.log('Starting Constraint Update...');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Drop existing year check constraint
        console.log('Dropping old year constraint...');
        await client.query(`
            ALTER TABLE players DROP CONSTRAINT IF EXISTS players_year_check;
        `);

        // 2. Add new year check constraint with all values
        console.log('Adding new year constraint...');
        await client.query(`
            ALTER TABLE players ADD CONSTRAINT players_year_check 
            CHECK (year IN ('1st', '2nd', '3rd', '4th', 'Intern', 'FE', 'SE', 'TE', 'BE'));
        `);

        await client.query('COMMIT');
        console.log('✅ Constraints updated successfully');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Update failed:', e);
    } finally {
        client.release();
        pool.end();
    }
}

updateConstraints();
