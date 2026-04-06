import pool from './src/config/database.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

async function seedAdmin() {
    try {
        const client = await pool.connect();
        try {
            // 🛡️ Sentinel: Never hardcode admin passwords! Read from env or generate secure default
            const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
            let adminPassword = process.env.ADMIN_PASSWORD;
            let isGenerated = false;

            if (!adminPassword) {
                adminPassword = crypto.randomBytes(16).toString('hex');
                isGenerated = true;
            }

            const hashedPassword = await bcrypt.hash(adminPassword, 10);

            // Check if admin exists
            const checkRes = await client.query("SELECT * FROM users WHERE email = $1", [adminEmail]);
            if (checkRes.rows.length > 0) {
                // 🛡️ Sentinel: Prevent accidental overwrite of legitimately changed admin password
                if (process.env.RESET_ADMIN_PASSWORD === 'true') {
                    console.log('🔄 Admin user exists. Resetting password...');
                    await client.query("UPDATE users SET password = $1 WHERE email = $2", [hashedPassword, adminEmail]);
                    console.log('✅ Admin password reset successfully.');
                    console.log(`Email: ${adminEmail}`);
                    if (isGenerated) {
                        console.log(`Password: ${adminPassword} (auto-generated, please save this)`);
                    } else {
                        console.log(`Password: [provided via ADMIN_PASSWORD]`);
                    }
                } else {
                    console.log('🛡️ Admin user already exists. Password not reset (set RESET_ADMIN_PASSWORD=true to force).');
                }
                return;
            }

            const res = await client.query(`
                INSERT INTO users (email, password, name, role)
                VALUES ($1, $2, $3, $4)
                RETURNING id, name, email, role
            `, [adminEmail, hashedPassword, 'Admin User', 'admin']);

            console.log('✅ Admin user created successfully:');
            console.log(`Email: ${adminEmail}`);
            if (isGenerated) {
                console.log(`Password: ${adminPassword} (auto-generated, please save this)`);
            } else {
                console.log(`Password: [provided via ADMIN_PASSWORD]`);
            }
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error seeding admin:', err);
    }
}

// Export
export default seedAdmin;
