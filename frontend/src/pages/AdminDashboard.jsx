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
                                        <h3>User Accounts</h3>
                                        <div className="users-table card">
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th>Name</th>
                                                        <th>Email</th>
                                                        <th>Role</th>
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
                                                                <select
                                                                    value={user.role}
                                                                    onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                                                                    className="role-select"
                                                                >
                                                                    <option value="viewer">Viewer</option>
                                                                    <option value="participant">Participant</option>
                                                                    <option value="auctioneer">Auctioneer</option>
                                                                    <option value="admin">Admin</option>
                                                                </select>
                                                            </td>
                                                            <td>{new Date(user.created_at).toLocaleDateString()}</td>
                                                            <td>
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
                                                </div>
                                            </div>
                                        </div>
                                    ))}
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
                                                                    <button
                                                                        onClick={() => handleDeleteTeam(team.id)}
                                                                        className="btn btn-sm btn-danger full-width mt-2"
                                                                    >
                                                                        Delete Team
                                                                    </button>
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
        </div>
    );
}
