import pool from './src/config/database.js';
import bcrypt from 'bcrypt';

async function seedAdmin() {
    try {
        const client = await pool.connect();
        try {
            const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
            const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

            // Check if admin exists
            const checkRes = await client.query("SELECT * FROM users WHERE email = $1", [adminEmail]);
            if (checkRes.rows.length > 0) {
                console.log(`✅ Admin user (${adminEmail}) already exists. Skipping creation to prevent password reset.`);
                return;
            }

            const hashedPassword = await bcrypt.hash(adminPassword, 10);

            const res = await client.query(`
                INSERT INTO users (email, password, name, role)
                VALUES ($1, $2, $3, $4)
                RETURNING id, name, email, role
            `, [adminEmail, hashedPassword, 'Admin User', 'admin']);

            console.log('✅ Admin user created successfully:');
            console.log(`Email: ${adminEmail}`);
            console.log(`Password: [HIDDEN]`);
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error seeding admin:', err);
    }
}

// Export
export default seedAdmin;
