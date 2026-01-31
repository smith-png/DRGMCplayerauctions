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

    // Auction state table
    await client.query(`
      CREATE TABLE IF NOT EXISTS auction_state (
        id SERIAL PRIMARY KEY,
        current_player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
        current_bid DECIMAL(10, 2),
        current_team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT false,
        started_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default auction state if not exists
    await client.query(`
      INSERT INTO auction_state (is_active)
      SELECT false
      WHERE NOT EXISTS (SELECT 1 FROM auction_state LIMIT 1)
    `);

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
