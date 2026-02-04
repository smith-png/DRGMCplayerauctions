
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

async function listUsers() {
    const client = await pool.connect();
    try {
        const res = await client.query('SELECT id, email, name, role FROM users');
        console.log('Users found:', res.rows);
    } catch (error) {
        console.error('Error querying users:', error);
    } finally {
        client.release();
        pool.end();
    }
}

listUsers();
