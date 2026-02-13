import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { teamsAPI, playerAPI, auctionAPI, adminAPI, authAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import './AuctionStats.css';

export default function AuctionStats() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Data State
    const [teams, setTeams] = useState([]);
    const [players, setPlayers] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [upcomingQueue, setUpcomingQueue] = useState([]);
    const [loading, setLoading] = useState(true);
    const [myTeam, setMyTeam] = useState(null);

    // UI State
    const [activeSport, setActiveSport] = useState('Cricket');
    const [showSidebar, setShowSidebar] = useState(false);

    // Password Modal State
    const [passwordModal, setPasswordModal] = useState({ show: false, oldPassword: '', newPassword: '' });

    // Wallet Modal State
    const [walletModal, setWalletModal] = useState({ show: false, team: null, action: 'add', amount: '' });

    useEffect(() => { if (!user) navigate('/login'); }, [user, navigate]);

    const handleWalletUpdate = async () => {
        try {
            if (!walletModal.team?.id || !walletModal.amount) return;
            const amount = parseInt(walletModal.amount);

            // Pass parameters as expected by adminAPI (id, action, amount)
            await adminAPI.adjustTeamWallet(walletModal.team.id, walletModal.action, amount);

            alert(`${walletModal.action === 'add' ? 'Credit' : 'Debit'} of ${amount.toLocaleString()} Pts successful.`);
            setWalletModal({ ...walletModal, show: false, amount: '' });
            fetchData();
        } catch (err) {
            console.error(err);
            alert("Failed to update wallet: " + (err.response?.data?.error || err.message));
        }
    };

    const handleWalletReset = async () => {
        if (!confirm(`RESET wallet for ${walletModal.team?.name}? This will clear transactions.`)) return;
        try {
            await adminAPI.resetTeamWallet(walletModal.team.id);
            alert("Wallet reset successfully.");
            setWalletModal({ ...walletModal, show: false });
            fetchData();
        } catch (err) {
            console.error(err);
            alert("Failed to reset wallet");
        }
    };

    const handleRelease = async (player) => {
        if (!confirm(`Are you sure you want to release ${player.name} from ${player.team_name}?`)) return;
        try {
            // Assuming adminAPI or auctionAPI has a release endpoint, or we mark as unsold/available
            // Based on context, we might use markPlayerUnsold or a specific release endpoint. 
            // Using markPlayerUnsold for now or custom logic if provided in previous context. 
            // Let's assume markPlayerUnsold which sets status to 'unsold' effectively releasing them to be auctioned again, 
            // OR we can set status to 'released'.
            await auctionAPI.markPlayerUnsold(player.id);
            alert("Player released.");
            fetchData();
        } catch (err) {
            alert("Failed to release player");
        }
    };

    const fetchData = async () => {
        try {
            // If Owner, fetch ALL teams to find their specific one, else filter by activeSport
            const teamsFilter = user.role === 'team_owner' ? '' : activeSport.toLowerCase();

            const promises = [
                teamsAPI.getAllTeams(teamsFilter),
                playerAPI.getAllPlayers(),
                auctionAPI.getTransactions()
            ];

            if (user.role === 'team_owner') {
                promises.push(auctionAPI.getUpcomingQueue());
            }

            const results = await Promise.all(promises);
            const teamsRes = results[0];
            const playersRes = results[1];
            const transRes = results[2];
            const queueRes = user.role === 'team_owner' ? results[3] : { data: { queue: [] } };

            const allPlayers = playersRes.data.players || playersRes.data || [];
            const parsedPlayers = allPlayers.map(p => {
                let stats = p.stats;
                if (typeof stats === 'string') {
                    try { stats = JSON.parse(stats); } catch (e) { stats = {}; }
                }
                return { ...p, stats: stats || {} };
            });

            setTeams(teamsRes.data.teams);
            setPlayers(parsedPlayers);
            setTransactions(transRes.data.transactions || transRes.data.bids || []);
            setUpcomingQueue(queueRes.data.queue || []);

            // If Owner, find their specific team using team_id
            if (user?.role === 'team_owner' && user?.team_id) {
                const foundTeam = teamsRes.data.teams.find(t => t.id == user.team_id);
                setMyTeam(foundTeam);
            }
        } catch (err) { console.error("Stats Load Failed", err); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (user) fetchData(); }, [user, activeSport]);

    const handleChangePassword = async (e) => {
        e.preventDefault();
        try {
            await authAPI.changePassword({
                oldPassword: passwordModal.oldPassword,
                newPassword: passwordModal.newPassword
            });
            alert("Password changed successfully.");
            setPasswordModal({ show: false, oldPassword: '', newPassword: '' });
        } catch (err) {
            alert(err.response?.data?.error || "Failed to change password");
        }
    };

    // ... Actions ...

    if (loading) return <div className="loading-screen" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#D1E0D7', color: '#3E5B4E', fontFamily: 'monospace', fontSize: '1.5rem', letterSpacing: '2px' }}>SYSTEM LOADING...</div>;
    if (!user) return null;

    // --- TEAM OWNER VIEW (PORTFOLIO) ---
    if (user.role === 'team_owner') {
        if (!myTeam) return (
            <div className="stats-error" style={{ flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
                <div>TEAM NOT LINKED.</div>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>CURRENT USER: {user.name}</div>
                <div>CONTACT ADMIN.</div>
            </div>
        );

        const myPlayers = players.filter(p => p.team_id == myTeam.id);
        const budgetUsed = (myTeam.budget || 2000) - (myTeam.remaining_budget || 0);
        const burnRate = myTeam.budget ? (budgetUsed / myTeam.budget) * 100 : 0;

        return (
            <div className="stats-page">
                <div className="stats-header-row">
                    <div>
                        <div className="meta-tag">PORTFOLIO /// {myTeam.name.toUpperCase()}</div>
                        <h1 className="page-title">TEAM REPORT</h1>
                    </div>
                    <div>
                        <button
                            className="btn-text-reset"
                            style={{ marginTop: 0, fontSize: '0.8rem' }}
                            onClick={() => setPasswordModal({ ...passwordModal, show: true })}
                        >
                            CHANGE PASSWORD
                        </button>
                    </div>
                </div>

                {/* KPI GRID */}
                <div className="kpi-grid">
                    <div className="kpi-card">
                        <span className="kpi-label">REMAINING POINTS</span>
                        <span className="kpi-value highlight">{(myTeam.remaining_budget || 0).toLocaleString()} PTS</span>
                        <div className="kpi-bar-bg"><div className="kpi-bar-fill" style={{ width: `${Math.max(0, 100 - burnRate)}%` }}></div></div>
                    </div>
                    <div className="kpi-card">
                        <span className="kpi-label">SPENT POINTS</span>
                        <span className="kpi-value">{budgetUsed.toLocaleString()} PTS</span>
                    </div>
                    <div className="kpi-card">
                        <span className="kpi-label">ROSTER SIZE</span>
                        <span className="kpi-value">{myPlayers.length} PLAYERS</span>
                    </div>
                </div>

                <div className="dashboard-split-row" style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
                    {/* LEFT: ROSTER */}
                    <div className="ledger-container" style={{ flex: 2 }}>
                        <div className="ledger-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>CURRENT HOLDINGS</span>
                            <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{myPlayers.length} / 15 MAX</span>
                        </div>
                        {myPlayers.length === 0 ? (
                            <div className="empty-ledger">NO ASSETS ACQUIRED YET.</div>
                        ) : (
                            <div className="table-responsive">
                                <table className="editorial-table">
                                    <thead>
                                        <tr>
                                            <th>NAME</th>
                                            <th>SPORT</th>
                                            <th>CLASS</th>
                                            <th>COST</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {myPlayers.map(p => (
                                            <tr key={p.id}>
                                                <td className="bold">{p.name}</td>
                                                <td>{(p.sport || 'UNKNOWN').toUpperCase()}</td>
                                                <td className="mono">{p.year}</td>
                                                <td className="mono highlight">{p.sold_price?.toLocaleString() || 0}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* RIGHT: WIDGETS */}
                    <div className="widgets-column" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                        {/* UPCOMING QUEUE */}
                        <div className="glass-card" style={{ padding: '1.5rem' }}>
                            <h3 className="section-title-small">UP NEXT</h3>
                            <div className="queue-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1rem' }}>
                                {upcomingQueue.length === 0 ? (
                                    <div className="dim-text">NO PLAYERS IN QUEUE</div>
                                ) : (
                                    upcomingQueue.map((p, i) => (
                                        <div key={p.id} className="queue-item" style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                            <span style={{ opacity: 0.5, fontFamily: 'monospace' }}>0{i + 1}</span>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{p.name}</div>
                                                <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>{(p.sport || 'UNKNOWN').toUpperCase()} • {p.year}</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* RECENT ACTIVITY */}
                        <div className="glass-card" style={{ padding: '1.5rem' }}>
                            <h3 className="section-title-small">RECENT BIDS</h3>
                            <div className="bid-activity-feed" style={{ marginTop: '1.5rem' }}>
                                {transactions.slice(0, 6).map(t => (
                                    <div key={t.id} className="bid-activity-row">
                                        <div className="bid-time-col">
                                            {t.timestamp ? new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                        </div>
                                        <div className="bid-details-col">
                                            <div className="bid-main-line">
                                                <span className="bid-team-name">{t.team_name || 'UNKNOWN'}</span>
                                                <span className="bid-action">PLACED</span>
                                                <span className="bid-amount">{t.amount?.toLocaleString()} PTS</span>
                                            </div>
                                            <div className="bid-player-line">FOR {t.player_name}</div>
                                        </div>
                                    </div>
                                ))}
                                {transactions.length === 0 && <div className="dim-text">NO RECENT ACTIVITY DETECTED</div>}
                            </div>
                        </div>

                    </div>
                </div>

                {/* CHANGE PASSWORD MODAL */}
                {passwordModal.show && (
                    <div className="wallet-modal-overlay">
                        <div className="wallet-modal-content" style={{ maxWidth: '400px' }}>
                            <button className="close-btn-top" onClick={() => setPasswordModal({ ...passwordModal, show: false })}>✕</button>
                            <h2 className="terminal-header">SECURITY SETTINGS</h2>
                            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 0' }}>
                                <div>
                                    <label className="terminal-label">CURRENT PASSWORD</label>
                                    <input
                                        type="password"
                                        className="input-minimal"
                                        value={passwordModal.oldPassword}
                                        onChange={e => setPasswordModal({ ...passwordModal, oldPassword: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="terminal-label">NEW PASSWORD</label>
                                    <input
                                        type="password"
                                        className="input-minimal"
                                        value={passwordModal.newPassword}
                                        onChange={e => setPasswordModal({ ...passwordModal, newPassword: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="terminal-actions">
                                    <button type="button" className="btn-discard" onClick={() => setPasswordModal({ ...passwordModal, show: false })}>CANCEL</button>
                                    <button type="submit" className="btn-commit">UPDATE PASSWORD</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // --- ADMIN VIEW (MAIN TEAMS GRID + LOGS SIDEBAR) ---
    if (user.role === 'admin') {
        const soldPlayers = players.filter(p =>
            p.status === 'sold' &&
            p.sport?.toLowerCase() === activeSport.toLowerCase()
        ).sort((a, b) => (b.sold_price || 0) - (a.sold_price || 0));

        const teamsWithRosters = teams.map(team => {
            const teamRoster = players.filter(p => p.team_id == team.id && p.sport?.toLowerCase() === activeSport.toLowerCase() && p.status === 'sold');
            return { ...team, roster: teamRoster };
        }).filter(t => t.sport?.toLowerCase() === activeSport.toLowerCase() || t.roster.length > 0);

        return (
            <div className="stats-page admin-stats-swapped">
                <div className="stats-header-row">
                    <div>
                        <div className="meta-tag">OFFICIAL /// {activeSport.toUpperCase()}</div>
                        <h1 className="page-title">OFFICIAL AUCTION LEDGER</h1>
                    </div>
                    <div className="header-actions">
                        <div className="sport-filter-group">
                            {['Cricket', 'Futsal', 'Volleyball'].map(sport => (
                                <button
                                    key={sport}
                                    className={`filter-btn ${activeSport === sport ? 'active' : ''}`}
                                    onClick={() => setActiveSport(sport)}
                                >
                                    {sport.toUpperCase()}
                                </button>
                            ))}
                        </div>
                        <button className="sidebar-toggle log-toggle" onClick={() => setShowSidebar(true)}>
                            VIEW LOGS →
                        </button>
                    </div>
                </div>

                <div className="ledger-scroll-snap-container">
                    {teamsWithRosters.length === 0 ? (
                        <div className="empty-ledger">NO TEAMS FOUND FOR {activeSport}</div>
                    ) : (
                        <div className="ledger-container">
                            {teamsWithRosters.map(team => (
                                <div key={team.id} className="ledger-column">
                                    <div className="ledger-team-header">
                                        <div className="team-info-group">
                                            <span className="ledger-team-name" title={team.name}>{team.name}</span>
                                            <div className="ledger-stats">
                                                <span className="stat-tag">{String(team.roster.length).padStart(2, '0')} PLS</span>
                                                <span className="stat-tag tag-accent">{(team.remaining_budget || 0).toLocaleString()} PTS</span>
                                            </div>
                                        </div>
                                        <button
                                            className="ledger-wallet-btn"
                                            onClick={() => setWalletModal({ show: true, team, action: 'add', amount: '' })}
                                            title="Manage Wallet"
                                        >
                                            MANAGE WALLET
                                        </button>
                                    </div>
                                    <div className="ledger-roster-content">
                                        {team.roster.length === 0 ? (
                                            <div className="roster-empty">OPEN ROSTER</div>
                                        ) : (
                                            <div className="ledger-player-list">
                                                {team.roster.map((p, index) => (
                                                    <div key={p.id} className="ledger-player-row">
                                                        <div className="ledger-player-inner">
                                                            <span className="ledger-row-index">#{String(index + 1).padStart(2, '0')}</span>
                                                            {p.photo_url ? (
                                                                <img src={p.photo_url} alt={p.name} className="ledger-player-avatar" />
                                                            ) : (
                                                                <div className="ledger-player-avatar placeholder">{p.name[0]}</div>
                                                            )}
                                                            <div className="ledger-player-info">
                                                                <span className="ledger-player-name">{p.name}</span>
                                                                <span className="ledger-player-sub">{p.year} • {p.sport}</span>
                                                            </div>
                                                        </div>
                                                        <div className="ledger-player-action">
                                                            <span className="ledger-player-price">{p.sold_price?.toLocaleString()} PTS</span>
                                                            <button
                                                                className="ledger-delete-btn"
                                                                onClick={() => handleRelease(p)}
                                                                title="Release Player"
                                                            >
                                                                RELEASE
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* TRANSACTION LOG SIDEBAR OVERLAY - MOVED OUTSIDE ledger-scroll-snap-container */}
                {showSidebar && (
                    <div className={`stats-sidebar-overlay ${showSidebar ? 'open' : ''}`} onClick={() => setShowSidebar(false)}>
                        <div className="stats-sidebar" onClick={e => e.stopPropagation()}>
                            <div className="sidebar-header">
                                <div>
                                    <div className="meta-tag">AUDIT LOG</div>
                                    <h2>TRANSACTIONS</h2>
                                </div>
                                <button className="close-btn" onClick={() => setShowSidebar(false)}>✕</button>
                            </div>
                            <div className="sidebar-content">
                                <div className="sidebar-log-table">
                                    {transactions.length === 0 ? (
                                        <div className="empty-sidebar" style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>NO TRANSACTIONS RECORDED</div>
                                    ) : (
                                        <table className="mini-ledger">
                                            <thead>
                                                <tr>
                                                    <th>TYPE</th>
                                                    <th>PLAYER</th>
                                                    <th>TEAM</th>
                                                    <th>PTS</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {transactions.map((t, index) => (
                                                    <tr key={t.id || index}>
                                                        <td><span className={`type-tag tag-${(t.type || 'unknown').toLowerCase()}`}>{(t.type || 'BID').toUpperCase()}</span></td>
                                                        <td className="bold">{t.player_name || 'SYSTEM'}</td>
                                                        <td className="dim">{t.team_name || 'N/A'}</td>
                                                        <td className={`highlight ${t.type === 'DEBIT' || t.type === 'BID' ? 'neg' : (t.type === 'CREDIT' ? 'pos' : '')}`}>
                                                            {t.type === 'CREDIT' ? '+' : (t.type === 'DEBIT' || t.type === 'BID' ? '-' : '')}{(t.amount || 0).toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* WALLET MANAGEMENT MODAL */}
                {walletModal.show && (
                    <div className="wallet-modal-overlay">
                        <div className="wallet-modal-content premium-horizontal">
                            <button className="close-btn-top" onClick={() => setWalletModal({ ...walletModal, show: false })}>✕</button>

                            <div className="modal-columns">
                                {/* LEFT COLUMN: IDENTITY & BALANCE */}
                                <div className="column-left gray-bg">
                                    <div className="meta-tag">FINANCE /// AUDIT</div>
                                    <h1 className="modal-title-small">{walletModal.team.name.toUpperCase()}</h1>

                                    <div className="balance-box">
                                        <span className="balance-label">CURRENT REMAINING</span>
                                        <div className="balance-main">
                                            <span className="balance-val-large">{(walletModal.team.remaining_budget || 0).toLocaleString()}</span>
                                            <span className="balance-unit">PTS</span>
                                        </div>
                                    </div>

                                    <div className="reset-zone">
                                        <button className="btn-text-reset" onClick={handleWalletReset}>
                                            ⚠ HARD RESET WALLET
                                        </button>
                                        <p className="reset-hint">Resets balance to 2k and clears roster.</p>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: TRANSACTION ACTION */}
                                <div className="column-right">
                                    <div className="action-set">
                                        <label className="input-label-premium">TRANSACTION TYPE</label>
                                        <div className="action-toggle-premium">
                                            <button
                                                className={`toggle-btn-p ${walletModal.action === 'add' ? 'active' : ''}`}
                                                onClick={() => setWalletModal({ ...walletModal, action: 'add' })}
                                            >
                                                CREDIT (+)
                                            </button>
                                            <button
                                                className={`toggle-btn-p ${walletModal.action === 'remove' ? 'active' : ''}`}
                                                onClick={() => setWalletModal({ ...walletModal, action: 'remove' })}
                                            >
                                                DEBIT (-)
                                            </button>
                                        </div>
                                    </div>

                                    <div className="form-group-premium">
                                        <label className="input-label-premium">AMOUNT TO {walletModal.action.toUpperCase()}</label>
                                        <div className="input-row-premium">
                                            <span className="currency-symbol">#</span>
                                            <input
                                                type="number"
                                                value={walletModal.amount}
                                                onChange={e => setWalletModal({ ...walletModal, amount: e.target.value })}
                                                placeholder="000"
                                                className="input-premium-styled"
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    <div className="action-footer">
                                        <button className="btn-execute-trans" onClick={handleWalletUpdate}>
                                            POST TRANSACTION →
                                        </button>
                                        <button className="btn-close-simple" onClick={() => setWalletModal({ ...walletModal, show: false })}>
                                            CANCEL
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return null;
}
