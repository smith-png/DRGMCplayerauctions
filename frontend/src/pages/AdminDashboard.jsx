import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI, playerAPI, auctionAPI } from '../services/api';
// import socketService from '../services/socket';
import './AdminDashboard.css';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [players, setPlayers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [newTeam, setNewTeam] = useState({ name: '', sport: 'cricket', budget: 100000, logo: null });
    const [isAuctionActive, setIsAuctionActive] = useState(false);
    const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [bulkSport, setBulkSport] = useState('cricket');
    const [bulkMinBid, setBulkMinBid] = useState(50);
    const [sportMinBids, setSportMinBids] = useState({ cricket: 50, futsal: 50, volleyball: 50 });
    const [animationDuration, setAnimationDuration] = useState(25);

    // User Modal State
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [userData, setUserData] = useState({ name: '', email: '', password: '', role: 'viewer' });

    useEffect(() => {
        setCurrentPage(1); // Reset page on tab change
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'overview') {
                const response = await adminAPI.getStats();
                setStats(response.data.stats);
                const stateResponse = await auctionAPI.getAuctionState();
                setIsAuctionActive(stateResponse.data.isActive);
                setIsRegistrationOpen(stateResponse.data.isRegistrationOpen ?? true);
                setSportMinBids(stateResponse.data.sportMinBids || { cricket: 50, futsal: 50, volleyball: 50 });
                setAnimationDuration(stateResponse.data.animationDuration || 25);
            } else if (activeTab === 'users') {
                try {
                    const usersRes = await adminAPI.getAllUsers();
                    setUsers(usersRes.data.users);
                } catch (e) {
                    console.error("Failed to fetch users:", e);
                }

                try {
                    const playersRes = await playerAPI.getAllPlayers();
                    setPlayers(playersRes.data.players);
                } catch (e) {
                    console.error("Failed to fetch players:", e);
                }

                try {
                    const teamsRes = await adminAPI.getAllTeams();
                    setTeams(teamsRes.data.teams);
                } catch (e) {
                    console.error("Failed to fetch teams:", e);
                }

            } else if (activeTab === 'players') {
                const response = await playerAPI.getAllPlayers();
                setPlayers(response.data.players);
            } else if (activeTab === 'teams') {
                const response = await adminAPI.getAllTeams();
                setTeams(response.data.teams);
            }
        } catch (err) {
            console.error('Failed to load data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateRole = async (userId, newRole) => {
        try {
            await adminAPI.updateUserRole(userId, newRole);
            setMessage('User role updated successfully');
            loadData();
        } catch (err) {
            setMessage('Failed to update user role');
        }
    };

    const handleApprovePlayer = async (playerId) => {
        try {
            await playerAPI.approvePlayer(playerId);
            setMessage('Player approved successfully');
            loadData();
        } catch (err) {
            setMessage('Failed to approve player');
        }
    };

    const handleAddToQueue = async (playerId) => {
        try {
            await playerAPI.markEligible(playerId);
            setMessage('Player added to auction queue');
            loadData();
        } catch (err) {
            setMessage('Failed to add player to queue');
        }
    };

    const handleCreateTeam = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('name', newTeam.name);
            formData.append('sport', newTeam.sport);
            formData.append('budget', newTeam.budget);
            if (newTeam.logo) {
                formData.append('logo', newTeam.logo);
            }

            await adminAPI.createTeam(formData);
            setMessage('Team created successfully');
            setNewTeam({ name: '', sport: 'cricket', budget: 100000, logo: null });
            if (activeTab === 'teams') loadData();
        } catch (err) {
            setMessage('Failed to create team');
            console.error(err);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            await adminAPI.deleteUser(userId);
            setMessage('User deleted successfully');
            loadData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeletePlayer = async (playerId) => {
        if (!confirm('Are you sure you want to delete this player? This action cannot be undone.')) return;
        try {
            await playerAPI.deletePlayer(playerId);
            setMessage('Player deleted successfully');
            loadData();
        } catch (err) {
            setMessage('Failed to delete player');
            console.error(err);
        }
    };

    const handleDeleteTeam = async (teamId) => {
        if (!confirm('Are you sure you want to delete this team? This action cannot be undone.')) return;
        try {
            await adminAPI.deleteTeam(teamId);
            setMessage('Team deleted successfully');
            loadData();
        } catch (err) {
            setMessage('Failed to delete team');
            console.error(err);
        }
    };

    const handleToggleAuction = async () => {
        try {
            const newState = !isAuctionActive;
            await auctionAPI.toggleAuctionState(newState);
            setIsAuctionActive(newState);
            setMessage(`Auction is now ${newState ? 'Active' : 'Inactive'}`);
        } catch (err) {
            setMessage('Failed to update auction state');
            console.error(err);
        }
    };

    const handleToggleRegistration = async () => {
        try {
            const newState = !isRegistrationOpen;
            await auctionAPI.toggleRegistrationState(newState);
            setIsRegistrationOpen(newState);
            setMessage(`Registration is now ${newState ? 'Open' : 'Closed'}`);
        } catch (err) {
            setMessage('Failed to update registration state');
            console.error(err);
        }
    };

    const handleBulkMinBidUpdate = async () => {
        try {
            const response = await adminAPI.bulkUpdateMinBid(bulkSport, bulkMinBid);
            setSportMinBids(response.data.sportMinBids);
            setMessage(`Updated ${bulkSport} minimum bid to ${bulkMinBid}`);
        } catch (err) {
            console.error(err);
            setMessage('Failed to update minimum bid');
        }
    };

    const handleBulkResetReleased = async () => {
        if (!confirm('Reset all released players to "Approved" and clear their bid history?')) return;
        try {
            await adminAPI.bulkResetReleasedBids();
            setMessage('Successfully reset all released players');
            loadData();
        } catch (err) {
            console.error(err);
            setMessage('Failed to reset players');
        }
    };

    const handleUpdateAnimationDuration = async () => {
        try {
            await adminAPI.updateAnimationDuration(parseInt(animationDuration));
            setMessage(`Animation duration updated to ${animationDuration}s`);
        } catch (err) {
            console.error(err);
            setMessage('Failed to update animation duration');
        }
    };

    // User Management Handlers
    const handleOpenUserModal = (user = null) => {
        if (user) {
            setEditingUser(user);
            setUserData({ name: user.name, email: user.email, role: user.role, password: '', team_id: user.team_id || '' });
        } else {
            setEditingUser(null);
            setUserData({ name: '', email: '', password: '', role: 'viewer', team_id: '' });
        }
        setShowUserModal(true);
    };

    const handleCloseUserModal = () => {
        setShowUserModal(false);
        setEditingUser(null);
        setUserData({ name: '', email: '', password: '', role: 'viewer', team_id: '' });
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        try {
            if (editingUser) {
                // Update
                const dataToSend = { ...userData };
                if (!dataToSend.password) delete dataToSend.password; // Don't send empty password
                await adminAPI.updateUser(editingUser.id, dataToSend);
                setMessage('User updated successfully');
            } else {
                // Create
                await adminAPI.createUser(userData);
                setMessage('User created successfully');
            }
            handleCloseUserModal();
            loadData();
        } catch (err) {
            console.error(err);
            setMessage(err.response?.data?.error || 'Failed to save user');
        }
    };

    // --- Team Extensions ---
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [editingTeam, setEditingTeam] = useState(null);
    const [teamForm, setTeamForm] = useState({ name: '', sport: 'cricket', budget: 100000, logo: null });

    // --- Player Extensions ---
    const [showPlayerModal, setShowPlayerModal] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState(null);
    const [playerForm, setPlayerForm] = useState({ name: '', sport: 'cricket', year: '1st', stats: '', base_price: 50, photo: null });
    const [queuePlayerId, setQueuePlayerId] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [overviewPage, setOverviewPage] = useState(1);
    const itemsPerPage = 10;

    const handleQueueById = async (e) => {
        e.preventDefault();
        try {
            await adminAPI.addToQueueById(queuePlayerId);
            setMessage(`Player #${queuePlayerId} added to queue`);
            setQueuePlayerId('');
            loadData();
        } catch (err) {
            setMessage(err.response?.data?.error || 'Failed to add to queue');
        }
    };

    // Helper for pagination
    const getPaginatedData = (data, page = currentPage) => {
        const startIndex = (page - 1) * itemsPerPage;
        return data.slice(startIndex, startIndex + itemsPerPage);
    };

    const totalPages = (data) => Math.ceil(data.length / itemsPerPage);


    const handleOpenTeamModal = (team = null) => {
        if (team) {
            setEditingTeam(team);
            setTeamForm({ name: team.name, sport: team.sport, budget: team.budget, logo: null }); // Don't preload file
        } else {
            setEditingTeam(null);
            setTeamForm({ name: '', sport: 'cricket', budget: 100000, logo: null });
        }
        setShowTeamModal(true);
    };

    const handleSaveTeamExtended = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('name', teamForm.name);
            formData.append('budget', teamForm.budget);
            if (!editingTeam) formData.append('sport', teamForm.sport); // Sport usually fixed on creation or editable? API allows updates.
            if (teamForm.logo) formData.append('logo', teamForm.logo);

            if (editingTeam) {
                await adminAPI.updateTeam(editingTeam.id, formData);
                setMessage('Team updated successfully');
            } else {
                await adminAPI.createTeam(formData);
                setMessage('Team created successfully');
            }
            setShowTeamModal(false);
            if (activeTab === 'teams') loadData();
        } catch (err) {
            console.error(err);
            setMessage('Failed to save team');
        }
    };

    const handleOpenPlayerModal = (player = null) => {
        if (player) {
            setEditingPlayer(player);
            // safe safely parse stats
            let statsStr = '';
            try { statsStr = JSON.stringify(player.stats || {}); } catch (e) { }

            setPlayerForm({
                name: player.name,
                sport: player.sport,
                year: player.year,
                stats: statsStr,
                base_price: player.base_price,
                photo: null
            });
        } else {
            setEditingPlayer(null);
            setPlayerForm({ name: '', sport: 'cricket', year: '1st', stats: '', base_price: 50, photo: null });
        }
        setShowPlayerModal(true);
    }

    const handleSavePlayerExtended = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('name', playerForm.name);
            formData.append('sport', playerForm.sport);
            formData.append('year', playerForm.year);
            formData.append('base_price', playerForm.base_price);
            formData.append('stats', playerForm.stats); // API parses this string
            if (playerForm.photo) formData.append('photo', playerForm.photo);

            if (editingPlayer) {
                await adminAPI.updatePlayer(editingPlayer.id, formData);
                setMessage('Player updated successfully');
            } else {
                await adminAPI.createPlayer(formData);
                setMessage('Player created successfully');
            }
            setShowPlayerModal(false);
            if (activeTab === 'players' || activeTab === 'users') loadData();
        } catch (err) {
            console.error(err);
            setMessage('Failed to save player');
        }
    }

    const handleRemoveFromQueue = async (id) => {
        if (!confirm('Remove this player from the auction queue?')) return;
        try {
            await adminAPI.removeFromQueue(id);
            setMessage('Player removed from queue');
            loadData();
        } catch (err) {
            console.error(err);
            setMessage('Failed to remove player from queue');
        }
    }

    const handleReApprove = async (id) => {
        if (!confirm('Re-approve this unsold player for auction?')) return;
        try {
            // Re-using removeFromQueue endpoint which sets status to 'approved'
            await adminAPI.removeFromQueue(id);
            setMessage('Player re-approved successfully');
            loadData();
        } catch (err) {
            console.error(err);
            setMessage('Failed to re-approve player');
        }
    }

    // Derived state for filtered players
    const pendingPlayers = players.filter(p => p.status === 'pending');
    const approvedPlayers = players.filter(p => p.status === 'approved' || p.status === 'eligible');
    const activePlayers = players.filter(p => p.status !== 'pending');

    return (
        <div className="admin-page">
            <div className="container">
                <div className="admin-header">
                    <h1>Admin Dashboard</h1>
                    <p>Manage users, players, teams, and auctions</p>
                </div>

                {message && (
                    <div className="alert alert-info">
                        {message}
                        <button onClick={() => setMessage('')} className="alert-close">×</button>
                    </div>
                )}

                <div className="admin-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        Overview
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        Users & Registrations
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'players' ? 'active' : ''}`}
                        onClick={() => setActiveTab('players')}
                    >
                        Active Players
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'teams' ? 'active' : ''}`}
                        onClick={() => setActiveTab('teams')}
                    >
                        Teams
                    </button>
                    <button
                        className="tab-btn testgrounds-tab"
                        onClick={() => navigate('/testgrounds')}
                    >
                        ⚗️ Testgrounds
                    </button>
                </div>

                <div className="admin-content">
                    {loading ? (
                        <div className="spinner"></div>
                    ) : (
                        <>
                            {activeTab === 'overview' && stats && (
                                <div className="overview-grid grid grid-4">
                                    <div className="card overview-controls full-width mb-4" style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div>
                                            <h3>Auction Master Control</h3>
                                            <p className="text-secondary">Enable or disable the live auction page for all users.</p>
                                        </div>
                                        <div className="toggle-switch-container">
                                            <label className="toggle-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={isAuctionActive}
                                                    onChange={handleToggleAuction}
                                                />
                                                <span className="slider round"></span>
                                            </label>
                                            <span className="toggle-label ml-2 font-bold">
                                                {isAuctionActive ? <span className="text-success">Active</span> : <span className="text-danger">Inactive</span>}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="card overview-controls full-width mb-4" style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div>
                                            <h3>Registration Status</h3>
                                            <p className="text-secondary">Enable or disable new user registrations. Users will be directed to live auction when disabled.</p>
                                        </div>
                                        <div className="toggle-switch-container">
                                            <label className="toggle-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={isRegistrationOpen}
                                                    onChange={handleToggleRegistration}
                                                />
                                                <span className="slider round"></span>
                                            </label>
                                            <span className="toggle-label ml-2 font-bold">
                                                {isRegistrationOpen ? <span className="text-success">Open</span> : <span className="text-danger">Closed</span>}
                                            </span>
                                        </div>
                                    </div>



                                    <div className="stat-card card">
                                        <div className="stat-icon icon-users">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                        </div>
                                        <div className="stat-info">
                                            <div className="stat-label">Total Users</div>
                                            <div className="stat-number">{stats.totalUsers}</div>
                                        </div>
                                    </div>
                                    <div className="stat-card card">
                                        <div className="stat-icon icon-players">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                        </div>
                                        <div className="stat-info">
                                            <div className="stat-label">Total Players</div>
                                            <div className="stat-number">
                                                {Object.values(stats.players || {}).reduce((a, b) => a + b, 0)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="stat-card card">
                                        <div className="stat-icon icon-teams">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                        </div>
                                        <div className="stat-info">
                                            <div className="stat-label">Total Teams</div>
                                            <div className="stat-number">{stats.totalTeams}</div>
                                        </div>
                                    </div>
                                    <div className="stat-card card">
                                        <div className="stat-icon icon-bids">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                                        </div>
                                        <div className="stat-info">
                                            <div className="stat-label">Total Bids</div>
                                            <div className="stat-number">{stats.totalBids}</div>
                                        </div>
                                    </div>

                                    {stats.players && (
                                        <div className="player-status-card card">
                                            <h3>Player Status</h3>
                                            <div className="status-list">
                                                <div className="status-item">
                                                    <span className="badge badge-warning">Pending</span>
                                                    <span>{stats.players.pending || 0}</span>
                                                </div>
                                                <div className="status-item">
                                                    <span className="badge badge-success">Approved</span>
                                                    <span>{stats.players.approved || 0}</span>
                                                </div>
                                                <div className="status-item">
                                                    <span className="badge badge-primary">Sold</span>
                                                    <span>{stats.players.sold || 0}</span>
                                                </div>
                                                <div className="status-item">
                                                    <span className="badge badge-secondary">Unsold</span>
                                                    <span>{stats.players.unsold || 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Bulk Operations Section */}
                                    {/* Compact Auction Controls Section */}
                                    <div className="card mt-4" style={{ gridColumn: '1 / -1', padding: '1rem' }}>
                                        <h3 className="mb-3" style={{ fontSize: '1.1rem' }}>Auction Controls & Settings</h3>
                                        <div className="auction-controls-grid">
                                            {/* Animation Duration */}
                                            <div className="control-item">
                                                <label className="text-xs font-bold text-secondary uppercase mb-1 block">Animation Duration</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="number"
                                                        className="input input-sm"
                                                        value={animationDuration}
                                                        onChange={(e) => setAnimationDuration(e.target.value)}
                                                        style={{ width: '60px' }}
                                                        min="5"
                                                        max="60"
                                                    />
                                                    <button onClick={handleUpdateAnimationDuration} className="btn btn-sm btn-primary">Set</button>
                                                </div>
                                            </div>

                                            {/* Min Bid Control */}
                                            <div className="control-item">
                                                <label className="text-xs font-bold text-secondary uppercase mb-1 block">Min Bids ({sportMinBids[bulkSport] || 50})</label>
                                                <div className="flex gap-2 items-center">
                                                    <select
                                                        className="input input-sm"
                                                        value={bulkSport}
                                                        onChange={(e) => {
                                                            setBulkSport(e.target.value);
                                                            setBulkMinBid(sportMinBids[e.target.value] || 50);
                                                        }}
                                                        style={{ width: 'auto' }}
                                                    >
                                                        <option value="cricket">Cricket</option>
                                                        <option value="futsal">Futsal</option>
                                                        <option value="volleyball">Volley</option>
                                                    </select>
                                                    <input
                                                        type="number"
                                                        className="input input-sm"
                                                        value={bulkMinBid}
                                                        onChange={(e) => setBulkMinBid(e.target.value)}
                                                        style={{ width: '60px' }}
                                                    />
                                                    <button
                                                        onClick={handleBulkMinBidUpdate}
                                                        className="btn btn-sm btn-primary"
                                                    >
                                                        Update
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Reset Released Control */}
                                            <div className="control-item flex items-end gap-2">
                                                <button
                                                    onClick={handleBulkResetReleased}
                                                    className="btn btn-sm btn-warning"
                                                    title="Moves 'Unsold' players back to 'Approved' and resets history"
                                                >
                                                    Reset Unsold
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (!confirm('DANGER: RESET ALL WALLETS? This will unsold ALL players, clear ALL bids, and set ALL team budgets to 2000. This cannot be undone.')) return;
                                                        try {
                                                            await adminAPI.resetAllWallets();
                                                            setMessage('GLOBAL RESET SUCCESSFUL');
                                                            loadData();
                                                        } catch (e) {
                                                            console.error(e);
                                                            setMessage('Global reset failed');
                                                        }
                                                    }}
                                                    className="btn btn-sm btn-danger"
                                                    title="Reset ALL teams to 2000 budget and clear all sales"
                                                >
                                                    GLOBAL RESET
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'users' && (
                                <div className="users-section">
                                    {/* Section 1: Pending Players */}
                                    <div className="section-block">
                                        <h3>Pending Approvals</h3>
                                        {pendingPlayers.length === 0 ? (
                                            <p className="no-data">No pending registrations.</p>
                                        ) : (
                                            <div className="table-container card">
                                                <table>
                                                    <thead>
                                                        <tr>
                                                            <th>Photo</th>
                                                            <th>Name</th>
                                                            <th>Sport</th>
                                                            <th>Year</th>
                                                            <th>Role</th>
                                                            <th>Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {pendingPlayers.map(player => (
                                                            <tr key={player.id}>
                                                                <td>
                                                                    {player.photo_url ? (
                                                                        <img src={player.photo_url} alt="" className="table-thumb" />
                                                                    ) : (
                                                                        <div className="table-placeholder">
                                                                            {player.name.charAt(0).toUpperCase()}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td>{player.name}</td>
                                                                <td>{player.sport}</td>
                                                                <td>{player.year}</td>
                                                                <td>{player.stats?.role || '-'}</td>
                                                                <td>
                                                                    <button
                                                                        onClick={() => handleApprovePlayer(player.id)}
                                                                        className="btn btn-sm btn-success"
                                                                    >
                                                                        Approve
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                    {/* Section 2: Approved Players */}
                                    <div className="section-block">
                                        <h3>Approved Registrations</h3>
                                        {approvedPlayers.length === 0 ? (
                                            <p className="no-data">No approved players yet.</p>
                                        ) : (
                                            <div className="table-container card">
                                                <table>
                                                    <thead>
                                                        <tr>
                                                            <th>Photo</th>
                                                            <th>Name</th>
                                                            <th>Sport</th>
                                                            <th>Year</th>
                                                            <th>Role</th>
                                                            <th>Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {getPaginatedData(approvedPlayers, overviewPage).map(player => (
                                                            <tr key={player.id}>
                                                                <td>
                                                                    {player.photo_url ? (
                                                                        <img src={player.photo_url} alt="" className="table-thumb" />
                                                                    ) : (
                                                                        <div className="table-placeholder">
                                                                            {player.name.charAt(0).toUpperCase()}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td>{player.name}</td>
                                                                <td>{player.sport}</td>
                                                                <td>{player.year}</td>
                                                                <td>{player.stats?.role || '-'}</td>
                                                                <td>
                                                                    {player.status === 'eligible'
                                                                        ? <span className="badge badge-warning">Queued</span>
                                                                        : <span className="badge badge-success">Approved</span>
                                                                    }
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                {/* Overview Pagination */}
                                                {approvedPlayers.length > itemsPerPage && (
                                                    <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem', padding: '1rem' }}>
                                                        <button
                                                            className="btn btn-sm btn-secondary"
                                                            onClick={() => setOverviewPage(p => Math.max(1, p - 1))}
                                                            disabled={overviewPage === 1}
                                                        >
                                                            Previous
                                                        </button>
                                                        <span style={{ alignSelf: 'center' }}>
                                                            Page {overviewPage} of {totalPages(approvedPlayers)}
                                                        </span>
                                                        <button
                                                            className="btn btn-sm btn-secondary"
                                                            onClick={() => setOverviewPage(p => Math.min(totalPages(approvedPlayers), p + 1))}
                                                            disabled={overviewPage === totalPages(approvedPlayers)}
                                                        >
                                                            Next
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* User Accounts Section */}
                                    <div className="section-block">
                                        <div className="section-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                            <h3>User Accounts</h3>
                                            <button onClick={() => handleOpenUserModal()} className="btn btn-primary btn-sm">
                                                + Create User
                                            </button>
                                        </div>
                                        <div className="users-table card">
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th>Name</th>
                                                        <th>Email</th>
                                                        <th>Role</th>
                                                        <th>Assigned Team</th>
                                                        <th>Joined</th>
                                                        <th>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {users.map((user) => (
                                                        <tr key={user.id}>
                                                            <td>{user.name}</td>
                                                            <td>{user.email}</td>
                                                            <td>
                                                                <span className={`badge badge-${user.role === 'admin' ? 'danger' : user.role === 'auctioneer' ? 'warning' : 'primary'}`}>
                                                                    {user.role}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                {user.role === 'team_owner' && user.team_id
                                                                    ? teams.find(t => t.id === user.team_id)?.name || 'N/A'
                                                                    : '-'
                                                                }
                                                            </td>
                                                            <td>{new Date(user.created_at).toLocaleDateString()}</td>
                                                            <td>
                                                                <button
                                                                    onClick={() => handleOpenUserModal(user)}
                                                                    className="btn btn-sm btn-secondary"
                                                                    style={{ marginRight: '0.5rem' }}
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteUser(user.id)}
                                                                    className="btn btn-sm btn-danger"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'players' && (
                                <div className="players-section">
                                    <div className="section-header-row mb-5" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                                        <h3>All Active Players</h3>
                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <form onSubmit={handleQueueById} style={{ display: 'flex', gap: '0.5rem' }}>
                                                <input
                                                    type="text"
                                                    placeholder="Queue Player ID"
                                                    className="input input-sm"
                                                    value={queuePlayerId}
                                                    onChange={e => setQueuePlayerId(e.target.value)}
                                                    style={{ width: '120px' }}
                                                />
                                                <button type="submit" className="btn btn-sm btn-warning">Queue ID</button>
                                            </form>
                                            <button onClick={() => handleOpenPlayerModal()} className="btn btn-primary">+ Create & Queue</button>
                                        </div>
                                    </div>

                                    {/* Paginated Players List */}
                                    <div className="users-table card">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>ID</th>
                                                    <th>Photo</th>
                                                    <th>Name</th>
                                                    <th>Sport</th>
                                                    <th>Year</th>
                                                    <th>Role</th>
                                                    <th>Status</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {getPaginatedData(activePlayers).map(player => (
                                                    <tr key={player.id}>
                                                        <td>#{player.id}</td>
                                                        <td>
                                                            {player.photo_url ? (
                                                                <img src={player.photo_url} alt="" className="table-thumb" />
                                                            ) : 'No Photo'}
                                                        </td>
                                                        <td>{player.name}</td>
                                                        <td>{player.sport}</td>
                                                        <td>{player.year}</td>
                                                        <td>{player.stats?.role || '-'}</td>
                                                        <td>
                                                            <span className={`badge badge-${player.status === 'sold' ? 'primary' :
                                                                player.status === 'unsold' ? 'secondary' :
                                                                    player.status === 'eligible' ? 'warning' : 'success'
                                                                }`}>
                                                                {player.status.toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div className="action-buttons" style={{ display: 'flex', gap: '0.5rem' }}>
                                                                {player.status === 'unsold' && (
                                                                    <button
                                                                        onClick={() => handleReApprove(player.id)}
                                                                        className="btn btn-sm btn-info"
                                                                        title="Move back to Approved list"
                                                                    >
                                                                        Re-Approve
                                                                    </button>
                                                                )}
                                                                {player.status === 'eligible' && (
                                                                    <button
                                                                        onClick={() => handleRemoveFromQueue(player.id)}
                                                                        className="btn btn-sm btn-outline-danger"
                                                                        title="Remove from queue"
                                                                    >
                                                                        Use Queue
                                                                    </button>
                                                                )}
                                                                {player.status === 'approved' && (
                                                                    <button
                                                                        onClick={() => handleAddToQueue(player.id)}
                                                                        className="btn btn-sm btn-warning"
                                                                    >
                                                                        Queue
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => handleOpenPlayerModal(player)}
                                                                    className="btn btn-sm btn-secondary"
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeletePlayer(player.id)}
                                                                    className="btn btn-sm btn-danger"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        {/* Pagination Controls */}
                                        {activePlayers.length > itemsPerPage && (
                                            <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem', padding: '1rem' }}>
                                                <button
                                                    className="btn btn-sm btn-secondary"
                                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                    disabled={currentPage === 1}
                                                >
                                                    Previous
                                                </button>
                                                <span style={{ alignSelf: 'center' }}>
                                                    Page {currentPage} of {totalPages(activePlayers)}
                                                </span>
                                                <button
                                                    className="btn btn-sm btn-secondary"
                                                    onClick={() => setCurrentPage(p => Math.min(totalPages(activePlayers), p + 1))}
                                                    disabled={currentPage === totalPages(activePlayers)}
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'teams' && (
                                <div className="teams-section">
                                    <div className="section-header-row mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3>Active Teams</h3>
                                        <button onClick={() => handleOpenTeamModal()} className="btn btn-primary">+ Create Team</button>
                                    </div>

                                    {Object.keys(teams.reduce((acc, team) => {
                                        const sport = team.sport || 'Other';
                                        if (!acc[sport]) acc[sport] = [];
                                        acc[sport].push(team);
                                        return acc;
                                    }, {})).length === 0 ? (
                                        <p className="no-data">No teams created yet.</p>
                                    ) : (
                                        Object.entries(teams.reduce((acc, team) => {
                                            const sport = team.sport || 'Other';
                                            if (!acc[sport]) acc[sport] = [];
                                            acc[sport].push(team);
                                            return acc;
                                        }, {})).map(([sport, sportTeams]) => (
                                            <div key={sport} className="sport-section mb-4">
                                                <h4 className="capitalize mb-4" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>{sport}</h4>
                                                <div className="teams-grid">
                                                    {sportTeams.map(team => (
                                                        <div key={team.id} className="team-card-admin card flex flex-col items-center text-center p-4">
                                                            <div className="team-logo-wrapper mb-3" style={{ margin: '0 auto 1rem' }}>
                                                                {team.logo_url ? (
                                                                    <img src={team.logo_url} alt={team.name} className="team-logo-small" />
                                                                ) : (
                                                                    <div className="team-logo-placeholder">
                                                                        {team.name ? team.name.substring(0, 2).toUpperCase() : '??'}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="team-info w-full">
                                                                <h4 className="m-0 text-lg font-bold">{team.name}</h4>
                                                                <span className="text-sm text-secondary capitalize block mb-2">{team.sport}</span>
                                                                <div className="team-card-body mt-3">
                                                                    <div className="stat-row flex justify-between text-sm mb-1">
                                                                        <span>Budget:</span>
                                                                        <span className="font-bold">{parseFloat(team.budget).toLocaleString()}</span>
                                                                    </div>
                                                                    {/* Could add player count here if available */}
                                                                </div>
                                                                <div className="team-card-actions mt-3 flex gap-2">
                                                                    <button
                                                                        onClick={() => handleOpenTeamModal(team)}
                                                                        className="btn btn-sm btn-secondary flex-1"
                                                                    >
                                                                        Edit
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteTeam(team.id)}
                                                                        className="btn btn-sm btn-danger flex-1"
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* User Modal */}
                {showUserModal && (
                    <div className="modal-overlay">
                        <div className="modal-content card">
                            <h2>{editingUser ? 'Edit User' : 'Create User'}</h2>
                            <form onSubmit={handleSaveUser}>
                                <div className="form-group">
                                    <label>Full Name</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={userData.name}
                                        onChange={e => setUserData({ ...userData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Email Address</label>
                                    <input
                                        type="email"
                                        className="input"
                                        value={userData.email}
                                        onChange={e => setUserData({ ...userData, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Password {editingUser && <span className="text-secondary text-sm">(Leave blank to keep current)</span>}</label>
                                    <input
                                        type="password"
                                        className="input"
                                        value={userData.password}
                                        onChange={e => setUserData({ ...userData, password: e.target.value })}
                                        required={!editingUser}
                                        placeholder={editingUser ? '••••••' : ''}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Role</label>
                                    <select
                                        className="input"
                                        value={userData.role}
                                        onChange={e => setUserData({ ...userData, role: e.target.value })}
                                    >
                                        <option value="viewer">Viewer</option>
                                        <option value="auctioneer">Auctioneer</option>
                                        <option value="admin">Admin</option>
                                        <option value="team_owner">Team Owner</option>
                                    </select>
                                </div>

                                {userData.role === 'team_owner' && (
                                    <div className="form-group">
                                        <label>Assign Team</label>
                                        <select
                                            className="input"
                                            value={userData.team_id}
                                            onChange={e => setUserData({ ...userData, team_id: e.target.value })}
                                            required
                                        >
                                            <option value="">Select a team...</option>
                                            {teams.map(team => (
                                                <option key={team.id} value={team.id}>
                                                    {team.name} ({team.sport})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="modal-actions">
                                    <button type="button" onClick={handleCloseUserModal} className="btn btn-secondary">Cancel</button>
                                    <button type="submit" className="btn btn-primary">{editingUser ? 'Update' : 'Create'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Team Modal */}
                {showTeamModal && (
                    <div className="modal-overlay">
                        <div className="modal-content card">
                            <h2>{editingTeam ? 'Edit Team' : 'Create Team'}</h2>
                            <form onSubmit={handleSaveTeamExtended}>
                                <div className="form-group">
                                    <label>Team Name</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={teamForm.name}
                                        onChange={e => setTeamForm({ ...teamForm, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Budget</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={teamForm.budget}
                                        onChange={e => setTeamForm({ ...teamForm, budget: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Sport</label>
                                    <select
                                        className="input"
                                        value={teamForm.sport}
                                        onChange={e => setTeamForm({ ...teamForm, sport: e.target.value })}
                                        disabled={!!editingTeam} // Lock sport on edit if desired, or allow
                                    >
                                        <option value="cricket">Cricket</option>
                                        <option value="futsal">Futsal</option>
                                        <option value="volleyball">Volleyball</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Logo</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => setTeamForm({ ...teamForm, logo: e.target.files[0] })}
                                        className="input"
                                    />
                                    <p className="text-secondary text-xs mt-1">Leave empty to keep current logo (if editing)</p>
                                </div>
                                <div className="modal-actions">
                                    <button type="button" onClick={() => setShowTeamModal(false)} className="btn btn-secondary">Cancel</button>
                                    <button type="submit" className="btn btn-primary">Save Team</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Player Modal */}
                {showPlayerModal && (
                    <div className="modal-overlay">
                        <div className="modal-content card">
                            <h2>{editingPlayer ? 'Edit Player' : 'Create Player'}</h2>
                            <form onSubmit={handleSavePlayerExtended}>
                                <div className="form-group">
                                    <label>Full Name</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={playerForm.name}
                                        onChange={e => setPlayerForm({ ...playerForm, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="row gap-2">
                                    <div className="form-group flex-1">
                                        <label>Sport</label>
                                        <select
                                            className="input"
                                            value={playerForm.sport}
                                            onChange={e => setPlayerForm({ ...playerForm, sport: e.target.value })}
                                        >
                                            <option value="cricket">Cricket</option>
                                            <option value="futsal">Futsal</option>
                                            <option value="volleyball">Volleyball</option>
                                        </select>
                                    </div>
                                    <div className="form-group flex-1">
                                        <label>Year</label>
                                        <select
                                            className="input"
                                            value={playerForm.year}
                                            onChange={e => setPlayerForm({ ...playerForm, year: e.target.value })}
                                        >
                                            <option value="1st">1st Year</option>
                                            <option value="2nd">2nd Year</option>
                                            <option value="3rd">3rd Year</option>
                                            <option value="4th">4th Year</option>
                                            <option value="Intern">Intern</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Stats / Role (JSON or text)</label>
                                    <textarea
                                        className="input"
                                        value={playerForm.stats}
                                        onChange={e => setPlayerForm({ ...playerForm, stats: e.target.value })}
                                        rows="3"
                                        placeholder='{"role": "Batsman", "matches": 10}'
                                    ></textarea>
                                </div>
                                <div className="form-group">
                                    <label>Base Price</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={playerForm.base_price}
                                        onChange={e => setPlayerForm({ ...playerForm, base_price: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Photo</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => setPlayerForm({ ...playerForm, photo: e.target.files[0] })}
                                        className="input"
                                    />
                                </div>
                                <div className="modal-actions">
                                    <button type="button" onClick={() => setShowPlayerModal(false)} className="btn btn-secondary">Cancel</button>
                                    <button type="submit" className="btn btn-primary">Save Player</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
