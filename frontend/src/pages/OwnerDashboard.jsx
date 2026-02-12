import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { teamOwnerAPI, auctionAPI } from '../services/api.js';
import FooterTicker from '../components/FooterTicker';
import './OwnerDashboard.css';

export default function OwnerDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [team, setTeam] = useState(null);
    const [roster, setRoster] = useState([]);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);

            // Fetch team data
            const teamResponse = await teamOwnerAPI.getMyTeam();
            setTeam(teamResponse.data.team);

            // Fetch roster (players bought by this team)
            const rosterResponse = await teamOwnerAPI.getMyTeamPlayers();
            setRoster(rosterResponse.data.players || []);

            // Fetch recent transactions for strategy feed
            const transactionsResponse = await auctionAPI.getTransactions();
            setRecentTransactions((transactionsResponse.data.transactions || []).slice(0, 5));

            setLoading(false);
        } catch (err) {
            console.error('Error loading dashboard:', err);
            setError('Failed to load dashboard data');
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="owner-dashboard-page">
                <div className="spinner"></div>
            </div>
        );
    }

    if (error || !team) {
        return (
            <div className="owner-dashboard-page">
                <div className="error-message">
                    <h2>Access Denied</h2>
                    <p>{error || 'You must be a team owner to access this dashboard.'}</p>
                    <button onClick={() => navigate('/')} className="btn-primary">
                        Return Home
                    </button>
                </div>
            </div>
        );
    }

    const remainingBudget = team.budget - (roster.reduce((sum, player) => sum + (player.final_price || 0), 0));

    return (
        <div className="owner-dashboard-page">
            <div className="owner-container">
                {/* Franchise Dossier Header */}
                <div className="franchise-dossier-header">
                    <div className="team-logo-stage">
                        {team.logo_url ? (
                            <img src={team.logo_url} alt={team.name} className="team-logo-large" />
                        ) : (
                            <div className="team-logo-placeholder">
                                {team.name.charAt(0)}
                            </div>
                        )}
                    </div>
                    <div className="franchise-info">
                        <h1 className="franchise-name">{team.name}</h1>
                        <p className="franchise-meta">{team.sport?.toUpperCase()} • FRANCHISE DOSSIER</p>
                    </div>
                    <div className="financial-hud">
                        <span className="budget-label">REMAINING BUDGET</span>
                        <span className="budget-value">₹ {remainingBudget.toLocaleString()}</span>
                    </div>
                </div>

                <div className="dashboard-grid">
                    {/* Live Roster Ledger */}
                    <div className="roster-ledger-section">
                        <h2 className="section-title">LIVE ROSTER LEDGER</h2>
                        <div className="roster-ledger-container glass-card">
                            {roster.length === 0 ? (
                                <div className="empty-roster">
                                    NO PLAYERS ACQUIRED YET
                                </div>
                            ) : (
                                <div className="roster-data-strips">
                                    {roster.map((player) => (
                                        <div key={player.id} className="roster-data-strip">
                                            <div className="strip-photo">
                                                {player.photo_url ? (
                                                    <img
                                                        src={player.photo_url}
                                                        alt={player.name}
                                                        className="player-photo-small grayscale"
                                                    />
                                                ) : (
                                                    <div className="player-photo-small placeholder">
                                                        {player.name.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="strip-player-info">
                                                <span className="player-name-roster">{player.name}</span>
                                                <span className="player-role">ROLE: {player.stats?.role || 'N/A'}</span>
                                            </div>
                                            <div className="strip-points">
                                                <span className="points-label">POINTS</span>
                                                <span className="points-value">₹ {player.final_price?.toLocaleString() || '0'}</span>
                                            </div>
                                            <div className="strip-year">
                                                <span className="year-label">ACADEMIC YEAR</span>
                                                <span className="year-value">{player.year || 'N/A'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Roster Summary */}
                        <div className="roster-summary">
                            <div className="summary-item">
                                <span className="summary-label">TOTAL PLAYERS</span>
                                <span className="summary-value">{roster.length}</span>
                            </div>
                            <div className="summary-item">
                                <span className="summary-label">TOTAL SPENT</span>
                                <span className="summary-value">₹ {roster.reduce((sum, p) => sum + (p.final_price || 0), 0).toLocaleString()}</span>
                            </div>
                            <div className="summary-item">
                                <span className="summary-label">BUDGET REMAINING</span>
                                <span className="summary-value">₹ {remainingBudget.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Strategy Feed Sidebar */}
                    <div className="strategy-feed-sidebar">
                        <h3 className="sidebar-title">STRATEGY FEED</h3>
                        <p className="sidebar-subtitle">RECENT AUCTION ACTIVITY</p>
                        <div className="strategy-feed-container glass-card">
                            {recentTransactions.length === 0 ? (
                                <div className="empty-feed">
                                    NO RECENT ACTIVITY
                                </div>
                            ) : (
                                <div className="transaction-feed">
                                    {recentTransactions.map((transaction, index) => (
                                        <div
                                            key={transaction.id || index}
                                            className={`transaction-item ${transaction.team_id === team.id ? 'highlight-runner-up' : ''}`}
                                        >
                                            <div className="transaction-player">
                                                {transaction.player_name || `Player #${transaction.player_id}`}
                                            </div>
                                            <div className="transaction-details">
                                                <span className="transaction-team">
                                                    {transaction.team_name || 'Unknown Team'}
                                                </span>
                                                <span className="transaction-amount">
                                                    ₹ {transaction.amount?.toLocaleString() || '0'}
                                                </span>
                                            </div>
                                            {transaction.team_id === team.id && (
                                                <span className="runner-up-badge">RUNNER-UP</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Ticker */}
            <FooterTicker />
        </div>
    );
}
