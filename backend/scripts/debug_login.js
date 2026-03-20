import pool from '../src/config/database.js';
import bcrypt from 'bcrypt';

async function debugSystem() {
    try {
        console.log('--- DEBUG SYSTEM ---');

        // 1. Check Users
        const users = await pool.query("SELECT id, email, role, password FROM users WHERE email = 'admin@example.com'");
        console.log(`Found ${users.rows.length} admin user(s).`);
        if (users.rows.length > 0) {
            const u = users.rows[0];
            console.log(`User: ${u.email}, Role: ${u.role}, ID: ${u.id}`);
            // Check if password matches 'admin123'
            const match123 = await bcrypt.compare('admin123', u.password);
            console.log(`Password matches 'admin123': ${match123}`);
            const matchAdmin = await bcrypt.compare('admin', u.password);
            console.log(`Password matches 'admin': ${matchAdmin}`);
        } else {
            console.log('CRITICAL: Admin user not found!');
        }

        // 2. Check Auction State
        try {
            const state = await pool.query("SELECT * FROM auction_state");
            console.log(`Auction State Rows: ${state.rows.length}`);
            if (state.rows.length === 0) {
                console.log('Auction State table is empty. Inserting default...');
                await pool.query("INSERT INTO auction_state (is_active) VALUES (false)");
                console.log('Inserted default auction state.');
            } else {
                console.log('Auction State:', state.rows[0]);
            }
        } catch (err) {
            console.error('Error querying auction_state:', err.message);
        }

    } catch (err) {
        console.error('Debug Error:', err);
    } finally {
        await pool.end();
    }
}

debugSystem();
