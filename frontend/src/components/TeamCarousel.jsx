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

    if (loading || teams.length === 0) return null;

    // Duplicate the list 4 times to ensure it's long enough to scroll infinitely
    const displayList = [...teams, ...teams, ...teams, ...teams];

    return (
        <div className="ticker-shell">
            {/* STATIC TITLE OVERLAY */}
            <div className="ticker-static-title">PARTICIPATING TEAMS</div>

            {/* MOVING TRACK (Must be transparent) */}
            <div className="ticker-track">
                {displayList.map((team, index) => (
                    <div key={`${team.id}-${index}`} className="ticker-item">
                        <div className="ticker-dot"></div>
                        <span className="ticker-name">{team.name || "TEAM NAME"}</span>
                        <span className="ticker-divider">///</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
