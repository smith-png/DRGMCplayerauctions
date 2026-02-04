import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from backend root
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function addTeamOwnerAssignment() {
    const client = await pool.connect();
    try {
        console.log('🔄 Starting team owner assignment migration...');
        await client.query('BEGIN');

        // 1. Add team_id column to users table
        console.log('1. Adding team_id column to users table...');
        const columnCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' AND column_name='team_id'
        `);

        if (columnCheck.rows.length === 0) {
            await client.query(`
                ALTER TABLE users 
                ADD COLUMN team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL
            `);
            console.log('   ✅ team_id column added');
        } else {
            console.log('   ℹ️  team_id column already exists');
        }

        // 2. Create unique index to ensure one owner per team
        console.log('2. Creating unique constraint for team ownership...');
        const indexCheck = await client.query(`
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename='users' AND indexname='unique_team_owner'
        `);

        if (indexCheck.rows.length === 0) {
            await client.query(`
                CREATE UNIQUE INDEX unique_team_owner ON users(team_id) 
                WHERE role = 'team_owner' AND team_id IS NOT NULL
            `);
            console.log('   ✅ Unique constraint created');
        } else {
            console.log('   ℹ️  Unique constraint already exists');
        }

        await client.query('COMMIT');
        console.log('✅ Team owner assignment migration completed successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        client.release();
        pool.end();
    }
}

addTeamOwnerAssignment();
