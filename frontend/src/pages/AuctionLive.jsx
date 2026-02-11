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

    // Admin: Remove from Queue
    const handleRemoveFromQueue = async (playerId) => {
        if (!confirm('Remove player from queue?')) return;
        try {
            await adminAPI.removeFromQueue(playerId);
            await loadEligiblePlayers();
        } catch (err) {
            setError('Failed to remove player from queue');
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

    // 1. Queue Dock (Visual Panel Bottom)
    const renderQueueDock = () => {
        return (
            <div className="queue-dock">
                <div className="queue-label">UP NEXT IN QUEUE</div>
                <div className="queue-list">
                    {eligiblePlayers.length === 0 ? (
                        <div className="text-secondary small" style={{ padding: '0 1rem' }}>Queue Empty</div>
                    ) : (
                        eligiblePlayers.map(player => (
                            <div key={player.id} className="queue-card">
                                {player.photo_url ? <img src={player.photo_url} className="queue-img" /> : <div className="queue-placeholder">{player.name[0]}</div>}
                                <div className="queue-name">{player.name}</div>
                                <div className="queue-actions">
                                    {(isAuctioneer || isAdmin) && (
                                        <>
                                            <button onClick={() => handleStartAuction(player.id)} className="queue-btn start">START</button>
                                            <button onClick={() => handleRemoveFromQueue(player.id)} className="queue-btn remove">REMOVE</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };

    // 2. Sold Players Overlay
    const renderSoldOverlay = () => {
        if (!showSoldPlayers) return null;
        return (
            <div className="sold-overlay">
                <button className="dismiss-sold" onClick={() => setShowSoldPlayers(false)}>×</button>
                <div className="sold-list-container" style={{ width: '90%', maxWidth: '1200px', maxHeight: '80vh', overflowY: 'auto', background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem' }}>
                    <h2 className="section-title text-center mb-4">SOLD PLAYERS</h2>
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
                                            <span className="stat-badge stat-accent">{totalSpent.toLocaleString()} Pts</span>
                                        </div>
                                    </div>
                                    <div className="players-list">
                                        {players.map((player, index) => (
                                            <div key={player.id} className="sold-player-item">
                                                <div className="player-rank">#{index + 1}</div>
                                                <div className="player-avatar">{player.photo_url ? <img src={player.photo_url} /> : '👤'}</div>
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
                </div>
            </div>
        );
    };

    // --- MAIN RENDER ---
    if (loading) return (
        <div className="auction-terminal">
            <div className="visual-panel standby-mode">
                <div className="spinner"></div>
            </div>
        </div>
    );

    // Terminal Layout
    return (
        <div className="auction-terminal">
            {soldAnimation && <Confetti recycle={false} numberOfPieces={500} colors={['#B8E0C0', '#ffffff', '#000000']} />}

            {/* LEFT: VISUAL PANEL */}
            <div className={`visual-panel ${!auction ? 'standby' : ''}`}>
                {/* Visual Content */}
                {auction ? (
                    <>
                        {auction.photo_url ? <img src={auction.photo_url} className="hero-image" /> : <div className="hero-placeholder">{auction.player_name[0]}</div>}
                        <div className="hero-overlay">
                            <h1 className="hero-name">{auction.player_name}</h1>
                            <div className="hero-meta">
                                <span>{auction.sport}</span>
                                <span>//</span>
                                <span>{auction.year}</span>
                                <span>//</span>
                                <span>{auction.stats?.role || 'PLAYER'}</span>
                            </div>
                            <div className="hero-stats">
                                {auction.stats && Object.entries(typeof auction.stats === 'string' ? JSON.parse(auction.stats) : auction.stats).map(([key, value]) => (
                                    key !== 'role' && <div key={key} className="stat-badge">{key}: {value}</div>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    // Standby / Empty State
                    <div className="standby-content">
                        <h1>AUCTION TERMINAL</h1>
                        <p>WAITING FOR NEXT PLAYER...</p>
                    </div>
                )}

                {/* Live Indicator */}
                <div className="live-indicator">
                    <div className={`blink-dot ${isConnected ? 'connected' : ''}`} style={{ background: 'red', boxShadow: '0 0 10px red' }}></div>
                    {isAuctionActive ? 'LIVE SESSION' : 'SESSION PAUSED'}
                </div>

                {/* Queue Dock (Absolute Bottom) */}
                {renderQueueDock()}
            </div>

            {/* RIGHT: CONTROL PANEL */}
            <div className="control-panel">
                <div className="panel-header">
                    <span>DRGMC AUCTION SYSTEM // V.2.0</span>
                    <span>{new Date().toLocaleDateString()}</span>
                </div>

                {/* Big Numbers */}
                <div className="bid-display-huge">
                    <div className="label">CURRENT BIDDING</div>
                    <div className="huge-number">{auction ? (auction.current_bid || auction.base_price).toLocaleString() : '---'}</div>
                    <div className="current-leader-box">
                        <span className="leader-label">CURRENT LEADER</span>
                        <div className="leader-name">
                            {auction?.current_team_name ? auction.current_team_name : (auction ? 'NO BIDS' : '---')}
                        </div>
                    </div>
                </div>

                {/* Action Zone */}
                <div className="action-zone">
                    {/* Error Display */}
                    {error && <div className="alert alert-error mb-4">{error}</div>}

                    {/* Controls based on Role */}
                    {(isAuctioneer || isAdmin) ? (
                        <div className="admin-command-deck">
                            <div className="deck-header">ADMIN COMMANDS</div>
                            {auction ? (
                                <>
                                    {/* Quick Actions Grid */}
                                    <div className="deck-grid mb-4">
                                        <button onClick={handleMarkSold} className="deck-btn btn-sold" disabled={!auction.current_team_id}>SOLD</button>
                                        <button onClick={handleMarkUnsold} className="deck-btn btn-unsold">UNSOLD</button>
                                        <button onClick={handleResetBid} className="deck-btn btn-reset">RESET BID</button>
                                    </div>

                                    {/* Manual Bid Form */}
                                    <form onSubmit={handlePlaceBid} className="proxy-bid-row">
                                        <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} className="admin-select-small" required>
                                            <option value="">Team...</option>
                                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                        <input type="number" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} className="admin-input-small" placeholder="Amt" required />
                                        <button type="submit" className="btn-proxy">BID</button>
                                    </form>
                                </>
                            ) : (
                                <div className="text-secondary text-center small">Select a player from the Queue to start.</div>
                            )}
                        </div>
                    ) : isTeamOwner && isAuctionActive && auction ? (
                        // Team Owner Controls
                        <div className="bidder-controls">
                            <button
                                className={`btn-bid-dynamic ${isBidding ? 'loading' : ''}`}
                                onClick={() => handleTeamOwnerBid(nextBidAmount)}
                                disabled={isBidding}
                            >
                                {isBidding ? 'PROCESSING...' : `BID ₹${nextBidAmount.toLocaleString()}`}
                                <span className="bid-label">CLICK TO PLACE BID</span>
                            </button>
                        </div>
                    ) : (
                        // Viewer / Resting State
                        <div className="viewer-controls text-center text-secondary">
                            {auction ? "SPECTATOR MODE" : "AUCTION PAUSED"}
                        </div>
                    )}

                    {/* Universal Links/Toggles */}
                    <div className="mt-4 flex justify-between">
                        <button className="btn-outline" onClick={() => setShowSoldPlayers(true)}>VIEW SOLD PLAYERS ({Object.values(soldPlayers).flat().length})</button>
                    </div>
                </div>
            </div>

            {/* Overlays */}
            {renderSoldOverlay()}
        </div>
    );
}
