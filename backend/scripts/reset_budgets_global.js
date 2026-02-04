import pool from '../src/config/database.js';

const resetBudgets = async () => {
    try {
        console.log('🔄 Resetting all team budgets to 2000...');

        await pool.query('UPDATE teams SET budget = 2000, remaining_budget = 2000');

        console.log('✅ Budgets reset successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error resetting budgets:', error);
        process.exit(1);
    }
};

resetBudgets();
