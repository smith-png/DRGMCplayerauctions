import pool from '../config/database.js';

// Start auction for a player
export const startAuction = async (req, res) => {
    try {
        console.log('=== START AUCTION REQUEST ===');
        console.log('Request body:', req.body);
        const { playerId, basePrice } = req.body;

        if (!playerId) {
            return res.status(400).json({ error: 'Player ID is required' });
        }

        // Atomic Update: Checks existence and status in one go
        const finalBasePrice = basePrice || 50; // We might need to fetch default if not provided, but for now assuming 50 or existing logic.
        // Actually, to get existing base_price fallback, we might need a COALESCE in SQL or a prior select.
        // Let's stick to the Gemini suggestion but ensure we handle base_price correctly.
        // "base_price = COALESCE($1, base_price, 50)"

        const updateResult = await pool.query(
            `UPDATE players 
             SET status = 'auctioning', base_price = COALESCE($1, base_price, 50) 
             WHERE id = $2 AND status != 'sold' 
             RETURNING *`,
            [basePrice || null, playerId]
        );

        if (updateResult.rows.length === 0) {
            // Check why it failed
            const check = await pool.query('SELECT status FROM players WHERE id = $1', [playerId]);
            if (check.rows.length === 0) {
                return res.status(404).json({ error: 'Player not found' });
            }
            return res.status(400).json({ error: 'Player is already sold or invalid status' });
        }

        const player = updateResult.rows[0];
        console.log(`✅ Started auction for player: ${player.name} (ID: ${player.id})`);

        // Broadcast real-time update
        if (req.io) {
            req.io.to('auction-room').emit('auction-update', {
                type: 'started',
                player: {
                    ...player,
                    status: 'auctioning'
                },
                timestamp: new Date()
            });
            console.log('📡 Socket event emitted: auction-started');
        }

        res.json({
            message: 'Auction started successfully',
            player
        });
    } catch (error) {
        console.error('❌ START AUCTION ERROR:', error);
        res.status(500).json({ error: 'Failed to start auction', details: error.message });
    }
};

// Place a bid
// Place a bid
export const placeBid = async (req, res) => {
    const client = await pool.connect();
    try {
        console.log('=== PLACE BID REQUEST ===');
        const { playerId, teamId, bidAmount } = req.body;

        // Input Validation
        if (!playerId || !teamId || !bidAmount) {
            return res.status(400).json({ error: 'Player ID, team ID, and bid amount are required' });
        }
        if (isNaN(bidAmount) || parseFloat(bidAmount) <= 0) {
            return res.status(400).json({ error: 'Invalid bid amount' });
        }

        await client.query('BEGIN');

        // Check budget & Lock Row
        const budgetResult = await client.query(
            'SELECT remaining_budget, name FROM teams WHERE id = $1 FOR UPDATE',
            [teamId]
        );

        if (budgetResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Team not found' });
        }

        const remainingBudget = parseFloat(budgetResult.rows[0].remaining_budget);
        const teamName = budgetResult.rows[0].name;

        if (parseFloat(bidAmount) > remainingBudget) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `Not enough budget. Remaining: ${remainingBudget} Pts` });
        }

        // Insert Bid
        const result = await client.query(
            'INSERT INTO bids (player_id, team_id, amount) VALUES ($1, $2, $3) RETURNING *',
            [playerId, teamId, bidAmount]
        );

        // Fetch Player Name (using SAME client) to ensure atomicity and correctness
        const playerRes = await client.query('SELECT name FROM players WHERE id = $1', [playerId]);
        const playerName = playerRes.rows[0]?.name || 'Unknown Player';

        // COMMIT only after all data is ready
        await client.query('COMMIT');

        console.log('✅ Bid placed successfully:', result.rows[0]);

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
        await client.query('ROLLBACK');
        console.error('❌ Place bid error:', error);
        res.status(500).json({ error: 'Failed to place bid', details: error.message });
    } finally {
        client.release();
    }
};

// Get current auction details including global state
export const getCurrentAuction = async (req, res) => {
    try {
        // Run independent queries in parallel
        const [stateResult, playerResult] = await Promise.all([
            pool.query('SELECT is_active FROM auction_state LIMIT 1'),
            pool.query("SELECT * FROM players WHERE status ILIKE 'auctioning' LIMIT 1")
        ]);

        const isAuctionActive = stateResult.rows[0]?.is_active || false;

        console.log(`[DEBUG] getCurrentAuction: Found ${playerResult.rows.length} auctioning players.`);

        if (playerResult.rows.length === 0) {
            console.log('[DEBUG] No active auction found.');
            return res.json({
                currentAuction: null,
                isAuctionActive
            });
        }

        const player = playerResult.rows[0];
        console.log(`[DEBUG] Active player: ${player.name} (ID: ${player.id})`);

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
        const result = await pool.query('SELECT is_active, sport_min_bids, is_registration_open, animation_duration FROM auction_state LIMIT 1');
        res.json({
            isActive: result.rows[0]?.is_active || false,
            sportMinBids: result.rows[0]?.sport_min_bids || { cricket: 50, futsal: 50, volleyball: 50 },
            isRegistrationOpen: result.rows[0]?.is_registration_open ?? true,
            animationDuration: result.rows[0]?.animation_duration || 25
        });
    } catch (error) {
        console.error('Get auction state error:', error);
        res.status(500).json({ error: 'Failed to get auction state' });
    }
};

export const updateAnimationDuration = async (req, res) => {
    try {
        const { duration } = req.body;
        await pool.query('UPDATE auction_state SET animation_duration = $1', [duration]);
        res.json({ message: 'Animation duration updated', duration });
    } catch (error) {
        console.error('Update animation duration error:', error);
        res.status(500).json({ error: 'Failed to update animation duration' });
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
        const playerRes = await pool.query('SELECT name, photo_url FROM players WHERE id = $1', [playerId]);

        if (req.io) {
            req.io.to('auction-room').emit('auction-update', {
                type: 'sold',
                playerName: playerRes.rows[0]?.name,
                photoUrl: playerRes.rows[0]?.photo_url,
                teamName: teamRes.rows[0]?.name,
                amount: finalPrice,
                timestamp: new Date()
            });
            // Also refresh leaderboard and general data
            req.io.emit('refresh-leaderboard');
            req.io.emit('refresh-data');
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
        // Get testgrounds lockdown state
        const lockdownResult = await pool.query('SELECT testgrounds_locked FROM auction_state LIMIT 1');
        const isLocked = lockdownResult.rows[0]?.testgrounds_locked || false;
        const isAdmin = req.user?.role === 'admin';

        let teamFilter = '';
        if (isLocked && !isAdmin) {
            teamFilter = 'WHERE t.is_test_data = FALSE';
        }

        const query = `
            SELECT 
                t.id,
                t.name,
                t.sport,
                t.budget,
                (t.budget - t.remaining_budget) as total_spent,
                t.remaining_budget,
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
            ${teamFilter}
            GROUP BY t.id, t.name, t.sport, t.budget, t.remaining_budget
            ORDER BY total_spent DESC
        `;

        const result = await pool.query(query);
        res.json({ leaderboard: result.rows });
    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({ error: 'Failed to get leaderboard' });
    }
};

export const resetAuctionBid = async (req, res) => {
    try {
        // 1. Find the player currently being auctioned
        const playerRes = await pool.query(
            'SELECT * FROM players WHERE status = $1 LIMIT 1',
            ['auctioning']
        );

        if (playerRes.rows.length === 0) {
            return res.status(400).json({ error: 'No active auction to reset' });
        }

        const player = playerRes.rows[0];

        // 2. Delete all bids for this player
        await pool.query('DELETE FROM bids WHERE player_id = $1', [player.id]);

        // 3. Reset auction state (optional, but good for consistency/safety)
        // Ensure base price is respected
        const minBid = player.base_price || 50;

        // 4. Update core auction state if used, but primarily broadcast the reset
        // We don't need to manually set current_bid in auction_state table if we rely on bids table,
        // but if the frontend reads from socket 'bid-update', we should emit that.

        if (req.io) {
            // calculated "current" state is now just the base price with no team
            req.io.to('auction-room').emit('bid-update', {
                amount: minBid,
                teamId: null,
                teamName: 'None',
                playerId: player.id,
                playerName: player.name,
                timestamp: new Date(),
                type: 'reset'
            });
            console.log('📡 Socket event emitted: bid-reset');
        }

        res.json({ message: 'Bid reset to minimum', currentBid: minBid });
    } catch (error) {
        console.error('Reset bid error:', error);
        res.status(500).json({ error: 'Failed to reset bid' });
    }
};

// Toggle registration state
export const toggleRegistrationState = async (req, res) => {
    try {
        const { isOpen } = req.body;

        await pool.query(
            'UPDATE auction_state SET is_registration_open = $1',
            [isOpen]
        );

        res.json({ message: 'Registration state updated successfully', isOpen });
    } catch (error) {
        console.error('Toggle registration state error:', error);
        res.status(500).json({ error: 'Failed to update registration state' });
    }
};


// Update sport minimum bids
export const updateSportMinBids = async (req, res) => {
    try {
        const { sportMinBids } = req.body;

        if (!sportMinBids || typeof sportMinBids !== 'object') {
            return res.status(400).json({ error: 'Valid sportMinBids object is required' });
        }

        await pool.query(
            'UPDATE auction_state SET sport_min_bids = $1',
            [sportMinBids]
        );

        res.json({ message: 'Sport minimum bids updated', sportMinBids });
    } catch (error) {
        console.error('Update sport min bids error:', error);
        res.status(500).json({ error: 'Failed to update sport minimum bids' });
    }
};
