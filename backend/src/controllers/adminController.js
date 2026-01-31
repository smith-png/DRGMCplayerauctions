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
            'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC'
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
            'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at',
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
        const updates = [];
        const params = [];
        let paramCount = 1;

        if (name) {
            updates.push(`name = $${paramCount}`);
            params.push(name);
            paramCount++;
        }
        if (email) {
            updates.push(`email = $${paramCount}`);
            params.push(email);
            paramCount++;
        }
        if (role) {
            updates.push(`role = $${paramCount}`);
            params.push(role);
            paramCount++;
        }
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updates.push(`password = $${paramCount}`);
            params.push(hashedPassword);
            paramCount++;
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        params.push(id);
        const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, name, email, role, created_at`;

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
        let query = 'SELECT * FROM teams';
        const params = [];

        if (sport) {
            query += ' WHERE sport = $1';
            params.push(sport);
        }

        query += ' ORDER BY name';

        const result = await pool.query(query, params);

        res.json({ teams: result.rows });
    } catch (error) {
        console.error('Get teams error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function updateTeam(req, res) {
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
            const result = await uploadToCloudinary(req.file.buffer);
            updates.push(`logo_url = $${paramCount}`);
            params.push(result.secure_url);
            paramCount++;
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        params.push(id);
        const query = `UPDATE teams SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Team not found' });
        }

        res.json({
            message: 'Team updated successfully',
            team: result.rows[0]
        });
    } catch (error) {
        console.error('Update team error:', error);
        res.status(500).json({ error: 'Internal server error' });
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

export async function removeFromQueue(req, res) {
    const { id } = req.params;
    try {
        // Logically remove from queue by setting status to 'unsold' or 'pending'
        // 'unsold' keeps them visible but out of "Upcoming" list usually.
        // 'pending' puts them back in approval queue.
        // Let's use 'unsold' so we know they were processed/removed.
        const result = await pool.query(
            "UPDATE players SET status = 'unsold' WHERE id = $1 RETURNING *",
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Player not found' });
        res.json({ message: 'Player removed from queue', player: result.rows[0] });
    } catch (error) {
        console.error('Remove from queue error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
