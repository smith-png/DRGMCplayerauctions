import pool from './src/config/database.js';
import bcrypt from 'bcrypt';

async function seedAdmin() {
    try {
        const client = await pool.connect();
        try {
            const hashedPassword = await bcrypt.hash('admin123', 10);

            // Check if admin exists
            const checkRes = await client.query("SELECT * FROM users WHERE email = 'admin@example.com'");
            if (checkRes.rows.length > 0) {
                console.log('🔄 Admin user exists. Resetting password...');
                await client.query("UPDATE users SET password = $1 WHERE email = 'admin@example.com'", [hashedPassword]);
                console.log('✅ Admin password reset successfully.');
                console.log('Email: admin@example.com');
                console.log('Password: admin123');
                return;
            }

            const res = await client.query(`
                INSERT INTO users (email, password, name, role)
                VALUES ($1, $2, $3, $4)
                RETURNING id, name, email, role
            `, ['admin@example.com', hashedPassword, 'Admin User', 'admin']);

            console.log('✅ Admin user created successfully:');
            console.log('Email: admin@example.com');
            console.log('Password: admin123');
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error seeding admin:', err);
    }
}

// Export
export default seedAdmin;
