import pool from '../config/database.js';

// Get team owner's assigned team details
export async function getMyTeam(req, res) {
    try {
        const userId = req.user.id;

        // Get user's team assignment
        const userResult = await pool.query(
            'SELECT team_id FROM users WHERE id = $1',
            [userId]
        );

        if (!userResult.rows[0]?.team_id) {
            return res.status(404).json({ error: 'No team assigned to this team owner' });
        }

        const teamId = userResult.rows[0].team_id;

        // Get team details with calculated remaining_budget
        const teamResult = await pool.query(
            `SELECT t.*, 
                    COALESCE(t.budget - SUM(p.sold_price), t.budget) as remaining_budget,
                    COALESCE(SUM(p.sold_price), 0) as total_spent
             FROM teams t
             LEFT JOIN players p ON p.team_id = t.id AND p.status = 'sold'
             WHERE t.id = $1
             GROUP BY t.id`,
            [teamId]
        );

        if (teamResult.rows.length === 0) {
            return res.status(404).json({ error: 'Team not found' });
        }

        res.json({ team: teamResult.rows[0] });
    } catch (error) {
        console.error('Get my team error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Get team owner's team players
export async function getMyTeamPlayers(req, res) {
    try {
        const userId = req.user.id;

        // Get user's team assignment
        const userResult = await pool.query(
            'SELECT team_id FROM users WHERE id = $1',
            [userId]
        );

        if (!userResult.rows[0]?.team_id) {
            return res.status(404).json({ error: 'No team assigned to this team owner' });
        }

        const teamId = userResult.rows[0].team_id;

        // Get team's players
        const playersResult = await pool.query(
            `SELECT id, name, sport, year, photo_url, stats, base_price, sold_price, status
             FROM players 
             WHERE team_id = $1 AND status = 'sold'
             ORDER BY sold_price DESC`,
            [teamId]
        );

        res.json({ players: playersResult.rows });
    } catch (error) {
        console.error('Get my team players error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Get team owner's team bid history
export async function getMyTeamBids(req, res) {
    try {
        const userId = req.user.id;

        // Get user's team assignment
        const userResult = await pool.query(
            'SELECT team_id FROM users WHERE id = $1',
            [userId]
        );

        if (!userResult.rows[0]?.team_id) {
            return res.status(404).json({ error: 'No team assigned to this team owner' });
        }

        const teamId = userResult.rows[0].team_id;

        // Get recent bids for this team
        const bidsResult = await pool.query(
            `SELECT 
                b.id,
                b.amount,
                b.created_at,
                p.name as player_name,
                p.photo_url as player_photo,
                p.sport,
                p.year,
                p.status as player_status
             FROM bids b
             JOIN players p ON b.player_id = p.id
             WHERE b.team_id = $1
             ORDER BY b.created_at DESC
             LIMIT 50`,
            [teamId]
        );

        res.json({ bids: bidsResult.rows });
    } catch (error) {
        console.error('Get my team bids error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
