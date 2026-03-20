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
    const [bidRules, setBidRules] = useState([
        { threshold: 0, increment: 10 },
        { threshold: 200, increment: 50 },
        { threshold: 500, increment: 100 }
    ]); // Cosmetic bid rules state to fix crash
    const [nuclearArmed, setNuclearArmed] = useState(false); // Nuclear toggle state
    const [testgroundsLocked, setTestgroundsLocked] = useState(false); // Lockdown state

    // Roster Tab State
    const [rosterFilter, setRosterFilter] = useState('ALL');
    const [rosterSearch, setRosterSearch] = useState('');
    const [rosterPage, setRosterPage] = useState(1);

    // User Tab State
    const [userSearch, setUserSearch] = useState('');
    const [userPage, setUserPage] = useState(1);

    // Players Tab State
    const [playersSportFilter, setPlayersSportFilter] = useState('ALL');
    const [playersPage, setPlayersPage] = useState(1);

    // User Modal State
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [userData, setUserData] = useState({ name: '', email: '', password: '', role: 'viewer' });

    // Console Tab State
    const [consoleLocked, setConsoleLocked] = useState(true);
    const [consoleLogs, setConsoleLogs] = useState([
        { id: 1, timestamp: '10:42:05', level: 'INFO', message: 'SYSTEM_INIT // REF.001', type: 'info' },
        { id: 2, timestamp: '10:42:08', level: 'INFO', message: 'WEBSOCKET_ENGINE :: ONLINE', type: 'info' },
        { id: 3, timestamp: '10:45:12', level: 'WARN', message: 'LATENCY_SPIKE // 120ms', type: 'warn' },
        { id: 4, timestamp: '10:48:30', level: 'INFO', message: 'USER_LOGIN // ADMIN_01', type: 'info' },
        { id: 5, timestamp: '10:50:00', level: 'ERROR', message: 'BID_REJECTED // INSUFFICIENT_FUNDS', type: 'error' },
    ]);

    // History Tab State


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
        // Mock Live Logs Generator
        const interval = setInterval(() => {
            const types = ['INFO', 'INFO', 'INFO', 'WARN', 'ERROR'];
            const messages = [
                'Socket::Heartbeat // ACK',
                'User::Auth_Token // REFRESHED',
                'Auction::Bid_Stream // SYNC_OK',
                'Database::Query_Time // 12ms',
                'System::Memory_Usage // 45%',
                'API::POST /bid // 200 OK',
                'Socket::Connection_Lost // RECONNECTING...',
                'Admin::Action // LOG_VIEW',
            ];
            const randomType = types[Math.floor(Math.random() * types.length)];
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];

            setConsoleLogs(prev => {
                const newLog = {
                    id: Date.now(),
                    timestamp: new Date().toLocaleTimeString(),
                    level: randomType === 'INFO' ? ' OK ' : randomType === 'ERROR' ? ' !! ' : randomType,
                    message: randomType === 'ERROR' ? 'CRITICAL::' + randomMessage.toUpperCase() : randomMessage,
                    type: randomType === 'INFO' ? 'ok-high' : randomType === 'ERROR' ? 'error-high' : randomType.toLowerCase()
                };
                return [...prev.slice(-14), newLog]; // Keep last 15
            });
        }, 4000);

        return () => clearInterval(interval);
    }, []);

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
                setTestgroundsLocked(stateResponse.data.testgrounds_locked || false);
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
                // Also fetch users to populate Owner dropdown
                const usersRes = await adminAPI.getAllUsers();
                setUsers(usersRes.data.users);
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

    const handleToggleLockdown = async () => {
        try {
            const newState = !testgroundsLocked;
            await adminAPI.toggleTestgroundsLockdown(newState);
            setTestgroundsLocked(newState);
            setMessage(`System is now ${newState ? 'LOCKED (Hiding Test Teams)' : 'UNLOCKED (Showing All Teams)'}`);
        } catch (err) {
            setMessage('Failed to update lockdown state');
        }
    };

    const handleResetAll = async () => {
        if (!confirm('⚠️ CRITICAL: This will reset ALL team wallets and unsell ALL players. Continue?')) return;
        try {
            await adminAPI.resetAllWallets();
            setMessage('System reset completed successfully');
            loadData();
        } catch (err) {
            console.error(err);
            setMessage('Failed to execute system reset');
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
            setTeamForm({ name: team.name, sport: team.sport, budget: team.budget, logo: null, owner_id: team.owner_id || '' }); // Include owner_id
        } else {
            setEditingTeam(null);
            setTeamForm({ name: '', sport: 'cricket', budget: 100000, logo: null, owner_id: '' });
        }
        setShowTeamModal(true);
    };

    const handleSaveTeamExtended = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('name', teamForm.name);
            formData.append('budget', teamForm.budget);
            if (teamForm.owner_id) formData.append('owner_id', teamForm.owner_id); // Append owner_id
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

    // Bid Rules Handlers
    const handleUpdateBidRules = async () => {
        try {
            // Sort by threshold
            const sorted = [...bidIncrementRules].sort((a, b) => a.threshold - b.threshold);
            await adminAPI.updateBidRules(sorted);
            setMessage('Bid increment rules updated');
            setBidIncrementRules(sorted);
        } catch (err) {
            setMessage('Failed to update bid rules');
        }
    };

    const addBidRule = () => {
        setBidIncrementRules([...bidIncrementRules, { threshold: 0, increment: 10 }]);
    };

    const removeBidRule = (index) => {
        const newRules = [...bidIncrementRules];
        newRules.splice(index, 1);
        setBidIncrementRules(newRules);
    };

    const updateBidRule = (index, field, value) => {
        const newRules = [...bidIncrementRules];
        newRules[index] = { ...newRules[index], [field]: parseInt(value) || 0 };
        setBidIncrementRules(newRules);
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
                        <div className="system-notification-banner animate-slideInTop">
                            <div className="notification-content">
                                <span className="status-dot pulsing"></span>
                                <span className="notification-text text-mono">{message.toUpperCase()}</span>
                            </div>
                            <button onClick={() => setMessage('')} className="btn-dismiss-notification">
                                [DISMISS]
                            </button>
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
                            Registrations
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
                            Teams
                        </button>

                        <button
                            className={`tab-btn ${activeTab === 'console' ? 'active' : ''}`}
                            onClick={() => setActiveTab('console')}
                        >
                            CONSOLE
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
                                            <div className="roster-ledger-container glass-card">
                                                {paginatedRoster.length === 0 ? (
                                                    <div className="ledger-empty-state">
                                                        NO ENTRIES FOUND IN DATABASE
                                                    </div>
                                                ) : (
                                                    <div className="ledger-data-strips">
                                                        {paginatedRoster.map(player => (
                                                            <div key={player.id} className="ledger-data-strip">
                                                                <div className="strip-photo">
                                                                    {player.photo_url ? (
                                                                        <img src={player.photo_url} alt={player.name} className="player-photo-ledger grayscale" />
                                                                    ) : (
                                                                        <div className="player-photo-ledger placeholder">
                                                                            {player.name.charAt(0)}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="strip-identity-ledger">
                                                                    <span className="player-name-ledger">{player.name}</span>
                                                                    <span className="player-ref-id">REF.{player.id?.toString().padStart(4, '0') || '0000'}</span>
                                                                </div>

                                                                <div className="strip-metadata">
                                                                    <div className="meta-item">
                                                                        <span className="meta-label">SPORT:</span>
                                                                        <span className="meta-value">{player.sport}</span>
                                                                    </div>
                                                                    <div className="meta-item">
                                                                        <span className="meta-label">YEAR:</span>
                                                                        <span className="meta-value">{player.year}</span>
                                                                    </div>
                                                                    <div className="meta-item">
                                                                        <span className="meta-label">ROLE:</span>
                                                                        <span className="meta-value">{player.stats?.role || '-'}</span>
                                                                    </div>
                                                                </div>

                                                                <div className="strip-status">
                                                                    <span className={`status-tag ${player.status === 'pending' ? 'pending' : player.status === 'eligible' ? 'eligible' : ''}`}>
                                                                        [ {player.status === 'eligible' ? 'QUEUED' : player.status?.toUpperCase() || 'UNKNOWN'} ]
                                                                    </span>
                                                                </div>

                                                                <div className="strip-actions-ledger">
                                                                    {player.status === 'pending' && (
                                                                        <button
                                                                            onClick={() => handleApprovePlayer(player.id)}
                                                                            className="btn-ledger-approve"
                                                                        >
                                                                            APPROVE
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={() => handleOpenPlayerModal(player)}
                                                                        className="btn-ledger-edit"
                                                                    >
                                                                        EDIT PLAYER
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeletePlayer(player.id)}
                                                                        className="btn-ledger-delete"
                                                                    >
                                                                        DELETE PLAYER
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
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
                                            {/* PLAYER DIRECTORY HEADER */}
                                            <div className="flex justify-between items-center mb-6">
                                                <h3 className="section-title text-2xl font-bold tracking-wider" style={{ color: 'var(--sage-deep)', letterSpacing: '2px' }}>PLAYER DIRECTORY</h3>

                                                <button
                                                    onClick={() => handleOpenPlayerModal()}
                                                    className="btn-settings-action"
                                                    style={{ width: 'auto', padding: '0.8rem 2rem', borderColor: 'var(--sage-accent)', color: 'var(--sage-accent)' }}
                                                >
                                                    + CREATE PLAYER
                                                </button>
                                            </div>

                                            {/* PLAYERS TABLE */}
                                            <div className="roster-ledger-container glass-card">
                                                {getPaginatedData(activePlayers).length === 0 ? (
                                                    <div className="ledger-empty-state">
                                                        NO PLAYERS FOUND
                                                    </div>
                                                ) : (
                                                    <div className="ledger-data-strips">
                                                        {getPaginatedData(activePlayers).map(player => (
                                                            <div key={player.id} className="ledger-data-strip">
                                                                <div className="strip-photo">
                                                                    {player.photo_url ? (
                                                                        <img src={player.photo_url} alt={player.name} className="player-photo-ledger grayscale" />
                                                                    ) : (
                                                                        <div className="player-photo-ledger placeholder">
                                                                            {player.name.charAt(0)}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="strip-identity-ledger">
                                                                    <span className="player-name-ledger">{player.name}</span>
                                                                    <span className="player-ref-id">REF.{player.id?.toString().padStart(4, '0') || '0000'}</span>
                                                                </div>

                                                                <div className="strip-metadata">
                                                                    <div className="meta-item">
                                                                        <span className="meta-label">SPORT:</span>
                                                                        <span className="meta-value">{player.sport}</span>
                                                                    </div>
                                                                    <div className="meta-item">
                                                                        <span className="meta-label">YEAR:</span>
                                                                        <span className="meta-value">{player.year}</span>
                                                                    </div>
                                                                    <div className="meta-item">
                                                                        <span className="meta-label">ROLE:</span>
                                                                        <span className="meta-value">{player.stats?.role || '-'}</span>
                                                                    </div>
                                                                </div>

                                                                <div className="strip-status">
                                                                    <span className={`status-tag ${player.status === 'pending' ? 'pending' : player.status === 'eligible' ? 'eligible' : ''}`}>
                                                                        [ {player.status === 'eligible' ? 'QUEUED' : player.status?.toUpperCase()} ]
                                                                    </span>
                                                                </div>

                                                                <div className="strip-actions-ledger">
                                                                    <button
                                                                        onClick={() => handleOpenPlayerModal(player)}
                                                                        className="btn-ledger-edit"
                                                                    >
                                                                        EDIT
                                                                    </button>

                                                                    <button
                                                                        onClick={() => handleDeletePlayer(player.id)}
                                                                        className="btn-ledger-delete"
                                                                    >
                                                                        DELETE
                                                                    </button>

                                                                    {player.status === 'approved' && (
                                                                        <button
                                                                            onClick={() => handleAddToQueue(player.id)}
                                                                            className="btn-ledger-approve"
                                                                        >
                                                                            + QUEUE
                                                                        </button>
                                                                    )}

                                                                    {player.status === 'eligible' && (
                                                                        <button
                                                                            onClick={() => handleRemoveFromQueue(player.id)}
                                                                            className="btn-ledger-delete"
                                                                            style={{ borderColor: '#f59e0b', color: '#f59e0b' }}
                                                                        >
                                                                            RETRACT
                                                                        </button>
                                                                    )}

                                                                    <button
                                                                        className="btn-ledger-delete"
                                                                        onClick={() => {
                                                                            if (player.status === 'unsold') handleReApprove(player.id);
                                                                        }}
                                                                        disabled={player.status !== 'unsold' && player.status !== 'sold'}
                                                                        style={{
                                                                            borderColor: '#60A5FA',
                                                                            color: '#60A5FA',
                                                                            opacity: (player.status !== 'unsold' && player.status !== 'sold') ? 0.3 : 1,
                                                                            cursor: (player.status !== 'unsold' && player.status !== 'sold') ? 'not-allowed' : 'pointer'
                                                                        }}
                                                                    >
                                                                        RESET
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Pagination */}
                                                {activePlayers.length > itemsPerPage && (
                                                    <div className="pagination-footer">
                                                        <button
                                                            className="page-nav-link"
                                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                            disabled={currentPage === 1}
                                                        >
                                                            &lt; PREV
                                                        </button>

                                                        <span className="pagination-info">
                                                            PAGE {currentPage} OF {totalPages(activePlayers)}
                                                        </span>

                                                        <button
                                                            className="page-nav-link"
                                                            onClick={() => setCurrentPage(p => Math.min(totalPages(activePlayers), p + 1))}
                                                            disabled={currentPage === totalPages(activePlayers)}
                                                        >
                                                            NEXT &gt;
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
                                                <button
                                                    onClick={() => handleOpenTeamModal()}
                                                    className="btn-action-primary"
                                                    style={{ flex: 'none', padding: '0.6rem 1.5rem', fontSize: '0.75rem' }}
                                                >
                                                    CREATE NEW TEAM
                                                </button>
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
                                                                    <div key={team.id} className="dossier-team-card">
                                                                        <div className="team-logo-wrapper">
                                                                            {team.logo_url ? (
                                                                                <img src={team.logo_url} alt={team.name} className="team-logo-img" />
                                                                            ) : (
                                                                                <div className="team-logo-placeholder">
                                                                                    {team.name ? team.name.substring(0, 2).toUpperCase() : '??'}
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        <div className="team-identity">
                                                                            <h4 className="m-0">{team.name}</h4>
                                                                            <span className="sport-tag">{team.sport}</span>
                                                                        </div>

                                                                        <div className="dossier-divider"></div>

                                                                        <div className="team-budget-block">
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

                                                                        <div className="team-actions">
                                                                            <button
                                                                                onClick={() => handleOpenTeamModal(team)}
                                                                                className="btn-action-primary"
                                                                            >
                                                                                EDIT TEAM
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





                                {
                                    activeTab === 'console' && (
                                        <div className="console-container animate-fadeIn">
                                            {/* System Status KPI Strip */}
                                            <div className="console-kpi-strip">
                                                <div className="console-kpi-item">
                                                    <span className="kpi-label">UPTIME</span>
                                                    <span className="kpi-value">14:02:11</span>
                                                </div>
                                                <span className="kpi-divider">///</span>
                                                <div className="console-kpi-item">
                                                    <span className="kpi-label">ACTIVE_WEBSOCKETS</span>
                                                    <span className="kpi-value text-sage">24</span>
                                                </div>
                                                <span className="kpi-divider">///</span>
                                                <div className="console-kpi-item">
                                                    <span className="kpi-label">DATABASE_LATENCY</span>
                                                    <span className="kpi-value text-gold">42ms</span>
                                                </div>
                                            </div>

                                            <div className="console-grid-layout">
                                                {/* Single Main Column for Console Settings */}
                                                <div className="col-span-full">

                                                    {/* NEW SETTINGS PANEL */}
                                                    <div className="settings-panel animate-fadeIn">
                                                        <div className="settings-header">
                                                            <h3 className="settings-title">AUCTION CONTROLS & SETTINGS</h3>
                                                        </div>

                                                        <div className="settings-grid-3">
                                                            {/* 1. Sold Overlay Duration */}
                                                            <div className="control-box">
                                                                <div>
                                                                    <label className="control-label">SOLD OVERLAY DURATION</label>
                                                                    <div className="control-input-group">
                                                                        <input
                                                                            type="number"
                                                                            value={animationDuration}
                                                                            onChange={(e) => setAnimationDuration(parseInt(e.target.value) || 0)}
                                                                            className="settings-input"
                                                                            min="5"
                                                                        />
                                                                        <span className="text-secondary font-bold text-xs opacity-50">SEC</span>
                                                                    </div>
                                                                </div>
                                                                <button onClick={handleUpdateAnimationDuration} className="btn-settings-action">SET</button>
                                                            </div>

                                                            {/* 2. Min Bids (Enhanced Editorial UI) */}
                                                            <div className="min-bid-standalone-card">
                                                                <div className="card-header-mono">
                                                                    MIN BIDS ({bulkMinBid})
                                                                </div>

                                                                <div className="card-body-flex">
                                                                    <div className="sport-selector-wrapper">
                                                                        <select
                                                                            className="sport-select-minimal"
                                                                            value={bulkSport}
                                                                            onChange={(e) => {
                                                                                setBulkSport(e.target.value);
                                                                                setBulkMinBid(sportMinBids[e.target.value] || 50);
                                                                            }}
                                                                        >
                                                                            <option value="cricket">Cricket</option>
                                                                            <option value="futsal">Futsal</option>
                                                                            <option value="volleyball">Volleyball</option>
                                                                        </select>
                                                                        <span className="chevron-icon"></span>
                                                                    </div>

                                                                    <div className="min-bid-value-display">
                                                                        <input
                                                                            type="number"
                                                                            className="value-input-large"
                                                                            value={bulkMinBid}
                                                                            onChange={(e) => setBulkMinBid(e.target.value)}
                                                                        />
                                                                        <div className="display-underline"></div>
                                                                    </div>
                                                                </div>

                                                                <button onClick={handleBulkMinBidUpdate} className="btn-update-minimal">
                                                                    UPDATE
                                                                </button>
                                                            </div>

                                                            {/* 3. Resets */}
                                                            <div className="control-box">
                                                                <div className="reset-grid">
                                                                    <button onClick={handleBulkResetReleased} className="btn-reset-unsold">
                                                                        RESET UNSOLD
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            if (confirm('CRITICAL: PERFORM GLOBAL RESET?')) handleResetAll();
                                                                        }}
                                                                        className="btn-global-reset-sm"
                                                                    >
                                                                        GLOBAL RESET
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* BID INCREMENT RULES (Integrated) */}
                                                        <div className="settings-table-container mt-12">
                                                            <div className="settings-header">
                                                                <h3 className="settings-title">BID INCREMENT RULES</h3>
                                                            </div>
                                                            <p className="text-secondary text-xs mb-6 opacity-60">
                                                                Configure how much the bid increases based on the current bid amount.
                                                            </p>

                                                            <div className="settings-table-header">
                                                                <span className="th-label">Threshold (Points)</span>
                                                                <span className="th-label">Increment (Points)</span>
                                                                <span className="th-label text-right">Action</span>
                                                            </div>

                                                            {bidRules.map((rule, index) => (
                                                                <div key={index} className="settings-table-row">
                                                                    <input
                                                                        type="number"
                                                                        className="table-input"
                                                                        value={rule.threshold}
                                                                        readOnly
                                                                    />
                                                                    <input
                                                                        type="number"
                                                                        className="table-input"
                                                                        value={rule.increment}
                                                                        readOnly
                                                                    />
                                                                    <div className="text-right">
                                                                        {rule.threshold !== 0 && (
                                                                            <button
                                                                                // Mock delete for now as requested by UI task, would need logic
                                                                                className="btn-delete-rule"
                                                                            >
                                                                                Delete
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            <div className="settings-footer">
                                                                <button className="btn-settings-action" style={{ width: 'auto', padding: '0.8rem 2rem' }}>
                                                                    + ADD RULE
                                                                </button>
                                                                <button className="btn-settings-action" style={{ width: 'auto', padding: '0.8rem 2rem', borderColor: 'var(--sage-accent)', color: 'var(--sage-accent)' }}>
                                                                    SAVE RULES
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Terminal moved below or kept? User said "refresh console settings", didn't say remove terminal. 
                                                            But checking screenshot, it seems to take full width. 
                                                            I'll keep the terminal below for debugging if needed, or maybe user meant this IS the console tab.
                                                            The screenshot shows "AUCTION SETTINGS" as the main view.
                                                            I will keep the terminal but verify placement. */ }
                                            </div>

                                            <div className="console-log-wrapper mt-8">
                                                <div className="terminal-window h-48">
                                                    {consoleLogs.map(log => (
                                                        <div key={log.id} className="log-entry">
                                                            <span className="log-time">[{log.timestamp}]</span>
                                                            <span className={`log-tag ${log.type === 'ok-high' ? 'tag-ok-high' : log.type === 'error-high' ? 'tag-error-high' : 'tag-' + log.type}`}>[{log.level}]</span>
                                                            <span className="log-message">{log.message}</span>
                                                        </div>
                                                    ))}
                                                    <div className="terminal-cursor">_</div>
                                                </div>
                                            </div>

                                            {/* Nuclear Override (The big red one) - Kept at bottom as requested */}
                                            <div className="col-span-full mt-8">
                                                <div className="nuclear-override-section">
                                                    <h3 className="settings-title mb-6" style={{ color: '#000' }}>NUCLEAR OVERRIDE</h3>

                                                    <div className="flex flex-col items-center gap-6">
                                                        <div className="nuclear-toggle-wrapper">
                                                            <span className="nuclear-status-label" style={{ color: nuclearArmed ? '#D32F2F' : '#2e7d32' }}>
                                                                {nuclearArmed ? 'ARMED' : 'SAFE'}
                                                            </span>
                                                            <label className="nuclear-toggle">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={nuclearArmed}
                                                                    onChange={(e) => setNuclearArmed(e.target.checked)}
                                                                />
                                                                <span className="nuclear-slider"></span>
                                                            </label>
                                                        </div>

                                                        <p className="text-secondary text-xs max-w-md mx-auto opacity-70 mb-4">
                                                            ENABLE TO UNLOCK SYSTEM RESET PROTOCOLS. THIS ACTION CANNOT BE UNDONE.
                                                        </p>

                                                        <button
                                                            onClick={handleResetAll}
                                                            disabled={!nuclearArmed}
                                                            className="btn-execute-wipe"
                                                        >
                                                            EXECUTE SYSTEM FLUSH
                                                        </button>
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
                                            <div className="glass-terminal-modal">
                                                <h2 className="terminal-header">{editingTeam ? 'REFINE TEAM DOSSIER' : 'NEW ACTIVE TEAM ENTRY'}</h2>
                                                <form onSubmit={handleSaveTeamExtended}>
                                                    <div className="form-group-terminal">
                                                        <label className="terminal-label">FRANCHISE IDENTITY</label>
                                                        <input
                                                            type="text"
                                                            className="input-minimal"
                                                            value={teamForm.name}
                                                            onChange={e => setTeamForm({ ...teamForm, name: e.target.value })}
                                                            required
                                                            placeholder="ENTER TEAM NAME..."
                                                        />
                                                    </div>
                                                    <div className="form-group-terminal">
                                                        <label className="terminal-label">BUDGET ALLOCATION (PTS)</label>
                                                        <input
                                                            type="number"
                                                            className="input-minimal"
                                                            value={teamForm.budget}
                                                            onChange={e => setTeamForm({ ...teamForm, budget: e.target.value })}
                                                            required
                                                            placeholder="MAX: 20000"
                                                        />
                                                    </div>
                                                    <div className="form-group-terminal">
                                                        <label className="terminal-label">SPORT CATEGORY</label>
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

                                                    <div className="form-divider-dashed"></div>

                                                    <div className="form-group-terminal">
                                                        <label className="terminal-label">FRANCHISE EMBLEM</label>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={e => setTeamForm({ ...teamForm, logo: e.target.files[0] })}
                                                            className="input-minimal"
                                                        />
                                                    </div>
                                                    <div className="terminal-actions">
                                                        <button type="button" onClick={() => setShowTeamModal(false)} className="btn-discard">DISCARD</button>
                                                        <button type="submit" className="btn-commit">{editingTeam ? 'UPDATE DOSSIER' : 'INITIALIZE TEAM'}</button>
                                                    </div>
                                                </form>
                                            </div>
                                        </div>
                                    )
                                }

                                {
                                    showPlayerModal && (
                                        <div className="modal-overlay animate-fadeIn">
                                            <div className="glass-terminal-modal">
                                                <h2 className="terminal-header">{editingPlayer ? 'REVISE PLAYER PROFILE' : 'NEW PLAYER REGISTRY'}</h2>
                                                <form onSubmit={handleSavePlayerExtended}>
                                                    <div className="form-group-terminal">
                                                        <label className="terminal-label">FULL LEGAL NAME</label>
                                                        <input
                                                            type="text"
                                                            className="input-minimal"
                                                            value={playerForm.name}
                                                            onChange={e => setPlayerForm({ ...playerForm, name: e.target.value })}
                                                            required
                                                            placeholder="ENTER PLAYER NAME..."
                                                        />
                                                    </div>

                                                    <div className="form-group-terminal">
                                                        <label className="terminal-label">SPORT DISCIPLINE</label>
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

                                                    <div className="form-group-terminal">
                                                        <label className="terminal-label">ACADEMIC YEAR</label>
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

                                                    {/* Conditional Stats Inputs */}
                                                    {playerForm.sport.toLowerCase() === 'cricket' && (
                                                        <>
                                                            <div className="form-divider-dashed"></div>
                                                            <div className="form-group-terminal">
                                                                <label className="terminal-label">PLAYER ROLE</label>
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
                                                            <div className="form-group-terminal">
                                                                <label className="terminal-label">BATTING STYLE</label>
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
                                                            <div className="form-group-terminal">
                                                                <label className="terminal-label">BOWLING STYLE</label>
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
                                                        </>
                                                    )}

                                                    {playerForm.sport.toLowerCase() === 'futsal' && (
                                                        <>
                                                            <div className="form-divider-dashed"></div>
                                                            <div className="form-group-terminal">
                                                                <label className="terminal-label">FIELD POSITION</label>
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
                                                        </>
                                                    )}

                                                    {playerForm.sport.toLowerCase() === 'volleyball' && (
                                                        <>
                                                            <div className="form-divider-dashed"></div>
                                                            <div className="form-group-terminal">
                                                                <label className="terminal-label">COURT POSITION</label>
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
                                                        </>
                                                    )}

                                                    <div className="terminal-actions">
                                                        <button type="button" onClick={() => setShowPlayerModal(false)} className="btn-discard">DISCARD</button>
                                                        <button type="submit" className="btn-commit">{editingPlayer ? 'COMMIT REVISION' : 'REGISTER PLAYER'}</button>
                                                    </div>
                                                </form>
                                            </div>
                                        </div>
                                    )
                                }
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
