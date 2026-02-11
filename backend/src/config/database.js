import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

// Initialize database tables
export async function initializeDatabase() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'viewer' CHECK (role IN ('admin', 'team_owner', 'participant', 'viewer')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Teams table
    await client.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        sport VARCHAR(50) NOT NULL CHECK (sport IN ('cricket', 'futsal', 'volleyball')),
        budget INTEGER DEFAULT 2000,
        remaining_budget INTEGER DEFAULT 2000,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Players table
    await client.query(`
      CREATE TABLE IF NOT EXISTS players (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        sport VARCHAR(50) NOT NULL CHECK (sport IN ('cricket', 'futsal', 'volleyball')),
        year VARCHAR(10) NOT NULL CHECK (year IN ('1st', '2nd', '3rd')),
        photo_url VARCHAR(500),
        stats JSONB,
        base_price INTEGER DEFAULT 50,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'sold', 'unsold', 'eligible', 'auctioning')),
        team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
        sold_price INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Bids table
    await client.query(`
      CREATE TABLE IF NOT EXISTS bids (
        id SERIAL PRIMARY KEY,
        player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
        team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Bid Logs table (Persistent History)
    await client.query(`
      CREATE TABLE IF NOT EXISTS bid_logs (
        id SERIAL PRIMARY KEY,
        player_id INTEGER REFERENCES players(id),
        team_id INTEGER REFERENCES teams(id),
        amount INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        auction_context VARCHAR(50) DEFAULT 'main'
      )
    `);

    // Transactions table (Sale, Release, Adjustments)
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        player_id INTEGER,
        player_name VARCHAR(255),
        team_id INTEGER,
        team_name VARCHAR(255),
        amount INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        metadata JSONB
      )
    `);

    // Auction state table
    await client.query(`
      CREATE TABLE IF NOT EXISTS auction_state (
        id SERIAL PRIMARY KEY,
        current_player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
        current_bid INTEGER,
        current_team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT false,
        sport_min_bids JSONB DEFAULT '{"cricket": 50, "futsal": 50, "volleyball": 50}'::jsonb,
        started_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_registration_open BOOLEAN DEFAULT true,
        animation_duration INTEGER DEFAULT 25,
        animation_type VARCHAR(50) DEFAULT 'confetti',
        bid_increment_rules JSONB DEFAULT '[{"threshold": 0, "increment": 10}, {"threshold": 200, "increment": 50}, {"threshold": 500, "increment": 100}]'::jsonb,
        testgrounds_locked BOOLEAN DEFAULT FALSE
      )
    `);

    await client.query(`
      INSERT INTO auction_state (is_active)
      SELECT false
      WHERE NOT EXISTS (SELECT 1 FROM auction_state LIMIT 1)
    `);

    // Add sport_min_bids column to auction_state if it doesn't exist (Migration)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='auction_state' AND column_name='sport_min_bids') THEN
          ALTER TABLE auction_state ADD COLUMN sport_min_bids JSONB DEFAULT '{"cricket": 50, "futsal": 50, "volleyball": 50}'::jsonb;
        END IF;
      END
      $$;
    `);

    // Add is_registration_open column to auction_state if it doesn't exist (Migration)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='auction_state' AND column_name='is_registration_open') THEN
          ALTER TABLE auction_state ADD COLUMN is_registration_open BOOLEAN DEFAULT true;
        END IF;
      END
      $$;
    `);

    // Add animation_duration column to auction_state if it doesn't exist (Migration)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='auction_state' AND column_name='animation_duration') THEN
          ALTER TABLE auction_state ADD COLUMN animation_duration INTEGER DEFAULT 25;
        END IF;
      END
      $$;
    `);

    // Add is_test_data column to players table (Migration)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='is_test_data') THEN
          ALTER TABLE players ADD COLUMN is_test_data BOOLEAN DEFAULT FALSE;
          CREATE INDEX idx_players_test_data ON players(is_test_data);
        END IF;
      END
      $$;
    `);

    // Add is_test_data column to teams table (Migration)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teams' AND column_name='is_test_data') THEN
          ALTER TABLE teams ADD COLUMN is_test_data BOOLEAN DEFAULT FALSE;
          CREATE INDEX idx_teams_test_data ON teams(is_test_data);
        END IF;
      END
      $$;
    `);

    // Add is_test_data column to users table (Migration)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_test_data') THEN
          ALTER TABLE users ADD COLUMN is_test_data BOOLEAN DEFAULT FALSE;
          CREATE INDEX idx_users_test_data ON users(is_test_data);
        END IF;
      END
      $$;
    `);

    // Add testgrounds_locked column to auction_state (Migration)
    await client.query(`
      ALTER TABLE auction_state ADD COLUMN IF NOT EXISTS testgrounds_locked BOOLEAN DEFAULT FALSE;
    `);

    // Add animation_type column to auction_state (Migration)
    await client.query(`
      ALTER TABLE auction_state ADD COLUMN IF NOT EXISTS animation_type VARCHAR(50) DEFAULT 'confetti';
    `);

    // Add bid_increment_rules column to auction_state (Migration)
    await client.query(`
      ALTER TABLE auction_state ADD COLUMN IF NOT EXISTS bid_increment_rules JSONB DEFAULT '[
        {"threshold": 0, "increment": 10},
        {"threshold": 200, "increment": 50},
        {"threshold": 500, "increment": 100}
      ]'::jsonb;
    `);

    // Migration: Convert DECIMAL to INTEGER (Rounding)
    console.log('Migrating financial columns to INTEGER...');
    await client.query(`
      ALTER TABLE teams ALTER COLUMN budget TYPE INTEGER USING ROUND(budget)::INTEGER;
      ALTER TABLE teams ALTER COLUMN remaining_budget TYPE INTEGER USING ROUND(remaining_budget)::INTEGER;
      ALTER TABLE players ALTER COLUMN base_price TYPE INTEGER USING ROUND(base_price)::INTEGER;
      ALTER TABLE players ALTER COLUMN sold_price TYPE INTEGER USING ROUND(sold_price)::INTEGER;
      ALTER TABLE bids ALTER COLUMN amount TYPE INTEGER USING ROUND(amount)::INTEGER;
      ALTER TABLE auction_state ALTER COLUMN current_bid TYPE INTEGER USING ROUND(current_bid)::INTEGER;
    `);

    // Create performance indexes
    console.log('Creating performance indexes...');

    // Players table indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_players_sport ON players(sport);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_players_status ON players(status);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_players_sport_status ON players(sport, status);
    `);

    // Teams table indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_teams_sport ON teams(sport);
    `);

    // Bids table indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bids_player_id ON bids(player_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bids_team_id ON bids(team_id);
    `);

    console.log('✅ Performance indexes created successfully');

    await client.query('COMMIT');
    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default pool;
