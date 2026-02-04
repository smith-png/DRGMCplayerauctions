import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

console.log('DATABASE_URL loaded:', process.env.DATABASE_URL ? 'YES' : 'NO');

async function ensureAuctionState() {
    let pool;
    try {
        // Dynamic import to ensure env is loaded first
        const module = await import('../src/config/database.js');
        pool = module.default;

        console.log('🔍 Checking auction_state table...');
        const res = await pool.query('SELECT * FROM auction_state');

        if (res.rows.length === 0) {
            console.log('⚠️ No row found. Inserting default row...');
            await pool.query('INSERT INTO auction_state (is_active, is_registration_open) VALUES (false, true)');
            console.log('✅ Default row inserted.');
        } else {
            console.log(`✅ Found ${res.rows.length} row(s).`);
            console.log('Row 0:', res.rows[0]);
            if (res.rows.length > 1) {
                console.log('⚠️ MULTIPLE ROWS FOUND! This might be the bug. Deleting extras...');
                const idToKeep = res.rows[0].id;
                await pool.query('DELETE FROM auction_state WHERE id != $1', [idToKeep]);
                console.log('✅ Extras deleted.');
            }
        }
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        if (pool) await pool.end();
    }
}

ensureAuctionState();
