import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

async function testOwnerFlow() {
    try {
        // 1. Login as Admin
        console.log("1. Logging in as Admin...");
        const adminRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@system.com',
            password: 'password123'
        });
        const adminToken = adminRes.data.token;
        console.log("Admin logged in.");

        // 2. Create a specific Team Owner User
        const timestamp = Date.now();
        const ownerEmail = `owner${timestamp}@test.com`;
        const ownerName = `Owner ${timestamp}`;

        console.log(`2. Creating Team Owner: ${ownerEmail}`);
        const createRes = await axios.post(`${API_URL}/admin/users`, {
            name: ownerName,
            email: ownerEmail,
            password: 'password123',
            role: 'team_owner'
        }, { headers: { Authorization: `Bearer ${adminToken}` } });

        const ownerId = createRes.data.user.id;
        console.log(`Owner Created. ID: ${ownerId}`);

        // 3. Get a Team
        const teamsRes = await axios.get(`${API_URL}/admin/teams`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        const team = teamsRes.data.teams[0];
        if (!team) throw new Error("No teams found");
        console.log(`Target Team: ${team.id} (${team.name})`);

        // 4. Assign Owner to Team
        console.log("3. Assigning Owner to Team...");
        await axios.put(`${API_URL}/admin/teams/${team.id}`, {
            owner_id: ownerId
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        console.log("Assignment complete.");

        // 5. Login as the NEW Owner
        console.log("4. Logging in as New Owner...");
        const ownerLoginRes = await axios.post(`${API_URL}/auth/login`, {
            email: ownerEmail,
            password: 'password123'
        });

        const loggedInUser = ownerLoginRes.data.user;
        console.log("Owner Login Response User:", loggedInUser);

        if (String(loggedInUser.team_id) === String(team.id)) {
            console.log("SUCCESS: team_id is present and correct in login response.");
        } else {
            console.error("FAILURE: team_id mismatch or missing.", { expected: team.id, got: loggedInUser.team_id });
        }

    } catch (error) {
        console.error("Test Failed:", error.message);
        if (error.response) console.error("Response:", error.response.data);
    }
}

testOwnerFlow();
