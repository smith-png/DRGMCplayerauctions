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
