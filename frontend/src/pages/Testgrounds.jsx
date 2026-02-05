import { useState, useEffect } from 'react';
import { testgroundsAPI, teamsAPI } from '../services/api';
import './Testgrounds.css';

export default function Testgrounds() {
    const [activeTab, setActiveTab] = useState('players');
    const [isLocked, setIsLocked] = useState(false);
    const [loading, setLoading] = useState(false);

    // Test Data States
    const [testPlayers, setTestPlayers] = useState([]);
    const [testTeams, setTestTeams] = useState([]);
    const [pseudoOwners, setPseudoOwners] = useState([]);
    const [allTeams, setAllTeams] = useState([]);

    // Form States - Test Player
    const [playerForm, setPlayerForm] = useState({
        name: '',
        sport: 'cricket',
        year: '',
        stats: '',
        base_price: 50,
        photo: null
    });

    // Form States - Test Team
    const [teamForm, setTeamForm] = useState({
        name: '',
        sport: 'cricket',
        budget: 2000,
        logo: null
    });

    // Form States - Pseudo Owner
    const [ownerForm, setOwnerForm] = useState({
        name: '',
        email: '',
        password: '',
        team_id: ''
    });

    // Load initial data
    useEffect(() => {
        fetchLockdownState();
        fetchAllData();
        fetchAllTeams();
    }, []);

    const fetchLockdownState = async () => {
        try {
            const response = await testgroundsAPI.getTestgroundsState();
            setIsLocked(response.data.testgrounds_locked);
        } catch (error) {
            console.error('Error fetching lockdown state:', error);
        }
    };

    const fetchAllData = async () => {
        try {
            const [playersRes, teamsRes, ownersRes] = await Promise.all([
                testgroundsAPI.getAllTestPlayers(),
                testgroundsAPI.getAllTestTeams(),
                testgroundsAPI.getAllPseudoOwners()
            ]);
            setTestPlayers(playersRes.data.players || []);
            setTestTeams(teamsRes.data.teams || []);
            setPseudoOwners(ownersRes.data.owners || []);
        } catch (error) {
            console.error('Error fetching test data:', error);
        }
    };

    const fetchAllTeams = async () => {
        try {
            const response = await teamsAPI.getAllTeams();
            setAllTeams(response.data.teams || []);
        } catch (error) {
            console.error('Error fetching teams:', error);
        }
    };

    const toggleLockdown = async () => {
        try {
            setLoading(true);
            const response = await testgroundsAPI.toggleLockdown();
            setIsLocked(response.data.testgrounds_locked);
            alert(response.data.message);
        } catch (error) {
            alert('Failed to toggle lockdown');
        } finally {
            setLoading(false);
        }
    };

    // TEST PLAYER HANDLERS
    const handleCreatePlayer = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('name', playerForm.name);
            formData.append('sport', playerForm.sport);
            formData.append('year', playerForm.year);
            formData.append('stats', playerForm.stats);
            formData.append('base_price', playerForm.base_price);
            if (playerForm.photo) formData.append('photo', playerForm.photo);

            await testgroundsAPI.createTestPlayer(formData);
            alert('Test player created successfully');
            setPlayerForm({ name: '', sport: 'cricket', year: '', stats: '', base_price: 50, photo: null });
            fetchAllData();
        } catch (error) {
            alert('Failed to create test player');
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePlayer = async (id) => {
        if (!confirm('Delete this test player?')) return;
        try {
            await testgroundsAPI.deleteTestPlayer(id);
            fetchAllData();
        } catch (error) {
            alert('Failed to delete player');
        }
    };

    const handleAddToQueue = async (id) => {
        try {
            await testgroundsAPI.addToTestQueue(id);
            alert('Player added to queue');
            fetchAllData();
        } catch (error) {
            alert('Failed to add to queue');
        }
    };

    const handleRemoveFromQueue = async (id) => {
        try {
            await testgroundsAPI.removeFromTestQueue(id);
            alert('Player removed from queue');
            fetchAllData();
        } catch (error) {
            alert('Failed to remove from queue');
        }
    };

    // TEST TEAM HANDLERS
    const handleCreateTeam = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('name', teamForm.name);
            formData.append('sport', teamForm.sport);
            formData.append('budget', teamForm.budget);
            if (teamForm.logo) formData.append('logo', teamForm.logo);

            await testgroundsAPI.createTestTeam(formData);
            alert('Test team created successfully');
            setTeamForm({ name: '', sport: 'cricket', budget: 2000, logo: null });
            fetchAllData();
            fetchAllTeams();
        } catch (error) {
            alert('Failed to create test team');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTeam = async (id) => {
        if (!confirm('Delete this test team?')) return;
        try {
            await testgroundsAPI.deleteTestTeam(id);
            fetchAllData();
            fetchAllTeams();
        } catch (error) {
            alert('Failed to delete team');
        }
    };

    // PSEUDO OWNER HANDLERS
    const handleCreateOwner = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            await testgroundsAPI.createPseudoOwner(ownerForm);
            alert('Pseudo owner created successfully');
            setOwnerForm({ name: '', email: '', password: '', team_id: '' });
            fetchAllData();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to create pseudo owner');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteOwner = async (id) => {
        if (!confirm('Delete this pseudo owner?')) return;
        try {
            await testgroundsAPI.deletePseudoOwner(id);
            fetchAllData();
        } catch (error) {
            alert('Failed to delete owner');
        }
    };

    // BULK DELETE
    const handleClearAll = async () => {
        if (!confirm('⚠️ This will delete ALL test data (players, teams, pseudo owners). Are you sure?')) return;
        try {
            setLoading(true);
            const response = await testgroundsAPI.clearAllTestData();
            alert(response.data.message);
            fetchAllData();
            fetchAllTeams();
        } catch (error) {
            alert('Failed to clear test data');
        } finally {
            setLoading(false);
        }
    };

    const queuedPlayers = testPlayers.filter(p => p.status === 'eligible');

    return (
        <div className="testgrounds-container">
            <div className="testgrounds-header">
                <h1 className="testgrounds-title">⚗️ Testgrounds</h1>
                <div className="lockdown-controls">
                    <div className={`lockdown-status ${isLocked ? 'locked' : 'unlocked'}`}>
                        {isLocked ? '🔒 Locked' : '🔓 Unlocked'}
                        <span className="lockdown-info">
                            {isLocked ? ' (Test data hidden from non-admins)' : ' (Test data visible to all)'}
                        </span>
                    </div>
                    <button
                        className={`toggle-lockdown-btn ${isLocked ? 'locked' : 'unlocked'}`}
                        onClick={toggleLockdown}
                        disabled={loading}
                    >
                        {isLocked ? 'Unlock Testgrounds' : 'Lock Testgrounds'}
                    </button>
                    <button
                        className="clear-all-btn"
                        onClick={handleClearAll}
                        disabled={loading}
                    >
                        🗑️ Clear All Test Data
                    </button>
                </div>
            </div>

            <div className="admin-tabs">
                <button
                    className={`tab-btn ${activeTab === 'players' ? 'active' : ''}`}
                    onClick={() => setActiveTab('players')}
                >
                    Test Players ({testPlayers.length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'teams' ? 'active' : ''}`}
                    onClick={() => setActiveTab('teams')}
                >
                    Test Teams ({testTeams.length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'owners' ? 'active' : ''}`}
                    onClick={() => setActiveTab('owners')}
                >
                    Pseudo Owners ({pseudoOwners.length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'queue' ? 'active' : ''}`}
                    onClick={() => setActiveTab('queue')}
                >
                    Test Queue ({queuedPlayers.length})
                </button>
            </div>

            <div className="tab-content">
                {/* TEST PLAYERS TAB */}
                {activeTab === 'players' && (
                    <div className="test-players-section">
                        <div className="card">
                            <h2>➕ Add Test Player</h2>
                            <form onSubmit={handleCreatePlayer} className="test-form">
                                <div className="form-row">
                                    <input
                                        type="text"
                                        placeholder="Player Name"
                                        value={playerForm.name}
                                        onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
                                        required
                                    />
                                    <select
                                        value={playerForm.sport}
                                        onChange={(e) => setPlayerForm({ ...playerForm, sport: e.target.value })}
                                    >
                                        <option value="cricket">Cricket</option>
                                        <option value="futsal">Futsal</option>
                                        <option value="volleyball">Volleyball</option>
                                    </select>
                                </div>
                                <div className="form-row">
                                    <select
                                        value={playerForm.year}
                                        onChange={(e) => setPlayerForm({ ...playerForm, year: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Year</option>
                                        <option value="FE">FE</option>
                                        <option value="SE">SE</option>
                                        <option value="TE">TE</option>
                                        <option value="BE">BE</option>
                                    </select>
                                    <input
                                        type="number"
                                        placeholder="Base Price"
                                        value={playerForm.base_price}
                                        onChange={(e) => setPlayerForm({ ...playerForm, base_price: e.target.value })}
                                    />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Stats (e.g., Batsman, Bowler)"
                                    value={playerForm.stats}
                                    onChange={(e) => setPlayerForm({ ...playerForm, stats: e.target.value })}
                                />
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setPlayerForm({ ...playerForm, photo: e.target.files[0] })}
                                />
                                <button type="submit" className="btn-primary" disabled={loading}>
                                    Create Test Player
                                </button>
                            </form>
                        </div>

                        <div className="card">
                            <h2>Test Players List</h2>
                            <div className="test-players-grid">
                                {testPlayers.map(player => (
                                    <div key={player.id} className="player-card test-badge">
                                        <span className="test-indicator">TEST</span>
                                        {player.photo_url && <img src={player.photo_url} alt={player.name} />}
                                        <h3>{player.name}</h3>
                                        <p>Sport: {player.sport} | Year: {player.year}</p>
                                        <p>Base Price: {player.base_price} | Status: {player.status}</p>
                                        <div className="player-actions">
                                            {player.status !== 'eligible' ? (
                                                <button onClick={() => handleAddToQueue(player.id)} className="btn-queue">
                                                    Add to Queue
                                                </button>
                                            ) : (
                                                <button onClick={() => handleRemoveFromQueue(player.id)} className="btn-secondary">
                                                    Remove from Queue
                                                </button>
                                            )}
                                            <button onClick={() => handleDeletePlayer(player.id)} className="btn-danger">
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* TEST TEAMS TAB */}
                {activeTab === 'teams' && (
                    <div className="test-teams-section">
                        <div className="card">
                            <h2>➕ Add Test Team</h2>
                            <form onSubmit={handleCreateTeam} className="test-form">
                                <input
                                    type="text"
                                    placeholder="Team Name"
                                    value={teamForm.name}
                                    onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                                    required
                                />
                                <div className="form-row">
                                    <select
                                        value={teamForm.sport}
                                        onChange={(e) => setTeamForm({ ...teamForm, sport: e.target.value })}
                                    >
                                        <option value="cricket">Cricket</option>
                                        <option value="futsal">Futsal</option>
                                        <option value="volleyball">Volleyball</option>
                                    </select>
                                    <input
                                        type="number"
                                        placeholder="Budget"
                                        value={teamForm.budget}
                                        onChange={(e) => setTeamForm({ ...teamForm, budget: e.target.value })}
                                    />
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setTeamForm({ ...teamForm, logo: e.target.files[0] })}
                                />
                                <button type="submit" className="btn-primary" disabled={loading}>
                                    Create Test Team
                                </button>
                            </form>
                        </div>

                        <div className="card">
                            <h2>Test Teams List</h2>
                            <div className="test-teams-grid">
                                {testTeams.map(team => (
                                    <div key={team.id} className="team-card test-badge">
                                        <span className="test-indicator">TEST</span>
                                        {team.logo_url && <img src={team.logo_url} alt={team.name} />}
                                        <h3>{team.name}</h3>
                                        <p>Sport: {team.sport}</p>
                                        <p>Budget: {team.budget} Pts | Remaining: {team.remaining_budget} Pts</p>
                                        <button onClick={() => handleDeleteTeam(team.id)} className="btn-danger">
                                            Delete
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* PSEUDO OWNERS TAB */}
                {activeTab === 'owners' && (
                    <div className="pseudo-owners-section">
                        <div className="card">
                            <h2>➕ Add Pseudo Owner</h2>
                            <form onSubmit={handleCreateOwner} className="test-form">
                                <input
                                    type="text"
                                    placeholder="Owner Name"
                                    value={ownerForm.name}
                                    onChange={(e) => setOwnerForm({ ...ownerForm, name: e.target.value })}
                                    required
                                />
                                <input
                                    type="email"
                                    placeholder="Email"
                                    value={ownerForm.email}
                                    onChange={(e) => setOwnerForm({ ...ownerForm, email: e.target.value })}
                                    required
                                />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={ownerForm.password}
                                    onChange={(e) => setOwnerForm({ ...ownerForm, password: e.target.value })}
                                    required
                                />
                                <select
                                    value={ownerForm.team_id}
                                    onChange={(e) => setOwnerForm({ ...ownerForm, team_id: e.target.value })}
                                >
                                    <option value="">No Team (Optional)</option>
                                    {allTeams.map(team => (
                                        <option key={team.id} value={team.id}>
                                            {team.name} ({team.sport})
                                        </option>
                                    ))}
                                </select>
                                <button type="submit" className="btn-primary" disabled={loading}>
                                    Create Pseudo Owner
                                </button>
                            </form>
                        </div>

                        <div className="card">
                            <h2>Pseudo Owners List</h2>
                            <table className="owners-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Assigned Team</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pseudoOwners.map(owner => {
                                        const assignedTeam = allTeams.find(t => t.id === owner.team_id);
                                        return (
                                            <tr key={owner.id}>
                                                <td>
                                                    <span className="test-indicator-inline">TEST</span> {owner.name}
                                                </td>
                                                <td>{owner.email}</td>
                                                <td>{assignedTeam ? assignedTeam.name : 'Not Assigned'}</td>
                                                <td>
                                                    <button onClick={() => handleDeleteOwner(owner.id)} className="btn-danger-sm">
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TEST QUEUE TAB */}
                {activeTab === 'queue' && (
                    <div className="test-queue-section">
                        <div className="card">
                            <h2>🎯 Test Player Queue</h2>
                            {queuedPlayers.length === 0 ? (
                                <p className="empty-message">No test players in queue. Add players from the Test Players tab.</p>
                            ) : (
                                <div className="queue-list">
                                    {queuedPlayers.map(player => (
                                        <div key={player.id} className="queue-item test-badge">
                                            <span className="test-indicator">TEST</span>
                                            {player.photo_url && <img src={player.photo_url} alt={player.name} />}
                                            <div className="queue-info">
                                                <h3>{player.name}</h3>
                                                <p>{player.sport} • {player.year} • Base: {player.base_price} Pts</p>
                                            </div>
                                            <button onClick={() => handleRemoveFromQueue(player.id)} className="btn-danger">
                                                Remove from Queue
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
