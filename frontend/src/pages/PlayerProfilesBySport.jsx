import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { playerAPI } from '../services/api';
import './PlayerProfilesBySport.css';

export default function PlayerProfilesBySport() {
    const { sport } = useParams();
    const navigate = useNavigate();
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const playersPerPage = 12;

    useEffect(() => {
        fetchPlayers();
    }, [sport]);

    const fetchPlayers = async () => {
        setLoading(true);
        try {
            const response = await playerAPI.getAllPlayers();
            const sportPlayers = response.data.players.filter(
                p => p.sport === sport && (p.status === 'approved' || p.status === 'eligible' || p.status === 'sold')
            );
            setPlayers(sportPlayers);
        } catch (error) {
            console.error('Error fetching players:', error);
        } finally {
            setLoading(false);
        }
    };

    // Pagination logic
    const indexOfLastPlayer = currentPage * playersPerPage;
    const indexOfFirstPlayer = indexOfLastPlayer - playersPerPage;
    const currentPlayers = players.slice(indexOfFirstPlayer, indexOfLastPlayer);
    const totalPages = Math.ceil(players.length / playersPerPage);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const getSportIcon = () => {
        switch (sport) {
            case 'cricket': return '🏏';
            case 'futsal': return '⚽';
            case 'volleyball': return '🏐';
            default: return '🏆';
        }
    };

    return (
        <div className="player-profiles-page">
            <div className="profiles-header">
                <button className="back-btn" onClick={() => navigate('/')}>
                    ← Back to Home
                </button>
                <h1 className="profiles-title">Participating Players</h1>
                <span className="sport-pill">
                    {getSportIcon()} {sport.charAt(0).toUpperCase() + sport.slice(1)}
                </span>
            </div>

            {loading ? (
                <div className="loading-spinner">
                    <div className="spinner"></div>
                </div>
            ) : players.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">👤</div>
                    <h3>Currently no registrations for {sport}</h3>
                    <p>Players will appear here once they register and are approved</p>
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
                                    />
                                ) : (
                                    <div className="profile-photo-placeholder">
                                        {player.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className="profile-card-info">
                                    <h3 className="profile-name">{player.name}</h3>
                                    <p className="profile-year">{player.year}</p>
                                    <p className="profile-role">{player.stats || 'Player'}</p>
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
                                            {getSportIcon()} {selectedPlayer.sport.charAt(0).toUpperCase() + selectedPlayer.sport.slice(1)}
                                        </span>
                                    </div>

                                    <div className="info-item">
                                        <span className="info-label">MBBS Year</span>
                                        <span className="info-value">{selectedPlayer.year}</span>
                                    </div>

                                    <div className="info-item">
                                        <span className="info-label">Playing Role</span>
                                        <span className="info-value">{selectedPlayer.stats || 'All-Rounder'}</span>
                                    </div>

                                    <div className="info-item">
                                        <span className="info-label">Base Price</span>
                                        <span className="info-value">{selectedPlayer.base_price} Pts</span>
                                    </div>

                                    {selectedPlayer.status === 'sold' && selectedPlayer.final_price && (
                                        <div className="info-item">
                                            <span className="info-label">Sold For</span>
                                            <span className="info-value sold-price">
                                                💰 {selectedPlayer.final_price} Pts
                                            </span>
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
