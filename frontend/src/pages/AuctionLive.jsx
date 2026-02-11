import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { auctionAPI, adminAPI, playerAPI, teamsAPI } from '../services/api';
import socketService from '../services/socket';
import Confetti from 'react-confetti';
import useSound from 'use-sound';
import './AuctionLive.css';
import './SoldPlayers.css';

const BID_SFX = 'https://assets.mixkit.co/sfx/preview/mixkit-sci-fi-click-900.mp3';
const SOLD_SFX = 'https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3';

export default function AuctionLive() {
    const { user, isAuctioneer, isTeamOwner, isAdmin } = useAuth();

    // --- State from Source (Design) ---
    const [auction, setAuction] = useState(null);
    const [teams, setTeams] = useState([]);
    const [bidAmount, setBidAmount] = useState('');
    const [selectedTeam, setSelectedTeam] = useState(''); // For Admin Dropdown
    const [error, setError] = useState('');
    const [isAuctionActive, setIsAuctionActive] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);

    const [eligiblePlayers, setEligiblePlayers] = useState([]); // Queue
    const [soldPlayers, setSoldPlayers] = useState([]);
    const [showSoldPlayers, setShowSoldPlayers] = useState(false);
    const [bidHistory, setBidHistory] = useState([]);

    // --- State from Destination (Functionality) ---
    const [soldAnimation, setSoldAnimation] = useState(null);
    const [isBidding, setIsBidding] = useState(false);
    const [customBid, setCustomBid] = useState(''); // For Team Owner input if needed

    // --- Refs and Sounds ---
    const soldTimeoutRef = useRef(null);
    const [playBid] = useSound(BID_SFX, { volume: 0.5 });
    const [playSold] = useSound(SOLD_SFX, { volume: 0.5 });

    // --- LOADERS (Source Structure) ---
    const loadAuction = async () => {
        try {
            const response = await auctionAPI.getCurrentAuction();
            const data = response.data.currentAuction;
            const stateRes = await auctionAPI.getAuctionState(); // Get state from API to be sure

            if (data) {
                setAuction({
                    ...data.player,
                    player_name: data.player.name,
                    current_player_id: data.player.id,
                    current_bid: data.highestBid ? parseFloat(data.highestBid.amount) : parseFloat(data.player.base_price || 0),
                    current_team_id: data.highestBid ? data.highestBid.team_id : null,
                    current_team_name: data.highestBid ? data.highestBid.team_name : 'None',
                    sport: data.player.sport,
                    year: data.player.year,
                    stats: data.player.stats,
                    photo_url: data.player.photo_url,
                    base_price: data.player.base_price
                });

                // Update team name if missing
                if (data.highestBid && !data.highestBid.team_name && teams.length > 0) {
                    const team = teams.find(t => t.id === data.highestBid.team_id);
                    if (team) {
                        setAuction(prev => ({ ...prev, current_team_name: team.name }));
                    }
                }
            } else {
                setAuction(null);
            }

            setIsAuctionActive(stateRes.data.isActive ?? response.data.isAuctionActive ?? true);

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

    // --- ACTIONS ---

    // Admin: Start Auction
    const handleStartAuction = async (playerId) => {
        try {
            setLoading(true);
            await auctionAPI.startAuction(playerId);
            socketService.emitAuctionStarted({ playerId });
            await loadAuction();
            await loadEligiblePlayers();
        } catch (err) {
            setError('Failed to start auction');
            setLoading(false);
        }
    };

    // Admin: Place Bid via Dropdown
    const handlePlaceBid = async (e) => {
        e.preventDefault();
        setError('');
        if (!selectedTeam || !bidAmount) return setError('Please select a team and enter bid amount');

        const amount = parseFloat(bidAmount);
        if (amount <= (auction?.current_bid || 0)) return setError('Bid must be higher than current bid');

        try {
            await auctionAPI.placeBid(auction.current_player_id, selectedTeam, amount);
            socketService.emitNewBid({ teamId: selectedTeam, amount, playerId: auction.current_player_id });
            setBidAmount('');
            setSelectedTeam('');
            await loadAuction();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to place bid');
        }
    };

    // Team Owner: Quick Bid (Logic from Destination)
    const handleTeamOwnerBid = async (amount) => {
        if (!auction || isBidding) return;
        setIsBidding(true);
        setError('');

        // Find matches
        let myTeam = teams.find(t => t.id == user.team_id);
        if (!myTeam && user.name) {
            myTeam = teams.find(t => t.owner_name?.toLowerCase() === user.name?.toLowerCase());
        }

        if (!myTeam) {
            setError(`Team not linked to user: ${user.name}`);
            setIsBidding(false);
            return;
        }

        // Artificial delay for UX
        setTimeout(async () => {
            try {
                await auctionAPI.placeBid(auction.current_player_id, myTeam.id, amount);
                setCustomBid('');
            } catch (err) {
                setError(err.response?.data?.error || 'Bid Failed');
            } finally {
                setIsBidding(false);
            }
        }, 300);
    };

    // Admin: Sold/Unsold/Reset
    const handleMarkSold = async () => {
        if (!auction || !auction.current_team_id) return setError("Cannot sell without a valid bid.");
        try {
            await auctionAPI.markPlayerSold(
                auction.current_player_id,
                auction.current_team_id,
                auction.current_bid
            );
            socketService.emitPlayerSold({
                playerId: auction.current_player_id,
                teamId: auction.current_team_id,
                amount: auction.current_bid
            });
            setAuction(null);
            await loadEligiblePlayers();
            await loadAuction();
            await loadSoldPlayers();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to mark sold');
        }
    };

    const handleMarkUnsold = async () => {
        if (!auction) return;
        try {
            await auctionAPI.markPlayerUnsold(auction.current_player_id);
            socketService.emitPlayerSold({ playerId: auction.current_player_id, teamId: null, amount: 0 }); // Use same event or unsold specific
            setAuction(null);
            await loadEligiblePlayers();
            await loadAuction();
        } catch (err) {
            setError('Failed to mark unsold');
        }
    };

    const handleResetBid = async () => {
        if (!auction || !confirm('Reset all bids for this player?')) return;
        try {
            await auctionAPI.resetBid(auction.current_player_id);
            await loadAuction();
        } catch (err) {
            setError('Failed to reset bid');
        }
    };

    const handleReleasePlayer = async (playerId) => {
        if (!confirm('Release player back to queue?')) return;
        try {
            await playerAPI.markEligible(playerId);
            await loadSoldPlayers();
            await loadEligiblePlayers();
        } catch (err) {
            setError('Failed to release player');
        }
    };

    // --- EFFECTS ---
    useEffect(() => {
        loadAuction();
        loadTeams();
        loadSoldPlayers();
        loadEligiblePlayers();

        socketService.connect();
        socketService.joinAuction();

        if (socketService.connected) setIsConnected(true);

        socketService.socket.on('connect', () => {
            setIsConnected(true);
            socketService.joinAuction();
        });
        socketService.socket.on('disconnect', () => setIsConnected(false));

        // Listeners
        socketService.onBidUpdate((data) => {
            if (data.type === 'reset') {
                setBidHistory([]);
                loadAuction();
            } else {
                playBid(); // Sound
                setBidHistory(prev => [data, ...prev].slice(0, 5));
                setAuction(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        current_bid: data.amount,
                        current_team_name: data.teamName,
                        current_team_id: data.teamId
                    };
                });
            }
        });

        socketService.onAuctionUpdate((data) => {
            if (data.type === 'started') {
                setBidHistory([]);
                loadAuction();
                loadEligiblePlayers();
            } else if (data.type === 'sold') {
                setSoldAnimation(data); // Trigger confetti
                playSold(); // Sound

                // Auto-refresh after delay
                if (soldTimeoutRef.current) clearTimeout(soldTimeoutRef.current);
                soldTimeoutRef.current = setTimeout(() => {
                    setSoldAnimation(null);
                    setAuction(null);
                    loadAuction();
                    loadSoldPlayers();
                }, 5000);
            } else if (data.type === 'unsold' || data.type === 'state-change') {
                loadAuction();
            }
        });

        return () => {
            socketService.off('bid-update');
            socketService.off('auction-update');
        };
    }, []);

    // Calculate next bid
    const currentPrice = auction?.current_bid || 0;
    const nextBidAmount = currentPrice + (currentPrice < 100 ? 10 : currentPrice < 1000 ? 50 : 100); // Simple increment logic or fetch rules

    // --- RENDER HELPERS ---
    const renderSoldPlayersList = () => {
        // (Copied from Source)
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
                                    <div key={player.id} className="sold-player-item">
                                        <div className="player-rank">#{index + 1}</div>
                                        <div className="player-avatar">{player.photo_url ? <img src={player.photo_url} alt="" /> : '👤'}</div>
                                        <div className="player-details">
                                            <h4 className="player-name">{player.name}</h4>
                                            <div className="player-meta"><span>{player.year}</span>•<span>{player.stats?.role || 'Player'}</span></div>
                                        </div>
                                        <div className="player-price"><div className="price-value">{player.sold_price}</div></div>
                                        {(isAuctioneer || isAdmin) && (
                                            <button onClick={() => handleReleasePlayer(player.id)} className="release-btn" title="Release">×</button>
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
        // (Copied from Source and adapted)
        const playersBySport = (eligiblePlayers || []).reduce((acc, player) => {
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
                    </div>
                    {Object.keys(playersBySport).length === 0 ? <p className="no-queue-msg">No players in queue.</p> :
                        Object.entries(playersBySport).map(([sport, players]) => (
                            <div key={sport} className="sport-category mb-4">
                                <h3 className="queue-sport-title capitalize">{sport}</h3>
                                <div className="queue-grid">
                                    {players.map(player => (
                                        <div key={player.id} className="queue-card card-glass-light p-3">
                                            <div className="flex items-center gap-3">
                                                <div className="queue-card-image w-10 h-10 rounded-full overflow-hidden bg-gray-700">
                                                    {player.photo_url ? <img src={player.photo_url} className="w-full h-full object-cover" /> : '👤'}
                                                </div>
                                                <div className="queue-card-info flex-1">
                                                    <h4 className="font-bold text-sm">{player.name}</h4>
                                                    <div className="queue-tags-row">
                                                        <span className="queue-tag">{player.year}</span>
                                                        <span className="queue-tag tag-accent">{player.stats?.role}</span>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleStartAuction(player.id)} className="btn btn-primary btn-sm" disabled={loading || !!auction}>
                                                    Start
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    }
                </div>
            </div>
        );
    };

    // --- MAIN RENDER ---
    if (loading) return <div className="auction-page"><div className="container"><div className="spinner"></div></div></div>;

    if (!isAuctionActive && !isAuctioneer && !isAdmin) {
        return <div className="auction-page"><div className="container"><div className="no-auction card-glass text-center"><h2>Auction Paused</h2></div></div></div>;
    }

    if (!auction && !isAuctioneer && !isAdmin) {
        return (
            <div className="auction-page">
                <div className="container">
                    <div className="no-auction card text-center"><h2>No Active Auction</h2><p>Waiting for auctioneer...</p></div>
                    <div className="sold-players-section"><h2 className="section-title">Sold Players</h2>{renderSoldPlayersList()}</div>
                </div>
            </div>
        );
    }

    // Determine min bid for Admin input
    const minBid = Math.max(auction?.current_bid ? auction.current_bid + 1 : (auction?.base_price || 0) + 1, 1);

    return (
        <div className="auction-page">
            {soldAnimation && <Confetti recycle={false} numberOfPieces={500} colors={['#B8E0C0', '#ffffff', '#000000']} />}

            <div className="container">
                <div className="auction-header">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem' }}>
                        <h1>Live Auction <span className="live-flair-badge">LIVE</span></h1>
                        <div className={`connection-pill ${isConnected ? 'connected' : 'disconnected'}`}>
                            <span className="status-dot"></span>{isConnected ? 'Connected' : 'Offline'}
                        </div>
                    </div>
                </div>

                {auction ? (
                    <div className="active-auction-hero">
                        <div className="auction-split-layout">
                            {/* Left: Player Card */}
                            <div className="player-main-card">
                                <div className="player-card-image-wrapper">
                                    {auction.photo_url ? <img src={auction.photo_url} className="player-full-photo" /> : <div className="player-placeholder-large">👤</div>}
                                    <div className="player-card-overlay">
                                        <h1 className="player-main-name">{auction.player_name}</h1>
                                        <p className="player-role-subtitle">{auction.stats?.role || 'Player'}</p>
                                    </div>
                                </div>
                                <div className="player-stats-grid">
                                    <div className="player-badges-row" style={{ gridColumn: '1 / -1', marginBottom: '1rem' }}>
                                        <span className="hero-badge badge-primary">{auction.sport}</span>
                                        <span className="hero-badge badge-secondary">{auction.year}</span>
                                    </div>
                                    {auction.stats && Object.entries(typeof auction.stats === 'string' ? JSON.parse(auction.stats) : auction.stats).map(([key, value]) => (
                                        key !== 'role' && <div key={key} className="stat-box"><span className="stat-label">{key}</span><span className="stat-value">{value}</span></div>
                                    ))}
                                </div>
                            </div>

                            {/* Right: Bidding Console */}
                            <div className="bidding-sidebar">
                                <div className="bid-status-header">
                                    <span className="bid-label">Current Highest Bid</span>
                                    <div className="current-bid-huge">{(auction.current_bid || 0).toLocaleString()}</div>
                                    {auction.current_team_name ? (
                                        <div className="bid-leader-pill">Held by <span className="team-highlight">{auction.current_team_name}</span></div>
                                    ) : (
                                        <div className="bid-leader-pill" style={{ opacity: 0.7 }}>No Bids Yet</div>
                                    )}
                                </div>

                                {bidHistory.length > 0 && (
                                    <div className="bid-history-mini card-glass-dark mb-4 p-3">
                                        <div className="bid-history-list">
                                            {bidHistory.map((bid, idx) => (
                                                <div key={idx} className="bid-history-item flex justify-between items-center py-1">
                                                    <span className="text-sm font-semibold">{bid.teamName}</span>
                                                    <span className="text-sm font-bold text-primary">₹{bid.amount.toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="bid-actions-area">
                                    {/* CONTROLS */}
                                    {(isAuctioneer || isAdmin) ? (
                                        // ADMIN Controls
                                        <div className="admin-bid-controls">
                                            {error && <div className="alert alert-error">{error}</div>}
                                            <form onSubmit={handlePlaceBid} className="bid-form-stacked">
                                                <div className="form-group">
                                                    <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} className="input input-dark" required>
                                                        <option value="">Select Team...</option>
                                                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                    </select>
                                                </div>
                                                <div className="form-group pb-4">
                                                    <input type="number" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} className="input input-dark" placeholder="Bid Amount" required />
                                                </div>
                                                <div className="auction-actions-row">
                                                    <button type="submit" className="btn btn-warning btn-xl">Bid</button>
                                                    <button type="button" onClick={handleMarkSold} className="btn btn-success btn-lg" disabled={!auction.current_team_id}>Sold</button>
                                                    <button type="button" onClick={handleMarkUnsold} className="btn btn-danger btn-lg">Unsold</button>
                                                </div>
                                                <button type="button" onClick={handleResetBid} className="btn btn-outline-danger mt-2" style={{ width: '100%' }}>Reset All Bids</button>
                                            </form>
                                        </div>
                                    ) : isTeamOwner && isAuctionActive ? (
                                        // TEAM OWNER Controls
                                        <div className="bidder-controls">
                                            {error && <div className="alert alert-error">{error}</div>}
                                            <button
                                                className={`btn-bid-dynamic ${isBidding ? 'loading' : ''}`}
                                                onClick={() => handleTeamOwnerBid(nextBidAmount)}
                                                disabled={isBidding}
                                                style={{ width: '100%', padding: '2rem', fontSize: '1.5rem', fontWeight: 'bold', background: 'var(--accent-gradient)', border: 'none', borderRadius: '1rem', color: '#fff', cursor: 'pointer', transition: 'transform 0.1s' }}
                                            >
                                                {isBidding ? 'PROCESSING...' : `BID ₹${nextBidAmount}`}
                                            </button>
                                            <div style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                                Click to place next valid bid
                                            </div>
                                        </div>
                                    ) : (
                                        // VIEWER Controls
                                        <div className="viewer-controls">
                                            <p className="text-secondary text-center">Spectator Mode</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    // No active auction, show queue if admin
                    (isAuctioneer || isAdmin) ? renderAuctioneerPanel() : null
                )}

                {/* Sold Players Footer */}
                <div className="sold-players-section">
                    <button className="sold-players-toggle" onClick={() => setShowSoldPlayers(!showSoldPlayers)}>
                        <h2 className="section-title">
                            <span style={{ marginRight: '0.5rem' }}>{showSoldPlayers ? '▼' : '▶'}</span> Sold Players
                        </h2>
                    </button>
                    {showSoldPlayers && <div className="sold-players-content">{renderSoldPlayersList()}</div>}
                </div>
            </div>
        </div>
    );
}
