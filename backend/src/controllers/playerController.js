import pool from '../config/database.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for memory storage (for Cloudinary upload)
const storage = multer.memoryStorage();

export const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Helper to upload buffer to Cloudinary
const uploadToCloudinary = (buffer) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'auction-players' },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
};

export async function createPlayer(req, res) {
    const { name, sport, year, stats } = req.body;
    const userId = req.user.id;

    try {
        // Validate required fields
        if (!name || !sport || !year) {
            return res.status(400).json({ error: 'Name, sport, and year are required' });
        }

        // Upload photo to Cloudinary if verified
        let photoUrl = null;
        if (req.file) {
            try {
                const result = await uploadToCloudinary(req.file.buffer);
                photoUrl = result.secure_url;
            } catch (uploadError) {
                console.error('Cloudinary upload error:', uploadError);
                return res.status(500).json({ error: 'Failed to upload image' });
            }
        }

        // Parse stats if it's a string
        const parsedStats = typeof stats === 'string' ? JSON.parse(stats) : stats;

        // Insert player
        const result = await pool.query(
            `INSERT INTO players (user_id, name, sport, year, photo_url, stats, status) 
       VALUES ($1, $2, $3, $4, $5, $6, 'pending') 
       RETURNING *`,
            [userId, name, sport, year, photoUrl, JSON.stringify(parsedStats)]
        );

        res.status(201).json({
            message: 'Player registered successfully',
            player: result.rows[0]
        });
    } catch (error) {
        console.error('Create player error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}


export async function getAllPlayers(req, res) {
    const { sport, year, status } = req.query;

    try {
        // Get testgrounds lockdown state
        const lockdownResult = await pool.query('SELECT testgrounds_locked FROM auction_state LIMIT 1');
        const isLocked = lockdownResult.rows[0]?.testgrounds_locked || false;
        const isAdmin = req.user?.role === 'admin';

        let query = 'SELECT * FROM players WHERE 1=1';
        const params = [];
        let paramCount = 1;

        // Filter test data based on lockdown and user role
        if (isLocked && !isAdmin) {
            query += ' AND is_test_data = FALSE';
        }

        if (sport) {
            query += ` AND sport = $${paramCount}`;
            params.push(sport);
            paramCount++;
        }

        if (year) {
            query += ` AND year = $${paramCount}`;
            params.push(year);
            paramCount++;
        }

        if (status) {
            query += ` AND status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }

        query += ' ORDER BY created_at DESC';

        const result = await pool.query(query, params);

        res.json({ players: result.rows });
    } catch (error) {
        console.error('Get players error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function getPlayerById(req, res) {
    const { id } = req.params;

    try {
        const result = await pool.query('SELECT * FROM players WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Player not found' });
        }

        res.json({ player: result.rows[0] });
    } catch (error) {
        console.error('Get player error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function updatePlayer(req, res) {
    const { id } = req.params;
    const { name, sport, year, stats, status } = req.body;

    try {
        const updates = [];
        const params = [];
        let paramCount = 1;

        if (name) {
            updates.push(`name = $${paramCount}`);
            params.push(name);
            paramCount++;
        }

        if (sport) {
            updates.push(`sport = $${paramCount}`);
            params.push(sport);
            paramCount++;
        }

        if (year) {
            updates.push(`year = $${paramCount}`);
            params.push(year);
            paramCount++;
        }

        if (stats) {
            updates.push(`stats = $${paramCount}`);
            params.push(JSON.stringify(stats));
            paramCount++;
        }

        if (status) {
            updates.push(`status = $${paramCount}`);
            params.push(status);
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

        res.json({
            message: 'Player updated successfully',
            player: result.rows[0]
        });
    } catch (error) {
        console.error('Update player error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function deletePlayer(req, res) {
    const { id } = req.params;

    try {
        const result = await pool.query('DELETE FROM players WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Player not found' });
        }

        res.json({ message: 'Player deleted successfully' });
    } catch (error) {
        console.error('Delete player error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Mark player as eligible for auction
export const markEligible = async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query(
            "UPDATE players SET status = 'eligible' WHERE id = $1",
            [id]
        );

        res.json({ message: 'Player marked as eligible for auction' });
    } catch (error) {
        console.error('Mark eligible error:', error);
        res.status(500).json({ error: 'Failed to mark player as eligible' });
    }
};

// Get eligible players
export const getEligiblePlayers = async (req, res) => {
    try {
        // Get testgrounds lockdown state
        const lockdownResult = await pool.query('SELECT testgrounds_locked FROM auction_state LIMIT 1');
        const isLocked = lockdownResult.rows[0]?.testgrounds_locked || false;
        const isAdmin = req.user?.role === 'admin';

        let query = "SELECT * FROM players WHERE status = 'eligible'";

        // Filter test data based on lockdown and user role
        if (isLocked && !isAdmin) {
            query += ' AND is_test_data = FALSE';
        }

        query += ' ORDER BY created_at ASC';

        const result = await pool.query(query);
        res.json({ players: result.rows });
    } catch (error) {
        console.error('Get eligible players error:', error);
        res.status(500).json({ error: 'Failed to get eligible players' });
    }
};
