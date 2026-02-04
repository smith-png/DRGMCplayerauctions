import pool from '../config/database.js';

async function testStartAuction() {
    try {
        // Get an eligible player
        const result = await pool.query("SELECT id, name FROM players WHERE status = 'eligible' LIMIT 1");

        if (result.rows.length === 0) {
            console.log('No eligible players found.');
            process.exit(0);
        }

        const player = result.rows[0];
        console.log('Testing with player:', player);

        // Simulate starting auction
        await pool.query(
            "UPDATE players SET status = $1, base_price = $2 WHERE id = $3",
            ['auctioning', 1000, player.id]
        );

        console.log('✅ Auction started successfully for player:', player.name);

        // Check the result
        const check = await pool.query("SELECT * FROM players WHERE status = 'auctioning'");
        console.log('Current auctioning player:', check.rows[0]);

        // Reset
        await pool.query("UPDATE players SET status = 'eligible' WHERE id = $1", [player.id]);
        console.log('✅ Test complete, player reset to eligible');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

testStartAuction();
