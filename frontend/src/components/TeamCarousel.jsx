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
        <section className="ticker-wrap">
            <div className="ticker-label">PARTICIPATING TEAMS</div>
            <div className="ticker-track">
                {displayTeams.map((team, index) => (
                    <React.Fragment key={`${team.id}-${index}`}>
                        <div className="ticker-item">
                            <div className="ticker-logo-wrapper">
                                {team.logo_url ? (
                                    <img src={team.logo_url} alt={team.name} className="ticker-logo" onError={(e) => e.target.style.display = 'none'} />
                                ) : (
                                    <div className="ticker-placeholder">{team.name.substring(0, 2)}</div>
                                )}
                            </div>
                            <span className="ticker-name">{team.name}</span>
                        </div>
                        {index < displayTeams.length - 1 && (
                            <span className="ticker-separator">///</span>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </section>
    );
}
