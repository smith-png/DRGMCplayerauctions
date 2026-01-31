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

        // Broadcast real-time update
        if (req.io) {
            req.io.to('auction-room').emit('auction-update', {
                type: 'started',
                player: {
                    ...player,
                    status: 'auctioning',
                    base_price: finalBasePrice
                },
                timestamp: new Date()
            });
            console.log('📡 Socket event emitted: auction-started');
        }

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

        // Check if team has enough budget
        const budgetResult = await pool.query(
            `SELECT t.budget, 
                    COALESCE(SUM(p.sold_price), 0) as total_spent
             FROM teams t
             LEFT JOIN players p ON p.team_id = t.id AND p.status = 'sold'
             WHERE t.id = $1
             GROUP BY t.id, t.budget`,
            [teamId]
        );

        if (budgetResult.rows.length === 0) {
            return res.status(404).json({ error: 'Team not found' });
        }

        const { budget, total_spent } = budgetResult.rows[0];
        const remainingBudget = parseFloat(budget) - parseFloat(total_spent);

        if (parseFloat(bidAmount) > remainingBudget) {
            return res.status(400).json({ error: `Not enough budget. Remaining: ${remainingBudget} Pts` });
        }

        // Insert bid into database
        const result = await pool.query(
            'INSERT INTO bids (player_id, team_id, amount) VALUES ($1, $2, $3) RETURNING *',
            [playerId, teamId, bidAmount]
        );

        console.log('✅ Bid placed successfully:', result.rows[0]);

        // Get team and player names for socket broadcast
        const teamRes = await pool.query('SELECT name FROM teams WHERE id = $1', [teamId]);
        const playerRes = await pool.query('SELECT name FROM players WHERE id = $1', [playerId]);

        const teamName = teamRes.rows[0]?.name || 'Unknown Team';
        const playerName = playerRes.rows[0]?.name || 'Unknown Player';

        // Broadcast real-time update
        if (req.io) {
            req.io.to('auction-room').emit('bid-update', {
                teamId,
                teamName,
                amount: bidAmount,
                playerId,
                playerName,
                timestamp: new Date()
            });
            console.log('📡 Socket event emitted: bid-update');
        }

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
        const result = await pool.query('SELECT is_active, sport_min_bids FROM auction_state LIMIT 1');
        res.json({
            isActive: result.rows[0]?.is_active || false,
            sportMinBids: result.rows[0]?.sport_min_bids || { cricket: 50, futsal: 50, volleyball: 50 }
        });
    } catch (error) {
        console.error('Get auction state error:', error);
        res.status(500).json({ error: 'Failed to get auction state' });
    }
};

// Skip a player from auction
export const skipPlayer = async (req, res) => {
    try {
        const { playerId } = req.body;

        if (!playerId) {
            return res.status(400).json({ error: 'Player ID is required' });
        }

        // 1. Get player sport
        const playerRes = await pool.query('SELECT name, sport FROM players WHERE id = $1', [playerId]);
        if (playerRes.rows.length === 0) return res.status(404).json({ error: 'Player not found' });
        const player = playerRes.rows[0];

        // 2. Get sport min bid
        const stateRes = await pool.query('SELECT sport_min_bids FROM auction_state LIMIT 1');
        const sportMinBids = stateRes.rows[0]?.sport_min_bids || { cricket: 50, futsal: 50, volleyball: 50 };
        const minBid = sportMinBids[player.sport] || 50;

        // 3. Reset player status and base price
        await pool.query(
            "UPDATE players SET status = 'eligible', base_price = $1 WHERE id = $2",
            [minBid, playerId]
        );

        // 4. Broadcast update
        if (req.io) {
            req.io.to('auction-room').emit('auction-update', {
                type: 'skipped',
                player: { id: playerId, name: player.name, status: 'eligible', base_price: minBid },
                timestamp: new Date()
            });
            console.log('📡 Socket event emitted: player-skipped');
        }

        res.json({ message: 'Player skipped and sent back to queue', minBid });
    } catch (error) {
        console.error('Skip player error:', error);
        res.status(500).json({ error: 'Failed to skip player' });
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

        // Update team's remaining budget in database (for other parts of app that use the column)
        await pool.query(
            'UPDATE teams SET remaining_budget = remaining_budget - $1 WHERE id = $2',
            [finalPrice, teamId]
        );

        // Get names for broadcast
        const teamRes = await pool.query('SELECT name FROM teams WHERE id = $1', [teamId]);
        const playerRes = await pool.query('SELECT name FROM players WHERE id = $1', [playerId]);

        if (req.io) {
            req.io.to('auction-room').emit('auction-update', {
                type: 'sold',
                playerName: playerRes.rows[0]?.name,
                teamName: teamRes.rows[0]?.name,
                amount: finalPrice,
                timestamp: new Date()
            });
            // Also refresh leaderboard
            req.io.emit('refresh-leaderboard');
            console.log('📡 Socket event emitted: player-sold');
        }

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
            'UPDATE players SET status = $1 WHERE id = $2',
            ['unsold', playerId]
        );

        if (req.io) {
            req.io.to('auction-room').emit('auction-update', {
                type: 'unsold',
                player: { id: playerId },
                timestamp: new Date()
            });
            console.log('📡 Socket event emitted: player-unsold');
        }

        res.json({ message: 'Player marked as unsold' });
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
                t.sport,
                t.budget,
                COALESCE(SUM(p.sold_price), 0) as total_spent,
                t.budget - COALESCE(SUM(p.sold_price), 0) as remaining_budget,
                COUNT(p.id) as players_count,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', p.id,
                            'name', p.name,
                            'photo_url', p.photo_url,
                            'year', p.year,
                            'sold_price', p.sold_price,
                            'stats', p.stats
                        )
                    ) FILTER (WHERE p.id IS NOT NULL),
                    '[]'
                ) as players
            FROM teams t
            LEFT JOIN players p ON p.team_id = t.id AND p.status = 'sold'
            GROUP BY t.id, t.name, t.sport, t.budget
            ORDER BY total_spent DESC
        `);

        res.json({ leaderboard: result.rows });
    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({ error: 'Failed to get leaderboard' });
    }
};

export const resetAuctionBid = async (req, res) => {
    try {
        const stateRes = await pool.query('SELECT current_player_id FROM auction_state LIMIT 1');
        const currentPlayerId = stateRes.rows[0]?.current_player_id;

        if (!currentPlayerId) {
            return res.status(400).json({ error: 'No active auction to reset' });
        }

        // 1. Get player sport
        const playerRes = await pool.query('SELECT sport FROM players WHERE id = $1', [currentPlayerId]);
        const sport = playerRes.rows[0]?.sport;

        // 2. Get sport min bid
        const auctionStateRes = await pool.query('SELECT sport_min_bids FROM auction_state LIMIT 1');
        const sportMinBids = auctionStateRes.rows[0]?.sport_min_bids || { cricket: 50, futsal: 50, volleyball: 50 };
        const minBid = sportMinBids[sport] || 50;

        // 3. Update auction state
        const result = await pool.query(
            'UPDATE auction_state SET current_bid = $1, current_team_id = NULL RETURNING *',
            [minBid]
        );

        const updatedState = result.rows[0];

        // 4. Broadcast update
        if (req.io) {
            req.io.to('auction-room').emit('bid-update', {
                amount: updatedState.current_bid,
                teamId: null,
                teamName: 'None',
                timestamp: new Date()
            });
            console.log('📡 Socket event emitted: bid-reset');
        }

        res.json({ message: 'Bid reset to minimum', currentBid: minBid });
    } catch (error) {
        console.error('Reset bid error:', error);
        res.status(500).json({ error: 'Failed to reset bid' });
    }
};

