import React, { useEffect, useState } from 'react';
import { teamsAPI } from '../services/api';
import './TeamCarousel.css';

// ⚡ Bolt: Cache team list at the module level to prevent redundant backend calls
// Impact: Reduces API requests on remount. Measurable improvement in load time
// for components containing this carousel.
let cachedTeams = null;

export default function TeamCarousel() {
    const [teams, setTeams] = useState(cachedTeams || []);
    const [loading, setLoading] = useState(!cachedTeams);

    useEffect(() => {
        // Skip fetching if already cached
        if (cachedTeams) return;

        let isMounted = true;
        const fetchTeams = async () => {
            try {
                const response = await teamsAPI.getAllTeams();
                cachedTeams = response.data.teams;
                if (isMounted) setTeams(cachedTeams);
            } catch (error) {
                console.error('Failed to fetch teams:', error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchTeams();

        return () => { isMounted = false; };
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
