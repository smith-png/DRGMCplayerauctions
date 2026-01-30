import pool from './src/config/database.js';
import bcrypt from 'bcrypt';

async function seedUser() {
    try {
        const client = await pool.connect();
        try {
            const hashedPassword = await bcrypt.hash('password123', 10);

            // Check if user exists
            const checkRes = await client.query("SELECT * FROM users WHERE email = 'test@example.com'");
            if (checkRes.rows.length > 0) {
                console.log('Test user already exists');
                return;
            }

            const res = await client.query(`
                INSERT INTO users (email, password, name, role)
                VALUES ($1, $2, $3, $4)
                RETURNING id, name, email, role
            `, ['test@example.com', hashedPassword, 'Test User', 'participant']);

            console.log('✅ Test user created:', res.rows[0]);
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error seeding user:', err);
    } finally {
        await pool.end();
    }
}

seedUser();
