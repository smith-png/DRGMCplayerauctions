import { useState, useEffect } from 'react';
import { auctionAPI, teamOwnerAPI, authAPI } from '../services/api';
import socketService from '../services/socket';
import './AuctionStats.css';

export default function AuctionStats() {
    const [leaderboard, setLeaderboard] = useState([]);
    const [selectedSport, setSelectedSport] = useState('');
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    // Team owner specific state
    const [myTeam, setMyTeam] = useState(null);
    const [myPlayers, setMyPlayers] = useState([]);
    const [myBids, setMyBids] = useState([]);

    const getTeamColor = (sport) => {
        switch (sport?.toLowerCase()) {
            case 'cricket': return 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)';
            case 'futsal': return 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
            case 'volleyball': return 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)';
            default: return 'var(--accent-gradient)';
        }
    };

    useEffect(() => {
        loadUserAndData();

        // Connect to Socket.IO
        socketService.connect();

        // Listen for leaderboard refresh
        socketService.onRefreshLeaderboard(() => {
            loadUserAndData();
        });

        // Listen for bid updates
        socketService.on('bid-placed', (bidData) => {
            if (user?.role === 'team_owner' && myTeam && bidData.team_id === myTeam.id) {
                loadTeamOwnerData();
            }
            // For admins or general leaderboard, we also refresh
            if (user?.role === 'admin') {
                loadLeaderboard();
            }
        });

        return () => {
            socketService.off('refresh-leaderboard');
            socketService.off('bid-placed');
        };
    }, []); // Fetch once and filter locally

    const loadUserAndData = async () => {
        try {
            const userResponse = await authAPI.getCurrentUser();
            setUser(userResponse.data.user);

            if (userResponse.data.user.role === 'team_owner') {
                await loadTeamOwnerData();
            } else if (userResponse.data.user.role === 'admin') {
                await loadLeaderboard();
            }
            // Viewers don't load data
        } catch (err) {
            console.error('Failed to load user:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadTeamOwnerData = async () => {
        try {
            const [teamRes, playersRes, bidsRes] = await Promise.all([
                teamOwnerAPI.getMyTeam(),
                teamOwnerAPI.getMyTeamPlayers(),
                teamOwnerAPI.getMyTeamBids()
            ]);

            setMyTeam(teamRes.data.team);
            setMyPlayers(playersRes.data.players);
            setMyBids(bidsRes.data.bids);
        } catch (err) {
            console.error('Failed to load team owner data:', err);
        }
    };

    const loadLeaderboard = async () => {
        try {
            const response = await auctionAPI.getLeaderboard(); // Always get all data
            setLeaderboard(response.data.leaderboard);
        } catch (err) {
            console.error('Failed to load leaderboard:', err);
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

    // Access Control
    if (user?.role !== 'admin' && user?.role !== 'team_owner') {
        return (
            <div className="leaderboard-page">
                <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>
                    <div className="card" style={{ padding: '2rem' }}>
                        <h2>Access Restricted</h2>
                        <p>This page is only accessible to Team Owners and Admins.</p>
                        <a href="/" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>Go Home</a>
                    </div>
                </div>
            </div>
        );
    }

    // Team Owner View
    if (user?.role === 'team_owner') {
        if (!myTeam) {
            return (
                <div className="leaderboard-page">
                    <div className="container">
                        <div className="card text-center" style={{ padding: '3rem' }}>
                            <h2>No Team Assigned</h2>
                            <p>Please contact an administrator to assign you to a team.</p>
                        </div>
                    </div>
                </div>
            );
        }

        const totalSpent = myPlayers.reduce((sum, p) => sum + parseFloat(p.sold_price || 0), 0);

        return (
            <div className="leaderboard-page team-owner-dashboard">
                <div className="container">
                    <div className="team-header-large card animate-fadeIn">
                        <div className="team-header-content">
                            <h1 className="team-owner-title">🏆 {myTeam.name}</h1>
                            <span className="badge badge-primary sport-tag-large">
                                {myTeam.sport}
                            </span>
                        </div>
                    </div>

                    <div className="team-stats-grid">
                        <div className="stat-card card animate-fadeIn" style={{ animationDelay: '0.1s' }}>
                            <div className="stat-label">Total Budget</div>
                            <div className="stat-value">{myTeam.budget.toLocaleString()} Pts</div>
                        </div>
                        <div className="stat-card card animate-fadeIn" style={{ animationDelay: '0.2s' }}>
                            <div className="stat-label">Total Spent</div>
                            <div className="stat-value spent">{totalSpent.toLocaleString()} Pts</div>
                        </div>
                        <div className="stat-card card animate-fadeIn" style={{ animationDelay: '0.3s' }}>
                            <div className="stat-label">Remaining Budget</div>
                            <div className="stat-value remaining">{(myTeam.budget - totalSpent).toLocaleString()} Pts</div>
                        </div>
                        <div className="stat-card card animate-fadeIn" style={{ animationDelay: '0.4s' }}>
                            <div className="stat-label">Players Acquired</div>
                            <div className="stat-value">{myPlayers.length}</div>
                        </div>
                    </div>

                    <div className="team-content-grid">
                        {/* Current Squad */}
                        <div className="squad-section card animate-fadeIn" style={{ animationDelay: '0.5s' }}>
                            <h2>Current Squad</h2>
                            {myPlayers.length === 0 ? (
                                <p className="no-data">No players acquired yet</p>
                            ) : (
                                <div className="players-grid">
                                    {myPlayers.map((player) => (
                                        <div key={player.id} className="player-card-small">
                                            <img
                                                src={player.photo_url || 'https://via.placeholder.com/150?text=No+Image'}
                                                alt={player.name}
                                                className="player-photo-small"
                                                onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/150?text=No+Image'; }}
                                            />
                                            <div className="player-info-small">
                                                <div className="player-name-small">{player.name}</div>
                                                <div className="player-year-small">{player.year} MBBS</div>
                                                <div className="player-role-small">{player.stats?.role || 'Player'}</div>
                                            </div>
                                            <div className="player-price-badge">{parseFloat(player.sold_price).toLocaleString()} Pts</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Recent Bidding Activity */}
                        <div className="bid-activity card animate-fadeIn" style={{ animationDelay: '0.6s' }}>
                            <h2>Recent Bidding Activity</h2>
                            {myBids.length === 0 ? (
                                <p className="no-data">No bids placed yet</p>
                            ) : (
                                <div className="bids-list">
                                    {myBids.slice(0, 20).map((bid) => (
                                        <div key={bid.id} className="bid-item">
                                            <div className="bid-player-info">
                                                <img
                                                    src={bid.player_photo || 'https://via.placeholder.com/150?text=No+Image'}
                                                    alt={bid.player_name}
                                                    className="bid-player-avatar"
                                                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/150?text=No+Image'; }}
                                                />
                                                <div>
                                                    <div className="bid-player-name">{bid.player_name}</div>
                                                    <div className="bid-player-details">{bid.year} • {bid.sport}</div>
                                                </div>
                                            </div>
                                            <div className="bid-amount">{parseFloat(bid.amount).toLocaleString()} Pts</div>
                                            <div className="bid-timestamp">
                                                {new Date(bid.created_at).toLocaleTimeString()}
                                            </div>
                                            {bid.player_status === 'sold' && (
                                                <span className="badge badge-success">Won</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Client-side filtering
    const filteredLeaderboard = selectedSport
        ? leaderboard.filter(team => team.sport && team.sport.trim().toLowerCase() === selectedSport.toLowerCase())
        : leaderboard;

    // Default Leaderboard View (for other users)
    return (
        <div className="leaderboard-page">
            <div className="container">
                <div className="leaderboard-header animate-fadeIn">
                    <h1 className="main-title">🏆 Auction Stats {user?.role === 'admin' ? '(Admin)' : ''}</h1>

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
                    {filteredLeaderboard.length === 0 ? (
                        <div className="no-data-message" style={{ textAlign: 'center', width: '100%', padding: '2rem', color: '#666' }}>
                            {selectedSport !== 'cricket'
                                ? `No teams found for ${selectedSport.charAt(0).toUpperCase() + selectedSport.slice(1)}`
                                : "No teams found"}
                        </div>
                    ) : (
                        filteredLeaderboard.map((team, index) => (
                            <div key={team.id} className="team-card card animate-fadeIn">
                                <div className="team-header">
                                    <div className="team-header-left">
                                        <div className="team-rank">#{index + 1}</div>
                                        <h3 style={{ background: getTeamColor(team.sport), WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                            {team.name}
                                        </h3>
                                    </div>
                                    <span className="badge badge-primary sport-tag-right">{team.sport || 'Unknown'}</span>
                                </div>

                                <div className="team-stats">
                                    <div className="stat-box">
                                        <span className="stat-label">Budget</span>
                                        <span className="stat-value">{team.budget.toLocaleString()} Pts</span>
                                    </div>
                                    <div className="stat-box">
                                        <span className="stat-label">Spent</span>
                                        <span className="stat-value spent">{parseFloat(team.total_spent).toLocaleString()} Pts</span>
                                    </div>
                                    <div className="stat-box">
                                        <span className="stat-label">Remaining</span>
                                        <span className="stat-value remaining">{team.remaining_budget.toLocaleString()} Pts</span>
                                    </div>
                                    <div className="stat-box">
                                        <span className="stat-label">Players</span>
                                        <span className="stat-value">{team.players ? team.players.length : 0}</span>
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
                                                    <div className="player-price">{parseFloat(player.sold_price).toLocaleString()} Pts</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )))}
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
