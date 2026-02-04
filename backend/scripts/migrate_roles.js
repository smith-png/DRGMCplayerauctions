
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from backend root
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrateRoles() {
    const client = await pool.connect();
    try {
        console.log('🔄 Starting role migration...');
        await client.query('BEGIN');

        // 1. Drop existing CHECK constraint on users.role
        console.log('1. Dropping existing role constraint...');
        // We need to find the constraint name first, but usually it's auto-generated.
        // However, since we defined it as inline CHECK, we might need to alter the column type logic
        // or simply drop the constraint if we can find its name.

        // Easier approach for inline checks in some PG versions/setups is ensuring valid data then adding new check.
        // But to update data that violates current check (if we were adding), it's fine.
        // Here we are renaming 'auctioneer' -> 'team_owner', so we are moving FROM a valid state.
        // BUT 'team_owner' is NOT valid in the current schema. So we MUST drop the constraint first.

        // Attempt to drop constraint by name if known (often users_role_check) or generic alter
        // Since we created it with `role VARCHAR(50) ... CHECK (...)` it likely has a generated name.

        // Let's try to remove the constraint by dropping it. 
        // If we don't know the name, we can query for it.
        const constraintRes = await client.query(`
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'users'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%role%';
    `);

        if (constraintRes.rows.length > 0) {
            const constraintName = constraintRes.rows[0].conname;
            console.log(`   Found constraint: ${constraintName}`);
            await client.query(`ALTER TABLE users DROP CONSTRAINT "${constraintName}"`);
        } else {
            console.log('   No explicit constraint found (might be older validation), proceeding...');
        }

        // 2. Update existing data
        console.log("2. Renaming 'auctioneer' to 'team_owner'...");
        const updateRes = await client.query(`
        UPDATE users 
        SET role = 'team_owner' 
        WHERE role = 'auctioneer'
    `);
        console.log(`   Updated ${updateRes.rowCount} users.`);

        // 3. Add new CHECK constraint
        console.log("3. Adding new constraint...");
        await client.query(`
        ALTER TABLE users 
        ADD CONSTRAINT users_role_check 
        CHECK (role IN ('admin', 'team_owner', 'participant', 'viewer'))
    `);

        // 4. Update the DEFAULT value if needed (it was 'viewer', so it's fine, but good to be safe about schema definition)
        // The previous creation script had `DEFAULT 'viewer'`, which matches valid roles. No change needed.

        await client.query('COMMIT');
        console.log('✅ Role migration completed successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        client.release();
        pool.end();
    }
}

migrateRoles();
