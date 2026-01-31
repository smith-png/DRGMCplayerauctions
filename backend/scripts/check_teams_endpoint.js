async function checkTeams() {
    try {
        const response = await fetch('http://localhost:5000/api/teams');
        console.log('Status:', response.status);
        const data = await response.json();
        console.log('Data:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error fetching teams:', error.message);
    }
}

checkTeams();
