import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { auctionAPI, adminAPI, playerAPI, teamsAPI } from '../services/api.js';
import socketService from '../services/socket.js';
import './AuctionLive.css';
import './SoldPlayers.css';
import './AuctionAnimation.css';



export default function AuctionLive() {
    const [auction, setAuction] = useState(null);
    const [teams, setTeams] = useState([]);
    const [bidAmount, setBidAmount] = useState('');
    const [selectedTeam, setSelectedTeam] = useState('');
    const [error, setError] = useState('');
    const [isAuctionActive, setIsAuctionActive] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);

    const [eligiblePlayers, setEligiblePlayers] = useState([]);
    const [soldPlayers, setSoldPlayers] = useState([]);
    const [queuePlayerId, setQueuePlayerId] = useState('');
    const [queueSortBy, setQueueSortBy] = useState('none'); // none, name, year

    // Animation State
    const [soldAnimationData, setSoldAnimationData] = useState(null);
    const [animationDuration, setAnimationDuration] = useState(25);
    const [animationType, setAnimationType] = useState('confetti');
    const [sportMinBids, setSportMinBids] = useState({ cricket: 50, futsal: 50, volleyball: 50 });

    const { user, isAuctioneer, isTeamOwner, isAdmin } = useAuth();

    const [bidPulse, setBidPulse] = useState(false);

    // Auto-dismiss animation
    useEffect(() => {
        let timer;
        if (soldAnimationData) {
            timer = setTimeout(() => {
                setSoldAnimationData(null);
            }, animationDuration * 1000);
        }
        return () => clearTimeout(timer);
    }, [soldAnimationData, animationDuration]);

    useEffect(() => {
        if (bidPulse) {
            const timer = setTimeout(() => setBidPulse(false), 400);
            return () => clearTimeout(timer);
        }
    }, [bidPulse]);

    // Helper functions
    // Helper functions
    const loadAuction = async () => {
        console.log('loadAuction: Starting...');
        try {
            const response = await auctionAPI.getCurrentAuction();
            const data = response.data.currentAuction;

            // Fetch global state for animation duration and min bids
            const stateRes = await auctionAPI.getAuctionState();
            if (stateRes.data.animationDuration) {
                setAnimationDuration(stateRes.data.animationDuration);
            }
            if (stateRes.data.animationType) {
                setAnimationType(stateRes.data.animationType);
            }
            if (stateRes.data.sportMinBids) {
                setSportMinBids(stateRes.data.sportMinBids);
            }

            if (data) {
                setAuction({
                    ...data.player,
                    player_name: data.player.name,
                    current_player_id: data.player.id,
                    current_bid: data.highestBid ? parseFloat(data.highestBid.amount) : parseFloat(data.player.base_price || 0),
                    current_team_id: data.highestBid ? data.highestBid.team_id : null,
                    current_team_name: data.highestBid ? data.highestBid.team_name : 'None',
                    photo_url: data.player.photo_url
                });

                if (data.highestBid && teams.length > 0) {
                    const team = teams.find(t => t.id === data.highestBid.team_id);
                    if (team) {
                        setAuction(prev => ({ ...prev, current_team_name: team.name }));
                    }
                }
            } else {
                setAuction(null);
            }
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
            setEligiblePlayers(response.data.players || []);
        } catch (err) {
            console.error('Failed to load eligible players:', err);
            setEligiblePlayers([]);
        }
    };

    const loadSoldPlayers = async () => {
        try {
            const response = await playerAPI.getAllPlayers();
            const allPlayers = response.data.players || response.data || [];
            const sold = allPlayers.filter(p => p.status === 'sold');

            const groupedByTeam = sold.reduce((acc, player) => {
                const teamId = player.team_id;
                if (!teamId) return acc;
                if (!acc[teamId]) acc[teamId] = [];
                acc[teamId].push(player);
                return acc;
            }, {});

            setSoldPlayers(groupedByTeam);
        } catch (err) {
            console.error('Failed to load sold players:', err);
        }
    };

    const handleReleasePlayer = async (playerId) => {
        if (!window.confirm('Are you sure you want to release this player back to the auction queue?')) return;
        try {
            await playerAPI.markEligible(playerId);
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
            await loadAuction();
            await loadEligiblePlayers();
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
        // Allow admins to correct bids (enter lower amount), but normal users must bid higher
        if (!isAdmin && amount <= (auction?.current_bid || 0)) {
            setError('Bid must be higher than current bid');
            return;
        }
        try {
            await auctionAPI.placeBid(auction.current_player_id, selectedTeam, amount);

            // Optimistic Update: Immediately update UI without waiting for socket
            const team = teams.find(t => t.id === parseInt(selectedTeam));
            setAuction(prev => ({
                ...prev,
                current_bid: amount,
                current_team_id: parseInt(selectedTeam),
                current_team_name: team ? team.name : 'Unknown'
            }));

            // socketService.emitNewBid(...) removed to prevent double broadcasting.
            // Server response will trigger 'bid-update' event which updates the UI.
            setBidAmount('');
            setSelectedTeam('');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to place bid');
        }
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleMarkSold = async () => {
        if (!auction || isSubmitting) return;

        // 1. Snapshot values for API and optimistic update
        const playerId = auction.current_player_id || auction.id;
        const teamId = auction.current_team_id;
        const finalPrice = auction.current_bid;
        const playerName = auction.player_name;
        const photoUrl = auction.photo_url;
        const teamName = auction.current_team_name;

        if (!teamId) {
            setError("Cannot sell player without a valid bid/team.");
            return;
        }

        setIsSubmitting(true);

        // 2. Optimistic UI Update
        // Immediate "Sold" overlay
        setSoldAnimationData({
            playerName: playerName,
            teamName: teamName,
            price: finalPrice,
            playerId: playerId,
            photoUrl: photoUrl
        });

        // Clear current auction view immediately to prevent further interaction
        setAuction(null);

        try {
            // 3. API Call (Background)
            await auctionAPI.markPlayerSold(playerId, teamId, finalPrice);

            // Success: state is already updated. 
            // The socket 'sold' event will come in later, which might re-set soldAnimationData.
            // React state updates are generally safe, but if we want to avoid double animation re-trigger,
            // we could check if it's the same player. But usually it's fine.

            // We can reload lists in background
            if (isAuctioneer || isAdmin || isTeamOwner) loadEligiblePlayers();
            loadSoldPlayers();

        } catch (err) {
            console.error('Mark sold error:', err);
            // 4. Revert UI on Failure
            setSoldAnimationData(null); // Hide overlay
            // We can't easily "restore" the auction state exactly as it was without fetching, 
            // but reloading current auction should work.
            setError(err.response?.data?.error || 'Failed to mark player as sold. Please try again.');
            loadAuction();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleMarkUnsold = async () => {
        if (!auction) return;
        try {
            const playerId = auction.current_player_id || auction.id;
            await auctionAPI.markPlayerUnsold(playerId);
            socketService.emitPlayerSold({ playerId, teamId: null, amount: 0 });
            setAuction(null);
            await loadEligiblePlayers();
            await loadAuction();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to mark player as unsold');
        }
    };

    const handleSkipPlayer = async () => {
        if (!auction) return;
        if (!window.confirm('Skip this player? They will be sent back to queue with minimum bid.')) return;
        try {
            const playerId = auction.current_player_id || auction.id;
            await auctionAPI.skipPlayer(playerId);
            setAuction(null);
            await loadEligiblePlayers();
            await loadAuction();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to skip player');
        }
    };

    const handleResetBid = async () => {
        if (!auction) return;
        if (!window.confirm('Reset current bid to minimum value?')) return;
        try {
            await auctionAPI.resetCurrentBid();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to reset bid');
        }
    };

    const handleRemoveFromQueue = async (playerId) => {
        if (!window.confirm('Remove this player from the queue? They will be marked as unsold.')) return;
        try {
            await adminAPI.removeFromQueue(playerId);
            await loadEligiblePlayers();
        } catch (err) {
            console.error(err);
            setError('Failed to remove player from queue');
        }
    };

    const handleQueueById = async (e) => {
        e.preventDefault();
        if (!queuePlayerId) return;
        try {
            await adminAPI.addToQueueById(queuePlayerId);
            setQueuePlayerId('');
            await loadEligiblePlayers();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add to queue');
            setTimeout(() => setError(''), 3000);
        }
    };

    const getTeamLogo = (teamName) => {
        const team = teams.find(t => t.name === teamName);
        return team?.logo_url || null;
    };

    useEffect(() => {
        const safetyTimeout = setTimeout(() => {
            setLoading(prev => {
                if (prev) {
                    console.warn('Safety timeout triggered: Loading took too long.');
                    return false;
                }
                return prev;
            });
        }, 5000);

        loadAuction();
        loadTeams();
        loadSoldPlayers();
        if (isAuctioneer) loadEligiblePlayers();

        socketService.connect();
        socketService.joinAuction();

        if (socketService.connected) setIsConnected(true);

        socketService.socket.on('connect', () => {
            setIsConnected(true);
            socketService.joinAuction();
        });
        socketService.socket.on('disconnect', () => setIsConnected(false));

        socketService.onBidUpdate((data) => {
            setAuction(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    current_bid: data.amount,
                    current_team_id: data.teamId,
                    current_team_name: data.teamName
                };
            });
            setBidPulse(true);
        });

        socketService.onAuctionUpdate((data) => {
            if (data.type === 'started') {
                loadAuction();
            } else if (data.type === 'sold') {
                // Prevent re-triggering animation if we already optimistically showed it for the same player
                setSoldAnimationData(prev => {
                    if (prev && prev.playerId === data.player?.id) {
                        return prev;
                    }
                    return {
                        playerName: data.playerName,
                        teamName: data.teamName,
                        price: data.amount,
                        playerId: data.player?.id,
                        photoUrl: data.photoUrl
                    };
                });

                setTimeout(() => {
                    loadAuction();
                    if (isAuctioneer || isAdmin || isTeamOwner) loadEligiblePlayers();
                    loadSoldPlayers();
                }, 2000);
            }
        });

        // Listen for generic refresh (e.g. min bid update, wallet reset)
        socketService.socket.on('refresh-data', () => {
            loadAuction();
            if (isAuctioneer || isAdmin || isTeamOwner) loadEligiblePlayers();
            loadSoldPlayers();
        });

        return () => {
            socketService.off('bid-update');
            socketService.off('auction-update');
            socketService.off('refresh-data');
            clearTimeout(safetyTimeout);
        };
    }, [isAuctioneer]);

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
                                    <span className="stat-badge">{players.length} Pls</span>
                                    <span className="stat-badge stat-accent">{totalSpent} Pts</span>
                                </div>
                            </div>
                            <div className="players-list">
                                {players.map((player, index) => (
                                    <div key={player.id} className="sold-player-item card-glass-light p-3">
                                        <div className="sold-player-card-content flex items-center gap-3">
                                            <div className="player-rank">#{index + 1}</div>
                                            <div className="player-avatar w-12 h-12 rounded-full overflow-hidden bg-gray-700">
                                                {player.photo_url ? (
                                                    <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="avatar-placeholder flex items-center justify-center h-full text-lg">👤</div>
                                                )}
                                            </div>
                                            <div className="player-info flex-1">
                                                <h4 className="font-bold text-sm m-0">{player.name}</h4>
                                                <div className="player-tags-row flex gap-2 mt-1">
                                                    <span className="queue-tag">{player.year} MBBS</span>
                                                    <span className="queue-tag tag-accent">{player.stats?.role || 'Player'}</span>
                                                </div>
                                            </div>
                                            <div className="sold-price-badge">
                                                <span className="price-val">{parseFloat(player.sold_price).toLocaleString()}</span>
                                                <span className="price-unit">pts</span>
                                            </div>
                                        </div>
                                        {isAuctioneer && (
                                            <button
                                                onClick={() => handleReleasePlayer(player.id)}
                                                className="release-btn mt-3 w-full"
                                                title="Release player back to queue"
                                            >
                                                Release Player
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

    const sortedEligible = useMemo(() => {
        let sorted = [...eligiblePlayers];
        if (queueSortBy === 'name') {
            sorted.sort((a, b) => a.name.localeCompare(b.name));
        } else if (queueSortBy === 'year') {
            const order = { '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, 'intern': 5 };
            sorted.sort((a, b) => {
                const aVal = order[String(a.year).toLowerCase()] || 0;
                const bVal = order[String(b.year).toLowerCase()] || 0;
                return bVal - aVal;
            });
        }
        return sorted;
    }, [eligiblePlayers, queueSortBy]);

    const renderAuctioneerPanel = () => {
        const playersBySport = (sortedEligible || []).reduce((acc, player) => {
            const sport = player.sport || 'Other';
            if (!acc[sport]) acc[sport] = [];
            acc[sport].push(player);
            return acc;
        }, {});

        return (
            <div className="auctioneer-dashboard">
                <div className="eligible-players-section">
                    <div className="queue-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h2>{auction ? "Next in Queue" : "Ready for Auction"}</h2>
                            {auction && <p className="text-sm text-secondary-color" style={{ marginTop: '0.5rem' }}>Start these players after current auction completes</p>}
                        </div>
                        {isAdmin && (
                            <div className="flex gap-2">
                                <select
                                    className="input input-sm"
                                    value={queueSortBy}
                                    onChange={(e) => setQueueSortBy(e.target.value)}
                                    style={{ height: '34px' }}
                                >
                                    <option value="none">Default Sort</option>
                                    <option value="name">Sort by Name</option>
                                    <option value="year">Sort by Year</option>
                                </select>
                                <form onSubmit={handleQueueById} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        placeholder="PID"
                                        className="input input-sm"
                                        value={queuePlayerId}
                                        onChange={e => setQueuePlayerId(e.target.value)}
                                        style={{ width: '80px', padding: '0.5rem' }}
                                    />
                                    <button type="submit" className="btn btn-sm btn-primary">Add</button>
                                </form>
                            </div>
                        )}
                    </div>

                    {Object.keys(playersBySport).length === 0 ? (
                        <div className="no-queue-msg">
                            <p>No players in the auction queue.</p>
                            <p className="text-sm">Go to Admin Dashboard → Players tab → Click "Queue for Auction" or use ID above</p>
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
                                                    <h4 className="font-bold text-sm">{player.name} <span className="text-xs text-secondary">#{player.id}</span></h4>
                                                    <div className="queue-tags-row">
                                                        <span className="queue-tag">{player.year} MBBS</span>
                                                        {player.stats?.role && player.stats.role.toLowerCase() !== 'player' && (
                                                            <span className="queue-tag tag-accent">{player.stats.role}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="queue-card-actions" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                    {isAuctioneer && (
                                                        <button
                                                            onClick={() => handleStartAuction(player.id)}
                                                            className="btn btn-primary btn-sm flex-1"
                                                            disabled={loading || !!auction}
                                                        >
                                                            {auction ? 'Wait' : 'Start'}
                                                        </button>
                                                    )}
                                                    {isAdmin && (
                                                        <button
                                                            onClick={() => handleRemoveFromQueue(player.id)}
                                                            className="btn btn-outline-danger btn-sm"
                                                            title="Remove from queue"
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
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
                <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
                    <div className="spinner"></div>
                    <h3 style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-primary)' }}>Loading Auction Data...</h3>
                    <p style={{ marginTop: '0.5rem', opacity: 0.7 }}>Please wait while we connect to the server.</p>
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
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>👀</div>
                        <h2>Stay tuned for next player</h2>
                        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
                            Waiting for admin to start the next player auction...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const currentBid = auction?.current_bid || 0;
    const sportMin = auction?.sport ? (sportMinBids[auction.sport.toLowerCase()] || 50) : 50;
    const minBid = Math.max(currentBid + 1, sportMin + 1);

    return (
        <div className="auction-page">
            {soldAnimationData && (
                <div className="sold-animation-overlay">
                    <div className="sold-content">
                        <div className="sold-header-text">SOLD TO</div>

                        <div className="sold-card-unified">
                            <div className="sold-player-section">
                                <div className="sold-player-img-container">
                                    {soldAnimationData.photoUrl ? (
                                        <img src={soldAnimationData.photoUrl} alt="Player" className="sold-player-img" />
                                    ) : (
                                        <div className="sold-placeholder">👤</div>
                                    )}
                                </div>
                                <h2 className="sold-player-name-overlay">{soldAnimationData.playerName || "Unknown Player"}</h2>
                            </div>

                            <div className="sold-info-center">
                                <div className="sold-price-badge-huge">
                                    <span className="currency-symbol">₹</span>
                                    {parseFloat(soldAnimationData.price).toLocaleString()}
                                </div>
                                <div className="sold-label">Final Bid</div>
                            </div>

                            <div className="sold-team-section">
                                <div className="sold-team-logo-container">
                                    {getTeamLogo(soldAnimationData.teamName) ? (
                                        <img src={getTeamLogo(soldAnimationData.teamName)} alt="Team Logo" className="sold-team-logo" />
                                    ) : (
                                        <div className="sold-team-name-placeholder">{soldAnimationData.teamName?.charAt(0)}</div>
                                    )}
                                </div>
                                <h3 className="sold-team-name-overlay">{soldAnimationData.teamName}</h3>
                            </div>
                        </div>

                        {(isAdmin || isAuctioneer) && (
                            <div className="admin-controls-overlay">
                                <button className="btn-stop-anim" onClick={() => setSoldAnimationData(null)}>
                                    Dismiss
                                </button>
                                <div style={{ color: '#475569', fontWeight: '600', alignSelf: 'center', marginTop: '0.5rem' }}>
                                    (Auto-close in {animationDuration}s)
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="container">
                <div className="auction-header">
                    <h1>
                        Live Auction
                        <span className="live-flair-badge">LIVE</span>
                    </h1>
                </div>

                {auction ? (
                    <div className="active-auction-hero">
                        <div className="auction-split-layout">
                            <div className="player-main-card">
                                <div className="player-card-image-wrapper">
                                    {auction.photo_url ? (
                                        <img src={auction.photo_url} alt={auction.player_name} className="player-full-photo" />
                                    ) : (
                                        <div className="player-placeholder-large">👤</div>
                                    )}
                                    <div className="player-card-overlay">
                                        <h1 className="player-main-name">{auction.player_name}</h1>
                                        <p className="player-role-subtitle">{auction.stats?.role || 'Player'}</p>
                                    </div>
                                </div>
                                <div className="player-stats-grid">
                                    <div className="player-badges-row" style={{ gridColumn: '1 / -1', marginBottom: '0.5rem' }}>
                                        <span className="hero-badge badge-primary uppercase">{auction.sport}</span>
                                        <span className="hero-badge badge-secondary">{auction.year} MBBS</span>
                                    </div>
                                    {auction.stats && Object.entries(typeof auction.stats === 'string' ? JSON.parse(auction.stats) : auction.stats).map(([key, value]) => {
                                        if (key === 'role') return null;
                                        const formattedKey = key
                                            .replace(/([A-Z])/g, ' $1')
                                            .replace(/^./, str => str.toUpperCase())
                                            .trim();
                                        return (
                                            <div key={key} className="stat-box">
                                                <span className="stat-label">{formattedKey}</span>
                                                <span className="stat-value">{value}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="bidding-sidebar">
                                <div className="bid-status-header">
                                    <span className="bid-label">Current Highest Bid</span>
                                    <div className={`current-bid-huge ${bidPulse ? 'bid-updated-pulse' : ''}`}>
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
                                                        min={isAdmin ? 0 : minBid}
                                                        required
                                                    />
                                                </div>
                                                <div className="auction-actions-row">
                                                    <button type="submit" className="btn btn-warning btn-xl full-width">Update Bid</button>
                                                    <div className="action-button-group">
                                                        <button
                                                            type="button"
                                                            onClick={handleMarkSold}
                                                            className="btn btn-success btn-xl"
                                                            disabled={!auction.current_team_id || isSubmitting}
                                                        >
                                                            {isSubmitting ? '...' : 'Mark SOLD'}
                                                        </button>
                                                        <button type="button" onClick={handleMarkUnsold} className="btn btn-danger btn-xl" disabled={isSubmitting}>Mark UNSOLD</button>
                                                        <button type="button" onClick={handleSkipPlayer} className="btn btn-secondary btn-xl" title="Skip and send back to queue" disabled={isSubmitting}>Skip</button>
                                                        {isAdmin && <button type="button" onClick={handleResetBid} className="btn btn-outline-danger btn-xl" style={{ gridColumn: 'span 3', marginTop: '0.5rem' }}>Reset Bid to Min</button>}
                                                    </div>
                                                </div>
                                            </form>
                                        </div>
                                    ) : (
                                        <div className="viewer-controls"></div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    (isAuctioneer) && renderAuctioneerPanel()
                )}

                {(isAuctioneer) && auction && renderAuctioneerPanel()}

                <div className="version-footer" style={{ textAlign: 'center', marginTop: '2rem', opacity: 0.7, fontSize: '0.8rem', color: isConnected ? '#4caf50' : '#f44336' }}>
                    System v1.2 - {isConnected ? 'Connected 🟢' : 'Disconnected 🔴'}
                </div>
            </div>
        </div>
    );
}
