import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { playerAPI, teamsAPI } from '../services/api';
import './PlayerProfilesBySport.css';

export default function PlayerProfilesBySport() {
    const { sport } = useParams();
    const navigate = useNavigate();
    const [players, setPlayers] = useState([]);
    const [filteredPlayers, setFilteredPlayers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [yearFilter, setYearFilter] = useState('All');

    useEffect(() => { fetchData(); }, [sport]);
    useEffect(() => { applyYearFilter(); }, [players, yearFilter]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [playersRes, teamsRes] = await Promise.all([playerAPI.getAllPlayers(), teamsAPI.getAllTeams()]);
            const sportPlayers = playersRes.data.players.filter(p => p.sport.toLowerCase() === sport.toLowerCase() && (p.status === 'approved' || p.status === 'eligible' || p.status === 'sold'));
            setPlayers(sportPlayers);
            setTeams(teamsRes.data.teams || []);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const applyYearFilter = () => {
        if (yearFilter === 'All') setFilteredPlayers(players);
        else setFilteredPlayers(players.filter(p => p.year === yearFilter));
    };

    const getPlayerTeam = (teamId) => teams.find(t => t.id === teamId);

    return (
        <div className="editorial-glass-stage">
            <div className="phantom-nav-spacer"></div>
            <div className="player-profiles-page">
                <div className="profiles-header">
                    <button className="back-btn" onClick={() => navigate('/')}>← BACK TO INDEX</button>
                    <h1 className="profiles-title">{sport} // ROSTER</h1>
                    <span className="sport-pill">/// TERMINAL: 2026</span>
                </div>

                <div className="filter-section">
                    <label className="filter-label">SORT BY CLASS:</label>
                    <select className="year-filter-dropdown" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
                        <option value="All">ALL PERSONNEL</option>
                        <option value="FE">FIRST YEAR (FE)</option>
                        <option value="SE">SECOND YEAR (SE)</option>
                        <option value="TE">THIRD YEAR (TE)</option>
                    </select>
                </div>

                {loading ? <div className="loading">ASSEMBLING ROSTER...</div> : (
                    <div className="players-grid">
                        {filteredPlayers.map(player => (
                            <div key={player.id} className="player-profile-card" onClick={() => setSelectedPlayer(player)}>
                                <div className="photo-container">
                                    {player.photo_url ? (
                                        <img src={player.photo_url} className="profile-photo" alt={player.name} />
                                    ) : (
                                        <div className="profile-photo-placeholder" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 900 }}>
                                            {player.name[0]}
                                        </div>
                                    )}
                                </div>
                                <div className="profile-card-info">
                                    <h3 className="profile-name">{player.name}</h3>
                                    <div className="profile-tags">
                                        <span className="profile-tag">{player.year}</span>
                                        <span className="profile-tag">{player.stats?.role || 'PLAYER'}</span>
                                        <span className="profile-tag">ID: {player.id}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* DOSSIER MODAL */}
                {selectedPlayer && (
                    <div className="profile-modal-overlay" onClick={() => setSelectedPlayer(null)}>
                        <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
                            <button className="modal-close" onClick={() => setSelectedPlayer(null)}>✕</button>
                            <div className="player-modal-content">
                                <div className="modal-photo-section">
                                    {selectedPlayer.photo_url ? (
                                        <img src={selectedPlayer.photo_url} className="modal-photo" alt={selectedPlayer.name} />
                                    ) : (
                                        <div className="modal-photo-placeholder" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem', fontWeight: 900, background: '#DDD' }}>
                                            {selectedPlayer.name[0]}
                                        </div>
                                    )}
                                    <div className="modal-name">{selectedPlayer.name}</div>
                                </div>
                                <div className="modal-info-section">
                                    <div className="info-item">
                                        <span className="info-label">PARTICIPATING SPORT</span>
                                        <span className="info-value">{selectedPlayer.sport}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">ACADEMIC YEAR</span>
                                        <span className="info-value">{selectedPlayer.year}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">BASE PRICE</span>
                                        <span className="info-value">{selectedPlayer.base_price} PTS</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">CURRENT STATUS</span>
                                        <span className="info-value" style={{ textDecoration: 'underline' }}>{selectedPlayer.status.toUpperCase()}</span>
                                    </div>

                                    {selectedPlayer.stats && (
                                        <div className="stats-grid">
                                            {Object.entries(selectedPlayer.stats).map(([key, value]) => (
                                                <div key={key} className="stat-box">
                                                    <div className="info-label">{key.replace(/([A-Z])/g, ' $1').toUpperCase()}</div>
                                                    <div className="info-value" style={{ fontSize: '0.9rem' }}>{value}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {selectedPlayer.status === 'sold' && selectedPlayer.team_id && (
                                        <div className="info-item" style={{ marginTop: '2rem', border: '2px solid #000', padding: '1rem' }}>
                                            <span className="info-label">ACQUIRED BY</span>
                                            <span className="info-value" style={{ fontWeight: 900 }}>{getPlayerTeam(selectedPlayer.team_id)?.name || 'UNKNOWN'}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
