import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { auctionAPI, adminAPI, playerAPI, teamsAPI } from '../services/api';
import socketService from '../services/socket';
import './AuctionLive.css';
import './SoldPlayers.css';

export default function AuctionLive() {
    const [auction, setAuction] = useState(null);
    const [teams, setTeams] = useState([]);
    const [bidAmount, setBidAmount] = useState('');
    const [selectedTeam, setSelectedTeam] = useState('');
    const [error, setError] = useState('');
    const [isAuctionActive, setIsAuctionActive] = useState(false);
    const [loading, setLoading] = useState(true);

    const [eligiblePlayers, setEligiblePlayers] = useState([]); // Moved eligiblePlayers state here
    const [soldPlayers, setSoldPlayers] = useState([]); // Sold players grouped by team
    const [showSoldPlayers, setShowSoldPlayers] = useState(false); // Toggle for collapsible section

    const { user, isAuctioneer } = useAuth();

    // Helper functions (defined before useEffect for clarity, or after if they don't depend on state/props directly)
    const loadAuction = async () => {
        try {
            const response = await auctionAPI.getCurrentAuction();
            const data = response.data.currentAuction;

            if (data) {
                // Backend returns { player, highestBid }
                // Map it to a unified structure for the UI
                setAuction({
                    ...data.player,
                    player_name: data.player.name,
                    current_player_id: data.player.id,
                    current_bid: data.highestBid ? parseFloat(data.highestBid.amount) : parseFloat(data.player.base_price || 0),
                    current_team_id: data.highestBid ? data.highestBid.team_id : null,
                    // We need team name, but current auction API might not return it directly if it's just ID in bids table
                    // We might need to fetch team name or update controller to return it.
                    // For now, let's assume we can get it from the bid update or standard load
                    current_team_name: data.highestBid ? data.highestBid.team_name : 'None'
                });

                // If we have a team ID but no name, we can try to find it in the teams list if loaded
                if (data.highestBid && teams.length > 0) {
                    const team = teams.find(t => t.id === data.highestBid.team_id);
                    if (team) {
                        setAuction(prev => ({ ...prev, current_team_name: team.name }));
                    }
                }
            } else {
                setAuction(null);
            }

            // Set global auction active state
            // If response doesn't include it (e.g. old backend), default to true for backward compatibility or false depending on need
            // But we just updated the backend to return it.
            setIsAuctionActive(response.data.isAuctionActive !== undefined ? response.data.isAuctionActive : true);

        } catch (err) {
            console.error('Failed to load auction:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadTeams = async () => {
        try {
            const response = await teamsAPI.getAllTeams();
            setTeams(response.data.teams);
        } catch (err) {
            console.error('Failed to load teams:', err);
        }
    };

    const loadEligiblePlayers = async () => {
        try {
            const response = await playerAPI.getEligiblePlayers();
            setEligiblePlayers(response.data.players);
        } catch (err) {
            console.error('Failed to load eligible players:', err);
        }
    };


    const loadSoldPlayers = async () => {
        try {
            console.log('Loading sold players...');
            const response = await playerAPI.getAllPlayers();
            console.log('All players response:', response.data);

            // Handle different response formats
            const allPlayers = response.data.players || response.data || [];
            const sold = allPlayers.filter(p => p.status === 'sold');

            console.log('Sold players:', sold);

            // Group by team
            const groupedByTeam = sold.reduce((acc, player) => {
                const teamId = player.team_id;
                if (!teamId) {
                    console.warn('Player has no team_id:', player);
                    return acc;
                }
                if (!acc[teamId]) {
                    acc[teamId] = [];
                }
                acc[teamId].push(player);
                return acc;
            }, {});

            console.log('Grouped by team:', groupedByTeam);
            setSoldPlayers(groupedByTeam);
        } catch (err) {
            console.error('Failed to load sold players:', err);
        }
    };

    const handleReleasePlayer = async (playerId) => {
        if (!window.confirm('Are you sure you want to release this player back to the auction queue?')) {
            return;
        }

        try {
            // Update player status back to eligible
            await playerAPI.markEligible(playerId);

            // Reload both sold and eligible lists
            await loadSoldPlayers();
            await loadEligiblePlayers();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to release player');
        }
    };

    const handleStartAuction = async (playerId) => {
        try {
            setLoading(true);
            await auctionAPI.startAuction(playerId);
            socketService.emitAuctionStarted({ playerId });
            // Re-fetch auction status immediately
            await loadAuction();
            await loadEligiblePlayers(); // Refresh list to remove started player
        } catch (err) {
            console.error(err);
            setError('Failed to start auction');
            setLoading(false);
        }
    };

    const handlePlaceBid = async (e) => {
        e.preventDefault();
        setError('');

        if (!selectedTeam || !bidAmount) {
            setError('Please select a team and enter bid amount');
            return;
        }

        const amount = parseFloat(bidAmount);
        if (amount <= (auction?.current_bid || 0)) {
            setError('Bid must be higher than current bid');
            return;
        }

        try {
            await auctionAPI.placeBid(auction.current_player_id, selectedTeam, amount);

            // Emit socket event
            socketService.emitNewBid({
                teamId: selectedTeam,
                amount,
                playerId: auction.current_player_id
            });

            setBidAmount('');
            setSelectedTeam('');

            // Reload auction to get updated bid info
            await loadAuction();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to place bid');
        }
    };

    const handleMarkSold = async () => {
        if (!auction) return;

        try {
            // Use the current auction state values
            const playerId = auction.current_player_id || auction.id;
            const teamId = auction.current_team_id;
            const finalPrice = auction.current_bid;

            console.log('Marking sold:', { playerId, teamId, finalPrice });

            if (!teamId) {
                setError("Cannot sell player without a valid bid/team.");
                return;
            }

            await auctionAPI.markPlayerSold(playerId, teamId, finalPrice);

            // Emit socket event
            socketService.emitPlayerSold({
                playerId,
                teamId,
                amount: finalPrice
            });

            setAuction(null);
            // After selling, reload eligible players and auction state
            await loadEligiblePlayers();
            await loadAuction();
            await loadSoldPlayers(); // Also reload sold players list
        } catch (err) {
            console.error('Mark sold error:', err);
            setError(err.response?.data?.error || 'Failed to mark player as sold');
        }
    };

    const handleMarkUnsold = async () => {
        if (!auction) return;

        try {
            const playerId = auction.current_player_id || auction.id;

            await auctionAPI.markPlayerUnsold(playerId);

            // Emit socket event
            socketService.emitPlayerSold({
                playerId,
                teamId: null,
                amount: 0
            });

            setAuction(null);
            // After marking unsold, reload eligible players and auction state
            await loadEligiblePlayers();
            await loadAuction();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to mark player as unsold');
        }
    };

    // Main useEffect hook
    useEffect(() => {
        loadAuction();
        loadTeams();
        loadSoldPlayers();
        if (isAuctioneer) {
            loadEligiblePlayers();
        }

        // Connect to Socket.IO
        socketService.connect();
        socketService.joinAuction();

        // Listen for real-time updates
        socketService.onBidUpdate((data) => {
            setAuction(prev => ({
                ...prev,
                current_bid: data.amount,
                current_team_name: data.teamName
            }));
        });

        socketService.onAuctionUpdate((data) => {
            if (data.type === 'started') {
                loadAuction();
            } else if (data.type === 'sold') {
                setTimeout(() => {
                    loadAuction();
                }, 2000);
            }
        });

        return () => {
            socketService.off('bid-update');
            socketService.off('auction-update');
        };
    }, [isAuctioneer]); // Added isAuctioneer to dependency array

    const renderSoldPlayersList = () => {
        if (Object.keys(soldPlayers).length === 0) {
            return (
                <div className="empty-state">
                    <div className="empty-icon">🏏</div>
                    <h3>No Players Sold Yet</h3>
                    <p>Sold players will appear here once the auction begins</p>
                </div>
            );
        }

        return (
            <div className="teams-grid">
                {Object.entries(soldPlayers).map(([teamId, players]) => {
                    const team = teams.find(t => t.id === parseInt(teamId));
                    const totalSpent = players.reduce((sum, p) => sum + (parseFloat(p.sold_price) || 0), 0);

                    return (
                        <div key={teamId} className="team-sold-group">
                            <div className="team-header">
                                <h3 className="team-name">{team?.name || `Team ${teamId}`}</h3>
                                <div className="team-stats">
                                    <span className="stat-badge">
                                        {players.length} Pls
                                    </span>
                                    <span className="stat-badge stat-accent">
                                        {totalSpent} Pts
                                    </span>
                                </div>
                            </div>
                            <div className="players-list">
                                {players.map((player, index) => (
                                    <div key={player.id} className="sold-player-item">
                                        <div className="player-rank">#{index + 1}</div>
                                        <div className="player-avatar">
                                            {player.photo_url ? (
                                                <img src={player.photo_url} alt={player.name} />
                                            ) : (
                                                <div className="avatar-placeholder">👤</div>
                                            )}
                                        </div>
                                        <div className="player-details">
                                            <h4 className="player-name">{player.name}</h4>
                                            <div className="player-meta">
                                                <span>{player.year} MBBS</span>
                                                <span className="meta-divider">•</span>
                                                <span className="meta-role">{player.stats?.role || 'Player'}</span>
                                            </div>
                                        </div>
                                        <div className="player-price">
                                            <div className="price-label">Sold for</div>
                                            <div className="price-value">{player.sold_price} pts</div>
                                        </div>
                                        {isAuctioneer && (
                                            <button
                                                onClick={() => handleReleasePlayer(player.id)}
                                                className="release-btn"
                                                title="Release player back to queue"
                                            >
                                                Release
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderAuctioneerPanel = () => {
        // Prepare eligible players by sport
        const playersBySport = eligiblePlayers.reduce((acc, player) => {
            const sport = player.sport || 'Other';
            if (!acc[sport]) acc[sport] = [];
            acc[sport].push(player);
            return acc;
        }, {});

        return (
            <div className="auctioneer-dashboard">
                <div className="eligible-players-section">
                    <div className="queue-section-header">
                        <h2>{auction ? "Next in Queue" : "Ready for Auction"}</h2>
                        {auction && <p className="text-sm text-secondary-color" style={{ marginTop: '0.5rem' }}>Start these players after current auction completes</p>}
                    </div>

                    {Object.keys(playersBySport).length === 0 ? (
                        <div className="no-queue-msg">
                            <p>No players in the auction queue.</p>
                            <p className="text-sm">Go to Admin Dashboard → Players tab → Click "Queue for Auction"</p>
                        </div>
                    ) : (
                        Object.entries(playersBySport).map(([sport, players]) => (
                            <div key={sport} className="sport-category mb-4">
                                <h3 className="queue-sport-title capitalize">{sport}</h3>
                                <div className="queue-grid">
                                    {players.map(player => (
                                        <div key={player.id} className="queue-card card-glass-light p-3">
                                            <div className="flex items-center gap-3">
                                                <div className="queue-card-image w-10 h-10 rounded-full overflow-hidden bg-gray-700">
                                                    {player.photo_url ? (
                                                        <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full text-lg">👤</div>
                                                    )}
                                                </div>
                                                <div className="queue-card-info flex-1">
                                                    <h4 className="font-bold text-sm">{player.name}</h4>
                                                    <div className="queue-tags-row">
                                                        <span className="queue-tag">{player.year} MBBS</span>
                                                        <span className="queue-tag tag-accent">{player.stats?.role || 'Player'}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleStartAuction(player.id)}
                                                    className="btn btn-primary btn-sm full-width mt-2"
                                                    disabled={loading || !!auction}
                                                >
                                                    {auction ? 'Complete Current Auction First' : 'Start Auction'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="auction-page">
                <div className="container">
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    if (!isAuctionActive && !isAuctioneer) {
        return (
            <div className="auction-page">
                <div className="container">
                    <div className="no-auction card-glass text-center" style={{ marginBottom: '3rem' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⏸️</div>
                        <h2>Auction is currently paused</h2>
                        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
                            Please wait for the administrator to resume the live auction.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (!auction && !isAuctioneer) {
        return (
            <div className="auction-page">
                <div className="container">
                    <div className="no-auction card text-center" style={{ marginBottom: '3rem' }}>
                        <h2>No Active Auction</h2>
                        <p>Waiting for auctioneer to start the next player auction...</p>
                    </div>

                    <div className="sold-players-section">
                        <h2 className="section-title" style={{ marginBottom: '1.5rem', marginTop: '2rem' }}>Sold Players</h2>
                        {renderSoldPlayersList()}
                    </div>
                </div>
            </div>
        );
    }

    const currentBid = auction?.current_bid || 0;
    const minBid = Math.max(currentBid + 1, 51);

    return (
        <div className="auction-page">
            <div className="container">
                <div className="auction-header">
                    <h1>
                        Live Auction
                        <span className="live-flair-badge">LIVE</span>
                    </h1>
                </div>

                {/* Header Section */}
                {auction ? (
                    <div className="active-auction-hero">
                        <div className="auction-split-layout">
                            {/* Left: Player Card */}
                            <div className="player-main-card">
                                {/* ... Left Column Content ... */}
                                <div className="player-card-image-wrapper">
                                    {auction.photo_url ? (
                                        <img
                                            src={auction.photo_url}
                                            alt={auction.player_name}
                                            className="player-full-photo"
                                        />
                                    ) : (
                                        <div className="player-placeholder-large">
                                            👤
                                        </div>
                                    )}
                                    <div className="player-card-overlay">
                                        <h1 className="player-main-name">{auction.player_name}</h1>
                                        <p className="player-role-subtitle">{auction.stats?.role || 'Player'}</p>
                                    </div>
                                </div>
                                <div className="player-stats-grid">
                                    <div className="player-badges-row" style={{ gridColumn: '1 / -1', marginBottom: '1rem' }}>
                                        <span className="hero-badge badge-primary">{auction.sport}</span>
                                        <span className="hero-badge badge-secondary">{auction.year} MBBS</span>
                                    </div>
                                    {auction.stats && Object.entries(typeof auction.stats === 'string' ? JSON.parse(auction.stats) : auction.stats).map(([key, value]) => (
                                        key !== 'role' && (
                                            <div key={key} className="stat-box">
                                                <span className="stat-label">{key}</span>
                                                <span className="stat-value">{value}</span>
                                            </div>
                                        )
                                    ))}
                                </div>
                            </div>

                            {/* Right: Bidding Console */}
                            <div className="bidding-sidebar">
                                <div className="bid-status-header">
                                    <span className="bid-label">Current Highest Bid</span>
                                    <div className="current-bid-huge">
                                        {currentBid.toLocaleString()}
                                    </div>
                                    {auction.current_team_name ? (
                                        <div className="bid-leader-pill">
                                            Held by <span className="team-highlight">{auction.current_team_name}</span>
                                        </div>
                                    ) : (
                                        <div className="bid-leader-pill" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}>
                                            No Bids Yet
                                        </div>
                                    )}
                                    <div className="viewer-status-message centered-message">
                                        <span className="live-status-badge">LIVE</span>
                                        <p>Live Bidding in Progress</p>
                                    </div>
                                </div>

                                <div className="bid-actions-area">
                                    {/* Admin/Auctioneer Controls - Only visible to Admin */}
                                    {isAuctioneer ? (
                                        <div className="admin-bid-controls">
                                            {error && <div className="alert alert-error">{error}</div>}
                                            <form onSubmit={handlePlaceBid} className="bid-form-stacked">
                                                <div className="form-group">
                                                    <label className="text-sm text-secondary">Select Team</label>
                                                    <select
                                                        value={selectedTeam}
                                                        onChange={(e) => setSelectedTeam(e.target.value)}
                                                        className="input input-dark"
                                                        required
                                                    >
                                                        <option value="">Choose Team...</option>
                                                        {teams
                                                            .filter(team => team.sport === auction.sport || team.sport === 'Other')
                                                            .map(team => (
                                                                <option key={team.id} value={team.id}>
                                                                    {team.name}
                                                                </option>
                                                            ))}
                                                    </select>
                                                </div>
                                                <div className="form-group pb-4">
                                                    <label className="text-sm text-secondary">Bid Amount</label>
                                                    <input
                                                        type="number"
                                                        value={bidAmount}
                                                        onChange={(e) => setBidAmount(e.target.value)}
                                                        className="input input-dark"
                                                        min={minBid}
                                                        required
                                                    />
                                                </div>
                                                <div className="auction-actions-row">
                                                    <button type="submit" className="btn btn-warning btn-xl">Update Bid</button>
                                                    <button
                                                        type="button"
                                                        onClick={handleMarkSold}
                                                        className="btn btn-success btn-lg"
                                                        disabled={!auction.current_team_id}
                                                    >
                                                        Mark SOLD
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleMarkUnsold}
                                                        className="btn btn-danger btn-lg"
                                                    >
                                                        Mark UNSOLD
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    ) : (
                                        <div className="viewer-controls">
                                            {/* Viewer only sees content, no controls */}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    // Admin View when no active auction (Queue)
                    renderAuctioneerPanel()
                )}

                {/* Show queue for Auctioneer always - even during active auction (below hero) */}
                {isAuctioneer && auction && renderAuctioneerPanel()}

                {/* Sold Players Section - Collapsible (Main View) */}
                <div className="sold-players-section">
                    <button
                        className="sold-players-toggle"
                        onClick={() => setShowSoldPlayers(!showSoldPlayers)}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h2 className="section-title">
                                <span className="toggle-icon" style={{ transform: showSoldPlayers ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block', marginRight: '0.5rem' }}>▼</span>
                                Sold Players
                            </h2>
                            <div className="sold-count-badge">
                                {Object.values(soldPlayers).flat().length} players
                            </div>
                        </div>
                    </button>

                    {showSoldPlayers && (
                        <div className="sold-players-content">
                            {renderSoldPlayersList()}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
