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
        budget DECIMAL(10, 2) DEFAULT 2000,
        remaining_budget DECIMAL(10, 2) DEFAULT 2000,
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
        base_price DECIMAL(10, 2) DEFAULT 50,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'sold', 'unsold', 'eligible', 'auctioning')),
        team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
        sold_price DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Bids table
    await client.query(`
      CREATE TABLE IF NOT EXISTS bids (
        id SERIAL PRIMARY KEY,
        player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
        team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL,
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

    // Auction state table
    await client.query(`
      CREATE TABLE IF NOT EXISTS auction_state (
        id SERIAL PRIMARY KEY,
        current_player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
        current_bid DECIMAL(10, 2),
        current_team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT false,
        sport_min_bids JSONB DEFAULT '{"cricket": 50, "futsal": 50, "volleyball": 50}'::jsonb,
        started_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_registration_open BOOLEAN DEFAULT true
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
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='auction_state' AND column_name='testgrounds_locked') THEN
          ALTER TABLE auction_state ADD COLUMN testgrounds_locked BOOLEAN DEFAULT FALSE;
        END IF;
      END
      $$;
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
