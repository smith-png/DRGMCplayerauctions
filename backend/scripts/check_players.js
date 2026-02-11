import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function check() {
    try {
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'players'");
        console.log('PLAYER_COLUMNS:', JSON.stringify(res.rows));
    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        await pool.end();
    }
}

check();
