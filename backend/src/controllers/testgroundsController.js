import pool from '../config/database.js';
import { v2 as cloudinary } from 'cloudinary';
import bcrypt from 'bcrypt';

// Helper to upload buffer to Cloudinary
const uploadToCloudinary = (buffer, folder) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
};

// ============================================
// TEST PLAYER MANAGEMENT
// ============================================

export async function createTestPlayer(req, res) {
    const { name, sport, year, stats, base_price } = req.body;

    try {
        if (!name || !sport || !year) {
            return res.status(400).json({ error: 'Name, sport, and year are required' });
        }

        let photoUrl = null;
        if (req.file) {
            try {
                const result = await uploadToCloudinary(req.file.buffer, 'auction-test-players');
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

        const userId = req.user.id; // Link to admin who created it

        const result = await pool.query(
            `INSERT INTO players (user_id, name, sport, year, photo_url, stats, base_price, status, is_test_data) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved', TRUE) 
             RETURNING *`,
            [userId, name, sport, year, photoUrl, JSON.stringify(parsedStats), base_price || 50]
        );

        res.status(201).json({
            message: 'Test player created successfully',
            player: result.rows[0]
        });
    } catch (error) {
        console.error('Create test player error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function getAllTestPlayers(req, res) {
    try {
        const result = await pool.query(
            'SELECT * FROM players WHERE is_test_data = TRUE ORDER BY created_at DESC'
        );
        res.json({ players: result.rows });
    } catch (error) {
        console.error('Get test players error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function updateTestPlayer(req, res) {
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
            const result = await uploadToCloudinary(req.file.buffer, 'auction-test-players');
            updates.push(`photo_url = $${paramCount}`);
            params.push(result.secure_url);
            paramCount++;
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        params.push(id);
        const query = `UPDATE players SET ${updates.join(', ')} WHERE id = $${paramCount} AND is_test_data = TRUE RETURNING *`;

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Test player not found' });
        }

        res.json({ message: 'Test player updated successfully', player: result.rows[0] });
    } catch (error) {
        console.error('Update test player error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function deleteTestPlayer(req, res) {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM players WHERE id = $1 AND is_test_data = TRUE RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Test player not found' });
        }

        res.json({ message: 'Test player deleted successfully' });
    } catch (error) {
        console.error('Delete test player error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// ============================================
// TEST TEAM MANAGEMENT
// ============================================

export async function createTestTeam(req, res) {
    const { name, sport, budget = 2000 } = req.body;

    try {
        if (!name || !sport) {
            return res.status(400).json({ error: 'Name and sport are required' });
        }

        let logoUrl = null;
        if (req.file) {
            try {
                const result = await uploadToCloudinary(req.file.buffer, 'auction-test-teams');
                logoUrl = result.secure_url;
            } catch (uploadError) {
                console.error('Cloudinary upload error:', uploadError);
                return res.status(500).json({ error: 'Failed to upload logo' });
            }
        }

        const result = await pool.query(
            'INSERT INTO teams (name, sport, budget, remaining_budget, logo_url, is_test_data) VALUES ($1, $2, $3, $3, $4, TRUE) RETURNING *',
            [name, sport, budget, logoUrl]
        );

        res.status(201).json({
            message: 'Test team created successfully',
            team: result.rows[0]
        });
    } catch (error) {
        console.error('Create test team error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function getAllTestTeams(req, res) {
    try {
        const result = await pool.query(
            'SELECT * FROM teams WHERE is_test_data = TRUE ORDER BY name'
        );
        res.json({ teams: result.rows });
    } catch (error) {
        console.error('Get test teams error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function updateTestTeam(req, res) {
    const { id } = req.params;
    const { name, budget } = req.body;

    try {
        const updates = [];
        const params = [];
        let paramCount = 1;

        if (name) {
            updates.push(`name = $${paramCount}`);
            params.push(name);
            paramCount++;
        }

        if (budget !== undefined) {
            updates.push(`budget = $${paramCount}`);
            params.push(budget);
            paramCount++;
        }

        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer, 'auction-test-teams');
            updates.push(`logo_url = $${paramCount}`);
            params.push(result.secure_url);
            paramCount++;
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        params.push(id);
        const query = `UPDATE teams SET ${updates.join(', ')} WHERE id = $${paramCount} AND is_test_data = TRUE RETURNING *`;

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Test team not found' });
        }

        res.json({
            message: 'Test team updated successfully',
            team: result.rows[0]
        });
    } catch (error) {
        console.error('Update test team error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function deleteTestTeam(req, res) {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM teams WHERE id = $1 AND is_test_data = TRUE RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Test team not found' });
        }

        res.json({ message: 'Test team deleted successfully' });
    } catch (error) {
        console.error('Delete test team error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// ============================================
// PSEUDO OWNER MANAGEMENT
// ============================================

export async function createPseudoOwner(req, res) {
    const { name, email, password, team_id } = req.body;

    try {
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        // Check if email exists
        const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            'INSERT INTO users (name, email, password, role, team_id, is_test_data) VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING id, name, email, role, team_id, created_at',
            [name, email, hashedPassword, 'team_owner', team_id || null]
        );

        res.status(201).json({
            user: result.rows[0],
            message: 'Pseudo owner created successfully'
        });
    } catch (error) {
        console.error('Create pseudo owner error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function getAllPseudoOwners(req, res) {
    try {
        const result = await pool.query(
            'SELECT id, email, name, role, team_id, created_at FROM users WHERE is_test_data = TRUE ORDER BY created_at DESC'
        );
        res.json({ owners: result.rows });
    } catch (error) {
        console.error('Get pseudo owners error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function updatePseudoOwner(req, res) {
    const { id } = req.params;
    const { name, email, password, team_id } = req.body;

    try {
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

        if (password && password.trim()) {
            const hashedPassword = await bcrypt.hash(password.trim(), 10);
            updates.push(`password = $${paramCount}`);
            params.push(hashedPassword);
            paramCount++;
        }

        if (req.body.hasOwnProperty('team_id')) {
            if (team_id) {
                updates.push(`team_id = $${paramCount}`);
                params.push(team_id);
                paramCount++;
            } else {
                updates.push(`team_id = NULL`);
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        params.push(id);
        const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} AND is_test_data = TRUE RETURNING id, name, email, role, team_id, created_at`;

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pseudo owner not found' });
        }

        res.json({ user: result.rows[0], message: 'Pseudo owner updated successfully' });
    } catch (error) {
        console.error('Update pseudo owner error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function deletePseudoOwner(req, res) {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM users WHERE id = $1 AND is_test_data = TRUE RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pseudo owner not found' });
        }

        res.json({ message: 'Pseudo owner deleted successfully' });
    } catch (error) {
        console.error('Delete pseudo owner error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// ============================================
// QUEUE MANAGEMENT
// ============================================

export async function addTestPlayerToQueue(req, res) {
    const { id } = req.params;

    try {
        const result = await pool.query(
            "UPDATE players SET status = 'eligible' WHERE id = $1 AND is_test_data = TRUE RETURNING *",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Test player not found' });
        }

        res.json({ message: 'Test player added to queue', player: result.rows[0] });
    } catch (error) {
        console.error('Add test player to queue error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function removeTestPlayerFromQueue(req, res) {
    const { id } = req.params;

    try {
        const result = await pool.query(
            "UPDATE players SET status = 'approved' WHERE id = $1 AND is_test_data = TRUE RETURNING *",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Test player not found' });
        }

        res.json({ message: 'Test player removed from queue', player: result.rows[0] });
    } catch (error) {
        console.error('Remove test player from queue error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// ============================================
// LOCKDOWN MANAGEMENT
// ============================================

export async function getTestgroundsState(req, res) {
    try {
        const result = await pool.query('SELECT testgrounds_locked FROM auction_state LIMIT 1');
        const isLocked = result.rows[0]?.testgrounds_locked || false;

        res.json({ testgrounds_locked: isLocked });
    } catch (error) {
        console.error('Get testgrounds state error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function toggleTestgroundsLockdown(req, res) {
    try {
        const currentState = await pool.query('SELECT testgrounds_locked FROM auction_state LIMIT 1');
        const newState = !(currentState.rows[0]?.testgrounds_locked || false);

        await pool.query('UPDATE auction_state SET testgrounds_locked = $1', [newState]);

        // Emit socket event to refresh data if socket.io is available
        if (req.io) {
            req.io.emit('testgrounds-lockdown-changed', { locked: newState });
            req.io.emit('refresh-data');
        }

        res.json({
            message: `Testgrounds ${newState ? 'locked' : 'unlocked'} successfully`,
            testgrounds_locked: newState
        });
    } catch (error) {
        console.error('Toggle testgrounds lockdown error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// ============================================
// BULK DELETE
// ============================================

export async function clearAllTestData(req, res) {
    try {
        // Delete in order to respect foreign key constraints
        // 1. Delete test bids (if any test players have bids)
        await pool.query('DELETE FROM bids WHERE player_id IN (SELECT id FROM players WHERE is_test_data = TRUE)');

        // 2. Delete test players
        const playersResult = await pool.query('DELETE FROM players WHERE is_test_data = TRUE');

        // 3. Delete test users (pseudo owners)
        const usersResult = await pool.query('DELETE FROM users WHERE is_test_data = TRUE');

        // 4. Delete test teams
        const teamsResult = await pool.query('DELETE FROM teams WHERE is_test_data = TRUE');

        // Emit socket event to refresh data
        if (req.io) {
            req.io.emit('refresh-data');
            req.io.emit('testgrounds-cleared');
        }

        res.json({
            message: 'All test data cleared successfully',
            deleted: {
                players: playersResult.rowCount,
                teams: teamsResult.rowCount,
                users: usersResult.rowCount
            }
        });
    } catch (error) {
        console.error('Clear all test data error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
