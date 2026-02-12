import { useState, useEffect } from 'react';
import { teamsAPI } from '../services/api';
import './Teams.css';

export default function Teams() {
    const [teams, setTeams] = useState([]);
    const [filteredTeams, setFilteredTeams] = useState([]);
    const [activeSport, setActiveSport] = useState('Cricket'); // Default tab
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTeams = async () => {
            try {
                const response = await teamsAPI.getAllTeams();
                setTeams(response.data.teams || []);
            } catch (error) { console.error('Failed to fetch teams:', error); }
            finally { setLoading(false); }
        };
        fetchTeams();
    }, []);

    useEffect(() => {
        // Filter teams based on active sport
        const filtered = teams.filter(team => team.sport?.toLowerCase() === activeSport.toLowerCase().replace('volleyball', 'volleyball')); // Normalized if needed, but usually match exact
        // The API returns lowercase sports usually. The tab is Title Case. 
        // Let's ensure robust matching.
        if (!teams) return;
        const targetSport = activeSport.toLowerCase();
        const filteredList = teams.filter(team => (team.sport || '').toLowerCase() === targetSport);
        setFilteredTeams(filteredList);
    }, [activeSport, teams]);

    return (
        <div className="editorial-glass-stage">
            <div className="phantom-nav-spacer"></div>
            <div className="teams-page">
                <div className="teams-header">
                    <div className="header-left">
                        <div className="header-meta">AUCTION TERMINAL // 2026 EDITION</div>
                        <h1 className="header-title">THE<br />TEAMS</h1>
                    </div>
                    <div className="header-right">
                        <div className="header-meta">SPORT: {activeSport.toUpperCase()}</div>
                    </div>
                </div>

                {/* GLASS CAPSULE TAB NAV */}
                <div className="sport-tabs-container">
                    {['Cricket', 'Futsal', 'Volleyball'].map(sport => (
                        <button
                            key={sport}
                            className={`sport-tab ${activeSport === sport ? 'active' : ''}`}
                            onClick={() => setActiveSport(sport)}
                        >
                            {sport}
                        </button>
                    ))}
                </div>

                {/* FLOATING GLASS DATA STRIPS */}
                {loading ? <div className="loading-state">SYNCHRONIZING DATA...</div> : (
                    <div className="teams-list">
                        {filteredTeams.map(team => {
                            const budgetRemaining = team.purse_remaining || team.budget || 0;
                            const budgetTotal = team.budget || 2000;
                            const budgetUsedPercent = ((budgetTotal - budgetRemaining) / budgetTotal) * 100;

                            return (
                                <div key={team.id} className="franchise-strip">
                                    {/* Identity Column */}
                                    <div className="strip-identity">
                                        <div className="team-name-main">{team.name}</div>
                                        <div className="owner-subtitle">PRINCIPAL OWNER: {team.owner_name || 'N/A'}</div>
                                    </div>

                                    {/* Visual Budget Column */}
                                    <div className="strip-budget">
                                        <div className="budget-header">
                                            <span className="budget-label">CAP LEFT</span>
                                            <span className="budget-value">{budgetRemaining.toLocaleString()} PTS</span>
                                        </div>
                                        <div className="budget-track">
                                            <div className="budget-fill" style={{ width: `${Math.max(0, 100 - budgetUsedPercent)}%` }}></div>
                                        </div>
                                    </div>

                                    {/* Roster Badge Column */}
                                    <div className="strip-roster">
                                        <div className="roster-badge">
                                            {team.player_count || 0}/15
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {filteredTeams.length === 0 && !loading && (
                    <div className="empty-state">NO RECORD FOUND FOR THIS CATEGORY.</div>
                )}
            </div>
        </div>
    );
}
