import { useState, useEffect } from 'react';
import { playerAPI, teamsAPI } from '../services/api';
import socketService from '../services/socket';
import './PlayerProfiles.css';

export default function PlayerProfiles() {
    const [allPlayers, setAllPlayers] = useState([]);
    const [soldPlayers, setSoldPlayers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);

    // Pagination State
    const [soldPage, setSoldPage] = useState(1);
    const [allPage, setAllPage] = useState(1);
    const ITEMS_PER_PAGE_SOLD = 10;
    const ITEMS_PER_PAGE_ALL = 15;
    const [playerSortBy, setPlayerSortBy] = useState('name');

    // Overlay State
    const [selectedPlayer, setSelectedPlayer] = useState(null);

    useEffect(() => {
        loadData();

        // Socket listeners for real-time updates
        socketService.connect();

        const handlePlayerSold = (data) => {
            // Refresh data to get the latest sold player at the top
            // Using a slight delay to ensure DB update propagates if needed, 
            // though ideally we'd just append to state. 
            // For Simplicity in syncing full details (like team name), reloading is safer.
            setTimeout(() => {
                loadData();
            }, 500);
        };

        socketService.on('player-sold', handlePlayerSold); // Assuming event name 'player-sold' or generic update
        socketService.onAuctionUpdate((data) => {
            if (data.type === 'sold') {
                handlePlayerSold(data);
            }
        });

        return () => {
            socketService.off('player-sold');
            socketService.off('auction-update');
        };
    }, []);

    const loadData = async () => {
        try {
            const [playersRes, teamsRes] = await Promise.all([
                playerAPI.getAllPlayers(),
                teamsAPI.getAllTeams()
            ]);

            const players = playersRes.data.players || [];
            const teamsList = teamsRes.data.teams || [];

            setTeams(teamsList);
            setAllPlayers(players);

            // Filter and sort sold players (newest sold might be last in DB, assuming we want reverse chrono?)
            // Actually, usually sold order isn't strictly tracked by timestamp in simple schemas unless 'updated_at' is used.
            // Let's sort by 'updated_at' desc if available, otherwise just filter.
            const sold = players.filter(p => p.status === 'sold');
            // Sort by ID desc as a proxy for recency if updated_at missing, or client-side append logic?
            // Let's assume database order or simple filter for now.
            setSoldPlayers(sold.reverse()); // Show newest first (if array came in ID order)

        } catch (err) {
            console.error("Failed to load profiles data", err);
        } finally {
            setLoading(false);
        }
    };

    // Helper: Get Team Name
    const getTeamName = (teamId) => {
        const team = teams.find(t => t.id === parseInt(teamId));
        return team ? team.name : 'Unknown Team';
    };

    // Helper: Generate Confetti (Simple Emoji Logic in CSS is handled, but maybe we want more?)
    // Keeping it simple as per CSS 'after' element for now.

    // Pagination Helpers
    const getPaginatedList = (list, page, perPage) => {
        const start = (page - 1) * perPage;
        return list.slice(start, start + perPage);
    };

    const totalSoldPages = Math.ceil(soldPlayers.length / ITEMS_PER_PAGE_SOLD);
    const totalAllPages = Math.ceil(allPlayers.length / ITEMS_PER_PAGE_ALL);

    return (
        <div className="player-profiles-page">
            {/* Overlay */}
            {selectedPlayer && (
                <div className="profile-overlay-backdrop" onClick={() => setSelectedPlayer(null)}>
                    <div className="profile-overlay-content" onClick={e => e.stopPropagation()}>
                        <button className="overlay-close-btn" onClick={() => setSelectedPlayer(null)}>×</button>
                        <div className="profile-hero">
                            {selectedPlayer.photo_url ? (
                                <img src={selectedPlayer.photo_url} alt={selectedPlayer.name} className="profile-hero-img" />
                            ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ddd', fontSize: '4rem' }}>👤</div>
                            )}
                        </div>
                        <div className="profile-body">
                            <h2 className="profile-name">{selectedPlayer.name}</h2>
                            <p className="profile-id">ID: #{selectedPlayer.id}</p>

                            <div className="profile-tags">
                                <span className="tag-large">{selectedPlayer.year} MBBS</span>
                                <span className="tag-large tag-accent">{selectedPlayer.sport}</span>
                                {selectedPlayer.stats && Object.entries(typeof selectedPlayer.stats === 'string' ? JSON.parse(selectedPlayer.stats) : selectedPlayer.stats).map(([key, value]) => {
                                    const formattedKey = key
                                        .replace(/([A-Z])/g, ' $1')
                                        .replace(/^./, str => str.toUpperCase())
                                        .trim();
                                    return (
                                        <span key={key} className="tag-large">
                                            <strong>{formattedKey}:</strong> {value}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="profiles-container">
                {/* Left Column: Sold Players */}
                <div className="sold-feed-section">
                    <div className="section-header-styled">
                        <h2>🎉 Sold Players</h2>
                        <span className="badge badge-primary">{soldPlayers.length} Sold</span>
                    </div>

                    <div className="sold-feed-list custom-scrollbar">
                        {soldPlayers.length === 0 ? (
                            <p className="text-center text-secondary mt-5">No players sold yet. The auction is waiting for the first sale! 🚀</p>
                        ) : (
                            getPaginatedList(soldPlayers, soldPage, ITEMS_PER_PAGE_SOLD).map(player => (
                                <div key={player.id} className="sold-feed-item">
                                    <div className="sold-item-image">
                                        {player.photo_url ? (
                                            <img src={player.photo_url} alt={player.name} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
                                        )}
                                    </div>
                                    <div className="sold-item-info">
                                        <div className="sold-player-name">{player.name}</div>
                                        <div className="sold-details-row">
                                            <span className="sold-to-badge">Sold to {getTeamName(player.team_id)}</span>
                                        </div>
                                    </div>
                                    <div className="sold-price">
                                        {parseFloat(player.sold_price).toLocaleString()} pts
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {soldPlayers.length > ITEMS_PER_PAGE_SOLD && (
                        <div className="pagination-controls">
                            <button
                                className="page-btn"
                                disabled={soldPage === 1}
                                onClick={() => setSoldPage(p => p - 1)}
                            >
                                Prev
                            </button>
                            <span className="page-info">Page {soldPage} of {totalSoldPages}</span>
                            <button
                                className="page-btn"
                                disabled={soldPage === totalSoldPages}
                                onClick={() => setSoldPage(p => p + 1)}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Column: All Players */}
                <div className="all-players-section">
                    <div className="section-header-styled">
                        <h2>📋 All Players</h2>
                        <div className="flex gap-2 items-center">
                            <select
                                className="sort-select"
                                value={playerSortBy}
                                onChange={(e) => setPlayerSortBy(e.target.value)}
                            >
                                <option value="name">Sort by Name</option>
                                <option value="year">Sort by Year (Grade)</option>
                                <option value="sport">Sort by Sport</option>
                            </select>
                            <span className="badge badge-secondary">{allPlayers.length} Total</span>
                        </div>
                    </div>

                    <div className="all-players-list custom-scrollbar">
                        {getPaginatedList(
                            [...allPlayers].sort((a, b) => {
                                if (playerSortBy === 'name') return a.name.localeCompare(b.name);
                                if (playerSortBy === 'sport') return a.sport.localeCompare(b.sport);
                                if (playerSortBy === 'year') {
                                    const order = { '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, 'intern': 5 };
                                    const aVal = order[String(a.year).toLowerCase()] || 0;
                                    const bVal = order[String(b.year).toLowerCase()] || 0;
                                    return bVal - aVal;
                                }
                                return 0;
                            }),
                            allPage,
                            ITEMS_PER_PAGE_ALL
                        ).map(player => (
                            <div
                                key={player.id}
                                className="mini-player-card"
                                onClick={() => setSelectedPlayer(player)}
                            >
                                <div className="mini-avatar">
                                    {player.photo_url ? (
                                        <img src={player.photo_url} alt={player.name} />
                                    ) : (
                                        <span>👤</span>
                                    )}
                                </div>
                                <div className="mini-info">
                                    <div className="mini-name">{player.name}</div>
                                    <div className="mini-meta">
                                        <span>#{player.id}</span>
                                        <span className="meta-year">{player.year}</span>
                                        <span style={{ textTransform: 'capitalize' }}>{player.sport}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {allPlayers.length > ITEMS_PER_PAGE_ALL && (
                        <div className="pagination-controls">
                            <button
                                className="page-btn"
                                disabled={allPage === 1}
                                onClick={() => setAllPage(p => p - 1)}
                            >
                                Prev
                            </button>
                            <span className="page-info">Page {allPage} of {totalAllPages}</span>
                            <button
                                className="page-btn"
                                disabled={allPage === totalAllPages}
                                onClick={() => setAllPage(p => p + 1)}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
