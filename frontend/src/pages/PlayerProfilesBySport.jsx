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
    const [currentPage, setCurrentPage] = useState(1);
    const [yearFilter, setYearFilter] = useState('All');
    const playersPerPage = 12;

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sport]);

    useEffect(() => {
        applyYearFilter();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [players, yearFilter]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [playersRes, teamsRes] = await Promise.all([
                playerAPI.getAllPlayers(),
                teamsAPI.getAllTeams()
            ]);

            const sportPlayers = playersRes.data.players.filter(
                p => p.sport === sport && (p.status === 'approved' || p.status === 'eligible' || p.status === 'sold')
            );
            setPlayers(sportPlayers);
            setTeams(teamsRes.data.teams || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const applyYearFilter = () => {
        if (yearFilter === 'All') {
            setFilteredPlayers(players);
        } else {
            setFilteredPlayers(players.filter(p => p.year === yearFilter));
        }
        setCurrentPage(1); // Reset to first page when filter changes
    };

    const getPlayerTeam = (teamId) => {
        return teams.find(t => t.id === teamId);
    };

    const handleTeamClick = (teamId, sport) => {
        navigate(`/teams?sport=${sport}&team=${teamId}`);
    };

    // Pagination logic
    const indexOfLastPlayer = currentPage * playersPerPage;
    const indexOfFirstPlayer = indexOfLastPlayer - playersPerPage;
    const currentPlayers = filteredPlayers.slice(indexOfFirstPlayer, indexOfLastPlayer);
    const totalPages = Math.ceil(filteredPlayers.length / playersPerPage);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const getSportName = () => {
        return sport.charAt(0).toUpperCase() + sport.slice(1);
    };

    return (
        <div className="player-profiles-page">
            <div className="profiles-header">
                <button className="back-btn" onClick={() => navigate('/')}>
                    ← Back to Home
                </button>
                <h1 className="profiles-title">Participating Players</h1>
                <span className="sport-pill">
                    {getSportName()}
                </span>
            </div>

            {/* Year Filter */}
            <div className="filter-section">
                <label htmlFor="year-filter" className="filter-label">Filter by MBBS Year:</label>
                <select
                    id="year-filter"
                    className="year-filter-dropdown"
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                >
                    <option value="All">All Years</option>
                    <option value="FE">First Year</option>
                    <option value="SE">Second Year</option>
                    <option value="TE">Third Year</option>
                </select>
            </div>

            {loading ? (
                <div className="loading-spinner">
                    <div className="spinner"></div>
                </div>
            ) : filteredPlayers.length === 0 ? (
                <div className="empty-state">
                    <h3>No players found</h3>
                    <p>
                        {yearFilter === 'All'
                            ? `No registrations for ${sport} yet`
                            : `No ${yearFilter} students registered for ${sport}`
                        }
                    </p>
                </div>
            ) : (
                <>
                    <div className="players-grid">
                        {currentPlayers.map(player => (
                            <div
                                key={player.id}
                                className="player-profile-card"
                                onClick={() => setSelectedPlayer(player)}
                            >
                                {player.photo_url ? (
                                    <img
                                        src={player.photo_url}
                                        alt={player.name}
                                        className="profile-photo"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="profile-photo-placeholder">
                                        {player.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className="profile-card-info">
                                    <h3 className="profile-name">{player.name}</h3>
                                    <div className="profile-tags-container">
                                        <span className="profile-tag">{player.year} MBBS</span>
                                        <span className="profile-tag">{
                                            typeof player.stats === 'object' ? player.stats.playingRole : (player.stats || 'Player')
                                        }</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="pagination">
                            <button
                                className="page-btn"
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </button>

                            <div className="page-numbers">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                                    <button
                                        key={pageNum}
                                        className={`page-num ${currentPage === pageNum ? 'active' : ''}`}
                                        onClick={() => handlePageChange(pageNum)}
                                    >
                                        {pageNum}
                                    </button>
                                ))}
                            </div>

                            <button
                                className="page-btn"
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Player Profile Modal */}
            {selectedPlayer && (
                <div className="profile-modal-overlay" onClick={() => setSelectedPlayer(null)}>
                    <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="modal-close"
                            onClick={() => setSelectedPlayer(null)}
                        >
                            ✕
                        </button>

                        <div className="modal-content">
                            <div className="modal-photo-section">
                                {selectedPlayer.photo_url ? (
                                    <img
                                        src={selectedPlayer.photo_url}
                                        alt={selectedPlayer.name}
                                        className="modal-photo"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="modal-photo-placeholder">
                                        {selectedPlayer.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>

                            <div className="modal-info-section">
                                <h2 className="modal-name">{selectedPlayer.name}</h2>

                                <div className="info-grid">
                                    <div className="info-item">
                                        <span className="info-label">Sport</span>
                                        <span className="info-value">
                                            {selectedPlayer.sport.charAt(0).toUpperCase() + selectedPlayer.sport.slice(1)}
                                        </span>
                                    </div>

                                    <div className="info-item">
                                        <span className="info-label">MBBS Year</span>
                                        <span className="info-value">{selectedPlayer.year}</span>
                                    </div>

                                    <div className="info-item">
                                        <span className="info-label">Playing Role</span>
                                        <span className="info-value">{
                                            typeof selectedPlayer.stats === 'object' ? selectedPlayer.stats.playingRole : (selectedPlayer.stats || 'All-Rounder')
                                        }</span>
                                    </div>

                                    <div className="info-item">
                                        <span className="info-label">Base Price</span>
                                        <span className="info-value">{selectedPlayer.base_price} Pts</span>
                                    </div>

                                    {selectedPlayer.status === 'sold' && selectedPlayer.final_price && (
                                        <div className="info-item">
                                            <span className="info-label">Sold For</span>
                                            <span className="info-value sold-price">
                                                {selectedPlayer.final_price} Pts
                                            </span>
                                        </div>
                                    )}

                                    {selectedPlayer.status === 'sold' && selectedPlayer.team_id && (
                                        <div className="info-item">
                                            <span className="info-label">Team</span>
                                            {(() => {
                                                const team = getPlayerTeam(selectedPlayer.team_id);
                                                return team ? (
                                                    <span
                                                        className="info-value team-link"
                                                        onClick={() => handleTeamClick(team.id, team.sport)}
                                                    >
                                                        {team.name} →
                                                    </span>
                                                ) : (
                                                    <span className="info-value">Unknown</span>
                                                );
                                            })()}
                                        </div>
                                    )}

                                    <div className="info-item">
                                        <span className="info-label">Status</span>
                                        <span className={`status-badge ${selectedPlayer.status}`}>
                                            {selectedPlayer.status.charAt(0).toUpperCase() + selectedPlayer.status.slice(1)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
