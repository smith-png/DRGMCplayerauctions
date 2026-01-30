import pool from '../src/config/database.js'; // Using the pool export from initDb (which exports the pool from database.js usually? Wait, initDb exports pool at the end)

// Actually, initDb.js exports pool as default.
// Let's verify imports.
// In initDb.js: export default pool;
// So import pool from '../src/config/initDb.js' is correct if file is in backend/migrations/

async function migrate() {
    console.log('🔄 Running migration: Add logo_url to teams table...');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if column exists
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='teams' AND column_name='logo_url'
        `);

        if (res.rows.length === 0) {
            await client.query(`
                ALTER TABLE teams 
                ADD COLUMN logo_url VARCHAR(500)
            `);
            console.log('✅ Added logo_url column to teams table');
        } else {
            console.log('ℹ️ logo_url column already exists');
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error);
    } finally {
        client.release();
        // Close pool to let script exit
        // pool.end(); // pool from pg is pool, not client.
        // The imported 'pool' is actually the pg Pool instance. 
        process.exit();
    }
}

migrate();
