
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from backend directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function updateSchema() {
    const client = await pool.connect();
    try {
        console.log('Updating database schema...');

        // Drop the existing check constraint
        await client.query('ALTER TABLE players DROP CONSTRAINT IF EXISTS players_status_check');

        // Add the new check constraint with all necessary statuses
        await client.query(`
      ALTER TABLE players 
      ADD CONSTRAINT players_status_check 
      CHECK (status IN ('pending', 'approved', 'eligible', 'auctioning', 'sold', 'unsold'))
    `);

        console.log('✅ Database schema updated successfully!');
    } catch (error) {
        console.error('❌ Error updating database:', error);
    } finally {
        client.release();
        pool.end();
    }
}

updateSchema();
