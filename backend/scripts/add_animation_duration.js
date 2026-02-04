const pool = require('../src/config/database');

async function addAnimationDuration() {
    try {
        console.log('Adding animation_duration column to auction_state table...');

        // Add column if not exists
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='auction_state' AND column_name='animation_duration') THEN 
                    ALTER TABLE auction_state ADD COLUMN animation_duration INTEGER DEFAULT 25; 
                END IF; 
            END 
            $$;
        `);

        // Ensure default value is set for existing row
        await pool.query('UPDATE auction_state SET animation_duration = 25 WHERE animation_duration IS NULL');

        console.log('Successfully added animation_duration column.');
    } catch (error) {
        console.error('Error adding column:', error);
    } finally {
        await pool.end();
    }
}

addAnimationDuration();
