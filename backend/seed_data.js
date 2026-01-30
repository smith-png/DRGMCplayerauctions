import fetch from 'node-fetch'; // Fallback if regular fetch has issues, but Node 24 has global fetch. 
// Actually Node 24 has global fetch, so no import needed.

const API_URL = 'http://localhost:5000/api';

const testData = [
    {
        user: { name: 'Virat Kohli', email: 'virat@rcb.com', password: 'password123', role: 'participant' },
        player: { name: 'Virat Kohli', sport: 'cricket', year: '3rd', stats: { role: 'Batsman (Rt H)' } }
    },
    {
        user: { name: 'Sunil Chhetri', email: 'sunil@bbfc.com', password: 'password123', role: 'participant' },
        player: { name: 'Sunil Chhetri', sport: 'futsal', year: '4th', stats: { role: 'Forward' } }
    },
    {
        user: { name: 'PV Sindhu', email: 'pv@badminton.com', password: 'password123', role: 'participant' },
        player: { name: 'PV Sindhu', sport: 'volleyball', year: '2nd', stats: { role: 'Attacker' } } // Volleyball mapping
    }
];

async function seed() {
    console.log('🌱 Starting database seed...');

    for (const data of testData) {
        let token = null;

        // 1. Register User
        try {
            console.log(`\nProcessing ${data.user.name}...`);
            const regRes = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data.user)
            });

            if (regRes.status === 201) {
                const json = await regRes.json();
                token = json.token;
                console.log(`✅ Registered user: ${data.user.email}`);
            } else if (regRes.status === 409) {
                console.log(`ℹ️ User already exists: ${data.user.email}. Logging in...`);
                // Login to get token
                const loginRes = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: data.user.email, password: data.user.password })
                });

                if (!loginRes.ok) {
                    const err = await loginRes.text();
                    console.error(`❌ Login failed: ${err}`);
                    continue;
                }
                const json = await loginRes.json();
                token = json.token;
                console.log(`✅ Logged in.`);
            } else {
                const err = await regRes.text();
                console.error(`❌ Registration failed: ${err}`);
                continue;
            }

        } catch (e) {
            console.error(`❌ Error during user processing: ${e.message}`);
            continue;
        }

        // 2. Create Player
        if (token) {
            try {
                // Check if player already exists for this user (optional, or just blindly create and ignore dupes?)
                // API doesn't seem to enforce one player per user unique constraint in code, but maybe DB does?
                // For simplicity, we try to create.
                const playerRes = await fetch(`${API_URL}/players`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(data.player)
                });

                if (playerRes.status === 201) {
                    console.log(`✅ Created player: ${data.player.name}`);
                } else {
                    const err = await playerRes.text();
                    console.log(`⚠️ Could not create player (maybe already exists?): ${err}`);
                }
            } catch (e) {
                console.error(`❌ Error creating player: ${e.message}`);
            }
        }
    }
    console.log('\n✨ Seeding completed.');
}

seed();
