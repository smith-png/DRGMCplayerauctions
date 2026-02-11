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
        <div className="teams-page">
            <div className="teams-header">
                <div className="header-meta">OFFICIAL LEAGUE PARTNERS</div>
                <h1 className="header-title">TEAM<br />DIRECTORY</h1>
            </div>

            {/* TAB NAV */}
            <div className="sport-tabs">
                {['Cricket', 'Futsal', 'Volleyball'].map(sport => (
                    <button
                        key={sport}
                        className={`tab-btn ${activeSport === sport ? 'active' : ''}`}
                        onClick={() => setActiveSport(sport)}
                    >
                        {sport}
                    </button>
                ))}
            </div>

            {/* GRID */}
            {loading ? <div className="loading-state">LOADING DATA...</div> : (
                <div className="teams-grid">
                    {filteredTeams.map(team => (
                        <div key={team.id} className="team-card-admin">
                            <div className="card-header" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                                <div className="team-logo-wrapper">
                                    {team.logo_url ? (
                                        <img src={team.logo_url} alt={team.name} className="team-logo-small" />
                                    ) : (
                                        <div className="team-logo-placeholder">{(team.name || '?').substring(0, 2).toUpperCase()}</div>
                                    )}
                                </div>
                                <div className="text-center text-secondary small">ID: #{String(team.id).padStart(4, '0')}</div>
                            </div>

                            <div className="card-body text-center">
                                <h2 className="team-name" style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{team.name}</h2>
                                <div className="owner-name text-secondary" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>OWNER: {team.owner_name || 'N/A'}</div>
                            </div>

                            <div className="card-footer" style={{ marginTop: 'auto', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-secondary small">CAP SPACE</span>
                                    <span className="font-bold highlight">{team.purse_remaining?.toLocaleString() || team.budget?.toLocaleString() || 0} PTS</span>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-secondary small">ROSTER SIZE</span>
                                    <span className="font-bold">{team.player_count || 0} ATHLETES</span>
                                </div>
                                <div className="cap-bar" style={{ height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div
                                        className="cap-fill"
                                        style={{
                                            width: `${(Math.max(0, 5000 - (team.purse_remaining || 0)) / 5000) * 100}%`,
                                            height: '100%',
                                            background: 'var(--accent-gradient)'
                                        }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {filteredTeams.length === 0 && !loading && (
                <div className="empty-state">NO TEAMS REGISTERED FOR THIS SPORT.</div>
            )}
        </div>
    );
}
