
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
    console.log('Starting Force Migration...');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Ensure user_id exists in players
        console.log('Checking user_id in players...');
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='user_id') THEN
                    ALTER TABLE players ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
                    RAISE NOTICE 'Added user_id to players';
                END IF;
            END
            $$;
        `);

        // 2. Ensure is_test_data exists in players
        console.log('Checking is_test_data in players...');
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='is_test_data') THEN
                    ALTER TABLE players ADD COLUMN is_test_data BOOLEAN DEFAULT FALSE;
                    CREATE INDEX IF NOT EXISTS idx_players_test_data ON players(is_test_data);
                    RAISE NOTICE 'Added is_test_data to players';
                END IF;
            END
            $$;
        `);

        // 3. Ensure is_test_data exists in teams
        console.log('Checking is_test_data in teams...');
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teams' AND column_name='is_test_data') THEN
                    ALTER TABLE teams ADD COLUMN is_test_data BOOLEAN DEFAULT FALSE;
                    CREATE INDEX IF NOT EXISTS idx_teams_test_data ON teams(is_test_data);
                    RAISE NOTICE 'Added is_test_data to teams';
                END IF;
            END
            $$;
        `);

        // 4. Ensure is_test_data exists in users
        console.log('Checking is_test_data in users...');
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_test_data') THEN
                    ALTER TABLE users ADD COLUMN is_test_data BOOLEAN DEFAULT FALSE;
                    CREATE INDEX IF NOT EXISTS idx_users_test_data ON users(is_test_data);
                    RAISE NOTICE 'Added is_test_data to users';
                END IF;
            END
            $$;
        `);

        // 5. Ensure testgrounds_locked exists in auction_state
        console.log('Checking testgrounds_locked in auction_state...');
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='auction_state' AND column_name='testgrounds_locked') THEN
                    ALTER TABLE auction_state ADD COLUMN testgrounds_locked BOOLEAN DEFAULT FALSE;
                    RAISE NOTICE 'Added testgrounds_locked to auction_state';
                END IF;
            END
            $$;
        `);

        await client.query('COMMIT');
        console.log('✅ Migration completed successfully');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', e);
    } finally {
        client.release();
        pool.end();
    }
}

runMigration();
