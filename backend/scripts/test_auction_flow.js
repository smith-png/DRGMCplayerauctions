
// Using node-fetch or axios to hit the local API would be best, but we can verify DB state directly.
// Actually, let's verify DB state changes via script.

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function simulateAuction() {
    try {
        const client = await pool.connect();
        try {
            console.log('--- DB Check ---');

            // 1. Find any player
            const pRes = await client.query('SELECT * FROM players LIMIT 1');
            if (pRes.rows.length === 0) {
                console.log('No players found.');
                return;
            }
            const player = pRes.rows[0];
            console.log(`Test Player: ${player.name} (${player.id}), Status: ${player.status}`);

            // 2. Set to 'eligible'
            await client.query("UPDATE players SET status = 'eligible' WHERE id = $1", [player.id]);
            console.log('Reset to eligible.');

            // 3. Set to 'auctioning' (simulating startAuction)
            await client.query("UPDATE players SET status = 'auctioning' WHERE id = $1", [player.id]);
            console.log("Updated to 'auctioning'.");

            // 4. Verify fetch (simulating getCurrentAuction)
            const checkRes = await client.query("SELECT * FROM players WHERE status = 'auctioning'");
            console.log(`Found ${checkRes.rows.length} players with status 'auctioning'.`);

            if (checkRes.rows.length > 0) {
                console.log('✅ DB Query works successfully.');
            } else {
                console.log('❌ DB Query failed to find the player just updated.');
            }

        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

simulateAuction();
