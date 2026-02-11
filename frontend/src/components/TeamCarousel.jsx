import React, { useEffect, useState } from 'react';
import { teamsAPI } from '../services/api';
import './TeamCarousel.css';

export default function TeamCarousel() {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTeams = async () => {
            try {
                const response = await teamsAPI.getAllTeams();
                setTeams(response.data.teams);
            } catch (error) { console.error('Failed to fetch teams:', error); }
            finally { setLoading(false); }
        };
        fetchTeams();
    }, []);

    if (loading || teams.length === 0) return null;

    // Quadruple the list for smooth infinite loop
    const displayTeams = [...teams, ...teams, ...teams, ...teams];

    return (
        <section className="marquee-section">
            <div className="marquee-label">PARTICIPATING FRANCHISES</div>
            <div className="marquee-track">
                {displayTeams.map((team, index) => (
                    <div key={`${team.id}-${index}`} className="marquee-item">
                        <div className="marquee-logo-wrapper">
                            {team.logo_url ? (
                                <img src={team.logo_url} alt={team.name} className="marquee-logo" onError={(e) => e.target.style.display = 'none'} />
                            ) : (
                                <div className="marquee-placeholder">{team.name.substring(0, 2)}</div>
                            )}
                        </div>
                        <span className="marquee-name">{team.name}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}
