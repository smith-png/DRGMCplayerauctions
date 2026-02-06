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

async function migrate() {
    try {
        const client = await pool.connect();
        try {
            console.log('Adding animation_type column...');
            await client.query(`
                ALTER TABLE auction_state 
                ADD COLUMN IF NOT EXISTS animation_type VARCHAR(50) DEFAULT 'confetti';
            `);
            console.log('Column added successfully.');
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

migrate();
