import pool from './src/config/database.js';

const createBidLogsTable = async () => {
    try {
        console.log('🔄 Creating bid_logs table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS bid_logs (
                id SERIAL PRIMARY KEY,
                player_id INTEGER REFERENCES players(id),
                team_id INTEGER REFERENCES teams(id),
                amount INTEGER NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                auction_context VARCHAR(50) DEFAULT 'main'
            );
        `);
        console.log('✅ bid_logs table created successfully');

        // Optional: Backfill from existing bids if any
        await pool.query(`
            INSERT INTO bid_logs (player_id, team_id, amount, created_at)
            SELECT player_id, team_id, amount, created_at FROM bids
            ON CONFLICT DO NOTHING;
        `);
        console.log('✅ Backfilled existing bids into bid_logs');

    } catch (error) {
        console.error('❌ Error creating bid_logs table:', error);
    } finally {
        // Only end the pool if we created it, but here we imported it.
        // Ending the imported pool might kill the app if running? 
        // But this is a standalone script, so we shoud end it to exit.
        await pool.end();
    }
};

createBidLogsTable();
