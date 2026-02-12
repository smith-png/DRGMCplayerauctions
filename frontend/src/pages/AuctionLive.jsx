import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { auctionAPI, adminAPI, playerAPI, teamsAPI } from '../services/api';
import socketService from '../services/socket';
import Confetti from 'react-confetti';
import useSound from 'use-sound';
import './AuctionLive.css';
import './SoldPlayers.css';
import './AuctionAnimation.css';

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

    // 1. Queue Dock (Standby Technical Module)
    const renderQueueDock = () => {
        return (
            <div className="queue-dock glass-module animate-fadeIn">
                <div className="queue-header">
                    <span className="queue-label">UP NEXT IN QUEUE</span>
                </div>
                <div className="queue-list-container custom-scrollbar">
                    {eligiblePlayers.length === 0 ? (
                        <div className="empty-queue-msg">NO ASSETS PENDING DEPLOYMENT</div>
                    ) : (
                        eligiblePlayers.map((player, index) => (
                            <div key={player.id} className="queue-strip">
                                <div className="strip-rank">#{String(index + 1).padStart(2, '0')}</div>
                                <div className="strip-avatar-box">
                                    {player.photo_url ? (
                                        <img src={player.photo_url} alt={player.name} className="strip-photo" />
                                    ) : (
                                        <div className="strip-photo placeholder">{player.name[0]}</div>
                                    )}
                                </div>
                                <div className="strip-info">
                                    <div className="strip-main-row">
                                        <span className="strip-name">{player.name.toUpperCase()}</span>
                                        <span className="strip-sport-tag">{player.sport.toUpperCase()}</span>
                                    </div>
                                    <div className="strip-tech-specs">
                                        ID-{String(player.id).padStart(4, '0')} // {player.year} // {player.role || 'PLAYER'}
                                    </div>
                                </div>
                                <div className="strip-actions">
                                    {(isAuctioneer || isAdmin) && (
                                        <>
                                            <button onClick={() => handleStartAuction(player.id)} className="cmd-btn start">START</button>
                                            <button onClick={() => handleRemoveFromQueue(player.id)} className="cmd-btn remove">REMOVE</button>
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

    // 2. Gavel Slam Overlay - High-Impact SOLD Animation
    const renderGavelSlamOverlay = () => {
        if (!soldAnimation) return null;

        const team = teams.find(t => t.id === soldAnimation.team_id);

        return (
            <div className="gavel-slam-overlay">
                <div className="gavel-slam-content">
                    {/* Phase 1: The SOLD Stamp */}
                    <div className="sold-stamp">SOLD</div>

                    {/* Phase 2: The Reveal - Player Info */}
                    <div className="gavel-player-card">
                        {soldAnimation.photo_url ? (
                            <img src={soldAnimation.photo_url} alt={soldAnimation.name} className="gavel-player-photo" />
                        ) : (
                            <div className="gavel-player-photo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 900, background: '#f1f5f9' }}>
                                {soldAnimation.name?.[0] || '?'}
                            </div>
                        )}
                        <div className="gavel-player-info">
                            <h2 className="gavel-player-name">{soldAnimation.name}</h2>
                            <div style={{ color: '#64748b', fontSize: '1.2rem' }}>
                                {soldAnimation.year} • {soldAnimation.sport}
                            </div>
                        </div>
                    </div>

                    {/* Team Info */}
                    <div className="gavel-team-card">
                        {team?.logo_url ? (
                            <img src={team.logo_url} alt={team.name} className="gavel-team-logo" />
                        ) : (
                            <div className="gavel-team-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800, background: '#f1f5f9', color: '#64748b' }}>
                                {team?.name?.[0] || 'T'}
                            </div>
                        )}
                        <div className="gavel-team-info">
                            <h3 className="gavel-team-name">{team?.name || `Team ${soldAnimation.team_id}`}</h3>
                        </div>
                    </div>

                    {/* Final Price */}
                    <div className="gavel-final-price">
                        {soldAnimation.sold_price?.toLocaleString()} PTS
                    </div>
                </div>
            </div>
        );
    };

    // 3. Sold Players Overlay
    const renderSoldOverlay = () => {
        if (!showSoldPlayers) return null;
        return (
            <div className="ledger-overlay-backdrop">
                <button className="dismiss-sold" onClick={() => setShowSoldPlayers(false)}>×</button>
                <div className="ledger-content-inner">
                    <div className="ledger-header">
                        <div className="meta-tag">OFFICIAL AUCTION REPORT</div>
                        <h2 className="ledger-main-title">OFFICIAL AUCTION LEDGER</h2>
                    </div>

                    <div className="ledger-horizontal-scroll">
                        {Object.entries(soldPlayers).length === 0 ? (
                            <div className="empty-ledger-state">NO ASSETS LIQUIDATED YET.</div>
                        ) : (
                            Object.entries(soldPlayers).map(([teamId, players]) => {
                                const team = teams.find(t => t.id === parseInt(teamId));
                                const totalSpent = players.reduce((sum, p) => sum + (parseFloat(p.sold_price) || 0), 0);
                                return (
                                    <div key={teamId} className="glass-ledger-pane">
                                        <div className="pane-header">
                                            <div className="team-info-pane">
                                                <h3 className="pane-team-name">{team?.name || `Team ${teamId}`}</h3>
                                                <div className="pane-stats">
                                                    <span className="mono-tag">[ {String(players.length).padStart(2, '0')} PLS ]</span>
                                                    <span className="mono-tag tag-accent">[ {totalSpent.toLocaleString()} PTS ]</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="pane-transaction-list">
                                            {players.map((player, index) => (
                                                <div key={player.id} className="transaction-strip">
                                                    <div className="strip-identity">
                                                        <span className="strip-rank">#{String(index + 1).padStart(2, '0')}</span>
                                                        <div className="strip-avatar">
                                                            {player.photo_url ? <img src={player.photo_url} alt={player.name} /> : <div className="avatar-placeholder">{player.name[0]}</div>}
                                                        </div>
                                                        <div className="strip-details">
                                                            <div className="strip-name">{player.name}</div>
                                                            <div className="strip-subtitle">{player.year} • {player.stats?.role || 'Player'}</div>
                                                        </div>
                                                    </div>
                                                    <div className="strip-action-group">
                                                        <div className="strip-price">{player.sold_price} PTS</div>
                                                        {(isAuctioneer || isAdmin) && (
                                                            <button
                                                                onClick={() => handleReleasePlayer(player.id)}
                                                                className="strip-delete-btn"
                                                                title="Release Asset"
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // --- MAIN RENDER ---
    if (loading) return (
        <div className="auction-terminal">
            <div className="standby-panel">
                <div className="spinner"></div>
            </div>
        </div>
    );
    return (
        <>
            <div className="editorial-glass-stage">
                <div className="phantom-nav-spacer"></div>
                <div className="auction-terminal">
                    {soldAnimation && <Confetti recycle={false} numberOfPieces={500} colors={['#3E5B4E', '#ffffff', '#000000']} />}

                    {/* LEFT: THE ARENA (75%) */}
                    <div className="showcase-side">
                        {auction ? (
                            <div className="player-showcase animate-fadeIn">
                                <div className="image-container">
                                    {auction.photo_url ? (
                                        <img src={auction.photo_url} className="player-hero-image" alt={auction.player_name} />
                                    ) : (
                                        <div className="player-hero-placeholder">{auction.player_name[0]}</div>
                                    )}
                                </div>

                                <div className="scouting-report">
                                    <div className="report-header">
                                        <span className="report-tag">SCOUTING REPORT // REF.{auction.current_player_id?.toString().padStart(4, '0')}</span>
                                        <h1 className="player-name-display">{auction.player_name}</h1>
                                    </div>

                                    <div className="data-grid-stats">
                                        <div className="stat-col">
                                            <label className="grid-label">ID #</label>
                                            <span className="grid-value">{auction.current_player_id}</span>
                                        </div>
                                        <div className="stat-col">
                                            <label className="grid-label">CATEGORY</label>
                                            <span className="grid-value">{auction.sport?.toUpperCase()}</span>
                                        </div>
                                        <div className="stat-col">
                                            <label className="grid-label">ACADEMIC YEAR</label>
                                            <span className="grid-value">{auction.year?.toUpperCase()}</span>
                                        </div>
                                        <div className="stat-col">
                                            <label className="grid-label">BASE VALUATION</label>
                                            <span className="grid-value">{auction.base_price?.toLocaleString()} PTS</span>
                                        </div>
                                    </div>

                                    <div className="technical-specs-grid">
                                        {auction.stats && Object.entries(typeof auction.stats === 'string' ? JSON.parse(auction.stats) : auction.stats).map(([key, value]) => (
                                            <div key={key} className="spec-item">
                                                <label className="spec-label">{key.replace('_', ' ').toUpperCase()}</label>
                                                <span className="spec-value">{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="standby-display animate-fadeIn">
                                <div className="terminal-logo">DRGMC AUCTIONS</div>
                                <p className="terminal-status">READY FOR NEXT DEPLOYMENT</p>
                                {renderQueueDock()}
                            </div>
                        )}

                        {/* Status Badges */}
                        <div className="session-badges">
                            <div className="session-badge">
                                <span className={`status-dot ${isConnected ? 'live' : 'offline'}`}></span>
                                {isAuctionActive ? 'LIVE' : 'PAUSED'}
                            </div>
                            {auction && (
                                <div className="session-badge">
                                    PLAYER ACTIVE
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: THE CONSOLE (25%) */}
                    <div className="trading-desk-side">
                        <div className="desk-header">
                            <span>CONSOLE_SYS.v2.0</span>
                            <span>{new Date().toLocaleTimeString()}</span>
                        </div>

                        <div className="market-valuation">
                            <div className="valuation-block">
                                <label className="market-label">CURRENT VALUATION</label>
                                <div className="market-price">
                                    {auction ? (auction.current_bid || auction.base_price).toLocaleString() : '---'} <span className="currency-label">PTS</span>
                                </div>
                            </div>

                            <div className="valuation-block">
                                <label className="market-label">CURRENT LEAD</label>
                                <div className="leader-name">
                                    {auction?.current_team_name ? auction.current_team_name.toUpperCase() : (auction ? 'NO ACTIVE BIDS' : 'STANDBY')}
                                </div>
                            </div>
                        </div>

                        {(isAuctioneer || isAdmin) && (
                            <div className="admin-trading-deck mt-6">
                                <button onClick={handleMarkSold} className="trading-btn sold mb-2" disabled={!auction?.current_team_id}>EXECUTE SALE</button>
                                <div className="deck-grid mb-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                    <button onClick={handleMarkUnsold} className="trading-btn secondary">MARK UNSOLD</button>
                                    <button onClick={handleResetBid} className="trading-btn danger">RESET BIDS</button>
                                </div>

                                <form onSubmit={handlePlaceBid} className="proxy-trading-row mt-6 pt-6 border-t border-border-color">
                                    <label className="market-label">PROXY OVERRIDE</label>
                                    <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} className="trading-select" required>
                                        <option value="">TEAM SELECT...</option>
                                        {teams.map(t => <option key={t.id} value={t.id}>{t.name.toUpperCase()}</option>)}
                                    </select>
                                    <div className="proxy-input-group">
                                        <input type="number" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} className="trading-input" placeholder="0.00" required />
                                        <button type="submit" className="trading-btn black">BID</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="trading-action-zone">
                            {error && <div className="market-alert error p-2 text-xs font-bold text-red-700 uppercase bg-red-100 mb-4">{error}</div>}

                            {isTeamOwner && isAuctionActive && auction && (
                                <div className="bidder-trading-deck">
                                    <button
                                        className={`trading-btn bid-execute ${isBidding ? 'processing' : ''}`}
                                        onClick={() => handleTeamOwnerBid(nextBidAmount)}
                                        disabled={isBidding}
                                    >
                                        <span className="action-tag">PLACE BID</span>
                                        <span className="action-val">{nextBidAmount.toLocaleString()} PTS</span>
                                    </button>
                                </div>
                            )}

                            {!isTeamOwner && !isAdmin && !isAuctioneer && (
                                <div className="market-standby">
                                    <div className="text-center font-black tracking-widest text-[10px] opacity-40">
                                        {auction ? 'MARKET MONITORING ACTIVE' : 'SYSTEM ON STANDBY'}
                                    </div>
                                </div>
                            )}

                            <div className="market-footer mt-6">
                                <button className="market-btn-text" onClick={() => setShowSoldPlayers(true)}>
                                    HISTORY: {Object.values(soldPlayers).flat().length} ACQUISITIONS
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Overlays moved outside editorial-glass-stage to prevent containing block (blur filter) issues */}
            {renderGavelSlamOverlay()}
            {renderSoldOverlay()}
        </>
    );
}
