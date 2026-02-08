import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv'; // Need dotenv to expand env vars

// Setup __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from backend root (.env)
// Script is in backend/scripts/export_players.js
// .env is in backend/.env
const envPath = path.join(__dirname, '../.env');
console.log(`Loading .env from ${envPath}`);
dotenv.config({ path: envPath });

const { Pool } = pg;

// Use process.env directly
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function exportCricketPlayers() {
    try {
        console.log('Connecting to database...');
        const client = await pool.connect();

        console.log("Fetching cricket players...");
        const res = await client.query(
            "SELECT * FROM players WHERE sport = 'cricket' ORDER BY id"
        );

        const players = res.rows;
        console.log(`Found ${players.length} cricket players.`);

        if (players.length === 0) {
            console.log("No players found.");
            client.release();
            await pool.end();
            return;
        }

        // Define CSV Headers
        const headers = [
            'ID', 'Name', 'Sport', 'Year', 'Status', 'Base Price', 'Sold Price', 'Team ID',
            'Role', 'Batting Style', 'Bowling Style', 'Photo URL'
        ];

        // Create CSV Content
        const csvRows = [];
        csvRows.push(headers.join(','));

        for (const player of players) {
            let stats = {};
            if (typeof player.stats === 'string') {
                try {
                    stats = JSON.parse(player.stats);
                } catch (e) {
                    console.error(`Failed to parse stats for player ${player.id}`);
                }
            } else if (typeof player.stats === 'object') {
                stats = player.stats || {};
            }

            const row = [
                player.id,
                `"${player.name}"`, // Quote name to handle commas
                player.sport,
                player.year,
                player.status,
                player.base_price,
                player.sold_price || '',
                player.team_id || '',
                stats.role || '',
                stats.battingStyle || '',
                stats.bowlingStyle || '',
                player.photo_url || ''
            ];

            csvRows.push(row.join(','));
        }

        const csvContent = csvRows.join('\n');

        // Output path: Project root (where backend folder is) -> one level up from script -> one level up from backend -> root
        // Actually, let's put it in backend root for simplicity first, or user asked for "an excel file".
        // I'll put it in `backend/cricket_players_export.csv`
        const outputPath = path.join(__dirname, '../cricket_players_export.csv');

        fs.writeFileSync(outputPath, csvContent);
        console.log(`Successfully exported data to ${outputPath}`);

        client.release();
    } catch (err) {
        console.error('Error exporting players:', err);
    } finally {
        await pool.end();
    }
}

exportCricketPlayers();
