import fetch from 'node-fetch';

async function testLogin() {
    try {
        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@example.com',
                password: 'admin123'
            })
        });
        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', data);
    } catch (err) {
        console.error('Fetch error:', err);
    }
}

testLogin();
