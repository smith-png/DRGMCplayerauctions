import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function check() {
    try {
        const colsRes = await pool.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_name IN ('teams', 'users')");
        console.log('SCHEMA_COLUMNS:', JSON.stringify(colsRes.rows));

        const teamsRes = await pool.query('SELECT * FROM teams LIMIT 5');
        console.log('TEAMS_SAMPLE:', JSON.stringify(teamsRes.rows));

        const ownersRes = await pool.query("SELECT id, name, role, team_id FROM users WHERE role = 'team_owner'");
        console.log('OWNERS_DATA:', JSON.stringify(ownersRes.rows));

    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        await pool.end();
    }
}

check();
