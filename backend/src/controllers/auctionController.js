import pool from '../config/database.js';

// Start auction for a player
export const startAuction = async (req, res) => {
    try {
        console.log('=== START AUCTION REQUEST ===');
        console.log('Request body:', req.body);
        console.log('Request user:', req.user);

        const { playerId, basePrice } = req.body;

        if (!playerId) {
            console.log('❌ Error: No playerId provided');
            return res.status(400).json({ error: 'Player ID is required' });
        }

        console.log(`✅ Starting auction for player ID: ${playerId}`);

        // Check if player exists
        const playerResult = await pool.query(
            'SELECT * FROM players WHERE id = $1',
            [playerId]
        );

        console.log(`Found ${playerResult.rows.length} player(s)`);

        if (playerResult.rows.length === 0) {
            console.log('❌ Error: Player not found');
            return res.status(404).json({ error: 'Player not found' });
        }

        const player = playerResult.rows[0];
        console.log('Player details:', { id: player.id, name: player.name, status: player.status });

        // Check if player is already sold
        if (player.status === 'sold') {
            console.log('❌ Error: Player already sold');
            return res.status(400).json({ error: 'Player is already sold' });
        }

        // Update player status to 'auctioning'
        const finalBasePrice = basePrice || player.base_price || 50;
        console.log(`Setting base price to: ${finalBasePrice}`);

        await pool.query(
            'UPDATE players SET status = $1, base_price = $2 WHERE id = $3',
            ['auctioning', finalBasePrice, playerId]
        );

        console.log('✅ Player status updated to auctioning');

        res.json({
            message: 'Auction started successfully',
            player: {
                ...player,
                status: 'auctioning',
                base_price: finalBasePrice
            }
        });

        console.log('=== AUCTION STARTED SUCCESSFULLY ===');
    } catch (error) {
        console.error('❌ START AUCTION ERROR:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to start auction', details: error.message });
    }
};

// Place a bid
export const placeBid = async (req, res) => {
    try {
        console.log('=== PLACE BID REQUEST ===');
        console.log('Request body:', req.body);

        const { playerId, teamId, bidAmount } = req.body;

        if (!playerId || !teamId || !bidAmount) {
            console.log('❌ Missing required fields');
            return res.status(400).json({ error: 'Player ID, team ID, and bid amount are required' });
        }

        console.log(`✅ Placing bid: Player ${playerId}, Team ${teamId}, Amount ${bidAmount}`);

        // Insert bid into database
        const result = await pool.query(
            'INSERT INTO bids (player_id, team_id, amount) VALUES ($1, $2, $3) RETURNING *',
            [playerId, teamId, bidAmount]
        );

        console.log('✅ Bid placed successfully:', result.rows[0]);

        res.json({
            message: 'Bid placed successfully',
            bid: result.rows[0]
        });
    } catch (error) {
        console.error('❌ Place bid error:', error);
        res.status(500).json({ error: 'Failed to place bid', details: error.message });
    }
};

// Get current auction details including global state
export const getCurrentAuction = async (req, res) => {
    try {
        // Get global auction state
        const stateResult = await pool.query('SELECT is_active FROM auction_state LIMIT 1');
        const isAuctionActive = stateResult.rows[0]?.is_active || false;

        // Get the player currently being auctioned
        const result = await pool.query(
            'SELECT * FROM players WHERE status = $1 LIMIT 1',
            ['auctioning']
        );

        if (result.rows.length === 0) {
            return res.json({
                currentAuction: null,
                isAuctionActive
            });
        }

        const player = result.rows[0];

        // Get current highest bid for this player
        const bidResult = await pool.query(
            `SELECT b.*, t.name as team_name 
             FROM bids b
             JOIN teams t ON b.team_id = t.id
             WHERE b.player_id = $1 
             ORDER BY b.amount DESC LIMIT 1`,
            [player.id]
        );

        res.json({
            currentAuction: {
                player,
                highestBid: bidResult.rows[0] || null
            },
            isAuctionActive
        });
    } catch (error) {
        console.error('Get current auction error:', error);
        res.status(500).json({ error: 'Failed to get current auction' });
    }
};

// Toggle global auction state
export const toggleAuctionState = async (req, res) => {
    try {
        const { isActive } = req.body;

        await pool.query(
            'UPDATE auction_state SET is_active = $1',
            [isActive]
        );

        res.json({ message: 'Auction state updated successfully', isActive });
    } catch (error) {
        console.error('Toggle auction state error:', error);
        res.status(500).json({ error: 'Failed to update auction state' });
    }
};

// Get global auction state
export const getAuctionState = async (req, res) => {
    try {
        const result = await pool.query('SELECT is_active FROM auction_state LIMIT 1');
        res.json({ isActive: result.rows[0]?.is_active || false });
    } catch (error) {
        console.error('Get auction state error:', error);
        res.status(500).json({ error: 'Failed to get auction state' });
    }
};

// Mark player as sold
export const markPlayerSold = async (req, res) => {
    try {
        const { playerId, teamId, finalPrice } = req.body;

        if (!playerId || !teamId || !finalPrice) {
            return res.status(400).json({ error: 'Player ID, team ID, and final price are required' });
        }

        // Update player status to sold
        await pool.query(
            'UPDATE players SET status = $1, team_id = $2, sold_price = $3 WHERE id = $4',
            ['sold', teamId, finalPrice, playerId]
        );

        res.json({ message: 'Player marked as sold successfully' });
    } catch (error) {
        console.error('Mark player sold error:', error);
        res.status(500).json({ error: 'Failed to mark player as sold' });
    }
};

// Mark player as unsold
export const markPlayerUnsold = async (req, res) => {
    try {
        console.log('=== MARK PLAYER UNSOLD REQUEST ===');
        console.log('Request body:', req.body);

        const { playerId } = req.body;

        if (!playerId) {
            return res.status(400).json({ error: 'Player ID is required' });
        }

        console.log(`Marking player ${playerId} as unsold`);

        // Update player status to unsold
        await pool.query(
            'UPDATE players SET status = $1, team_id = NULL, sold_price = NULL WHERE id = $2',
            ['unsold', playerId]
        );

        console.log('✅ Player marked as unsold');

        res.json({ message: 'Player marked as unsold successfully' });
    } catch (error) {
        console.error('❌ Mark player unsold error:', error);
        res.status(500).json({ error: 'Failed to mark player as unsold', details: error.message });
    }
};

// Get leaderboard (teams with their players and total spent)
export const getLeaderboard = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                t.id,
                t.name,
                t.budget,
                COALESCE(SUM(p.sold_price), 0) as total_spent,
                t.budget - COALESCE(SUM(p.sold_price), 0) as remaining_budget,
                COUNT(p.id) as players_count
            FROM teams t
            LEFT JOIN players p ON p.team_id = t.id AND p.status = 'sold'
            GROUP BY t.id, t.name, t.budget
            ORDER BY total_spent DESC
        `);

        res.json({ leaderboard: result.rows });
    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({ error: 'Failed to get leaderboard' });
    }
};
