import pool from '../src/config/database.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

async function resetAdminPassword() {
    const email = 'admin@example.com';
    const password = 'admin'; // Keeping it simple for the user

    try {
        console.log(`Resetting password for: ${email} to '${password}'`);
        const hashedPassword = await bcrypt.hash(password, 10);

        // First check if user exists
        const check = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (check.rows.length === 0) {
            console.log('User not found. Creating admin user...');
            await pool.query(
                'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)',
                ['Admin User', email, hashedPassword, 'admin']
            );
            console.log('✅ Admin user created successfully');
        } else {
            const result = await pool.query( // Using result variable
                'UPDATE users SET password = $1, role = $2 WHERE email = $3 RETURNING id, email',
                [hashedPassword, 'admin', email]
            );
            console.log('✅ Admin password updated successfully');
        }

    } catch (err) {
        console.error('Error resetting password:', err);
    } finally {
        await pool.end();
    }
}

resetAdminPassword();
