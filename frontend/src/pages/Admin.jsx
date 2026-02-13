import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { teamsAPI, playerAPI, adminAPI, auctionAPI } from '../services/api';
import './Admin.css';

export default function Admin() {
    const { user, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState({ pending: 0, teams: 0, players: 0 });
    const [allPlayers, setAllPlayers] = useState([]);
    const [allTeams, setAllTeams] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [isAuctionActive, setIsAuctionActive] = useState(false);
    const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);
    const [sportMinBids, setSportMinBids] = useState({ cricket: 50, futsal: 50, volleyball: 50 });
    const [animationDuration, setAnimationDuration] = useState(25);
    const [bidRules, setBidRules] = useState([
        { threshold: 0, increment: 10 },
        { threshold: 200, increment: 50 },
        { threshold: 500, increment: 100 }
    ]);
    const [message, setMessage] = useState('');

    // --- Modal States ---
    const [showUserModal, setShowUserModal] = useState(false);
    const [userData, setUserData] = useState({ name: '', email: '', role: 'viewer', password: '', team_id: '' });
    const [editingUser, setEditingUser] = useState(null);

    const [showTeamModal, setShowTeamModal] = useState(false);
    const [teamData, setTeamData] = useState({ name: '', sport: 'cricket', budget: 2000, logo: null });
    const [editingTeam, setEditingTeam] = useState(null);

    const [showPlayerModal, setShowPlayerModal] = useState(false);
    const [playerData, setPlayerData] = useState({ name: '', sport: 'Cricket', year: 'FE', base_price: 500, role: '', batting_style: 'Right Handed', bowling_style: 'None', photo: null });
    const [editingPlayer, setEditingPlayer] = useState(null);

    const [showMinBidModal, setShowMinBidModal] = useState(false);
    const [minBidData, setMinBidData] = useState({ sport: 'Cricket', value: 50 });


    useEffect(() => { if (!isAdmin) navigate('/'); }, [isAdmin, navigate]);

    const loadData = async () => {
        try {
            const [pRes, tRes, uRes, sRes, aRes] = await Promise.all([
                playerAPI.getAllPlayers(),
                teamsAPI.getAllTeams(),
                adminAPI.getAllUsers(),
                adminAPI.getStats(),
                auctionAPI.getAuctionState()
            ]);

            setAllPlayers(pRes.data.players);
            setAllTeams(tRes.data.teams);
            setAllUsers(uRes.data.users);
            setIsAuctionActive(aRes.data.isActive);
            setIsRegistrationOpen(aRes.data.isRegistrationOpen ?? true);
            setSportMinBids(aRes.data.sportMinBids || { cricket: 50, futsal: 50, volleyball: 50 });
            setAnimationDuration(aRes.data.animationDuration || 25);
            setBidRules(aRes.data.bidIncrementRules || bidRules);
            setStats({
                pending: pRes.data.players.filter(p => p.status === 'pending').length,
                players: pRes.data.players.length,
                teams: tRes.data.teams.length
            });
        } catch (err) { console.error(err); }
    };

    useEffect(() => { if (isAdmin) loadData(); }, [isAdmin]);

    // --- Global Controls ---
    const toggleAuction = async () => {
        if (!confirm(`Turn auction ${isAuctionActive ? 'OFF' : 'ON'}?`)) return;
        try {
            await auctionAPI.toggleAuctionState(!isAuctionActive);
            setIsAuctionActive(!isAuctionActive);
            setMessage(`Auction is now ${!isAuctionActive ? 'Active' : 'Inactive'}`);
        } catch (e) { console.error(e); }
    };

    const toggleRegistration = async () => {
        if (!confirm(`Turn registration ${isRegistrationOpen ? 'OFF' : 'ON'}?`)) return;
        try {
            await auctionAPI.toggleRegistrationState(!isRegistrationOpen);
            setIsRegistrationOpen(!isRegistrationOpen);
            setMessage(`Registration is now ${!isRegistrationOpen ? 'Open' : 'Closed'}`);
        } catch (e) { console.error(e); }
    };

    const resetAllBids = async () => {
        if (!confirm("RESET ALL BIDS for eligible players?")) return;
        try { await adminAPI.resetAllBids(); loadData(); setMessage("Bids reset."); } catch (e) { console.error(e); }
    };

    const openMinBidModal = () => {
        setMinBidData({ sport: 'Cricket', value: sportMinBids.cricket || 50 });
        setShowMinBidModal(true);
    };

    const handleMinBidUpdate = async (e) => {
        if (e) e.preventDefault();
        try {
            await adminAPI.bulkUpdateMinBid(minBidData.sport, minBidData.value);
            loadData();
            setShowMinBidModal(false);
            setMessage(`Min bid for ${minBidData.sport} updated to ${minBidData.value}.`);
        } catch (e) {
            console.error(e);
            alert("Failed to update min bids.");
        }
    };

    const handleSetAnimationDuration = async () => {
        try {
            await adminAPI.updateAnimationDuration(animationDuration);
            setMessage(`Sold overlay duration set to ${animationDuration}s`);
            loadData();
        } catch (e) {
            console.error(e);
            alert("Failed to update duration");
        }
    };

    const handleSaveBidRules = async () => {
        try {
            await adminAPI.updateBidRules(bidRules);
            setMessage("Bid increment rules updated.");
            loadData();
        } catch (e) {
            console.error(e);
            alert("Failed to save rules");
        }
    };

    const addBidRule = () => {
        setBidRules([...bidRules, { threshold: '', increment: '' }]);
    };

    const removeBidRule = (index) => {
        const newRules = bidRules.filter((_, i) => i !== index);
        setBidRules(newRules);
    };

    const updateBidRule = (index, field, value) => {
        const newRules = [...bidRules];
        newRules[index][field] = parseInt(value) || 0;
        setBidRules(newRules);
    };

    // --- Player Actions ---
    const handleApprove = async (id) => {
        if (!confirm("Approve player?")) return;
        try { await adminAPI.approvePlayer(id); loadData(); } catch (e) { console.error(e); }
    };

    const handleDeletePlayer = async (id) => {
        if (!confirm("Delete player?")) return;
        try { await adminAPI.deletePlayer(id); loadData(); } catch (e) { console.error(e); }
    };

    const handleQueue = async (id, action) => {
        try {
            if (action === 'add') await adminAPI.addToQueueById(id);
            else await adminAPI.removeFromQueue(id);
            loadData();
        } catch (e) { console.error(e); }
    };

    const handleResetBid = async (id) => {
        if (!confirm("Reset this player's bid to sport minimum?")) return;
        try {
            await adminAPI.resetPlayerBid(id);
            loadData();
            setMessage(`Bid Reset for ID #${id}`);
        } catch (e) { console.error(e); }
    };

    // --- User Actions ---
    const handleUserSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingUser) {
                const payload = { ...userData };
                if (!payload.password) delete payload.password;
                await adminAPI.updateUser(editingUser.id, payload);
            } else {
                await adminAPI.createUser(userData);
            }
            setShowUserModal(false);
            loadData();
        } catch (e) { console.error(e); alert("Failed to save user."); }
    };

    const handleDeleteUser = async (id) => {
        if (!confirm("Delete user?")) return;
        try { await adminAPI.deleteUser(id); loadData(); } catch (e) { console.error(e); }
    };

    const openUserModal = (user = null) => {
        setEditingUser(user);
        setUserData(user ? { ...user, password: '' } : { name: '', email: '', role: 'viewer', password: '', team_id: '' });
        setShowUserModal(true);
    };

    // --- Team Actions ---
    const handleTeamSubmit = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('name', teamData.name);
            formData.append('budget', teamData.budget);
            if (!editingTeam) formData.append('sport', teamData.sport);
            if (teamData.logo) formData.append('logo', teamData.logo);

            if (editingTeam) await adminAPI.updateTeam(editingTeam.id, formData);
            else await adminAPI.createTeam(formData);

            setShowTeamModal(false);
            loadData();
        } catch (e) { console.error(e); alert("Failed to save team."); }
    };

    const handleDeleteTeam = async (id) => {
        if (!confirm("Delete team?")) return;
        try { await adminAPI.deleteTeam(id); loadData(); } catch (e) { console.error(e); }
    };

    const openTeamModal = (team = null) => {
        setEditingTeam(team);
        setTeamData(team ? { ...team, logo: null } : { name: '', sport: 'Cricket', budget: 2000, logo: null });
        setShowTeamModal(true);
    };

    // --- Player Management ---
    const handlePlayerSubmit = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('name', playerData.name);
            formData.append('sport', playerData.sport);
            formData.append('year', playerData.year);
            formData.append('base_price', playerData.base_price);

            const stats = {
                role: playerData.role,
                batting_style: playerData.sport === 'Cricket' ? playerData.batting_style : null,
                bowling_style: playerData.sport === 'Cricket' ? playerData.bowling_style : null
            };
            formData.append('stats', JSON.stringify(stats));

            if (playerData.photo) formData.append('photo', playerData.photo);

            if (editingPlayer) await adminAPI.updatePlayer(editingPlayer.id, formData);
            else await adminAPI.createPlayer(formData);

            setShowPlayerModal(false);
            loadData();
        } catch (e) { console.error(e); alert("Failed to save player."); }
    };

    const openPlayerModal = (player = null) => {
        setEditingPlayer(player);
        if (player) {
            const stats = player.stats || {};
            setPlayerData({
                ...player,
                role: stats.role || '',
                batting_style: stats.batting_style || 'Right Handed',
                bowling_style: stats.bowling_style || 'None',
                photo: null
            });
        } else {
            setPlayerData({ name: '', sport: 'Cricket', year: 'FE', base_price: 500, role: '', batting_style: 'Right Handed', bowling_style: 'None', photo: null });
        }
        setShowPlayerModal(true);
    };

    const handleSportChangeForMinBid = (sport) => {
        const key = sport.toLowerCase();
        setMinBidData({ sport, value: sportMinBids[key] || 50 });
    };


    if (!isAdmin) return null;

    return (
        <div className="admin-page">
            <div className="admin-header">
                <div className="meta-tag">ADMINISTRATION DASHBOARD</div>
                <h1 className="page-title">LEAGUE CONTROL</h1>
                {message && <div className="admin-message">{message}</div>}
            </div>

            {/* TAB NAV */}
            <div className="admin-tabs">
                <button className={`admin-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>OVERVIEW</button>
                <button className={`admin-tab-btn ${activeTab === 'players' ? 'active' : ''}`} onClick={() => setActiveTab('players')}>PLAYERS</button>
                <button className={`admin-tab-btn ${activeTab === 'teams' ? 'active' : ''}`} onClick={() => setActiveTab('teams')}>TEAMS</button>
                <button className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>USERS</button>
            </div>

            {/* CONTENT */}
            <div className="admin-content">

                {/* DASHBOARD TAB */}
                {activeTab === 'dashboard' && (
                    <div className="dashboard-view">
                        <div className="kpi-grid">
                            <div className="kpi-card">
                                <span className="kpi-label">PENDING APPROVALS</span>
                                <span className="kpi-value highlight">{stats.pending}</span>
                            </div>
                            <div className="kpi-card">
                                <span className="kpi-label">TOTAL TEAMS</span>
                                <span className="kpi-value">{stats.teams}</span>
                            </div>
                            <div className="kpi-card">
                                <span className="kpi-label">TOTAL PLAYERS</span>
                                <span className="kpi-value">{stats.players}</span>
                            </div>
                        </div>

                        <div className="control-panel">
                            <h3>AUCTION SETTINGS</h3>
                            <div className="settings-section">
                                <div className="settings-card main-settings">
                                    <h4>Auction Controls & Settings</h4>
                                    <div className="settings-grid">
                                        <div className="setting-box duration-setting">
                                            <label>SOLD OVERLAY DURATION</label>
                                            <div className="input-group">
                                                <input
                                                    type="number"
                                                    value={animationDuration}
                                                    onChange={e => setAnimationDuration(e.target.value)}
                                                    className="editorial-input"
                                                />
                                                <span className="unit">SEC</span>
                                            </div>
                                            <button className="editorial-btn" onClick={handleSetAnimationDuration}>Set</button>
                                        </div>

                                        <div className="setting-box min-bid-setting">
                                            <label>MIN BIDS ({stats.players})</label>
                                            <div className="input-group">
                                                <select
                                                    value={minBidData.sport}
                                                    onChange={e => handleSportChangeForMinBid(e.target.value)}
                                                    className="editorial-input"
                                                >
                                                    <option value="Cricket">Cricket</option>
                                                    <option value="Futsal">Futsal</option>
                                                    <option value="Volleyball">Volleyball</option>
                                                </select>
                                                <input
                                                    type="number"
                                                    value={minBidData.value}
                                                    onChange={e => setMinBidData({ ...minBidData, value: e.target.value })}
                                                    className="editorial-input"
                                                />
                                            </div>
                                            <button className="editorial-btn" onClick={() => handleMinBidUpdate()}>Update</button>
                                        </div>

                                        <div className="setting-box action-buttons">
                                            <button className="editorial-btn orange-glow" onClick={() => adminAPI.bulkResetReleasedBids().then(() => loadData())}>Reset Unsold</button>
                                            <button className="editorial-btn red" onClick={resetAllBids}>GLOBAL RESET</button>
                                        </div>
                                    </div>
                                </div>

                                <div className="settings-card rules-settings">
                                    <h4>Bid Increment Rules</h4>
                                    <p className="hint">Configure how much the bid increases based on the current bid amount.</p>
                                    <table className="rules-table">
                                        <thead>
                                            <tr>
                                                <th>Threshold (Points)</th>
                                                <th>Increment (Points)</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bidRules.map((rule, idx) => (
                                                <tr key={idx}>
                                                    <td>
                                                        {idx === 0 ? (
                                                            <span className="base-label">0 (Base)</span>
                                                        ) : (
                                                            <input
                                                                type="number"
                                                                value={rule.threshold}
                                                                onChange={e => updateBidRule(idx, 'threshold', e.target.value)}
                                                                className="rule-input"
                                                            />
                                                        )}
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            value={rule.increment}
                                                            onChange={e => updateBidRule(idx, 'increment', e.target.value)}
                                                            className="rule-input"
                                                        />
                                                    </td>
                                                    <td>
                                                        {idx !== 0 && (
                                                            <button className="action-btn delete" onClick={() => removeBidRule(idx)}>Delete</button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div className="rules-actions">
                                        <button className="editorial-btn outline" onClick={addBidRule}>+ Add Rule</button>
                                        <button className="editorial-btn sage" onClick={handleSaveBidRules}>Save Rules</button>
                                    </div>
                                </div>
                            </div>

                            <h3>GLOBAL CONTROLS</h3>
                            <div className="control-row">
                                <div className="control-item">
                                    <span>AUCTION STATUS: <b className={isAuctionActive ? 'text-sage' : 'text-red'}>{isAuctionActive ? 'ONLINE' : 'OFFLINE'}</b></span>
                                    <button className="editorial-btn" onClick={toggleAuction}>TOGGLE</button>
                                </div>
                                <div className="control-item">
                                    <span>REGISTRATION: <b className={isRegistrationOpen ? 'text-sage' : 'text-red'}>{isRegistrationOpen ? 'OPEN' : 'CLOSED'}</b></span>
                                    <button className="editorial-btn" onClick={toggleRegistration}>TOGGLE</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* PLAYERS TAB */}
                {activeTab === 'players' && (
                    <div className="admin-tab-content">
                        <div className="tab-header">
                            <h3>PLAYER DIRECTORY</h3>
                            <button className="editorial-btn sage" onClick={() => openPlayerModal()}>+ CREATE PLAYER</button>
                        </div>
                        <div className="table-responsive">
                            <table className="editorial-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>NAME</th>
                                        <th>YEAR</th>
                                        <th>SPORT</th>
                                        <th>STATUS</th>
                                        <th>ACTION</th>
                                        <th>AUCTION</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allPlayers.map(p => (
                                        <tr key={p.id}>
                                            <td className="mono">#{p.id}</td>
                                            <td className="bold">{p.name}</td>
                                            <td>{p.year}</td>
                                            <td>{p.sport}</td>
                                            <td><span className={`status-badge ${p.status}`}>{p.status.toUpperCase()}</span></td>
                                            <td>
                                                <div className="action-row">
                                                    <button className="action-btn" onClick={() => openPlayerModal(p)}>EDIT</button>
                                                    <button className="action-btn delete" onClick={() => handleDeletePlayer(p.id)}>DELETE</button>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="action-row">
                                                    {(p.status === 'approved' || p.status === 'eligible') && (
                                                        <button
                                                            className={`action-btn ${p.status === 'eligible' ? 'unsold' : 'approve'}`}
                                                            onClick={() => handleQueue(p.id, p.status === 'eligible' ? 'remove' : 'add')}
                                                        >
                                                            {p.status === 'eligible' ? '− QUEUE' : '+ QUEUE'}
                                                        </button>
                                                    )}
                                                    <button
                                                        className="action-btn reset"
                                                        onClick={() => handleResetBid(p.id)}
                                                        disabled={p.status === 'sold'}
                                                        title={p.status === 'sold' ? "Cannot reset sold player" : "Reset to Sport Min"}
                                                    >
                                                        RESET
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TEAMS TAB */}
                {activeTab === 'teams' && (
                    <div>
                        <div className="section-actions">
                            <button className="editorial-btn" onClick={() => openTeamModal()}>+ NEW TEAM</button>
                        </div>
                        <div className="table-responsive">
                            <table className="editorial-table">
                                <thead>
                                    <tr>
                                        <th>NAME</th>
                                        <th>SPORT</th>
                                        <th>BUDGET</th>
                                        <th>ACTION</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allTeams.map(t => (
                                        <tr key={t.id}>
                                            <td className="bold">{t.name}</td>
                                            <td>{t.sport.toUpperCase()}</td>
                                            <td>{t.remaining_budget} / {t.budget}</td>
                                            <td>
                                                <div className="action-row">
                                                    <button className="action-btn" onClick={() => openTeamModal(t)}>EDIT</button>
                                                    <button className="action-btn delete" onClick={() => handleDeleteTeam(t.id)}>DELETE</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* USERS TAB */}
                {activeTab === 'users' && (
                    <div>
                        <div className="section-actions">
                            <button className="editorial-btn" onClick={() => openUserModal()}>+ NEW USER</button>
                        </div>
                        <div className="table-responsive">
                            <table className="editorial-table">
                                <thead>
                                    <tr>
                                        <th>NAME</th>
                                        <th>EMAIL</th>
                                        <th>ROLE</th>
                                        <th>TEAM</th>
                                        <th>ACTION</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allUsers.map(u => (
                                        <tr key={u.id}>
                                            <td className="bold">{u.name}</td>
                                            <td>{u.email}</td>
                                            <td>{u.role.toUpperCase()}</td>
                                            <td>{allTeams.find(t => t.id === u.team_id)?.name || '-'}</td>
                                            <td>
                                                <div className="action-row">
                                                    <button className="action-btn" onClick={() => openUserModal(u)}>EDIT</button>
                                                    <button className="action-btn delete" onClick={() => handleDeleteUser(u.id)}>DELETE</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* MODALS */}
            {showUserModal && (
                <div className="modal-overlay">
                    <div className="editorial-modal">
                        <h2>{editingUser ? 'EDIT USER' : 'NEW USER'}</h2>
                        <form onSubmit={handleUserSubmit}>
                            <input className="editorial-input" placeholder="Name" value={userData.name} onChange={e => setUserData({ ...userData, name: e.target.value })} required />
                            <input className="editorial-input" placeholder="Email" value={userData.email} onChange={e => setUserData({ ...userData, email: e.target.value })} required />
                            <input className="editorial-input" placeholder="Password (leave empty to keep)" value={userData.password} onChange={e => setUserData({ ...userData, password: e.target.value })} />
                            <select className="editorial-input" value={userData.role} onChange={e => setUserData({ ...userData, role: e.target.value })}>
                                <option value="viewer">Viewer</option>
                                <option value="participant">Participant</option>
                                <option value="team_owner">Team Owner</option>
                                <option value="admin">Admin</option>
                            </select>
                            {userData.role === 'team_owner' && (
                                <select className="editorial-input" value={userData.team_id} onChange={e => setUserData({ ...userData, team_id: e.target.value })}>
                                    <option value="">No Team</option>
                                    {allTeams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.sport})</option>)}
                                </select>
                            )}
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowUserModal(false)} className="editorial-btn cancel">CANCEL</button>
                                <button type="submit" className="editorial-btn">SAVE</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showTeamModal && (
                <div className="modal-overlay">
                    <div className="editorial-modal">
                        <h2>{editingTeam ? 'EDIT TEAM' : 'NEW TEAM'}</h2>
                        <form onSubmit={handleTeamSubmit}>
                            <input className="editorial-input" placeholder="Team Name" value={teamData.name} onChange={e => setTeamData({ ...teamData, name: e.target.value })} required />
                            {!editingTeam && (
                                <select className="editorial-input" value={teamData.sport} onChange={e => setTeamData({ ...teamData, sport: e.target.value })}>
                                    <option value="cricket">Cricket</option>
                                    <option value="futsal">Futsal</option>
                                    <option value="volleyball">Volleyball</option>
                                </select>
                            )}
                            <input className="editorial-input" type="number" placeholder="Budget" value={teamData.budget} onChange={e => setTeamData({ ...teamData, budget: e.target.value })} />

                            <div className="modal-form-group">
                                <label>TEAM LOGO</label>
                                <div className="file-input-wrapper">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => setTeamData({ ...teamData, logo: e.target.files[0] })}
                                        className="file-input-custom"
                                    />
                                </div>
                                {(teamData.logo || editingTeam?.logo_url) && (
                                    <div className="upload-preview-container">
                                        <img
                                            src={teamData.logo ? URL.createObjectURL(teamData.logo) : editingTeam.logo_url}
                                            alt="Preview"
                                            className="circular"
                                        />
                                        <span className="meta-tag" style={{ margin: 0 }}>LOGO PREVIEW</span>
                                    </div>
                                )}
                            </div>

                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowTeamModal(false)} className="editorial-btn cancel">CANCEL</button>
                                <button type="submit" className="editorial-btn">SAVE</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showPlayerModal && (
                <div className="modal-overlay">
                    <div className="editorial-modal">
                        <h2>{editingPlayer ? 'EDIT PLAYER' : 'NEW PLAYER'}</h2>
                        <form onSubmit={handlePlayerSubmit}>
                            <input className="editorial-input" placeholder="Name" value={playerData.name} onChange={e => setPlayerData({ ...playerData, name: e.target.value })} required />

                            <div className="modal-row">
                                <select className="editorial-input" value={playerData.sport} onChange={e => setPlayerData({ ...playerData, sport: e.target.value })}>
                                    <option value="Cricket">Cricket</option>
                                    <option value="Futsal">Futsal</option>
                                    <option value="Volleyball">Volleyball</option>
                                </select>
                                <select className="editorial-input" value={playerData.year} onChange={e => setPlayerData({ ...playerData, year: e.target.value })}>
                                    <option value="FE">FE</option>
                                    <option value="SE">SE</option>
                                    <option value="TE">TE</option>
                                </select>
                            </div>

                            <input className="editorial-input" type="number" placeholder="Base Price" value={playerData.base_price} onChange={e => setPlayerData({ ...playerData, base_price: e.target.value })} />

                            <div className="modal-form-group">
                                <label>PLAYER PHOTO</label>
                                <div className="file-input-wrapper">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => setPlayerData({ ...playerData, photo: e.target.files[0] })}
                                        className="file-input-custom"
                                    />
                                </div>
                                {(playerData.photo || editingPlayer?.photo_url) && (
                                    <div className="upload-preview-container">
                                        <img
                                            src={playerData.photo ? URL.createObjectURL(playerData.photo) : editingPlayer.photo_url}
                                            alt="Preview"
                                        />
                                        <span className="meta-tag" style={{ margin: 0 }}>PHOTO PREVIEW</span>
                                    </div>
                                )}
                            </div>

                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowPlayerModal(false)} className="editorial-btn cancel">CANCEL</button>
                                <button type="submit" className="editorial-btn">SAVE</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showMinBidModal && (
                <div className="modal-overlay">
                    <div className="editorial-modal">
                        <h2>UPDATE MINIMUM BIDS</h2>
                        <form onSubmit={handleMinBidUpdate}>
                            <div className="modal-form-group">
                                <label>SELECT SPORT</label>
                                <select
                                    className="editorial-input"
                                    value={minBidData.sport}
                                    onChange={e => handleSportChangeForMinBid(e.target.value)}
                                >
                                    <option value="Cricket">CRICKET</option>
                                    <option value="Futsal">FUTSAL</option>
                                    <option value="Volleyball">VOLLEYBALL</option>
                                </select>
                            </div>

                            <div className="modal-form-group">
                                <label>MINIMUM BID AMOUNT</label>
                                <div className="input-with-hint">
                                    <input
                                        className="editorial-input"
                                        type="number"
                                        value={minBidData.value}
                                        onChange={e => setMinBidData({ ...minBidData, value: e.target.value })}
                                        required
                                    />
                                    <span className="input-hint">CURRENT: {sportMinBids[minBidData.sport.toLowerCase()] || 0}</span>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowMinBidModal(false)} className="editorial-btn cancel">CANCEL</button>
                                <button type="submit" className="editorial-btn">APPLY TO ALL</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
