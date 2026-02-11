import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
});

async function check() {
    try {
        await pool.query('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS player_name VARCHAR(255), ADD COLUMN IF NOT EXISTS team_name VARCHAR(255)');
        const result = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log("Tables:", result.rows.map(r => r.table_name));

        const transCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'transactions'");
        console.log("Transactions Columns:", transCols.rows.map(r => r.column_name));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
