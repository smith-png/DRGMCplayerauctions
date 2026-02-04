import pool from '../src/config/database.js';

async function debugDatabase() {
    try {
        console.log('--- DEBUGGING TEAMS (JSON) ---');
        const teams = await pool.query('SELECT id, name, sport FROM teams');
        console.log(JSON.stringify(teams.rows, null, 2));

        console.log('\n--- TESTING LEADERBOARD QUERY ---');
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

        console.log(JSON.stringify(result.rows, null, 2));

    } catch (err) {
        console.error('Debug script error:', err);
    } finally {
        pool.end();
    }
}

debugDatabase();
