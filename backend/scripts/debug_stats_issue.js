
import pool from '../src/config/database.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

async function checkData() {
    try {
        console.log("--- TEAMS ---");
        const teams = await pool.query('SELECT id, name, sport, is_test_data FROM teams');
        console.table(teams.rows);

        console.log("\n--- USERS ---");
        const users = await pool.query('SELECT id, email, name, role, team_id FROM users');
        console.table(users.rows);

        console.log("\n--- AUCTION STATE ---");
        const state = await pool.query('SELECT * FROM auction_state');
        console.table(state.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkData();
