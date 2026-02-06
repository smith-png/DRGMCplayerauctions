import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkValue() {
    try {
        const client = await pool.connect();
        try {
            const res = await client.query(`SELECT animation_duration FROM auction_state LIMIT 1`);
            console.log('Current animation_duration:', res.rows[0]);
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkValue();
