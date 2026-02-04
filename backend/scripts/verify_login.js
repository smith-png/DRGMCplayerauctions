
async function verifyLogin() {
    try {
        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'aryan@auction.com',
                password: 'password123'
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('Login Successful!');
            console.log('User ID:', data.user.id);
            console.log('User Role:', data.user.role);
            console.log('Token received:', !!data.token);
        } else {
            console.error('Login Failed:', data);
        }
    } catch (error) {
        console.error('Network/Script Error:', error);
    }
}

verifyLogin();
