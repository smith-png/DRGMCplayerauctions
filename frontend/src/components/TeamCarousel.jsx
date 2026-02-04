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
            } catch (error) {
                console.error('Failed to fetch teams:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTeams();
    }, []);

    // Duplicate the teams list to create seamless infinite scroll
    // Ensure we have enough items for scrolling even if teams list is short
    const displayTeams = teams.length > 0
        ? [...teams, ...teams, ...teams, ...teams]
        : [];

    if (loading) return null;
    if (teams.length === 0) return null;

    return (
        <section className="team-carousel-section">
            <h2 className="section-title">Participating Teams</h2>

            <div className="carousel-wrapper-new">
                <div className="carousel-track-new">
                    {displayTeams.map((team, index) => (
                        <div key={`${team.id}-${index}`} className="team-carousel-card">
                            <div className="team-logo-wrapper-carousel" style={{ position: 'relative' }}>
                                <div
                                    className="team-logo-placeholder"
                                    style={{
                                        '--team-color': '#2563EB',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        zIndex: 1
                                    }}
                                >
                                    {team.name ? team.name.substring(0, 2).toUpperCase() : '??'}
                                </div>
                                {team.logo_url && (
                                    <img
                                        src={team.logo_url}
                                        alt={team.name}
                                        className="team-logo-carousel"
                                        style={{
                                            position: 'relative',
                                            zIndex: 2,
                                            background: 'var(--bg-primary)'
                                        }}
                                        onError={(e) => {
                                            e.target.style.opacity = '0';
                                        }}
                                    />
                                )}
                            </div>
                            <h3 className="team-name">{team.name}</h3>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
