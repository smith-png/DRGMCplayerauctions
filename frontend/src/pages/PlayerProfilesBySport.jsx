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
        <div className="player-profiles-page">
            <div className="profiles-header">
                <button className="back-btn" onClick={() => navigate('/')}>← INDEX</button>
                <h1 className="profiles-title">{sport} ROSTER</h1>
                <span className="sport-pill">/// 2026 SEASON</span>
            </div>

            <div className="filter-section">
                <label className="filter-label">FILTER CLASS:</label>
                <select className="year-filter-dropdown" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
                    <option value="All">ALL CLASSES</option>
                    <option value="FE">FIRST YEAR</option>
                    <option value="SE">SECOND YEAR</option>
                    <option value="TE">THIRD YEAR</option>
                </select>
            </div>

            {loading ? <div className="loading">LOADING...</div> : (
                <div className="players-grid">
                    {filteredPlayers.map(player => (
                        <div key={player.id} className="player-profile-card" onClick={() => setSelectedPlayer(player)}>
                            {player.photo_url ? <img src={player.photo_url} className="profile-photo" /> : <div className="profile-photo-placeholder">{player.name[0]}</div>}
                            <div className="profile-card-info">
                                <h3 className="profile-name">{player.name}</h3>
                                <div className="profile-tags"><span className="profile-tag">{player.year}</span><span className="profile-tag">{player.stats?.role || 'PLAYER'}</span></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* DOSSIER SLIDE-OVER */}
            {selectedPlayer && (
                <div className="profile-modal-overlay" onClick={() => setSelectedPlayer(null)}>
                    <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setSelectedPlayer(null)}>✕</button>
                        <div className="player-modal-content">
                            <div className="modal-photo-section">
                                {selectedPlayer.photo_url ? <img src={selectedPlayer.photo_url} className="modal-photo" /> : <div className="modal-photo-placeholder">{selectedPlayer.name[0]}</div>}
                                <div className="modal-name">{selectedPlayer.name}</div>
                            </div>
                            <div className="modal-info-section">
                                <div className="info-item"><span className="info-label">SPORT</span><span className="info-value lowercase">{selectedPlayer.sport}</span></div>
                                <div className="info-item"><span className="info-label">GRADE</span><span className="info-value">{selectedPlayer.year} {selectedPlayer.year !== 'Intern' ? 'MBBS' : ''}</span></div>
                                <div className="info-item"><span className="info-label">BASE VALUATION</span><span className="info-value">{selectedPlayer.base_price} PTS</span></div>
                                <div className="info-item"><span className="info-label">STATUS</span><span className={`status-badge ${selectedPlayer.status}`}>{selectedPlayer.status}</span></div>

                                {selectedPlayer.stats && (
                                    <div className="info-item full-width-stats">
                                        <span className="info-label">STATS</span>
                                        <div className="stats-tags-container">
                                            {Object.entries(selectedPlayer.stats).map(([key, value]) => (
                                                <span key={key} className="stat-tag">
                                                    <span className="stat-key">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                                    <span className="stat-value">{value}</span>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedPlayer.status === 'sold' && selectedPlayer.team_id && (
                                    <div className="info-item">
                                        <span className="info-label">ACQUIRED BY</span>
                                        <span className="info-value" style={{ color: 'var(--cricket-green)' }}>{getPlayerTeam(selectedPlayer.team_id)?.name || 'UNKNOWN'}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
