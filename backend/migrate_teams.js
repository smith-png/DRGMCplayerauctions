import pool from './src/config/database.js';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Running migration: Adding logo_url to teams table...');
        await client.query(`
      ALTER TABLE teams 
      ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);
    `);
        console.log('✅ Migration successful: logo_url column added.');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
