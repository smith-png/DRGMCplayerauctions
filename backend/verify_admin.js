import axios from 'axios';

const API_URL = 'http://localhost:5000/api';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

async function verifyAdminUsers() {
    try {
        console.log('1. Logging in as admin...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });
        const token = loginRes.data.token;
        console.log('Login successful. Token obtained.');

        console.log('\n2. Fetching Users...');
        try {
            const usersRes = await axios.get(`${API_URL}/admin/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`Success! Status: ${usersRes.status}`);
            console.log('Users found:', usersRes.data.users.length);
            console.log('User list:', JSON.stringify(usersRes.data.users, null, 2));
        } catch (err) {
            console.error('Failed to fetch users:', err.response ? err.response.data : err.message);
        }

    } catch (error) {
        console.error('Test failed:', error.response ? error.response.data : error.message);
    }
}

verifyAdminUsers();
