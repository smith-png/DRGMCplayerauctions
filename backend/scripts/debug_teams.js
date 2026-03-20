
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkTeams() {
    try {
        console.log('Connecting to database...');
        // Query to get column names
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'teams'
        `);
        console.log('\n--- TEAMS TABLE COLUMNS ---');
        res.rows.forEach(col => {
            console.log(`${col.column_name} (${col.data_type})`);
        });

        // Also check if there's a separate team_owners table or similar
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('\n--- ALL TABLES ---');
        tables.rows.forEach(t => console.log(t.table_name));
        // Check team_owners table
        console.log('\n--- TEAM_OWNERS TABLE COLUMNS ---');
        const ownersRes = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'team_owners'
        `);
        ownersRes.rows.forEach(col => console.log(`${col.column_name} (${col.data_type})`));

        // Check users table to see if it has team info
        console.log('\n--- USERS TABLE COLUMNS ---');
        const usersRes = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users'
        `);
        usersRes.rows.forEach(col => console.log(`${col.column_name} (${col.data_type})`));

        // Check actual data in team_owners
        console.log('\n--- TEAM_OWNERS DATA ---');
        const ownersData = await pool.query('SELECT * FROM team_owners LIMIT 5');
        console.table(ownersData.rows);

        // Check actual data in users who are team owners
        console.log('\n--- USERS (Team Owners) ---');
        const teamOwners = await pool.query("SELECT id, name, email, role, team_id FROM users WHERE role = 'team_owner' LIMIT 5");
        console.table(teamOwners.rows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkTeams();
