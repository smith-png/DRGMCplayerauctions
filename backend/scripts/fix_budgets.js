
import pool from '../src/config/database.js';

async function fixBudgets() {
    try {
        console.log('🔄 Fixing team budgets...');

        // Update remaining_budget for all teams based on actual sold players
        await pool.query(`
            UPDATE teams t
            SET remaining_budget = t.budget - COALESCE((
                SELECT SUM(p.sold_price)
                FROM players p
                WHERE p.team_id = t.id AND p.status = 'sold'
            ), 0)
        `);

        console.log('✅ Budgets fixed successfully!');
    } catch (err) {
        console.error('❌ Error fixing budgets:', err);
    } finally {
        pool.end();
    }
}

fixBudgets();
