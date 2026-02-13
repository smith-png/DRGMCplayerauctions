import pool from '../config/database.js';
import { v2 as cloudinary } from 'cloudinary';
import bcrypt from 'bcrypt';

// Helper to upload buffer to Cloudinary
const uploadToCloudinary = (buffer) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'auction-teams' },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
};

export async function getAllUsers(req, res) {
    try {
        const result = await pool.query(
            'SELECT id, email, name, role, team_id, created_at FROM users ORDER BY created_at DESC'
        );

        res.json({ users: result.rows });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function createUser(req, res) {
    const { name, email, password, role } = req.body;

    try {
        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if user exists
        const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, team_id, created_at',
            [name, email, hashedPassword, role]
        );

        res.status(201).json({ user: result.rows[0], message: 'User created successfully' });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function updateUser(req, res) {
    const { id } = req.params;
    const { name, email, role, password } = req.body;

    try {
        // Validate role if provided
        const validRoles = ['admin', 'team_owner', 'participant', 'viewer'];
        if (role && !validRoles.includes(role)) {
            return res.status(400).json({
                error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
            });
        }

        const updates = [];
        const params = [];
        let paramCount = 1;

        if (name && name.trim()) {
            updates.push(`name = $${paramCount}`);
            params.push(name.trim());
            paramCount++;
        }
        if (email && email.trim()) {
            updates.push(`email = $${paramCount}`);
            params.push(email.trim());
            paramCount++;
        }
        if (role) {
            updates.push(`role = $${paramCount}`);
            params.push(role);
            paramCount++;
        }

        // Handle team assignment for team owners
        if (req.body.hasOwnProperty('team_id')) {
            const teamId = req.body.team_id;

            if (teamId) {
                // Validate team exists
                const teamCheck = await pool.query('SELECT id FROM teams WHERE id = $1', [teamId]);
                if (teamCheck.rows.length === 0) {
                    return res.status(400).json({ error: 'Team does not exist' });
                }

                // Check if another team owner is already assigned to this team
                const ownerCheck = await pool.query(
                    'SELECT id FROM users WHERE team_id = $1 AND role = $2 AND id != $3',
                    [teamId, 'team_owner', id]
                );
                if (ownerCheck.rows.length > 0) {
                    return res.status(400).json({ error: 'This team already has an assigned team owner' });
                }

                updates.push(`team_id = $${paramCount}`);
                params.push(teamId);
                paramCount++;
            } else {
                // Allow unsetting team assignment
                updates.push(`team_id = NULL`);
            }
        }
        // Only update password if it's a non-empty string with actual characters
        if (password && typeof password === 'string' && password.trim().length > 0) {
            const hashedPassword = await bcrypt.hash(password.trim(), 10);
            updates.push(`password = $${paramCount}`);
            params.push(hashedPassword);
            paramCount++;
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        params.push(id);
        const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, name, email, role, team_id, created_at`;

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: result.rows[0], message: 'User updated successfully' });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function deleteUser(req, res) {
    const { id } = req.params;

    try {
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function createTeam(req, res) {
    const { name, sport, budget = 100000 } = req.body;

    try {
        if (!name || !sport) {
            return res.status(400).json({ error: 'Name and sport are required' });
        }

        // Upload logo to Cloudinary if provided
        let logoUrl = null;
        if (req.file) {
            try {
                const result = await uploadToCloudinary(req.file.buffer);
                logoUrl = result.secure_url;
            } catch (uploadError) {
                console.error('Cloudinary upload error:', uploadError);
                return res.status(500).json({ error: 'Failed to upload logo' });
            }
        }

        const result = await pool.query(
            'INSERT INTO teams (name, sport, budget, remaining_budget, logo_url) VALUES ($1, $2, $3, $3, $4) RETURNING *',
            [name, sport, budget, logoUrl]
        );

        res.status(201).json({
            message: 'Team created successfully',
            team: result.rows[0]
        });
    } catch (error) {
        console.error('Create team error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}


export async function getAllTeams(req, res) {
    const { sport } = req.query;

    try {
        // Get lockdown state first
        const stateRes = await pool.query('SELECT testgrounds_locked FROM auction_state LIMIT 1');
        const isLocked = stateRes.rows[0]?.testgrounds_locked || false;

        let conditions = [];
        const params = [];

        // Filter by sport if provided
        if (sport) {
            params.push(sport);
            conditions.push(`LOWER(t.sport) = LOWER($${params.length})`);
        }

        // Handle Test Data Visibility
        if (isLocked) {
            // ADMINS see everything
            if (req.user?.role === 'admin') {
                // No additional filter
            }
            // TEAM OWNERS see real data + THEIR OWN team (even if it's test data)
            else if (req.user?.role === 'team_owner' && req.user.team_id) {
                params.push(req.user.team_id);
                conditions.push(`(t.is_test_data = FALSE OR t.is_test_data IS NULL OR t.id = $${params.length})`);
            }
            // PUBLIC / Others see only real data
            else {
                conditions.push(`(t.is_test_data = FALSE OR t.is_test_data IS NULL)`);
            }
        }

        let query = `
            SELECT t.*, u.name as owner_name 
            FROM teams t
            LEFT JOIN users u ON t.id = u.team_id AND u.role = 'team_owner'
        `;

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY t.name';

        const result = await pool.query(query, params);
        res.json({ teams: result.rows });
    } catch (error) {
        console.error('Get teams error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}



// Re-implementing updateTeam with correct logic
export async function updateTeam(req, res) {
    const { id } = req.params;
    const { name, budget } = req.body;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Fetch current team data for budget calculation
        const currentRes = await client.query('SELECT * FROM teams WHERE id = $1 FOR UPDATE', [id]);
        if (currentRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Team not found' });
        }
        const currentTeam = currentRes.rows[0];

        const updates = [];
        const params = [];
        let paramCount = 1;

        if (name) {
            updates.push(`name = $${paramCount}`);
            params.push(name);
            paramCount++;
        }

        if (budget !== undefined) {
            const newBudget = parseInt(budget);
            const oldBudget = parseInt(currentTeam.budget);
            const difference = newBudget - oldBudget;

            updates.push(`budget = $${paramCount}`);
            params.push(newBudget);
            paramCount++;

            // Update remaining budget by the SAME difference
            // stored as part of the update query
            updates.push(`remaining_budget = remaining_budget + $${paramCount}`);
            params.push(difference);
            paramCount++;
        }

        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer);
            updates.push(`logo_url = $${paramCount}`);
            params.push(result.secure_url);
            paramCount++;
        }

        if (updates.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'No fields to update' });
        }

        params.push(id);
        const query = `UPDATE teams SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

        const result = await client.query(query, params);
        await client.query('COMMIT');

        // Broadcast update
        if (req.io) {
            req.io.emit('refresh-leaderboard');
            req.io.emit('refresh-data');
        }

        res.json({
            message: 'Team updated successfully',
            team: result.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update team error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
}

export async function deleteTeam(req, res) {
    const { id } = req.params;

    try {
        const result = await pool.query('DELETE FROM teams WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Team not found' });
        }

        res.json({ message: 'Team deleted successfully' });
    } catch (error) {
        console.error('Delete team error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function resetTeamWallet(req, res) {
    const { id } = req.params;
    try {
        // 1. Unsell all players belonging to this team
        await pool.query(
            "UPDATE players SET status = 'unsold', team_id = NULL, sold_price = NULL WHERE team_id = $1",
            [id]
        );

        // 2. Clear any bids by this team (optional but cleaner)
        await pool.query('DELETE FROM bids WHERE team_id = $1', [id]);

        // 3. Reset team budget to default 2000
        const result = await pool.query(
            'UPDATE teams SET budget = 2000, remaining_budget = 2000 WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Team not found' });
        }

        if (req.io) {
            req.io.emit('refresh-leaderboard');
            req.io.emit('refresh-data');
            console.log('📡 Socket event emitted: refresh-data (wallet reset)');
        }

        res.json({ message: 'Team wallet and stats reset successfully', team: result.rows[0] });
    } catch (error) {
        console.error('Reset team wallet error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function resetAllWallets(req, res) {
    try {
        // 1. Clear ALL bids
        await pool.query('DELETE FROM bids');

        // 2. Reset ALL teams budget
        await pool.query('UPDATE teams SET budget = 2000, remaining_budget = 2000');

        if (req.io) {
            req.io.emit('refresh-leaderboard');
            req.io.emit('refresh-data');
        }

        res.json({ message: 'Global wallet and stats reset successfully.' });
    } catch (error) {
        console.error('Global reset error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function getDashboardStats(req, res) {
    try {
        const stats = {};

        // Total users
        const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
        stats.totalUsers = parseInt(usersResult.rows[0].count);

        // Total players by status
        const playersResult = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM players 
      GROUP BY status
    `);
        stats.players = playersResult.rows.reduce((acc, row) => {
            acc[row.status] = parseInt(row.count);
            return acc;
        }, {});

        // Total teams
        const teamsResult = await pool.query('SELECT COUNT(*) as count FROM teams');
        stats.totalTeams = parseInt(teamsResult.rows[0].count);

        // Total bids
        const bidsResult = await pool.query('SELECT COUNT(*) as count FROM bids');
        stats.totalBids = parseInt(bidsResult.rows[0].count);

        res.json({ stats });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// --- Player Management (Admin) ---

export async function createPlayer(req, res) {
    const { name, sport, year, stats, base_price } = req.body;

    try {
        if (!name || !sport || !year) {
            return res.status(400).json({ error: 'Name, sport, and year are required' });
        }

        // Upload photo to Cloudinary
        let photoUrl = null;
        if (req.file) {
            try {
                // Re-use the existing helper which uploads to 'auction-teams', might want to change folder or make it generic
                // For now, let's use a new helper or modify the existing one. 
                // Since uploadToCloudinary is locally defined here for teams, let's copy it or use a generic one.
                // Actually, the existing one is tied to 'auction-teams'. 
                // Let's create a specific one for players or make the helper accept a folder.
                const result = await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { folder: 'auction-players' },
                        (error, result) => {
                            if (error) return reject(error);
                            resolve(result);
                        }
                    );
                    uploadStream.end(req.file.buffer);
                });
                photoUrl = result.secure_url;
            } catch (uploadError) {
                console.error('Cloudinary upload error:', uploadError);
                return res.status(500).json({ error: 'Failed to upload photo' });
            }
        }

        let parsedStats = stats;
        if (typeof stats === 'string') {
            try {
                parsedStats = JSON.parse(stats);
            } catch (e) {
                parsedStats = {};
            }
        }

        // Admin creates player, user_id is null or a placeholder? 
        // Logic check: Players table has user_id foreign key NOT NULL? 
        // Let's check schema.
        // Schema: user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
        // It doesn't say NOT NULL explicitly in the CREATE TABLE usually implies nullable unless specified.
        // But usually we want to link a player to a user. 
        // If Admin creates a player, is it a "dummy" player or linked to a real user?
        // User request: "add new players... maintain consistency".
        // If we create a player without a user account, they can't login.
        // Maybe we just link it to the Admin for now, or null if allowed.
        // Let's assume nullable for now or use the Admin's ID.
        // Using Admin's ID (req.user.id) seems safest for "System Created" players.

        const userId = req.user.id;

        const result = await pool.query(
            `INSERT INTO players (user_id, name, sport, year, photo_url, stats, base_price, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'eligible') 
             RETURNING *`,
            [userId, name, sport, year, photoUrl, JSON.stringify(parsedStats), base_price || 50]
        );

        res.status(201).json({
            message: 'Player created successfully',
            player: result.rows[0]
        });

    } catch (error) {
        console.error('Admin create player error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function updatePlayer(req, res) {
    const { id } = req.params;
    const { name, sport, year, stats, base_price, status } = req.body;

    try {
        const updates = [];
        const params = [];
        let paramCount = 1;

        if (name) { updates.push(`name = $${paramCount}`); params.push(name); paramCount++; }
        if (sport) { updates.push(`sport = $${paramCount}`); params.push(sport); paramCount++; }
        if (year) { updates.push(`year = $${paramCount}`); params.push(year); paramCount++; }
        if (base_price) { updates.push(`base_price = $${paramCount}`); params.push(base_price); paramCount++; }
        if (status) { updates.push(`status = $${paramCount}`); params.push(status); paramCount++; }

        if (stats) {
            let parsedStats = stats;
            if (typeof stats === 'string') {
                try { parsedStats = JSON.parse(stats); } catch (e) { }
            }
            updates.push(`stats = $${paramCount}`);
            params.push(JSON.stringify(parsedStats));
            paramCount++;
        }

        if (req.file) {
            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: 'auction-players' },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    }
                );
                uploadStream.end(req.file.buffer);
            });
            updates.push(`photo_url = $${paramCount}`);
            params.push(result.secure_url);
            paramCount++;
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        params.push(id);
        const query = `UPDATE players SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Player not found' });
        }

        res.json({ message: 'Player updated successfully', player: result.rows[0] });
    } catch (error) {
        console.error('Admin update player error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function adjustTeamWallet(req, res) {
    const { id } = req.params;
    const { action, amount } = req.body;

    const client = await pool.connect();
    try {
        if (!['add', 'remove'].includes(action) || !amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ error: 'Invalid action or amount' });
        }

        const value = parseInt(amount);
        const operator = action === 'add' ? '+' : '-';
        const logType = action === 'add' ? 'CREDIT' : 'DEBIT';

        await client.query('BEGIN');

        // 1. Update team budget
        const result = await client.query(
            `UPDATE teams 
             SET budget = budget ${operator} $1, 
                 remaining_budget = remaining_budget ${operator} $1 
             WHERE id = $2 
             RETURNING *`,
            [value, id]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Team not found' });
        }

        // 2. Log to bid_logs for history
        await client.query(
            'INSERT INTO bid_logs (team_id, amount, type) VALUES ($1, $2, $3)',
            [id, value, logType]
        );

        await client.query('COMMIT');

        if (req.io) {
            req.io.emit('refresh-leaderboard');
            req.io.emit('refresh-data');
        }

        res.json({ message: 'Wallet adjusted successfully', team: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Adjust wallet error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
}

export async function removeFromQueue(req, res) {
    const { id } = req.params;
    try {
        // Logically remove from queue by setting status to 'unsold' or 'pending'
        // 'unsold' keeps them visible but out of "Upcoming" list usually.
        // 'pending' puts them back in approval queue.
        // Let's use 'unsold' so we know they were processed/removed.
        const result = await pool.query(
            "UPDATE players SET status = 'approved' WHERE id = $1 RETURNING *",
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Player not found' });
        res.json({ message: 'Player removed from queue and sent back to Approved list', player: result.rows[0] });
    } catch (error) {
        console.error('Remove from queue error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Bulk update minimum bid for a sport
export async function bulkUpdateMinBid(req, res) {
    const { sport, minBid } = req.body;
    try {
        if (!sport || minBid === undefined) {
            return res.status(400).json({ error: 'Sport and min bid value are required' });
        }

        const value = Math.round(parseFloat(minBid));

        // 1. Update all non-sold players of that sport
        await pool.query(
            "UPDATE players SET base_price = $1 WHERE sport = $2 AND status != 'sold'",
            [value, sport]
        );

        // 2. Update auction_state sport_min_bids
        const stateRes = await pool.query('SELECT sport_min_bids FROM auction_state LIMIT 1');
        const sportMinBids = stateRes.rows[0]?.sport_min_bids || { cricket: 50, futsal: 50, volleyball: 50 };
        // Force lowercase key
        sportMinBids[sport.toLowerCase()] = value;

        await pool.query(
            'UPDATE auction_state SET sport_min_bids = $1',
            [JSON.stringify(sportMinBids)]
        );

        if (req.io) {
            req.io.emit('refresh-data'); // Notify all clients of config change
        }

        res.json({ message: `Updated minimum bid for ${sport} to ${value}`, sportMinBids });
    } catch (error) {
        console.error('Bulk update min bid error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Bulk reset bids for released players
export async function bulkResetReleasedBids(req, res) {
    try {
        // Reset sold_price, team_id and status for 'unsold' players (released)
        // Actually, if they are 'unsold', they are released.
        // We might want to reset their base_price to current min_bid too.

        const stateRes = await pool.query('SELECT sport_min_bids FROM auction_state LIMIT 1');
        const minBids = stateRes.rows[0]?.sport_min_bids || { cricket: 50, futsal: 50, volleyball: 50 };

        // Need to loop per sport or do complex case-when
        const sports = ['cricket', 'futsal', 'volleyball'];
        for (const sport of sports) {
            const val = minBids[sport] || 50;
            await pool.query(
                "UPDATE players SET status = 'approved', base_price = $1, sold_price = NULL, team_id = NULL WHERE status = 'unsold' AND sport = $2",
                [val, sport]
            );
        }

        // Also delete bids for any players who were just reset
        // This is optional but cleaner.
        // DELETE FROM bids WHERE player_id IN (SELECT id FROM players WHERE status = 'approved' AND ...)

        res.json({ message: 'Resetted all released players to approved with minimum bids' });
    } catch (error) {
        console.error('Bulk reset released bids error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Add player to queue by ID
export async function addToQueueById(req, res) {
    const { id } = req.params;
    try {
        // Check player status first
        const playerRes = await pool.query('SELECT status FROM players WHERE id = $1', [id]);
        if (playerRes.rows.length === 0) {
            return res.status(404).json({ error: 'Player not found' });
        }

        const player = playerRes.rows[0];
        if (player.status === 'sold') {
            return res.status(400).json({ error: 'Player is already sold. Release them first.' });
        }

        if (player.status === 'eligible') {
            return res.status(400).json({ error: 'Player is already in the queue.' });
        }

        // Update status to eligible
        const result = await pool.query(
            "UPDATE players SET status = 'eligible' WHERE id = $1 RETURNING *",
            [id]
        );

        res.json({ message: 'Player added to auction queue', player: result.rows[0] });
    } catch (error) {
        console.error('Add to queue error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Release player (make unsold) and refund budget
export async function releasePlayer(req, res) {
    const { id } = req.params;
    try {
        const result = await pool.query(
            "UPDATE players SET status = 'unsold', team_id = NULL, sold_price = NULL WHERE id = $1 RETURNING *",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Player not found' });
        }

        res.json({ message: 'Player released successfully', player: result.rows[0] });
    } catch (error) {
        console.error('Release player error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
// Export players to CSV
export async function exportPlayersToCSV(req, res) {
    try {
        const { sport } = req.query;

        let query = 'SELECT * FROM players';
        const params = [];
        if (sport) {
            query += ' WHERE sport = $1';
            params.push(sport);
        }
        query += ' ORDER BY id ASC';

        const result = await pool.query(query, params);
        const players = result.rows;

        if (players.length === 0) {
            return res.status(404).json({ error: 'No players found to export' });
        }

        // Define CSV Headers
        const headers = [
            'ID', 'Name', 'Sport', 'Year', 'Status', 'Base Price', 'Sold Price', 'Team ID',
            'Role', 'Batting Style', 'Bowling Style', 'Photo URL'
        ];

        // Create CSV Content
        const csvRows = [];
        csvRows.push(headers.join(','));

        for (const player of players) {
            let stats = {};
            if (typeof player.stats === 'string') {
                try {
                    stats = JSON.parse(player.stats);
                } catch (e) {
                    stats = {};
                }
            } else if (typeof player.stats === 'object') {
                stats = player.stats || {};
            }

            const row = [
                player.id,
                `"${player.name.replace(/"/g, '""')}"`, // Escape quotes
                player.sport,
                player.year,
                player.status,
                player.base_price,
                player.sold_price || '',
                player.team_id || '',
                stats.role || stats.playingRole || '', // Handle varied key names if any
                stats.battingStyle || '',
                stats.bowlingStyle || '',
                player.photo_url || ''
            ];

            csvRows.push(row.join(','));
        }

        const csvContent = csvRows.join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=players_export_${sport || 'all'}_${Date.now()}.csv`);
        res.status(200).send(csvContent);

    } catch (error) {
        console.error('Export CSV error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
