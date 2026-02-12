import pool from '../src/config/database.js';
import bcrypt from 'bcrypt';

const sampleTeams = [
    {
        name: 'SAGE WARRIORS',
        sport: 'cricket',
        budget: 5000,
        logo_url: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=200&h=200&fit=crop',
        owner: { name: 'Vikram Singh', email: 'vikram@warriors.com', password: 'password123' }
    },
    {
        name: 'STORM STRIKERS',
        sport: 'futsal',
        budget: 4500,
        logo_url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=200&h=200&fit=crop',
        owner: { name: 'Sarah Khan', email: 'sarah@strikers.com', password: 'password123' }
    },
    {
        name: 'VOLLEY VANGUARD',
        sport: 'volleyball',
        budget: 4800,
        logo_url: 'https://images.unsplash.com/photo-1592656094267-764a45159577?w=200&h=200&fit=crop',
        owner: { name: 'Rohan Mehta', email: 'rohan@vanguard.com', password: 'password123' }
    }
];

const sports = ['cricket', 'futsal', 'volleyball'];
const names = {
    cricket: ['Arjun Sharma', 'Rahul Dravid', 'Ishaan Pant', 'Sanjay Manjrekar', 'Kunal Pandya', 'Amit Mishra'],
    futsal: ['Lionel Messi', 'Cristiano Ronaldo', 'Neymar Jr', 'Kylian Mbappe', 'Luka Modric', 'Kevin De Bruyne'],
    volleyball: ['Gilberto Amauri', 'Ivan Zaytsev', 'Karch Kiraly', 'Giba', 'Saied Marouf', 'Facundo Conte']
};

const statsTemplate = {
    cricket: (name) => ({ role: 'All-Rounder', batting: 'Right Handed', bowling: 'Fast-Medium' }),
    futsal: (name) => ({ role: 'Forward', pace: '92', finishing: '88' }),
    volleyball: (name) => ({ role: 'Setter', spikes: '85', defence: '90' })
};

async function seed() {
    console.log('🌱 Starting Demo Data Seeding...');

    try {
        // 1. Clear existing non-admin data (Optional, but helps with clean testing)
        // await pool.query("DELETE FROM users WHERE role != 'admin'");
        // await pool.query("DELETE FROM teams");
        // await pool.query("DELETE FROM players");

        // 2. Add Teams and Owners
        for (const t of sampleTeams) {
            console.log(`Creating Team: ${t.name}`);
            const teamRes = await pool.query(
                'INSERT INTO teams (name, sport, budget, remaining_budget, logo_url) VALUES ($1, $2, $3, $3, $4) RETURNING id',
                [t.name, t.sport, t.budget, t.logo_url]
            );
            const teamId = teamRes.rows[0].id;

            const hashedPassword = await bcrypt.hash(t.owner.password, 10);
            await pool.query(
                'INSERT INTO users (name, email, password, role, team_id) VALUES ($1, $2, $3, $4, $5)',
                [t.owner.name, t.owner.email, hashedPassword, 'team_owner', teamId]
            );
        }

        // 3. Add 6 Players per Sport
        for (const sport of sports) {
            console.log(`Creating Players for ${sport}...`);
            const playerNames = names[sport];

            for (let i = 0; i < playerNames.length; i++) {
                const name = playerNames[i];
                const stats = statsTemplate[sport](name);
                const base_price = 100 + (i * 50);
                const year = ['1st', '2nd', '3rd', '4th'][Math.floor(Math.random() * 4)];

                // Placeholder images for players
                const photo_url = `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop&q=80&sig=${sport}${i}`;

                // Create a generic user for the player
                const email = `${name.toLowerCase().replace(' ', '.')}@example.com`;
                const hashedPassword = await bcrypt.hash('password123', 10);

                const userRes = await pool.query(
                    'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
                    [name, email, hashedPassword, 'participant']
                );
                const userId = userRes.rows[0].id;

                await pool.query(
                    'INSERT INTO players (user_id, name, sport, year, photo_url, stats, base_price, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                    [userId, name, sport, year, photo_url, JSON.stringify(stats), base_price, i === 0 ? 'eligible' : 'approved']
                );
            }
        }

        console.log('✅ Seeding Successful! 18 Players and 3 Teams added.');
    } catch (err) {
        console.error('❌ Seeding Failed:', err);
    } finally {
        pool.end();
    }
}

seed();
