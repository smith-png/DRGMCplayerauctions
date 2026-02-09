import { useState, useEffect } from 'react';
import { auctionAPI, teamOwnerAPI, authAPI, playerAPI, adminAPI } from '../services/api';
import socketService from '../services/socket';
import './AuctionStats.css';

export default function AuctionStats() {
    const [leaderboard, setLeaderboard] = useState([]);
    const [selectedSport, setSelectedSport] = useState('');
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    // Live Auction State for Bidding
    const [currentAuction, setCurrentAuction] = useState(null);
    const [bidIncrementRules, setBidIncrementRules] = useState([]);
    const [isConnected, setIsConnected] = useState(false);

    // Team owner specific state
    const [myTeam, setMyTeam] = useState(null);
    const [myPlayers, setMyPlayers] = useState([]);
    const [myBids, setMyBids] = useState([]);
    const [eligiblePlayers, setEligiblePlayers] = useState([]);

    // Admin Logs State
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [bidLogs, setBidLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(false);

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
        loadAuctionStateAndCurrent();

        // Connect to Socket.IO
        socketService.connect();
        socketService.joinAuction(); // Join room to get updates

        setIsConnected(socketService.connected);
        socketService.socket.on('connect', () => setIsConnected(true));
        socketService.socket.on('disconnect', () => setIsConnected(false));

        // Listen for leaderboard refresh
        socketService.onRefreshLeaderboard(() => {
            loadUserAndData();
        });

        // Listen for bid updates (updates local state immediately)
        socketService.on('bid-update', (data) => {
            setCurrentAuction(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    current_bid: data.amount,
                    current_team_id: data.teamId,
                    current_team_name: data.teamName
                };
            });

            // Also refresh owner data if it's my team
            if (user?.role === 'team_owner' && myTeam && data.teamId === myTeam.id) {
                loadTeamOwnerData();
            }
        });

        // Listen for auction updates (start, end, sold)
        socketService.onAuctionUpdate((data) => {
            if (data.type === 'started') {
                loadAuctionStateAndCurrent();
            } else if (data.type === 'sold' || data.type === 'unsold') {
                setCurrentAuction(null);
                loadUserAndData(); // Refresh budget/players
            }
        });

        // Listen for generic refresh data (wallet reset, sold player, etc.)
        socketService.on('refresh-data', () => {
            loadUserAndData();
            loadAuctionStateAndCurrent();
        });

        return () => {
            socketService.off('refresh-leaderboard');
            socketService.off('bid-update');
            socketService.off('auction-update');
            socketService.off('refresh-data');
            socketService.socket.off('connect');
            socketService.socket.off('disconnect');
        };
    }, [user?.role, myTeam?.id]); // Re-bind if user role or team changes

    const loadAuctionStateAndCurrent = async () => {
        try {
            const [stateRes, currentRes] = await Promise.all([
                auctionAPI.getAuctionState(),
                auctionAPI.getCurrentAuction()
            ]);

            if (stateRes.data.bidIncrementRules) {
                setBidIncrementRules(stateRes.data.bidIncrementRules);
            }

            const data = currentRes.data.currentAuction;
            if (data) {
                setCurrentAuction({
                    ...data.player,
                    current_bid: data.highestBid ? parseFloat(data.highestBid.amount) : parseFloat(data.player.base_price || 0),
                    current_team_id: data.highestBid ? data.highestBid.team_id : null,
                });
            } else {
                setCurrentAuction(null);
            }
        } catch (err) {
            console.error("Failed to load auction state/current", err);
        }
    };

    const calculateNextBid = (currentBid) => {
        // Default rules if none provided
        const rules = bidIncrementRules.length > 0 ? bidIncrementRules : [
            { threshold: 0, increment: 10 },
            { threshold: 200, increment: 50 },
            { threshold: 500, increment: 100 }
        ];

        // Find applicable rule: highest threshold <= currentBid
        // We sort rules descending by threshold to find the first match easily
        const sortedRules = [...rules].sort((a, b) => b.threshold - a.threshold);
        const applicableRule = sortedRules.find(r => currentBid >= r.threshold);

        const increment = applicableRule ? applicableRule.increment : 10;
        return currentBid + increment;
    };

    const handleTeamOwnerBid = async () => {
        if (!currentAuction || !myTeam) return;

        const nextBid = calculateNextBid(currentAuction.current_bid || 0);

        // Optimistic update (optional, but safer to wait for ack or just fire and forget)
        // We will just fire request.
        try {
            await auctionAPI.placeBid(currentAuction.id, myTeam.id, nextBid);
            // Success - socket will update UI
        } catch (err) {
            console.error("Bid failed", err);
            alert(err.response?.data?.error || "Failed to place bid");
        }
    };

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

            // Fetch eligible players for queue preview
            try {
                const eligibleRes = await playerAPI.getEligiblePlayers();
                setEligiblePlayers(eligibleRes.data.players || []);
            } catch (e) {
                console.error("Failed to load eligible players", e);
            }
        } catch (err) {
            console.error('Failed to load team owner data:', err);
        }
    };

    const [showBudgetModal, setShowBudgetModal] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [budgetAmount, setBudgetAmount] = useState('');
    const [budgetAction, setBudgetAction] = useState('add'); // 'add' or 'remove'
    const [message, setMessage] = useState('');

    const handleOpenBudgetModal = (team) => {
        setSelectedTeam(team);
        setBudgetAmount('');
        setMessage('');
        setShowBudgetModal(true);
    };

    const handleResetWallet = async () => {
        if (!window.confirm(`DANGER: This will reset ${selectedTeam.name}'s wallet to 2000 and UNSOLD all their players. Continue?`)) return;

        try {
            await adminAPI.resetTeamWallet(selectedTeam.id);
            setMessage('Team wallet and stats reset successfully');
            setTimeout(() => {
                setShowBudgetModal(false);
                loadLeaderboard();
            }, 1000);
        } catch (err) {
            console.error(err);
            setMessage('Failed to reset wallet');
        }
    };

    const handleUpdateBudget = async (e) => {
        e.preventDefault();
        if (!budgetAmount || isNaN(budgetAmount)) return;

        const amount = parseInt(budgetAmount);
        let newBudget = parseInt(selectedTeam.budget);

        if (budgetAction === 'add') {
            newBudget += amount;
        } else {
            newBudget -= amount;
        }

        try {
            const formData = new FormData();
            formData.append('budget', newBudget);

            await adminAPI.updateTeam(selectedTeam.id, formData);

            setMessage(`Successfully updated budget to ${newBudget}`);
            setTimeout(() => {
                setShowBudgetModal(false);
                loadLeaderboard(); // Refresh data
            }, 1000);
        } catch (err) {
            console.error(err);
            setMessage('Failed to update budget');
        }
    };

    const handleShowLogs = async () => {
        setShowLogsModal(true);
        setLogsLoading(true);
        try {
            const response = await adminAPI.getRecentBids();
            setBidLogs(response.data.bids || []);
        } catch (err) {
            console.error("Failed to fetch logs", err);
        } finally {
            setLogsLoading(false);
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

        const totalSpent = parseFloat(myTeam.total_spent || 0);

        return (
            <div className="leaderboard-page team-owner-dashboard">
                <div className="container">
                    <div className="team-header-large card animate-fadeIn">
                        <div className="team-header-content">
                            <h1 className="team-owner-title">{myTeam.name}</h1>
                            <div className="flex gap-2 items-center">
                                <span className="badge sport-tag-large sage-pill">
                                    {myTeam.sport}
                                </span>
                                {currentAuction && (
                                    <button
                                        className="btn btn-success btn-lg pulsate-btn"
                                        onClick={handleTeamOwnerBid}
                                        disabled={!isConnected || myTeam.remaining_budget < calculateNextBid(currentAuction.current_bid || 0)}
                                        style={{
                                            marginLeft: '1rem',
                                            fontWeight: 'bold',
                                            boxShadow: '0 4px 14px 0 rgba(72, 187, 120, 0.39)',
                                            fontSize: '1.1rem',
                                            padding: '0.75rem 1.5rem'
                                        }}
                                    >
                                        Bid {calculateNextBid(currentAuction.current_bid || 0)} Pts on {currentAuction.name}
                                    </button>
                                )}
                            </div>
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
                            <div className="stat-value remaining">{myTeam.remaining_budget.toLocaleString()} Pts</div>
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

                        {/* Next in Queue Section */}
                        <div className="next-in-queue card animate-fadeIn" style={{ animationDelay: '0.7s', gridColumn: '1 / -1' }}>
                            <h2>Next up in Queue</h2>
                            <p className="text-secondary subtitle-sm mb-3">Prepare for upcoming players</p>

                            {eligiblePlayers.length === 0 ? (
                                <p className="no-data">No players in queue</p>
                            ) : (
                                <div className="queue-preview-grid">
                                    {eligiblePlayers.slice(0, 3).map((player, idx) => (
                                        <div key={player.id} className="queue-preview-card">
                                            <div className="queue-rank-badge">#{idx + 1}</div>
                                            <div className="queue-card-content flex items-center gap-3">
                                                <div className="queue-avatar-container">
                                                    {player.photo_url ? (
                                                        <img src={player.photo_url} alt={player.name} className="queue-avatar-img" />
                                                    ) : (
                                                        <div className="queue-avatar-placeholder">👤</div>
                                                    )}
                                                </div>
                                                <div className="queue-info min-w-0">
                                                    <h4 className="font-bold text-sm truncate">{player.name} <span className="text-xs text-secondary">#{player.id}</span></h4>
                                                    <div className="queue-tags">
                                                        <span className="queue-tag">{player.year}</span>
                                                        <span className="queue-tag tag-accent">{player.sport}</span>
                                                        {player.stats?.role && player.stats.role.toLowerCase() !== 'player' && (
                                                            <span className="queue-tag">{player.stats.role}</span>
                                                        )}
                                                        {player.stats?.battingStyle && (
                                                            <span className="queue-tag">{player.stats.battingStyle}</span>
                                                        )}
                                                        {player.stats?.bowlingStyle && player.stats.bowlingStyle !== 'None' && (
                                                            <span className="queue-tag">{player.stats.bowlingStyle}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {eligiblePlayers.length > 3 && (
                                        <div className="queue-preview-more flex items-center justify-center text-secondary text-sm">
                                            +{eligiblePlayers.length - 3} more
                                        </div>
                                    )}
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h1 className="main-title" style={{ margin: 0 }}>🏆 Auction Stats {user?.role === 'admin' ? '(Admin)' : ''}</h1>
                        {user?.role === 'admin' && (
                            <button
                                onClick={handleShowLogs}
                                className="btn btn-secondary btn-sm"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                📜 Bid Logs
                            </button>
                        )}
                    </div>

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
                                    {user?.role === 'admin' && (
                                        <button
                                            onClick={() => handleOpenBudgetModal(team)}
                                            className="btn btn-sm btn-secondary"
                                            style={{ marginLeft: '1rem', zIndex: 2 }}
                                        >
                                            Manage Wallet
                                        </button>
                                    )}
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
                                                    {user?.role === 'admin' && (
                                                        <button
                                                            className="release-btn"
                                                            onClick={async () => {
                                                                if (window.confirm(`Are you sure you want to release ${player.name}? they will be moved to unsold.`)) {
                                                                    try {
                                                                        await adminAPI.releasePlayer(player.id);
                                                                        loadLeaderboard(); // Refresh
                                                                    } catch (err) {
                                                                        console.error("Release error", err);
                                                                        alert(`Failed to release player: ${err.response?.data?.error || err.message}`);
                                                                    }
                                                                }
                                                            }}
                                                            style={{
                                                                marginTop: '8px',
                                                                backgroundColor: '#ef4444',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '8px',
                                                                padding: '6px 12px',
                                                                cursor: 'pointer',
                                                                fontSize: '0.8rem',
                                                                fontWeight: '600'
                                                            }}
                                                        >
                                                            Release
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )))}
                </div>

            </div>


            {/* Budget Modal */}
            {
                showBudgetModal && selectedTeam && (
                    <div className="modal-overlay">
                        <div className="modal-content card">
                            <div className="modal-header">
                                <h2>Manage Wallet: {selectedTeam.name}</h2>
                                <button onClick={() => setShowBudgetModal(false)} className="modal-close">×</button>
                            </div>
                            <div className="modal-body">
                                <p>Current Budget: <strong>{selectedTeam.budget.toLocaleString()}</strong></p>
                                <form onSubmit={handleUpdateBudget}>
                                    <div className="input-group">
                                        <label>Action</label>
                                        <select
                                            className="input"
                                            value={budgetAction}
                                            onChange={(e) => setBudgetAction(e.target.value)}
                                        >
                                            <option value="add">Add Points</option>
                                            <option value="remove">Remove Points</option>
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label>Amount</label>
                                        <input
                                            type="number"
                                            className="input"
                                            value={budgetAmount}
                                            onChange={(e) => setBudgetAmount(e.target.value)}
                                            placeholder="Enter amount"
                                            min="1"
                                            required
                                        />
                                    </div>
                                    {message && <p className={`message ${message.includes('Failed') ? 'error' : 'success'}`}>{message}</p>}
                                    <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
                                        <div>
                                            <button type="button" onClick={handleResetWallet} className="btn btn-danger" style={{ marginRight: '1rem' }}>Reset Wallet</button>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button type="button" onClick={() => setShowBudgetModal(false)} className="btn btn-secondary">Cancel</button>
                                            <button type="submit" className="btn btn-primary">Update</button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Bid Logs Sidebar/Drawer */}
            <div className={`bid-logs-sidebar ${showLogsModal ? 'open' : ''}`}
                style={{
                    position: 'fixed',
                    top: 0,
                    right: showLogsModal ? 0 : '-400px',
                    width: '400px',
                    height: '100%',
                    background: 'var(--bg-card)',
                    boxShadow: '-4px 0 15px rgba(0,0,0,0.3)',
                    zIndex: 1000,
                    transition: 'right 0.3s ease-in-out',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                <div className="sidebar-header" style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--bg-secondary)'
                }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>📜 Bid Logs</h2>
                    <button
                        onClick={() => setShowLogsModal(false)}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            color: 'var(--text-primary)'
                        }}
                    >
                        &times;
                    </button>
                </div>

                <div className="sidebar-content" style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '1rem'
                }}>
                    {logsLoading ? (
                        <div className="text-center py-4">Loading entire history...</div>
                    ) : bidLogs.length === 0 ? (
                        <div className="text-center py-4 text-secondary">No bids found</div>
                    ) : (
                        <div className="logs-list">
                            {bidLogs.map((log) => (
                                <div key={log.id} className="log-item" style={{
                                    padding: '1rem',
                                    borderBottom: '1px solid var(--border-color)',
                                    marginBottom: '0.5rem',
                                    background: 'var(--bg-primary)',
                                    borderRadius: '8px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        <span>{new Date(log.created_at).toLocaleString()}</span>
                                    </div>
                                    <div style={{ fontSize: '0.95rem' }}>
                                        <span className="font-bold text-accent">{log.team_name || 'Unknown Team'}</span>
                                        {' '}bid{' '}
                                        <span className="font-bold" style={{ color: 'var(--success)' }}>{log.amount}</span>
                                        {' '}for{' '}
                                        <span className="font-bold">{log.player_name || 'Unknown Player'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Overlay for sidebar */}
            {showLogsModal && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setShowLogsModal(false)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 999
                    }}
                />
            )}
        </div>
    );
}
