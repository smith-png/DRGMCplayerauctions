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

async function addBasePriceColumn() {
    const client = await pool.connect();
    try {
        console.log('Adding base_price column to players table...');

        // Check if column already exists
        const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='players' AND column_name='base_price'
    `);

        if (checkColumn.rows.length === 0) {
            // Add the column
            await client.query(`
        ALTER TABLE players 
        ADD COLUMN base_price DECIMAL(10, 2) DEFAULT 1000
      `);
            console.log('✅ base_price column added successfully!');
        } else {
            console.log('✅ base_price column already exists!');
        }

    } catch (error) {
        console.error('❌ Error adding base_price column:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

addBasePriceColumn();
