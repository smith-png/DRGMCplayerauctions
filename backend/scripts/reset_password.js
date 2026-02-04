import pool from '../src/config/database.js';
import bcrypt from 'bcrypt';

async function resetPassword(email, newPassword) {
    try {
        console.log(`Resetting password for: ${email}`);
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const result = await pool.query(
            'UPDATE users SET password = $1 WHERE email = $2 RETURNING id, email',
            [hashedPassword, email]
        );

        if (result.rows.length === 0) {
            console.log('❌ User not found');
        } else {
            console.log(`✅ Password reset successfully for ${email}`);
        }
    } catch (err) {
        console.error('Error resetting password:', err);
    } finally {
        pool.end();
    }
}

resetPassword('aryan@auction.com', 'password123');
