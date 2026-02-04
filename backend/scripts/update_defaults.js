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

async function updateDefaults() {
    const client = await pool.connect();
    try {
        console.log('Updating default values...');

        // Update base_price default to 50
        await client.query(`
      ALTER TABLE players 
      ALTER COLUMN base_price SET DEFAULT 50
    `);
        console.log('✅ Updated base_price default to 50');

        // Update existing players' base_price if it's 1000 (old default)
        const result = await client.query(`
      UPDATE players 
      SET base_price = 50 
      WHERE base_price = 1000 OR base_price IS NULL
    `);
        console.log(`✅ Updated ${result.rowCount} existing players to base_price 50`);

        // Update team budgets
        await client.query(`
      UPDATE teams 
      SET budget = 2000, remaining_budget = 2000
    `);
        console.log('✅ Updated all team budgets to 2000');

        // Update defaults for future teams
        await client.query(`
      ALTER TABLE teams
      ALTER COLUMN budget SET DEFAULT 2000
    `);
        await client.query(`
      ALTER TABLE teams
      ALTER COLUMN remaining_budget SET DEFAULT 2000
    `);
        console.log('✅ Updated team budget defaults to 2000');

    } catch (error) {
        console.error('❌ Error updating defaults:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

updateDefaults();
