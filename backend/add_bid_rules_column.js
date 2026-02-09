import pool from './src/config/database.js';

const runMigration = async () => {
    try {
        console.log('Migrating database...');

        // Add bid_increment_rules column if it doesn't exist
        await pool.query(`
            ALTER TABLE auction_state 
            ADD COLUMN IF NOT EXISTS bid_increment_rules JSONB DEFAULT '[
                { "threshold": 0, "increment": 10 },
                { "threshold": 200, "increment": 50 },
                { "threshold": 500, "increment": 100 }
            ]'::jsonb;
        `);

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

runMigration();
