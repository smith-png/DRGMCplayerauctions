import pool from './src/config/database.js';
import dotenv from 'dotenv';
dotenv.config();

async function checkTeams() {
    try {
        const res = await pool.query('SELECT * FROM teams');
        console.log('Teams in DB:', res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
checkTeams();
