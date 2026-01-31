
import pool from '../src/config/database.js';

async function checkTeamOwners() {
    try {
        const res = await pool.query("SELECT id, name, email, role FROM users WHERE role = 'team_owner'");
        console.log('--- Team Owners ---');
        if (res.rows.length === 0) {
            console.log('No users found with role "team_owner".');
        } else {
            res.rows.forEach(u => {
                console.log(`ID: ${u.id} | Name: ${u.name} | Email: ${u.email} | Role: ${u.role}`);
            });
        }
    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        pool.end();
    }
}

checkTeamOwners();
