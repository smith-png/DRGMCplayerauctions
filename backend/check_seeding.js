import pool from './src/config/database.js';

async function check() {
    try {
        const users = await pool.query("SELECT id, email, role, name FROM users");
        console.log('--- USERS ---');
        console.table(users.rows);

        const teams = await pool.query("SELECT id, name, sport FROM teams");
        console.log('\n--- TEAMS ---');
        console.table(teams.rows);

        const players = await pool.query("SELECT id, name, sport, status FROM players");
        console.log('\n--- PLAYERS (Count: ' + players.rows.length + ') ---');
        // console.table(players.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

check();
