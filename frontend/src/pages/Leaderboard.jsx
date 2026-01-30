import { useState, useEffect } from 'react';
import { auctionAPI } from '../services/api';
import socketService from '../services/socket';
import './Leaderboard.css';

export default function Leaderboard() {
    const [leaderboard, setLeaderboard] = useState([]);
    const [selectedSport, setSelectedSport] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLeaderboard();

        // Connect to Socket.IO
        socketService.connect();

        // Listen for leaderboard refresh
        socketService.onRefreshLeaderboard(() => {
            loadLeaderboard();
        });

        return () => {
            socketService.off('refresh-leaderboard');
        };
    }, [selectedSport]);

    const loadLeaderboard = async () => {
        try {
            const response = await auctionAPI.getLeaderboard(selectedSport);
            setLeaderboard(response.data.leaderboard);
        } catch (err) {
            console.error('Failed to load leaderboard:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="leaderboard-page">
                <div className="container">
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="leaderboard-page">
            <div className="container">
                <div className="leaderboard-header">
                    <h1>🏆 Team Leaderboard</h1>

                    <div className="sport-filter">
                        <button
                            className={`filter-btn ${selectedSport === '' ? 'active' : ''}`}
                            onClick={() => setSelectedSport('')}
                        >
                            All Sports
                        </button>
                        <button
                            className={`filter-btn ${selectedSport === 'cricket' ? 'active' : ''}`}
                            onClick={() => setSelectedSport('cricket')}
                        >
                            Cricket
                        </button>
                        <button
                            className={`filter-btn ${selectedSport === 'futsal' ? 'active' : ''}`}
                            onClick={() => setSelectedSport('futsal')}
                        >
                            Futsal
                        </button>
                        <button
                            className={`filter-btn ${selectedSport === 'volleyball' ? 'active' : ''}`}
                            onClick={() => setSelectedSport('volleyball')}
                        >
                            Volleyball
                        </button>
                    </div>
                </div>

                <div className="leaderboard-grid">
                    {leaderboard.map((team, index) => (
                        <div key={team.id} className="team-card card animate-fadeIn">
                            <div className="team-header">
                                <div className="team-rank">#{index + 1}</div>
                                <div className="team-info">
                                    <h3>{team.name}</h3>
                                    <span className="badge badge-primary">{team.sport}</span>
                                </div>
                            </div>

                            <div className="team-stats">
                                <div className="stat-box">
                                    <span className="stat-label">Budget</span>
                                    <span className="stat-value">₹{team.budget.toLocaleString()}</span>
                                </div>
                                <div className="stat-box">
                                    <span className="stat-label">Spent</span>
                                    <span className="stat-value spent">₹{parseFloat(team.total_spent).toLocaleString()}</span>
                                </div>
                                <div className="stat-box">
                                    <span className="stat-label">Remaining</span>
                                    <span className="stat-value remaining">₹{team.remaining_budget.toLocaleString()}</span>
                                </div>
                                <div className="stat-box">
                                    <span className="stat-label">Players</span>
                                    <span className="stat-value">{team.player_count}</span>
                                </div>
                            </div>

                            {team.players && team.players.length > 0 && (
                                <div className="team-players">
                                    <h4>Squad</h4>
                                    <div className="players-list">
                                        {team.players.map((player) => (
                                            <div key={player.id} className="player-item">
                                                <div className="player-item-info">
                                                    {player.photo_url && (
                                                        <img src={player.photo_url} alt={player.name} className="player-avatar" />
                                                    )}
                                                    <div>
                                                        <div className="player-name">{player.name}</div>
                                                        <div className="player-year">{player.year} MBBS</div>
                                                    </div>
                                                </div>
                                                <div className="player-price">₹{parseFloat(player.sold_price).toLocaleString()}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {leaderboard.length === 0 && (
                    <div className="no-data card text-center">
                        <h3>No teams found</h3>
                        <p>Teams will appear here once the auction starts</p>
                    </div>
                )}
            </div>
        </div>
    );
}
