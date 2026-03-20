import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { teamsAPI, playerAPI, adminAPI, auctionAPI, teamOwnerAPI } from '../services/api';
import './Teams.css';

export default function Teams() {
    const { user } = useAuth();
    const [teams, setTeams] = useState([]);
    const [players, setPlayers] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [filteredTeams, setFilteredTeams] = useState([]);
    const [activeSport, setActiveSport] = useState('Cricket');
    const [loading, setLoading] = useState(true);
    // user state is now from context
    // myTeam state is derived or managed differently if needed
    const [expandedTeam, setExpandedTeam] = useState(null);
    const [walletModal, setWalletModal] = useState({ show: false, teamId: null, teamName: '', action: '' });

    // Removed manual user fetch useEffect

    useEffect(() => {
        const fetchData = async () => {
            try {
                const teamsRes = await teamsAPI.getAllTeams('');
                const teamsList = teamsRes.data.teams || [];
                setTeams(teamsList);

                if (user) {
                    const playersRes = await playerAPI.getAllPlayers();
                    const allPlayers = playersRes.data.players || playersRes.data || [];
                    const parsedPlayers = allPlayers.map(p => {
                        let stats = p.stats;
                        if (typeof stats === 'string') {
                            try { stats = JSON.parse(stats); } catch (e) { stats = {}; }
                        }
                        return { ...p, stats: stats || {} };
                    });
                    setPlayers(parsedPlayers);

                    if (user.role === 'admin') {
                        try {
                            const transRes = await auctionAPI.getTransactions().catch(() =>
                                adminAPI.getRecentBids().catch(() => ({ data: { transactions: [] } }))
                            );
                            const allTrans = transRes.data.transactions || transRes.data.bids || transRes.data.recentBids || [];
                            setTransactions(allTrans);
                        } catch (err) {
                            console.log('Could not fetch transactions');
                        }
                    }

                    if (user.role === 'team_owner') {
                        try {
                            // Fetch specific team owner data
                            const myTeamRes = await teamOwnerAPI.getMyTeam();
                            const myPlayersRes = await teamOwnerAPI.getMyTeamPlayers();
                            const myBidsRes = await teamOwnerAPI.getMyTeamBids();

                            setTeams([myTeamRes.data.team]); // Only show my team
                            setPlayers(myPlayersRes.data.players);
                            setTransactions(myBidsRes.data.bids);
                        } catch (err) {
                            console.error("Failed to load Team Owner dashboard:", err);
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        };
        if (user !== null) fetchData();
    }, [user, activeSport]);

    useEffect(() => {
        if (!teams) return;
        const targetSport = activeSport.toLowerCase();
        const filteredList = teams.filter(team => (team.sport || '').toLowerCase() === targetSport);
        setFilteredTeams(filteredList);
    }, [activeSport, teams]);

    const handleWalletAdjust = async (teamId, action, amount) => {
        console.log('Adjusting wallet:', { teamId, action, amount });
        if (!amount || amount <= 0) return alert('Invalid amount');
        try {
            await adminAPI.adjustTeamWallet(teamId, action, amount);
            alert(`Wallet ${action}ed successfully`);
            window.location.reload();
        } catch (err) {
            console.error('Wallet adjustment failed:', err);
            alert(err.response?.data?.error || 'Failed to adjust wallet');
        }
    };

    const handlePlayerRelease = async (playerId, playerName) => {
        if (!confirm(`Release ${playerName} from their team?`)) return;
        try {
            await playerAPI.markPlayerUnsold(playerId);
            alert('Player released successfully');
            window.location.reload();
        } catch (err) {
            alert('Failed to release player');
        }
    };

    // PUBLIC VIEW
    if (!user) {
        return (
            <div className="editorial-glass-stage">
                <div className="phantom-nav-spacer"></div>
                <div className="teams-page">
                    <div className="teams-header">
                        <div className="header-left">
                            <div className="header-meta">AUCTION TERMINAL // 2026 EDITION</div>
                            <h1 className="header-title">THE<br />TEAMS</h1>
                        </div>
                        <div className="header-right">
                            <div className="header-meta">SPORT: {activeSport.toUpperCase()}</div>
                        </div>
                    </div>

                    <div className="sport-tabs-container">
                        {['Cricket', 'Futsal', 'Volleyball'].map(sport => (
                            <button
                                key={sport}
                                className={`sport-tab ${activeSport === sport ? 'active' : ''}`}
                                onClick={() => setActiveSport(sport)}
                            >
                                {sport}
                            </button>
                        ))}
                    </div>

                    {loading ? <div className="loading-state">SYNCHRONIZING DATA...</div> : (
                        <div className="teams-list">
                            {filteredTeams.map(team => {
                                const budgetRemaining = team.remaining_budget || team.budget || 0;
                                const budgetTotal = team.budget || 2000;
                                const budgetUsedPercent = ((budgetTotal - budgetRemaining) / budgetTotal) * 100;

                                return (
                                    <div key={team.id} className="franchise-strip">
                                        <div className="strip-identity">
                                            <div className="team-name-main">{team.name}</div>
                                            <div className="owner-subtitle">OWNER: {team.owner_name || 'N/A'}</div>
                                        </div>

                                        <div className="strip-budget">
                                            <div className="budget-header">
                                                <span className="budget-label">CAP LEFT</span>
                                                <span className="budget-value">{budgetRemaining.toLocaleString()} PTS</span>
                                            </div>
                                            <div className="budget-track">
                                                <div className="budget-fill" style={{ width: `${Math.max(0, 100 - budgetUsedPercent)}%` }}></div>
                                            </div>
                                        </div>

                                        <div className="strip-roster">
                                            <div className="roster-badge">
                                                {team.player_count || 0}/{
                                                    activeSport === 'Futsal' ? 8 :
                                                        activeSport === 'Volleyball' ? 7 : 15
                                                }
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {filteredTeams.length === 0 && !loading && (
                        <div className="empty-state">NO RECORD FOUND FOR THIS CATEGORY.</div>
                    )}
                </div>
            </div>
        );
    }

    // VIEWER ROLE
    if (user && user.role === 'viewer') {
        const teamsWithRosters = filteredTeams.map(team => {
            const teamRoster = players.filter(p =>
                p.team_id == team.id &&
                p.sport?.toLowerCase() === activeSport.toLowerCase() &&
                p.status === 'sold'
            );
            return { ...team, roster: teamRoster };
        });

        return (
            <div className="editorial-glass-stage">
                <div className="phantom-nav-spacer"></div>
                <div className="teams-page">
                    <div className="teams-header">
                        <div className="header-left">
                            <div className="header-meta">TEAM ROSTERS /// {activeSport.toUpperCase()}</div>
                            <h1 className="header-title">THE<br />SQUADS</h1>
                        </div>
                    </div>

                    <div className="sport-tabs-container">
                        {['Cricket', 'Futsal', 'Volleyball'].map(sport => (
                            <button
                                key={sport}
                                className={`sport-tab ${activeSport === sport ? 'active' : ''}`}
                                onClick={() => setActiveSport(sport)}
                            >
                                {sport}
                            </button>
                        ))}
                    </div>

                    {loading ? <div className="loading-state">SYNCHRONIZING DATA...</div> : (
                        <div className="viewer-teams-grid">
                            {teamsWithRosters.map(team => {
                                const budgetRemaining = team.remaining_budget ?? team.budget ?? 0;
                                const isExpanded = expandedTeam === team.id;

                                return (
                                    <div key={team.id} className="viewer-team-card">
                                        <div
                                            className="viewer-team-header"
                                            onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                                        >
                                            <div className="viewer-team-info">
                                                <h3 className="viewer-team-name">{team.name}</h3>
                                                <span className="viewer-team-owner">OWNER: {team.owner_name || 'N/A'}</span>
                                            </div>
                                            <div className="viewer-team-stats">
                                                <div className="viewer-stat">
                                                    <span className="viewer-stat-label">BUDGET LEFT</span>
                                                    <span className="viewer-stat-value">{budgetRemaining.toLocaleString()} PTS</span>
                                                </div>
                                                <div className="viewer-stat">
                                                    <span className="viewer-stat-label">ROSTER</span>
                                                    <span className="viewer-stat-value">{team.roster.length}</span>
                                                </div>
                                                <button className="expand-btn">{isExpanded ? '−' : '+'}</button>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="viewer-team-details">
                                                <div className="viewer-roster-list">
                                                    {team.roster.map(player => (
                                                        <div key={player.id} className="viewer-roster-row">
                                                            <span className="viewer-player-name">{player.name}</span>
                                                            <span className="viewer-player-year">{player.year}</span>
                                                            <span className="viewer-player-price">{player.sold_price?.toLocaleString()} PTS</span>
                                                        </div>
                                                    ))}
                                                    {team.roster.length === 0 && (
                                                        <div className="empty-roster">NO PLAYERS YET</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {teamsWithRosters.length === 0 && !loading && (
                        <div className="empty-state">NO TEAMS FOUND FOR {activeSport.toUpperCase()}</div>
                    )}
                </div>
            </div>
        );
    }

    // TEAM OWNER DASHBOARD VIEW
    if (user && user.role === 'team_owner') {
        // Should only be one team in state, but logic holds
        const myTeam = teams[0];

        if (!myTeam) {
            return (
                <div className="editorial-glass-stage">
                    <div className="phantom-nav-spacer"></div>
                    <div className="teams-page">
                        <div className="empty-state">NO TEAM ASSIGNED. CONTACT ADMINISTRATOR.</div>
                    </div>
                </div>
            );
        }

        const budgetTotal = myTeam.budget || 0;
        const budgetRemaining = myTeam.remaining_budget ?? budgetTotal;
        const budgetSpent = myTeam.total_spent || (budgetTotal - budgetRemaining);

        return (
            <div className="editorial-glass-stage">
                <div className="phantom-nav-spacer"></div>
                <div className="teams-page">
                    <div className="teams-header">
                        <div className="header-left">
                            <div className="header-meta">FRANCHISE CONTROL // OWNER MODE</div>
                            <h1 className="header-title">{myTeam.name.toUpperCase()}</h1>
                        </div>
                        <div className="header-right">
                            <img src={myTeam.logo_url} className="owner-team-logo-large" alt="Logo" onError={(e) => e.target.style.display = 'none'} />
                        </div>
                    </div>

                    <div className="admin-view">
                        {/* Reuse Admin Layout Structure for Dashboard feel */}

                        <div className="admin-ledger"> {/* Left Column: Stats & Roster */}

                            {/* 1. KEY STATS CARDS */}
                            <div className="owner-stats-grid">
                                <div className="owner-stat-card">
                                    <div className="stat-label">TOTAL BUDGET</div>
                                    <div className="stat-value">{budgetTotal.toLocaleString()}</div>
                                </div>
                                <div className="owner-stat-card">
                                    <div className="stat-label">SPENT</div>
                                    <div className="stat-value">{budgetSpent.toLocaleString()}</div>
                                </div>
                                <div className="owner-stat-card highlight">
                                    <div className="stat-label">REMAINING</div>
                                    <div className="stat-value">{budgetRemaining.toLocaleString()}</div>
                                </div>
                                <div className="owner-stat-card">
                                    <div className="stat-label">SQUAD SIZE</div>
                                    <div className="stat-value">{players.length}</div>
                                </div>
                            </div>

                            {/* 2. MY ROSTER */}
                            <div className="ledger-team-block expanded" style={{ marginTop: '2rem' }}>
                                <div className="ledger-team-header">
                                    <h3 className="ledger-team-name">ACTIVE ROSTER</h3>
                                </div>
                                <div className="ledger-team-details">
                                    <div className="roster-list">
                                        {players.length > 0 ? players.map(player => (
                                            <div key={player.id} className="roster-player-row">
                                                <div className="player-info-cell">
                                                    {player.photo_url && <img src={player.photo_url} className="roster-thumb" />}
                                                    <div>
                                                        <span className="roster-player-name">{player.name}</span>
                                                        <span className="roster-player-meta">{player.year} • {player.sport}</span>
                                                    </div>
                                                </div>
                                                <span className="roster-player-price">{player.sold_price?.toLocaleString()} PTS</span>
                                            </div>
                                        )) : (
                                            <div className="empty-roster">NO PLAYERS ACQUIRED YET</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Transaction Logs */}
                        <div className="logs-sidebar">
                            <h3 className="logs-title">MY BID HISTORY</h3>
                            {transactions.length > 0 ? transactions.map((bid) => (
                                <div key={bid.id} className="log-entry">
                                    <span className="log-player">{bid.player_name}</span>
                                    <br />
                                    <span className="log-price">{bid.amount?.toLocaleString()} PTS</span>
                                    <span className="log-time">
                                        {new Date(bid.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            )) : (
                                <div className="empty-state" style={{ fontSize: '0.7rem' }}>NO BIDS PLACED</div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        );
    }



    // ADMIN VIEW (removed team owner section to save time)


    // ADMIN VIEW
    if (user.role === 'admin') {
        const teamsWithRosters = filteredTeams.map(team => {
            const teamRoster = players.filter(p =>
                p.team_id == team.id &&
                p.sport?.toLowerCase() === activeSport.toLowerCase() &&
                p.status === 'sold'
            );
            return { ...team, roster: teamRoster };
        });

        return (
            <div className="editorial-glass-stage">
                <div className="phantom-nav-spacer"></div>
                <div className="teams-page">
                    <div className="teams-header">
                        <div className="header-left">
                            <div className="header-meta">OFFICIAL /// {activeSport.toUpperCase()}</div>
                            <h1 className="header-title">AUCTION<br />LEDGER</h1>
                        </div>
                    </div>

                    <div className="sport-tabs-container">
                        {['Cricket', 'Futsal', 'Volleyball'].map(sport => (
                            <button
                                key={sport}
                                className={`sport-tab ${activeSport === sport ? 'active' : ''}`}
                                onClick={() => setActiveSport(sport)}
                            >
                                {sport}
                            </button>
                        ))}
                    </div>

                    {loading ? <div className="loading-state">SYNCHRONIZING DATA...</div> : (
                        <div className="admin-view">
                            <div className="admin-ledger">
                                {teamsWithRosters.map(team => {
                                    const budgetRemaining = team.remaining_budget || team.budget || 0;
                                    const isExpanded = expandedTeam === team.id;

                                    return (
                                        <div key={team.id} className="ledger-team-block">
                                            <div
                                                className="ledger-team-header"
                                                onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                                            >
                                                <div className="ledger-team-info">
                                                    <h3 className="ledger-team-name">{team.name}</h3>
                                                    <span className="ledger-team-owner">OWNER: {team.owner_name || 'N/A'}</span>
                                                </div>
                                                <div className="ledger-team-stats">
                                                    <div className="ledger-stat">
                                                        <span className="ledger-stat-label">BUDGET</span>
                                                        <span className="ledger-stat-value">{budgetRemaining.toLocaleString()} PTS</span>
                                                    </div>
                                                    <div className="ledger-stat">
                                                        <span className="ledger-stat-label">ROSTER</span>
                                                        <span className="ledger-stat-value">{team.roster.length}</span>
                                                    </div>
                                                    <button className="expand-btn">{isExpanded ? '−' : '+'}</button>
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div className="ledger-team-details">
                                                    <div className="wallet-controls">
                                                        <button
                                                            onClick={() => setWalletModal({ show: true, teamId: team.id, teamName: team.name, action: 'add' })}
                                                            className="wallet-btn add"
                                                        >
                                                            + ADD FUNDS
                                                        </button>
                                                        <button
                                                            onClick={() => setWalletModal({ show: true, teamId: team.id, teamName: team.name, action: 'deduct' })}
                                                            className="wallet-btn deduct"
                                                        >
                                                            − DEDUCT FUNDS
                                                        </button>
                                                    </div>
                                                    <div className="roster-list">
                                                        {team.roster.map(player => (
                                                            <div key={player.id} className="roster-player-row">
                                                                <span className="roster-player-name">{player.name}</span>
                                                                <span className="roster-player-year">{player.year}</span>
                                                                <span className="roster-player-price">{player.sold_price?.toLocaleString()} PTS</span>
                                                                <button
                                                                    className="roster-release-btn"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handlePlayerRelease(player.id, player.name);
                                                                    }}
                                                                    title="Release player"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                        ))}
                                                        {team.roster.length === 0 && (
                                                            <div className="empty-roster">NO PLAYERS YET</div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="logs-sidebar">
                                <h3 className="logs-title">RECENT TRANSACTIONS</h3>
                                {transactions.slice(0, 20).map((trans, idx) => (
                                    <div key={idx} className="log-entry">
                                        <span className="log-player">{trans.player_name || 'Unknown Player'}</span>
                                        {' → '}
                                        <span className="log-team">{trans.team_name || 'Unknown Team'}</span>
                                        <br />
                                        <span className="log-price">{trans.amount?.toLocaleString()} PTS</span>
                                        <span className="log-time">
                                            {trans.created_at ? new Date(trans.created_at).toLocaleTimeString() : ''}
                                        </span>
                                    </div>
                                ))}
                                {transactions.length === 0 && (
                                    <div className="empty-state" style={{ padding: '2rem 0', fontSize: '0.7rem' }}>
                                        NO TRANSACTIONS YET
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {teamsWithRosters.length === 0 && !loading && (
                        <div className="empty-state">NO TEAMS FOUND FOR {activeSport.toUpperCase()}</div>
                    )}

                    {/* Wallet Adjustment Modal */}
                    {walletModal.show && (
                        <div className="modal-overlay" onClick={() => setWalletModal({ ...walletModal, show: false })}>
                            <div className="wallet-modal" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h3 className="modal-title">
                                        {walletModal.action === 'add' ? 'ADD FUNDS' : 'DEDUCT FUNDS'}
                                    </h3>
                                    <button
                                        className="modal-close"
                                        onClick={() => setWalletModal({ ...walletModal, show: false })}
                                    >
                                        ×
                                    </button>
                                </div>
                                <div className="modal-body">
                                    <div className="modal-team-info">
                                        <span className="modal-label">TEAM:</span>
                                        <span className="modal-value">{walletModal.teamName}</span>
                                    </div>
                                    <div className="modal-input-group">
                                        <label className="modal-label">AMOUNT (PTS)</label>
                                        <input
                                            type="number"
                                            className="modal-input"
                                            placeholder="Enter amount..."
                                            id="wallet-amount"
                                            min="1"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button
                                        className="modal-btn cancel"
                                        onClick={() => setWalletModal({ ...walletModal, show: false })}
                                    >
                                        CANCEL
                                    </button>
                                    <button
                                        className={`modal-btn confirm ${walletModal.action}`}
                                        onClick={() => {
                                            const amount = parseInt(document.getElementById('wallet-amount').value);
                                            if (amount && amount > 0) {
                                                handleWalletAdjust(walletModal.teamId, walletModal.action, amount);
                                                setWalletModal({ ...walletModal, show: false });
                                            } else {
                                                alert('Please enter a valid amount');
                                            }
                                        }}
                                    >
                                        {walletModal.action === 'add' ? '+ ADD' : '− DEDUCT'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return null;
}
