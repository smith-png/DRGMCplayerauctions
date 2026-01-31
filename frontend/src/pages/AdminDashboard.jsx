import { useState, useEffect } from 'react';
import { adminAPI, playerAPI, auctionAPI } from '../services/api';
import socketService from '../services/socket';
import './AdminDashboard.css';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [players, setPlayers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [newTeam, setNewTeam] = useState({ name: '', sport: 'cricket', budget: 100000, logo: null });
    const [isAuctionActive, setIsAuctionActive] = useState(false);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    // User Modal State
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [userData, setUserData] = useState({ name: '', email: '', password: '', role: 'viewer' });

    useEffect(() => {
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
            } else if (activeTab === 'users') {
                // Fetch both users and players for the Users tab
                // Fetch both users and players for the Users tab independently
                // This prevents one failure from blocking the other
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
            // setMessage('Failed to delete user');
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
                // Re-use logic or call API directly
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
                                                                    ) : 'No Photo'}
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
                                                        {approvedPlayers.map(player => (
                                                            <tr key={player.id}>
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
                                                                    {player.status === 'eligible'
                                                                        ? <span className="badge badge-warning">Queued</span>
                                                                        : <span className="badge badge-success">Approved</span>
                                                                    }
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
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
                                    <div className="section-header-row mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3>All Active Players</h3>
                                        <button onClick={() => handleOpenPlayerModal()} className="btn btn-primary">+ Create Player</button>
                                    </div>
                                    <div className="players-grid grid grid-4">
                                        {activePlayers.map((player) => (
                                            <div key={player.id} className="player-card card simple-card">
                                                <div className="card-image-wrapper">
                                                    {player.photo_url ? (
                                                        <img src={player.photo_url} alt={player.name} className="player-card-photo" />
                                                    ) : (
                                                        <div className="placeholder-photo">No Photo</div>
                                                    )}
                                                </div>
                                                <div className="simple-card-content">
                                                    <h4>{player.name}</h4>
                                                    <p className="player-year">{player.year} MBBS</p>

                                                    {/* Only show Auction controls for approved (not sold/unsold) */}
                                                    <div className="player-card-actions">
                                                        {player.status === 'approved' && (
                                                            <button
                                                                onClick={() => handleAddToQueue(player.id)}
                                                                className="btn btn-sm btn-primary"
                                                                title="Add to Auction Queue"
                                                            >
                                                                Add to Queue
                                                            </button>
                                                        )}
                                                        {player.status === 'eligible' && <span className="badge badge-warning">Queued</span>}
                                                        {player.status === 'sold' && <span className="badge badge-primary">Sold</span>}
                                                        {player.status === 'unsold' && (
                                                            <>
                                                                <span className="badge badge-secondary">Unsold</span>
                                                                <button
                                                                    onClick={() => handleAddToQueue(player.id)}
                                                                    className="btn btn-sm btn-outline-primary"
                                                                    title="Add back to Auction Queue"
                                                                    style={{ marginLeft: '0.5rem' }}
                                                                >
                                                                    Queue Again
                                                                </button>
                                                            </>
                                                        )}

                                                        <button
                                                            onClick={() => handleDeletePlayer(player.id)}
                                                            className="btn btn-sm btn-danger"
                                                            title="Delete Player"
                                                        >
                                                            Delete
                                                        </button>
                                                        <button onClick={() => handleOpenPlayerModal(player)} className="btn btn-sm btn-secondary">Edit</button>
                                                        {(player.status === 'eligible' || player.status === 'approved') && (
                                                            <button onClick={() => handleRemoveFromQueue(player.id)} className="btn btn-sm btn-warning" title="Remove from Queue/Approval">
                                                                Remove
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'teams' && (
                                <div className="teams-section">
                                    {/* Active Teams Section */}
                                    <div className="section-block">
                                        <h3>Active Teams</h3>
                                        {teams.length === 0 ? (
                                            <p className="no-data">No teams active.</p>
                                        ) : (
                                            <div className="teams-by-sport">
                                                {Object.entries(
                                                    teams.reduce((acc, team) => {
                                                        const sport = team.sport || 'Other';
                                                        if (!acc[sport]) acc[sport] = [];
                                                        acc[sport].push(team);
                                                        return acc;
                                                    }, {})
                                                ).map(([sport, sportTeams]) => (
                                                    <div key={sport} className="sport-category-group mb-4">
                                                        <h4 className="sport-heading capitalize">{sport} Teams</h4>
                                                        <div className="teams-list grid grid-3">
                                                            {sportTeams.map((team) => (
                                                                <div key={team.id} className="team-card-admin card">
                                                                    <div className="team-logo-wrapper">
                                                                        {team.logo_url ? (
                                                                            <img src={team.logo_url} alt={team.name} className="team-logo-small" />
                                                                        ) : (
                                                                            <div className="team-logo-placeholder">No Logo</div>
                                                                        )}
                                                                    </div>
                                                                    <h4>{team.name}</h4>
                                                                    <div className="team-card-info">
                                                                        <span className="badge badge-primary">{team.sport}</span>
                                                                        <p>Budget: {team.budget.toLocaleString()} Points</p>
                                                                        <p>Remaining: {team.remaining_budget.toLocaleString()} Points</p>
                                                                    </div>
                                                                    <div className="team-actions" style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                                                                        <button onClick={() => handleOpenTeamModal(team)} className="btn btn-sm btn-secondary full-width">Edit</button>
                                                                        <button onClick={() => handleDeleteTeam(team.id)} className="btn btn-sm btn-danger full-width">Delete</button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Create Team Section */}
                                    <div className="section-block">
                                        <h3>Create New Team</h3>
                                        <div className="create-team-form card">
                                            <form onSubmit={handleCreateTeam} className="team-form">
                                                <div className="input-group">
                                                    <input
                                                        type="text"
                                                        value={newTeam.name}
                                                        onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                                                        className="input"
                                                        placeholder="Team name"
                                                        required
                                                    />
                                                </div>
                                                <div className="input-group">
                                                    <select
                                                        value={newTeam.sport}
                                                        onChange={(e) => setNewTeam({ ...newTeam, sport: e.target.value })}
                                                        className="input"
                                                    >
                                                        <option value="cricket">Cricket</option>
                                                        <option value="futsal">Futsal</option>
                                                        <option value="volleyball">Volleyball</option>
                                                    </select>
                                                </div>
                                                <div className="input-group">
                                                    <input
                                                        type="number"
                                                        value={newTeam.budget}
                                                        onChange={(e) => setNewTeam({ ...newTeam, budget: e.target.value })}
                                                        className="input"
                                                        placeholder="Budget"
                                                        required
                                                    />
                                                </div>
                                                <div className="input-group">
                                                    <label className="file-upload-label">
                                                        Team Logo
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={(e) => setNewTeam({ ...newTeam, logo: e.target.files[0] })}
                                                            className="file-input"
                                                        />
                                                    </label>
                                                    {newTeam.logo && <span className="file-name">{newTeam.logo.name}</span>}
                                                </div>
                                                <button type="submit" className="btn btn-primary">Create Team</button>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            {/* User Modal */}
            {showUserModal && (
                <div className="modal-overlay">
                    <div className="modal-content card">
                        <div className="modal-header">
                            <h2>{editingUser ? 'Edit User' : 'Create User'}</h2>
                            <button onClick={handleCloseUserModal} className="modal-close">×</button>
                        </div>
                        <form onSubmit={handleSaveUser}>
                            <div className="input-group">
                                <label>Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={userData.name}
                                    onChange={e => setUserData({ ...userData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    className="input"
                                    value={userData.email}
                                    onChange={e => setUserData({ ...userData, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label>Role</label>
                                <select
                                    className="input"
                                    value={userData.role}
                                    onChange={e => setUserData({ ...userData, role: e.target.value })}
                                >
                                    <option value="viewer">Viewer</option>
                                    <option value="participant">Participant</option>
                                    <option value="team_owner">Team Owner</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            {userData.role === 'team_owner' && (
                                <div className="input-group">
                                    <label>Assigned Team</label>
                                    <select
                                        className="input"
                                        value={userData.team_id || ''}
                                        onChange={e => setUserData({ ...userData, team_id: e.target.value })}
                                    >
                                        <option value="">No Team Assigned</option>
                                        {teams.map(team => (
                                            <option key={team.id} value={team.id}>
                                                {team.name} ({team.sport})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="input-group">
                                <label>Password {editingUser && <span className="text-secondary text-sm">(Leave blank to keep current)</span>}</label>
                                <input
                                    type="password"
                                    className="input"
                                    value={userData.password}
                                    onChange={e => setUserData({ ...userData, password: e.target.value })}
                                    required={!editingUser}
                                    placeholder={editingUser ? "Example: NewPassword123" : ""}
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={handleCloseUserModal} className="btn btn-secondary">Cancel</button>
                                <button type="submit" className="btn btn-primary">{editingUser ? 'Update User' : 'Create User'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Team Modal */}
            {showTeamModal && (
                <div className="modal-overlay">
                    <div className="modal-content card">
                        <div className="modal-header">
                            <h2>{editingTeam ? 'Edit Team' : 'Create Team'}</h2>
                            <button onClick={() => setShowTeamModal(false)} className="modal-close">×</button>
                        </div>
                        <form onSubmit={handleSaveTeamExtended}>
                            <div className="input-group">
                                <label>Name</label>
                                <input type="text" className="input" value={teamForm.name} onChange={e => setTeamForm({ ...teamForm, name: e.target.value })} required />
                            </div>
                            {!editingTeam && (
                                <div className="input-group">
                                    <label>Sport</label>
                                    <select className="input" value={teamForm.sport} onChange={e => setTeamForm({ ...teamForm, sport: e.target.value })}>
                                        <option value="cricket">Cricket</option>
                                        <option value="futsal">Futsal</option>
                                        <option value="volleyball">Volleyball</option>
                                    </select>
                                </div>
                            )}
                            <div className="input-group">
                                <label>Budget</label>
                                <input type="number" className="input" value={teamForm.budget} onChange={e => setTeamForm({ ...teamForm, budget: e.target.value })} required />
                            </div>
                            <div className="input-group">
                                <label>Logo (Optional)</label>
                                <input type="file" className="file-input" onChange={e => setTeamForm({ ...teamForm, logo: e.target.files[0] })} />
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
                        <div className="modal-header">
                            <h2>{editingPlayer ? 'Edit Player' : 'Create Player'}</h2>
                            <button onClick={() => setShowPlayerModal(false)} className="modal-close">×</button>
                        </div>
                        <form onSubmit={handleSavePlayerExtended}>
                            <div className="input-group">
                                <label>Name</label>
                                <input type="text" className="input" value={playerForm.name} onChange={e => setPlayerForm({ ...playerForm, name: e.target.value })} required />
                            </div>
                            <div className="input-group">
                                <label>Sport</label>
                                <select className="input" value={playerForm.sport} onChange={e => setPlayerForm({ ...playerForm, sport: e.target.value })}>
                                    <option value="cricket">Cricket</option>
                                    <option value="futsal">Futsal</option>
                                    <option value="volleyball">Volleyball</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Year</label>
                                <select className="input" value={playerForm.year} onChange={e => setPlayerForm({ ...playerForm, year: e.target.value })}>
                                    <option value="1st">1st Year</option>
                                    <option value="2nd">2nd Year</option>
                                    <option value="3rd">3rd Year</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Base Price</label>
                                <input type="number" className="input" value={playerForm.base_price} onChange={e => setPlayerForm({ ...playerForm, base_price: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <label>Stats (JSON)</label>
                                <textarea className="input" rows="3" value={playerForm.stats} onChange={e => setPlayerForm({ ...playerForm, stats: e.target.value })} placeholder='{"role":"Batsman"}'></textarea>
                            </div>
                            <div className="input-group">
                                <label>Photo (Optional)</label>
                                <input type="file" className="file-input" onChange={e => setPlayerForm({ ...playerForm, photo: e.target.files[0] })} />
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
    );
}
