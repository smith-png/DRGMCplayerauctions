cat << 'INNER' > frontend/src/pages/AuctionStats.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuctionStats() {
    const navigate = useNavigate();

    useEffect(() => {
        navigate('/teams');
    }, [navigate]);

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1a1a1a',
            color: '#3E5B4E',
            fontFamily: 'monospace'
        }}>
            REDIRECTING TO TEAMS...
        </div>
    );
}
INNER
