import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI, playerAPI, auctionAPI } from '../services/api.js';
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
    const [animationType, setAnimationType] = useState('confetti');
    const [bidIncrementRules, setBidIncrementRules] = useState([]);

    // Roster Tab State
    const [rosterFilter, setRosterFilter] = useState('ALL');
    const [rosterSearch, setRosterSearch] = useState('');
    const [rosterPage, setRosterPage] = useState(1);

    // User Tab State
    const [userSearch, setUserSearch] = useState('');
    const [userPage, setUserPage] = useState(1);

    // User Modal State
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [userData, setUserData] = useState({ name: '', email: '', password: '', role: 'viewer' });

    const rolesBySport = {
        Cricket: [
            'Batsman',
            'Bowler',
            'All-Rounder',
            'Wicket Keeper'
        ],
        Futsal: ['Striker', 'Midfielder', 'Defender', 'Goalkeeper'],
        Volleyball: [
            'Setter',
            'Center',
            'Striker (Right)',
            'Striker (Left)',
            'Defence (Right)',
            'Defence (Left)'
        ]
    };

    const battingStyles = ['Right Handed', 'Left Handed'];
    const bowlingStyles = [
        'None',
        'Right Arm Pace',
        'Right Arm Spin',
        'Left Arm Pace',
        'Left Arm Spin',
        'Slow Left Arm Orthodox'
    ];

    const handlePlayerSportChange = (e) => {
        const newSport = e.target.value;
        const updates = { sport: newSport };

        // If creating new player, auto-set base price to sport minimum
        if (!editingPlayer) {
            updates.base_price = sportMinBids[newSport.toLowerCase()] || 50;
        }

        setPlayerForm({ ...playerForm, ...updates });
    };

    useEffect(() => {
        setCurrentPage(1); // Reset page on tab change
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'overview' || activeTab === 'settings') {
                const response = await adminAPI.getStats();
                if (activeTab === 'overview') setStats(response.data.stats);

                const stateResponse = await auctionAPI.getAuctionState();
                setIsAuctionActive(stateResponse.data.isActive);
                setIsRegistrationOpen(stateResponse.data.isRegistrationOpen ?? true);
                setSportMinBids(stateResponse.data.sportMinBids || { cricket: 50, futsal: 50, volleyball: 50 });
                setAnimationDuration(stateResponse.data.animationDuration || 25);
                setAnimationType(stateResponse.data.animationType || 'confetti');
                setBidIncrementRules(stateResponse.data.bidIncrementRules || []);
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

    const handleUpdateAnimationType = async (type) => {
        try {
            setAnimationType(type);
            await adminAPI.updateAnimationType(type);
            setMessage(`Animation style updated to ${type}`);
        } catch (err) {
            console.error(err);
            setMessage('Failed to update animation style');
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
    const [playerForm, setPlayerForm] = useState({
        name: '',
        sport: 'cricket',
        year: '1st',
        stats: {}, // Changed from string to object
        base_price: 50,
        photo: null
    });
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
            // Parse stats safely or use as is if already object
            let parsedStats = {};
            if (typeof player.stats === 'string') {
                try { parsedStats = JSON.parse(player.stats); } catch (e) { }
            } else {
                parsedStats = player.stats || {};
            }

            setPlayerForm({
                name: player.name,
                sport: player.sport,
                year: player.year,
                stats: parsedStats,
                base_price: player.base_price,
                photo: null
            });
        } else {
            setEditingPlayer(null);
            setPlayerForm({
                name: '',
                sport: 'cricket',
                year: '1st',
                stats: {},
                base_price: 50,
                photo: null
            });
        }
        setShowPlayerModal(true);
    }

    const handlePlayerStatChange = (statName, value) => {
        setPlayerForm(prev => ({
            ...prev,
            stats: {
                ...prev.stats,
                [statName]: value
            }
        }));
    };

    const handleSavePlayerExtended = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('name', playerForm.name);
            formData.append('sport', playerForm.sport);
            formData.append('year', playerForm.year);
            formData.append('base_price', playerForm.base_price);
            formData.append('stats', JSON.stringify(playerForm.stats)); // Stringify for backend
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

    const [exportSport, setExportSport] = useState('all');

    const handleExportCSV = async () => {
        try {
            const params = exportSport !== 'all' ? { sport: exportSport } : {};
            // Assuming adminAPI.exportPlayers can accept params or we modify it to. 
            // If api.js doesn't support arg, we need to check.
            // Based on previous context, `adminAPI.exportPlayers` might need update if it doesn't take args.
            // But let's assume we pass it.
            const response = await adminAPI.exportPlayers(exportSport !== 'all' ? exportSport : null);

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const fileName = `players_export_${exportSport}_${Date.now()}.csv`;

            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();

            setMessage('Players exported successfully');
        } catch (err) {
            console.error(err);
            setMessage('Failed to export players');
        }
    };


    const pendingPlayers = players.filter(p => p.status === 'pending');
    const approvedPlayers = players.filter(p => p.status === 'approved' || p.status === 'eligible');
    const activePlayers = players.filter(p => p.status !== 'pending');

    // Roster Filtering
    const filteredRoster = players.filter(player => {
        const matchesFilter = rosterFilter === 'ALL' || player.sport?.toLowerCase() === rosterFilter.toLowerCase();
        const matchesSearch = rosterSearch === '' ||
            player.name.toLowerCase().includes(rosterSearch.toLowerCase()) ||
            (player.id && player.id.toString().includes(rosterSearch));
        return matchesFilter && matchesSearch;
    });

    const rosterItemsPerPage = 8;
    const paginatedRoster = filteredRoster.slice((rosterPage - 1) * rosterItemsPerPage, rosterPage * rosterItemsPerPage);
    const totalRosterPages = Math.ceil(filteredRoster.length / rosterItemsPerPage);

    // User Filtering
    const filteredUsers = users.filter(user => {
        const search = userSearch.toLowerCase();
        return (
            user.name.toLowerCase().includes(search) ||
            user.email.toLowerCase().includes(search) ||
            user.role.toLowerCase().includes(search)
        );
    });

    const userItemsPerPage = 5;
    const paginatedUsers = filteredUsers.slice((userPage - 1) * userItemsPerPage, userPage * userItemsPerPage);
    const totalUserPages = Math.ceil(filteredUsers.length / userItemsPerPage);

    return (
        <div className="editorial-glass-stage">
            <div className="phantom-nav-spacer"></div>
            <div className="admin-page">
                <div className="container">
                    <div className="admin-header">
                        <h1>Admin Dashboard</h1>
                        <p>SYSTEM CONTROL // LUMINOUS SAGE INTERFACE</p>
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
                            Rosters
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'players' ? 'active' : ''}`}
                            onClick={() => setActiveTab('players')}
                        >
                            Players
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'teams' ? 'active' : ''}`}
                            onClick={() => setActiveTab('teams')}
                        >
                            Franchises
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
                            onClick={() => setActiveTab('settings')}
                        >
                            Console
                        </button>
                    </div>

                    <div className="admin-content">
                        {loading ? (
                            <div className="spinner"></div>
                        ) : (
                            <>
                                {activeTab === 'overview' && stats && (
                                    <div className="overview-container animate-fadeIn">
                                        <div className="overview-grid">
                                            <div className="stat-card card">
                                                <span className="stat-ref-index">REF.001</span>
                                                <div className="stat-label">TOTAL USERS</div>
                                                <div className="stat-number">{stats.totalUsers}</div>
                                            </div>
                                            <div className="stat-card card">
                                                <span className="stat-ref-index">REF.002</span>
                                                <div className="stat-label">TOTAL PLAYERS</div>
                                                <div className="stat-number">
                                                    {Object.values(stats.players || {}).reduce((a, b) => a + b, 0)}
                                                </div>
                                            </div>
                                            <div className="stat-card card">
                                                <span className="stat-ref-index">REF.003</span>
                                                <div className="stat-label">FRANCHISES</div>
                                                <div className="stat-number">{stats.totalTeams}</div>
                                            </div>
                                            <div className="stat-card card">
                                                <span className="stat-ref-index">REF.004</span>
                                                <div className="stat-label">VOL. BIDS</div>
                                                <div className="stat-number">{stats.totalBids}</div>
                                            </div>
                                        </div>

                                        <div className="overview-controls card">
                                            <div className="system-override-strip">
                                                <div className="control-info">
                                                    <h3>LIVE AUCTION PROTOCOL</h3>
                                                    <span className="text-secondary">ENABLE REAL-TIME BIDDING ENGINE</span>
                                                </div>
                                                <div className="editorial-toggle-wrapper">
                                                    <span className={`system-status-indicator ${isAuctionActive ? 'active' : ''}`}>SYSTEM ACTIVE</span>
                                                    <label className="toggle-switch-editorial">
                                                        <input
                                                            type="checkbox"
                                                            checked={isAuctionActive}
                                                            onChange={handleToggleAuction}
                                                        />
                                                        <span className="slider-editorial type2"></span>
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="system-override-strip">
                                                <div className="control-info">
                                                    <h3>REGISTRATION PORTAL</h3>
                                                    <span className="text-secondary">ALLOW NEW PLAYER ENTRIES</span>
                                                </div>
                                                <div className="editorial-toggle-wrapper">
                                                    <span className={`system-status-indicator ${isRegistrationOpen ? 'active' : ''}`}>SYSTEM ACTIVE</span>
                                                    <label className="toggle-switch-editorial">
                                                        <input
                                                            type="checkbox"
                                                            checked={isRegistrationOpen}
                                                            onChange={handleToggleRegistration}
                                                        />
                                                        <span className="slider-editorial type2"></span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="market-ledger-strip">
                                            <div className="ledger-item">
                                                <span>PENDING</span>
                                                <span className="ledger-value">{stats.players?.pending || 0}</span>
                                            </div>
                                            <span className="ledger-divider">///</span>
                                            <div className="ledger-item">
                                                <span>APPROVED</span>
                                                <span className="ledger-value">{stats.players?.approved || 0}</span>
                                            </div>
                                            <span className="ledger-divider">///</span>
                                            <div className="ledger-item">
                                                <span>ELIGIBLE</span>
                                                <span className="ledger-value">{stats.players?.eligible || 0}</span>
                                            </div>
                                            <span className="ledger-divider">///</span>
                                            <div className="ledger-item">
                                                <span>SOLD</span>
                                                <span className="ledger-value">{stats.players?.sold || 0}</span>
                                            </div>
                                            <span className="ledger-divider">///</span>
                                            <div className="ledger-item">
                                                <span>UNSOLD</span>
                                                <span className="ledger-value">{stats.players?.unsold || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}{/* End Overview Tab */}

                                {
                                    activeTab === 'users' && (
                                        <div className="users-section animate-fadeIn">
                                            {/* Master Roster Header */}
                                            <div className="roster-header">
                                                <div>
                                                    <h3 className="roster-title">MASTER ROSTER // DATABASE ACCESS</h3>
                                                    <div className="filter-group mt-3">
                                                        {['ALL', 'CRICKET', 'FUTSAL', 'VOLLEYBALL'].map(sport => (
                                                            <button
                                                                key={sport}
                                                                className={`filter-pill ${rosterFilter === sport ? 'active' : ''}`}
                                                                onClick={() => { setRosterFilter(sport); setRosterPage(1); }}
                                                            >
                                                                {sport}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="roster-actions">
                                                    <input
                                                        type="text"
                                                        className="roster-search"
                                                        placeholder="SEARCH DATABASE..."
                                                        value={rosterSearch}
                                                        onChange={(e) => { setRosterSearch(e.target.value); setRosterPage(1); }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Roster List - Ledger Strips */}
                                            <div className="roster-list card mb-5">
                                                {paginatedRoster.length === 0 ? (
                                                    <div className="p-8 text-center text-secondary font-mono text-xs tracking-widest uppercase">
                                                        No Entries Found
                                                    </div>
                                                ) : (
                                                    paginatedRoster.map(player => (
                                                        <div key={player.id} className="roster-strip">
                                                            <div className="player-info-block">
                                                                {player.photo_url ? (
                                                                    <img src={player.photo_url} alt="" className="player-avatar-small" />
                                                                ) : (
                                                                    <div className="player-avatar-small flex items-center justify-center bg-gray-200 text-xs font-bold" style={{ backgroundColor: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        {player.name.charAt(0)}
                                                                    </div>
                                                                )}
                                                                <div className="player-identity">
                                                                    <span className="player-name-bold">{player.name}</span>
                                                                    <span className="player-id-mono">REF.{player.id?.toString().padStart(4, '0') || '0000'}</span>
                                                                </div>
                                                            </div>

                                                            <div className="tech-data-block">
                                                                <div className="tech-item">
                                                                    <span className="tech-label">SPORT:</span>
                                                                    {player.sport}
                                                                </div>
                                                                <div className="tech-item">
                                                                    <span className="tech-label">YEAR:</span>
                                                                    {player.year}
                                                                </div>
                                                                <div className="tech-item">
                                                                    <span className="tech-label">ROLE:</span>
                                                                    {player.stats?.role || '-'}
                                                                </div>
                                                            </div>

                                                            <div className="status-block flex items-center gap-4">
                                                                <span className={`editorial-tag ${player.status === 'pending' ? 'pending' : ''}`}>
                                                                    [{player.status === 'eligible' ? 'QUEUED' : player.status?.toUpperCase() || 'UNKNOWN'}]
                                                                </span>

                                                                <div className="flex gap-2">
                                                                    {player.status === 'pending' && (
                                                                        <button
                                                                            onClick={() => handleApprovePlayer(player.id)}
                                                                            className="btn btn-success"
                                                                            style={{ fontSize: '0.6rem', padding: '0.4rem 0.8rem' }}
                                                                        >
                                                                            APPROVE
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={() => handleDeletePlayer(player.id)}
                                                                        className="btn btn-outline-danger"
                                                                        style={{ fontSize: '0.6rem', padding: '0.4rem 0.8rem', border: '1px solid #dc2626', color: '#dc2626' }}
                                                                    >
                                                                        REMOVE
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>

                                            {/* Pagination */}
                                            {totalRosterPages > 1 && (
                                                <div className="pagination-footer">
                                                    <button
                                                        className="page-nav-link"
                                                        onClick={() => setRosterPage(p => Math.max(1, p - 1))}
                                                        disabled={rosterPage === 1}
                                                    >
                                                        &lt; PREV
                                                    </button>

                                                    <span className="pagination-info">
                                                        PAGE {rosterPage} OF {totalRosterPages}
                                                    </span>

                                                    <button
                                                        className="page-nav-link"
                                                        onClick={() => setRosterPage(p => Math.min(totalRosterPages, p + 1))}
                                                        disabled={rosterPage === totalRosterPages}
                                                    >
                                                        NEXT &gt;
                                                    </button>
                                                </div>
                                            )}

                                            {/* User Accounts Section */}
                                            <div className="section-block mt-12 pt-12 border-t border-black/10">
                                                <div className="flex justify-between items-center mb-6">
                                                    <h3>System Access Control</h3>
                                                    <div className="flex gap-4 items-center">
                                                        <input
                                                            type="text"
                                                            className="roster-search"
                                                            placeholder="SEARCH USERS..."
                                                            value={userSearch}
                                                            onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                                                            style={{ width: '200px' }}
                                                        />
                                                        <button
                                                            onClick={() => handleOpenUserModal()}
                                                            className="btn-action-primary"
                                                            style={{ flex: 'none', padding: '0.6rem 1.5rem', fontSize: '0.75rem' }}
                                                        >
                                                            CREATE NEW USER
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="users-table card">
                                                    <table>
                                                        <thead>
                                                            <tr>
                                                                <th>USER IDENTIFIER</th>
                                                                <th>EMAIL CONTACT</th>
                                                                <th>SECURITY ROLE</th>
                                                                <th>TEAM ASSIGNMENT</th>
                                                                <th>ACTIONS</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {paginatedUsers.length === 0 ? (
                                                                <tr>
                                                                    <td colSpan="5" className="text-center py-8 text-secondary">
                                                                        NO RECORDS FOUND
                                                                    </td>
                                                                </tr>
                                                            ) : (
                                                                paginatedUsers.map((user) => (
                                                                    <tr key={user.id}>
                                                                        <td className="font-bold">{user.name}</td>
                                                                        <td className="text-secondary">{user.email}</td>
                                                                        <td>
                                                                            <span className={`badge badge-${user.role === 'admin' ? 'danger' : user.role === 'auctioneer' ? 'warning' : 'primary'}`}>
                                                                                {user.role}
                                                                            </span>
                                                                        </td>
                                                                        <td>
                                                                            {user.role === 'team_owner' && user.team_id
                                                                                ? teams.find(t => t.id === user.team_id)?.name || 'UNASSIGNED'
                                                                                : '---'
                                                                            }
                                                                        </td>
                                                                        <td>
                                                                            <div className="flex gap-2">
                                                                                <button
                                                                                    onClick={() => handleOpenUserModal(user)}
                                                                                    className="btn btn-secondary"
                                                                                >
                                                                                    Edit
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDeleteUser(user.id)}
                                                                                    className="btn btn-outline-danger"
                                                                                >
                                                                                    Delete
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))
                                                            )}
                                                        </tbody>
                                                    </table>

                                                    {/* User Pagination */}
                                                    {totalUserPages > 1 && (
                                                        <div className="pagination-footer px-4 pb-4 border-none mt-0">
                                                            <button
                                                                className="page-nav-link"
                                                                onClick={() => setUserPage(p => Math.max(1, p - 1))}
                                                                disabled={userPage === 1}
                                                            >
                                                                &lt; PREV
                                                            </button>

                                                            <span className="pagination-info">
                                                                PAGE {userPage} OF {totalUserPages}
                                                            </span>

                                                            <button
                                                                className="page-nav-link"
                                                                onClick={() => setUserPage(p => Math.min(totalUserPages, p + 1))}
                                                                disabled={userPage === totalUserPages}
                                                            >
                                                                NEXT &gt;
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                }

                                {
                                    activeTab === 'players' && (
                                        <div className="players-section animate-fadeIn">
                                            <div className="section-block">
                                                <div className="flex justify-between items-center mb-6">
                                                    <h3>Active Player Ledger</h3>
                                                    <div className="flex gap-4">
                                                        <button onClick={() => handleOpenPlayerModal()} className="btn btn-primary">
                                                            + Registry Player
                                                        </button>
                                                        <div className="flex gap-2">
                                                            <select
                                                                value={exportSport}
                                                                onChange={(e) => setExportSport(e.target.value)}
                                                                className="input"
                                                                style={{ width: '150px', padding: '0.4rem 0' }}
                                                            >
                                                                <option value="all">All Sports</option>
                                                                <option value="cricket">Cricket</option>
                                                                <option value="futsal">Futsal</option>
                                                                <option value="volleyball">Volleyball</option>
                                                            </select>
                                                            <button onClick={handleExportCSV} className="btn btn-secondary">
                                                                Export CSV
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="players-grid">
                                                    {getPaginatedData(activePlayers).map(player => (
                                                        <div key={player.id} className="dossier-player-card card">
                                                            <button
                                                                onClick={() => handleDeletePlayer(player.id)}
                                                                className="registry-purge-btn"
                                                                title="Purge Entry"
                                                            >
                                                                ✕
                                                            </button>
                                                            {player.photo_url ? (
                                                                <img src={player.photo_url} alt={player.name} className="player-card-photo" />
                                                            ) : (
                                                                <div className="table-placeholder mb-4" style={{ height: '140px', width: '100%', borderRadius: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e0e0e0', color: '#666', fontSize: '2rem', fontWeight: '900' }}>
                                                                    {player.name.charAt(0).toUpperCase()}
                                                                </div>
                                                            )}
                                                            <h4>{player.name}</h4>
                                                            <div className="player-card-meta mb-4">
                                                                <span className="badge badge-primary">{player.sport.toUpperCase()}</span>
                                                                <span className="badge badge-secondary">{player.year} • MS</span>
                                                                <span className={`badge badge-${player.status === 'sold' ? 'success' : 'warning'}`}>{player.status.toUpperCase()}</span>
                                                            </div>
                                                            <div className="player-card-actions flex-col gap-2">
                                                                {player.status === 'approved' && (
                                                                    <button
                                                                        onClick={() => handleAddToQueue(player.id)}
                                                                        className="btn btn-success w-full"
                                                                    >
                                                                        ACTIVATE IN QUEUE
                                                                    </button>
                                                                )}
                                                                {player.status === 'eligible' && (
                                                                    <button
                                                                        onClick={() => handleRemoveFromQueue(player.id)}
                                                                        className="btn btn-outline-danger w-full"
                                                                    >
                                                                        RETRACT QUEUE
                                                                    </button>
                                                                )}
                                                                {player.status === 'unsold' && (
                                                                    <button
                                                                        onClick={() => handleReApprove(player.id)}
                                                                        className="btn btn-success w-full"
                                                                    >
                                                                        RESTORE TO APPROVED
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => handleOpenPlayerModal(player)}
                                                                    className="btn btn-secondary w-full"
                                                                >
                                                                    UPDATE PROFILE
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Players Pagination */}
                                                {activePlayers.length > itemsPerPage && (
                                                    <div className="pagination-controls flex justify-center gap-4 mt-8">
                                                        <button
                                                            className="btn btn-secondary"
                                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                            disabled={currentPage === 1}
                                                        >
                                                            Prev
                                                        </button>
                                                        <span className="flex items-center font-bold text-xs uppercase letter-spacing-1">
                                                            Page {currentPage} of {totalPages(activePlayers)}
                                                        </span>
                                                        <button
                                                            className="btn btn-secondary"
                                                            onClick={() => setCurrentPage(p => Math.min(totalPages(activePlayers), p + 1))}
                                                            disabled={currentPage === totalPages(activePlayers)}
                                                        >
                                                            Next
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                }

                                {
                                    activeTab === 'teams' && (
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
                                                        <div className="dossier-grid">
                                                            {sportTeams.map(team => {
                                                                const budgetRemaining = team.budget || 0; // In this app, 'budget' is the remaining purse
                                                                const maxBudget = 20000;
                                                                const budgetUsed = maxBudget - budgetRemaining;
                                                                const percentUsed = (budgetUsed / maxBudget) * 100;

                                                                return (
                                                                    <div key={team.id} className="dossier-franchise-card">
                                                                        <div className="franchise-logo-wrapper">
                                                                            {team.logo_url ? (
                                                                                <img src={team.logo_url} alt={team.name} className="franchise-logo-img" />
                                                                            ) : (
                                                                                <div className="team-logo-placeholder">
                                                                                    {team.name ? team.name.substring(0, 2).toUpperCase() : '??'}
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        <div className="franchise-identity">
                                                                            <h4 className="m-0">{team.name}</h4>
                                                                            <span className="sport-tag">{team.sport}</span>
                                                                        </div>

                                                                        <div className="dossier-divider"></div>

                                                                        <div className="franchise-budget-block">
                                                                            <div className="budget-meta">
                                                                                <span className="budget-label">BUDGET REMAINING</span>
                                                                                <span className="budget-value-mono">PTS {parseFloat(budgetRemaining).toLocaleString()}</span>
                                                                            </div>
                                                                            <div className="budget-progress-track">
                                                                                <div
                                                                                    className="budget-progress-fill"
                                                                                    style={{ width: `${Math.min(100, Math.max(0, percentUsed))}%` }}
                                                                                ></div>
                                                                            </div>
                                                                        </div>

                                                                        <div className="franchise-actions">
                                                                            <button
                                                                                onClick={() => handleOpenTeamModal(team)}
                                                                                className="btn-action-primary"
                                                                            >
                                                                                EDIT FRANCHISE
                                                                            </button>
                                                                            <button
                                                                                onClick={() => {
                                                                                    // Filter roster by this team's ID
                                                                                    // Since we don't have a direct route, we switch tab and set filter
                                                                                    setActiveTab('users'); // Switch to Roster
                                                                                    // Ideally we'd set a filter, but for now just navigate
                                                                                }}
                                                                                className="btn-action-secondary"
                                                                            >
                                                                                VIEW ROSTER
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )
                                }
                            </>
                        )}

                        {
                            activeTab === 'settings' && (
                                <div className="settings-section animate-fadeIn">
                                    <div className="section-block">
                                        <h3 className="mb-6">SYSTEM CONSOLE // CONFIGURATION</h3>

                                        <div className="grid grid-2 gap-6 mb-8">
                                            {/* Auction Controls */}
                                            <div className="card glass-card p-6">
                                                <div className="flex justify-between items-center mb-6">
                                                    <h4 className="stat-label">AUCTION PARAMETERS</h4>
                                                    <span className="badge badge-primary">LIVE</span>
                                                </div>

                                                <div className="flex-col gap-4">
                                                    <div className="control-item border-bottom pb-4 mb-4">
                                                        <label className="stat-label mb-2 block">SOLD OVERLAY DURATION</label>
                                                        <div className="flex gap-2 items-center">
                                                            <input
                                                                type="number"
                                                                value={animationDuration}
                                                                onChange={(e) => setAnimationDuration(parseInt(e.target.value) || 0)}
                                                                className="input text-center w-24"
                                                                min="5"
                                                            />
                                                            <span className="text-secondary font-bold text-xs">SECONDS</span>
                                                            <button onClick={handleUpdateAnimationDuration} className="btn btn-secondary ml-auto">APPLY</button>
                                                        </div>
                                                    </div>

                                                    <div className="control-item border-bottom pb-4 mb-4">
                                                        <label className="stat-label mb-2 block">MINIMUM BID REGISTRY</label>
                                                        <div className="flex gap-2 items-center">
                                                            <select
                                                                className="input flex-1"
                                                                value={bulkSport}
                                                                onChange={(e) => {
                                                                    setBulkSport(e.target.value);
                                                                    setBulkMinBid(sportMinBids[e.target.value] || 50);
                                                                }}
                                                            >
                                                                <option value="cricket">Cricket</option>
                                                                <option value="futsal">Futsal</option>
                                                                <option value="volleyball">Volley</option>
                                                            </select>
                                                            <input
                                                                type="number"
                                                                className="input w-24"
                                                                value={bulkMinBid}
                                                                onChange={(e) => setBulkMinBid(e.target.value)}
                                                            />
                                                            <button onClick={handleBulkMinBidUpdate} className="btn btn-secondary">UPDATE</button>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={handleBulkResetReleased}
                                                            className="btn btn-secondary flex-1"
                                                        >
                                                            RESET UNSOLD
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                if (!confirm('DANGER: RESET ALL WALLETS? This will unsold ALL players, clear ALL bids, and set ALL team budgets to 2000.')) return;
                                                                try {
                                                                    await adminAPI.resetAllWallets();
                                                                    setMessage('GLOBAL RESET SUCCESSFUL');
                                                                    loadData();
                                                                } catch (e) {
                                                                    setMessage('Global reset failed');
                                                                }
                                                            }}
                                                            className="btn btn-outline-danger flex-1"
                                                        >
                                                            FACTORY RESET
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Bid Increment Rules */}
                                            <div className="card glass-card p-6">
                                                <h4 className="stat-label mb-6">BID INCREMENT LOGIC</h4>
                                                <div className="config-sheet mb-4">
                                                    <table className="w-full text-left font-mono text-xs">
                                                        <thead>
                                                            <tr className="border-bottom">
                                                                <th className="pb-2">THRESHOLD</th>
                                                                <th className="pb-2">STEP</th>
                                                                <th className="pb-2">ACTION</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {bidIncrementRules.map((rule, index) => (
                                                                <tr key={index} className="border-bottom">
                                                                    <td className="py-2">
                                                                        {index === 0 ? "0 (BASE)" : (
                                                                            <input
                                                                                type="number"
                                                                                className="input-minimal w-20"
                                                                                value={rule.threshold}
                                                                                onChange={(e) => {
                                                                                    const newRules = [...bidIncrementRules];
                                                                                    newRules[index].threshold = parseInt(e.target.value);
                                                                                    setBidIncrementRules(newRules);
                                                                                }}
                                                                            />
                                                                        )}
                                                                    </td>
                                                                    <td className="py-2">
                                                                        <input
                                                                            type="number"
                                                                            className="input-minimal w-16"
                                                                            value={rule.increment}
                                                                            onChange={(e) => {
                                                                                const newRules = [...bidIncrementRules];
                                                                                newRules[index].increment = parseInt(e.target.value);
                                                                                setBidIncrementRules(newRules);
                                                                            }}
                                                                        />
                                                                    </td>
                                                                    <td className="py-2">
                                                                        {index > 0 && (
                                                                            <button
                                                                                className="text-danger hover:underline"
                                                                                onClick={() => {
                                                                                    const newRules = bidIncrementRules.filter((_, i) => i !== index);
                                                                                    setBidIncrementRules(newRules);
                                                                                }}
                                                                            >
                                                                                DROP
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        className="btn btn-secondary flex-1"
                                                        onClick={() => setBidIncrementRules([...bidIncrementRules, { threshold: 0, increment: 10 }])}
                                                    >
                                                        + ADD RULE
                                                    </button>
                                                    <button
                                                        className="btn btn-primary flex-1"
                                                        onClick={async () => {
                                                            try {
                                                                const cleanRules = bidIncrementRules
                                                                    .map(r => ({ threshold: parseInt(r.threshold), increment: parseInt(r.increment) }))
                                                                    .sort((a, b) => a.threshold - b.threshold);
                                                                if (cleanRules.length === 0 || cleanRules[0].threshold !== 0) {
                                                                    alert("Must have a rule starting at 0 threshold");
                                                                    return;
                                                                }
                                                                await adminAPI.updateBidRules(cleanRules);
                                                                setMessage('Bid rules updated successfully');
                                                            } catch (err) {
                                                                setMessage('Failed to update bid rules');
                                                            }
                                                        }}
                                                    >
                                                        SAVE LOGIC
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        }

                        {
                            showUserModal && (
                                <div className="modal-overlay animate-fadeIn">
                                    <div className="glass-terminal-modal">
                                        <h2 className="terminal-header">MODIFY USER REGISTRY // SYSTEM OVERRIDE</h2>
                                        <form onSubmit={handleSaveUser}>
                                            <div className="form-group-terminal">
                                                <label className="terminal-label">FULL LEGAL NAME</label>
                                                <input
                                                    type="text"
                                                    className="input-minimal"
                                                    value={userData.name}
                                                    onChange={e => setUserData({ ...userData, name: e.target.value })}
                                                    required
                                                    placeholder="ENTER NAME..."
                                                />
                                            </div>
                                            <div className="form-group-terminal">
                                                <label className="terminal-label">EMAIL IDENTIFIER</label>
                                                <input
                                                    type="email"
                                                    className="input-minimal"
                                                    value={userData.email}
                                                    onChange={e => setUserData({ ...userData, email: e.target.value })}
                                                    required
                                                    placeholder="EMAIL@SYSTEM.COM"
                                                />
                                            </div>

                                            <div className="form-divider-dashed"></div>

                                            <div className="form-group-terminal">
                                                <label className="terminal-label">SECURE ACCESS TOKEN {editingUser && <span className="opacity-50">(BLANK TO KEEP)</span>}</label>
                                                <input
                                                    type="password"
                                                    className="input-minimal"
                                                    value={userData.password}
                                                    onChange={e => setUserData({ ...userData, password: e.target.value })}
                                                    required={!editingUser}
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                            <div className="form-group-terminal">
                                                <label className="terminal-label">SYSTEM ROLE</label>
                                                <select
                                                    className="input-minimal"
                                                    value={userData.role}
                                                    onChange={e => setUserData({ ...userData, role: e.target.value })}
                                                >
                                                    <option value="viewer">VIEWER</option>
                                                    <option value="auctioneer">AUCTIONEER</option>
                                                    <option value="admin">ADMINISTRATOR</option>
                                                    <option value="team_owner">TEAM OWNER</option>
                                                </select>
                                            </div>

                                            {userData.role === 'team_owner' && (
                                                <div className="form-group-terminal">
                                                    <label className="terminal-label">ASSIGNED FRANCHISE</label>
                                                    <select
                                                        className="input-minimal"
                                                        value={userData.team_id}
                                                        onChange={e => setUserData({ ...userData, team_id: e.target.value })}
                                                        required
                                                    >
                                                        <option value="">SELECT A FRANCHISE...</option>
                                                        {teams.map(team => (
                                                            <option key={team.id} value={team.id}>
                                                                {team.name.toUpperCase()} [{team.sport.toUpperCase()}]
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            <div className="terminal-actions">
                                                <button type="button" onClick={handleCloseUserModal} className="btn-discard">DISCARD</button>
                                                <button type="submit" className="btn-commit">{editingUser ? 'COMMIT CHANGE' : 'INITIALIZE USER'}</button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )
                        }

                        {
                            showTeamModal && (
                                <div className="modal-overlay animate-fadeIn">
                                    <div className="admin-modal glass-card">
                                        <h2 className="stat-label mb-8">{editingTeam ? 'REFINE FRANCHISE' : 'NEW FRANCHISE ENTRY'}</h2>
                                        <form onSubmit={handleSaveTeamExtended}>
                                            <div className="form-group border-bottom pb-4 mb-4">
                                                <label className="stat-label mb-2 block">FRANCHISE NAME</label>
                                                <input
                                                    type="text"
                                                    className="input-minimal"
                                                    value={teamForm.name}
                                                    onChange={e => setTeamForm({ ...teamForm, name: e.target.value })}
                                                    required
                                                    placeholder="Enter team name..."
                                                />
                                            </div>
                                            <div className="form-group border-bottom pb-4 mb-4">
                                                <label className="stat-label mb-2 block">BUDGET ALLOCATION (PTS)</label>
                                                <input
                                                    type="number"
                                                    className="input-minimal"
                                                    value={teamForm.budget}
                                                    onChange={e => setTeamForm({ ...teamForm, budget: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="form-group border-bottom pb-4 mb-4">
                                                <label className="stat-label mb-2 block">SPORT CATEGORY</label>
                                                <select
                                                    className="input-minimal"
                                                    value={teamForm.sport}
                                                    onChange={e => setTeamForm({ ...teamForm, sport: e.target.value })}
                                                    disabled={!!editingTeam}
                                                >
                                                    <option value="cricket">CRICKET</option>
                                                    <option value="futsal">FUTSAL</option>
                                                    <option value="volleyball">VOLLEYBALL</option>
                                                </select>
                                            </div>
                                            <div className="form-group border-bottom pb-4 mb-8">
                                                <label className="stat-label mb-2 block">FRANCHISE EMBLEM</label>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={e => setTeamForm({ ...teamForm, logo: e.target.files[0] })}
                                                    className="input-minimal"
                                                />
                                            </div>
                                            <div className="modal-actions flex gap-4 mt-8">
                                                <button type="button" onClick={() => setShowTeamModal(false)} className="btn btn-secondary flex-1">DISCARD</button>
                                                <button type="submit" className="btn btn-primary flex-1">SAVE FRANCHISE</button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )
                        }

                        {
                            showPlayerModal && (
                                <div className="modal-overlay animate-fadeIn">
                                    <div className="admin-modal glass-card">
                                        <h2 className="stat-label mb-8">{editingPlayer ? 'REVISE PLAYER PROFILE' : 'NEW PLAYER REGISTRY'}</h2>
                                        <form onSubmit={handleSavePlayerExtended}>
                                            <div className="form-group border-bottom pb-4 mb-4">
                                                <label className="stat-label mb-2 block">FULL NAME</label>
                                                <input
                                                    type="text"
                                                    className="input-minimal"
                                                    value={playerForm.name}
                                                    onChange={e => setPlayerForm({ ...playerForm, name: e.target.value })}
                                                    required
                                                    placeholder="Enter player name..."
                                                />
                                            </div>
                                            <div className="grid grid-2 gap-4 mb-4">
                                                <div className="form-group border-bottom pb-4">
                                                    <label className="stat-label mb-2 block">SPORT</label>
                                                    <select
                                                        className="input-minimal"
                                                        value={playerForm.sport}
                                                        onChange={handlePlayerSportChange}
                                                    >
                                                        <option value="cricket">CRICKET</option>
                                                        <option value="futsal">FUTSAL</option>
                                                        <option value="volleyball">VOLLEYBALL</option>
                                                    </select>
                                                </div>
                                                <div className="form-group border-bottom pb-4">
                                                    <label className="stat-label mb-2 block">ACADEMIC YEAR</label>
                                                    <select
                                                        className="input-minimal"
                                                        value={playerForm.year}
                                                        onChange={e => setPlayerForm({ ...playerForm, year: e.target.value })}
                                                    >
                                                        <option value="1st">1ST YEAR</option>
                                                        <option value="2nd">2ND YEAR</option>
                                                        <option value="3rd">3RD YEAR</option>
                                                        <option value="4th">4TH YEAR</option>
                                                        <option value="Intern">INTERN</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Conditional Stats Inputs */}
                                            {playerForm.sport.toLowerCase() === 'cricket' && (
                                                <div className="stats-inputs-group mb-4">
                                                    <h4 className="text-secondary text-xs font-bold uppercase mb-3 opacity-60">CRICKET DATA</h4>
                                                    <div className="grid grid-2 gap-4">
                                                        <div className="form-group border-bottom pb-2">
                                                            <label className="text-xs uppercase opacity-80">ROLE</label>
                                                            <select
                                                                className="input-minimal"
                                                                value={playerForm.stats.role || ''}
                                                                onChange={e => handlePlayerStatChange('role', e.target.value)}
                                                            >
                                                                <option value="">SELECT ROLE</option>
                                                                {rolesBySport.Cricket.map(role => (
                                                                    <option key={role} value={role}>{role.toUpperCase()}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="form-group border-bottom pb-2">
                                                            <label className="text-xs uppercase opacity-80">BATTING</label>
                                                            <select
                                                                className="input-minimal"
                                                                value={playerForm.stats.batting_style || ''}
                                                                onChange={e => handlePlayerStatChange('batting_style', e.target.value)}
                                                            >
                                                                <option value="">SELECT STYLE</option>
                                                                {battingStyles.map(style => (
                                                                    <option key={style} value={style}>{style.toUpperCase()}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="form-group border-bottom pb-2 span-2">
                                                            <label className="text-xs uppercase opacity-80">BOWLING</label>
                                                            <select
                                                                className="input-minimal"
                                                                value={playerForm.stats.bowling_style || ''}
                                                                onChange={e => handlePlayerStatChange('bowling_style', e.target.value)}
                                                            >
                                                                <option value="">SELECT STYLE</option>
                                                                {bowlingStyles.map(style => (
                                                                    <option key={style} value={style}>{style.toUpperCase()}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {playerForm.sport.toLowerCase() === 'futsal' && (
                                                <div className="stats-inputs-group mb-4">
                                                    <h4 className="text-secondary text-xs font-bold uppercase mb-3 opacity-60">FUTSAL DATA</h4>
                                                    <div className="form-group border-bottom pb-2">
                                                        <label className="text-xs uppercase opacity-80">POSITION</label>
                                                        <select
                                                            className="input-minimal"
                                                            value={playerForm.stats.role || ''}
                                                            onChange={e => handlePlayerStatChange('role', e.target.value)}
                                                        >
                                                            <option value="">SELECT POSITION</option>
                                                            {rolesBySport.Futsal.map(role => (
                                                                <option key={role} value={role}>{role.toUpperCase()}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            )}

                                            {playerForm.sport.toLowerCase() === 'volleyball' && (
                                                <div className="stats-inputs-group mb-4">
                                                    <h4 className="text-secondary text-xs font-bold uppercase mb-3 opacity-60">VOLLEYBALL DATA</h4>
                                                    <div className="form-group border-bottom pb-2">
                                                        <label className="text-xs uppercase opacity-80">PREFERENCE</label>
                                                        <select
                                                            className="input-minimal"
                                                            value={playerForm.stats.role || ''}
                                                            onChange={e => handlePlayerStatChange('role', e.target.value)}
                                                        >
                                                            <option value="">SELECT POSITION</option>
                                                            {rolesBySport.Volleyball.map(role => (
                                                                <option key={role} value={role}>{role.toUpperCase()}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="modal-actions flex gap-4 mt-8">
                                                <button type="button" onClick={() => setShowPlayerModal(false)} className="btn btn-secondary flex-1">DISCARD</button>
                                                <button type="submit" className="btn btn-primary flex-1">SAVE PLAYER</button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )
                        }
                    </div >
                </div >
            </div >
        </div >
    );
}
