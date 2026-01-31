import pool from '../src/config/database.js';

async function checkUser(email) {
    try {
        console.log(`Checking for user: ${email}`);
        const result = await pool.query('SELECT id, name, email, role, password FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            console.log('❌ User not found');
        } else {
            console.log('✅ User found:');
            console.table(result.rows.map(u => ({ ...u, password: u.password ? '[HASHED]' : 'MISSING' })));
        }
    } catch (err) {
        console.error('Error checking user:', err);
    } finally {
        pool.end();
    }
}

checkUser('aryan@auction.com');
