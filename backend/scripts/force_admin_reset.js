import pool from '../src/config/database.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

async function forceResetAdmin() {
    console.log('--- FORCING ADMIN PASSWORD RESET TO admin123 ---');
    try {
        const hashedPassword = await bcrypt.hash('admin123', 10);

        // Update any existing admin user
        const res = await pool.query(
            "UPDATE users SET password = $1 WHERE email = 'admin@example.com' RETURNING email",
            [hashedPassword]
        );

        if (res.rows.length === 0) {
            console.log('Admin user not found, inserting...');
            await pool.query(
                "INSERT INTO users (name, email, password, role) VALUES ('Admin User', 'admin@example.com', $1, 'admin')",
                [hashedPassword]
            );
        }

        console.log('✅ Admin password set to: admin123');

        // Verify
        const verify = await pool.query("SELECT password FROM users WHERE email='admin@example.com'");
        const match = await bcrypt.compare('admin123', verify.rows[0].password);
        console.log(`Verification check (admin123): ${match ? 'MATCH' : 'FAIL'}`);

    } catch (err) {
        console.error('Reset Error:', err);
    } finally {
        await pool.end();
    }
}
forceResetAdmin();
