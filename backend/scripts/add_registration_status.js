import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env from backend/.env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
console.log(`Loading .env from: ${envPath}`);
dotenv.config({ path: envPath });

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function addRegistrationStatus() {
    try {
        console.log('🔗 Connecting to database...');

        // Check if column exists
        const client = await pool.connect();
        try {
            const checkRes = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='auction_state' AND column_name='is_registration_open';
            `);

            if (checkRes.rows.length === 0) {
                console.log('📝 Adding is_registration_open column...');
                await client.query(`
                    ALTER TABLE auction_state 
                    ADD COLUMN is_registration_open BOOLEAN DEFAULT TRUE;
                `);
                console.log('✅ Column added successfully!');
            } else {
                console.log('ℹ️ Column already exists.');
            }

            // Fix potential nulls
            await client.query('UPDATE auction_state SET is_registration_open = TRUE WHERE is_registration_open IS NULL');
            console.log('✅ Null values fixed (if any).');

        } finally {
            client.release();
        }

    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await pool.end();
        console.log('👋 Connection closed.');
    }
}

addRegistrationStatus();
