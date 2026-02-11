import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { teamsAPI, playerAPI, auctionAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import './AuctionStats.css';

export default function AuctionStats() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Data State
    const [teams, setTeams] = useState([]);
    const [players, setPlayers] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [myTeam, setMyTeam] = useState(null);

    // UI State
    const [activeSport, setActiveSport] = useState('Cricket'); // Default filter
    const [showSidebar, setShowSidebar] = useState(false);

    useEffect(() => { if (!user) navigate('/login'); }, [user, navigate]);

    const fetchData = async () => {
        try {
            // If Owner, fetch ALL teams to find their specific one, else filter by activeSport
            const teamsFilter = user.role === 'team_owner' ? '' : activeSport.toLowerCase();

            const [teamsRes, playersRes, transRes] = await Promise.all([
                teamsAPI.getAllTeams(teamsFilter),
                playerAPI.getAllPlayers(),
                auctionAPI.getTransactions()
            ]);
            setTeams(teamsRes.data.teams);
            setPlayers(playersRes.data.players);
            setTransactions(transRes.data.transactions || []);

            // If Owner, find their specific team using team_id
            if (user?.role === 'team_owner' && user?.team_id) {
                const foundTeam = teamsRes.data.teams.find(t => t.id == user.team_id);
                setMyTeam(foundTeam);
            }
        } catch (err) { console.error("Stats Load Failed", err); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (user) fetchData(); }, [user]);

    // Actions
    const handleRelease = async (player) => {
        if (!window.confirm(`Release ${player.name}? WARNING: Points will NOT be refunded.`)) return;
        try {
            await auctionAPI.markPlayerUnsold(player.id);
            fetchData();
        } catch (err) { alert("Failed to release."); console.error(err); }
    };

    // --- WALLET MODAL ---
    const [walletModal, setWalletModal] = useState({ show: false, team: null, action: 'add', amount: '' });

    const handleWalletUpdate = async () => {
        if (!walletModal.amount || isNaN(walletModal.amount)) return alert("Enter valid amount");
        try {
            await adminAPI.adjustTeamWallet(walletModal.team.id, walletModal.action, walletModal.amount);
            setWalletModal({ ...walletModal, show: false, amount: '' });
            fetchData();
        } catch (err) { alert("Adjustment failed"); }
    };

    const handleWalletReset = async () => {
        if (!window.confirm("RESET WALLET? This will unsell all players and reset balance to default.")) return;
        try {
            await adminAPI.resetTeamWallet(walletModal.team.id);
            setWalletModal({ ...walletModal, show: false });
            fetchData();
        } catch (err) { alert("Reset failed"); }
    };

    if (!user) return null;
    if (loading) return <div className="stats-loading">LOADING DATA...</div>;

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
                </div>

                {/* KPI GRID (Restored for Owner) */}
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

                {/* MY ROSTER TABLE */}
                <div className="ledger-container">
                    <div className="ledger-title">CURRENT HOLDINGS</div>
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
                                        <th>ACQUISITION COST</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {myPlayers.map(p => (
                                        <tr key={p.id}>
                                            <td className="bold">{p.name}</td>
                                            <td>{p.sport}</td>
                                            <td className="mono">{p.year} MBBS</td>
                                            <td className="mono highlight">{p.sold_price?.toLocaleString() || 0}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
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
                        <div className="meta-tag">ADMINISTRATION /// {activeSport.toUpperCase()}</div>
                        <h1 className="page-title">TEAMS & ROSTERS</h1>
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
                            VIEW TRANSACTION LOGS →
                        </button>
                    </div>
                </div>

                <div className="teams-grid-main">
                    {teamsWithRosters.length === 0 ? (
                        <div className="empty-ledger">NO TEAMS FOUND FOR {activeSport}</div>
                    ) : (
                        <div className="teams-report-grid">
                            {teamsWithRosters.map(team => (
                                <div key={team.id} className="team-report-card">
                                    <div className="card-header">
                                        <div className="team-info">
                                            <span className="team-name">{team.name}</span>
                                            <button
                                                className="btn-manage-wallet"
                                                onClick={() => setWalletModal({ show: true, team, action: 'add', amount: '' })}
                                            >
                                                MANAGE WALLET
                                            </button>
                                        </div>
                                        <div className="team-budget">
                                            <div className="budget-val">{(team.remaining_budget || 0).toLocaleString()} PTS</div>
                                            <div className="budget-label">REMAINING</div>
                                        </div>
                                    </div>
                                    <div className="card-roster">
                                        <div className="roster-header">PLAYER ROSTER ({team.roster.length})</div>
                                        {team.roster.length === 0 ? (
                                            <div className="roster-empty">NO PLAYERS ACQUIRED</div>
                                        ) : (
                                            <div className="roster-list">
                                                {team.roster.map(p => (
                                                    <div key={p.id} className="roster-row">
                                                        <div className="player-meta">
                                                            <span className="p-name">{p.name} <span className="p-year">({p.year} MBBS)</span></span>
                                                            <span className="p-price">#{p.sold_price?.toLocaleString()}</span>
                                                        </div>
                                                        <button
                                                            className="btn-release-inline"
                                                            onClick={() => handleRelease(p)}
                                                            title="Release Player (No Refund)"
                                                        >
                                                            RELEASE
                                                        </button>
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

                {/* TRANSACTION LOG SIDEBAR removed for brevity here but should be maintained in actual file */}
                <div className={`stats-sidebar-overlay ${showSidebar ? 'open' : ''}`} onClick={() => setShowSidebar(false)}>
                    <div className="stats-sidebar log-sidebar" onClick={e => e.stopPropagation()}>
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
                                    <div className="empty-sidebar">NO TRANSACTIONS RECORDED</div>
                                ) : (
                                    <table className="mini-ledger">
                                        <thead>
                                            <tr>
                                                <th>TYPE</th>
                                                <th>ACTOR</th>
                                                <th>TEAM</th>
                                                <th>PTS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactions.map(t => (
                                                <tr key={t.id}>
                                                    <td className={`type-tag tag-${t.type}`}>{t.type.toUpperCase()}</td>
                                                    <td className="bold">{t.player_name || 'SYSTEM'}</td>
                                                    <td className="dim">{t.team_name || 'N/A'}</td>
                                                    <td className={`highlight ${t.amount < 0 ? 'neg' : ''}`}>
                                                        {t.amount > 0 ? '+' : ''}{t.amount?.toLocaleString()}
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
