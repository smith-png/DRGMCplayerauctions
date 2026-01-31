import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add token to requests if available
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth API
export const authAPI = {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    getCurrentUser: () => api.get('/auth/me')
};

// Player API
export const playerAPI = {
    getAllPlayers: () => api.get('/players'),
    getPlayerById: (id) => api.get(`/players/${id}`),
    createPlayer: (formData) => api.post('/players', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    updatePlayer: (id, data) => api.put(`/players/${id}`, data),
    deletePlayer: (id) => api.delete(`/players/${id}`),
    approvePlayer: (id) => api.put(`/players/${id}`, { status: 'approved' }),
    markEligible: (id) => api.put(`/players/${id}/eligible`),
    getEligiblePlayers: () => api.get('/players/eligible'),
    getPlayersBySport: (sport) => api.get(`/players/sport/${sport}`)
};

// Auction API
export const auctionAPI = {
    startAuction: (playerId, basePrice) => api.post('/auction/start', { playerId, basePrice }),
    placeBid: (playerId, teamId, bidAmount) => api.post('/auction/bid', { playerId, teamId, bidAmount }),
    getCurrentAuction: () => api.get('/auction/current'),
    markPlayerSold: (playerId, teamId, finalPrice) => api.post('/auction/sold', { playerId, teamId, finalPrice }),
    markPlayerUnsold: (playerId) => api.post('/auction/unsold', { playerId }),
    getLeaderboard: () => api.get('/auction/leaderboard'),
    getAuctionState: () => api.get('/auction/state'),
    toggleAuctionState: (isActive) => api.post('/auction/state', { isActive }),
    skipPlayer: (playerId) => api.post('/auction/skip', { playerId }),
    resetCurrentBid: () => api.post('/auction/reset-bid', {})
};

// Admin API
export const adminAPI = {
    getAllUsers: () => api.get('/admin/users'),
    createUser: (userData) => api.post('/admin/users', userData),
    updateUser: (id, userData) => api.put(`/admin/users/${id}`, userData),
    deleteUser: (id) => api.delete(`/admin/users/${id}`),
    getAllTeams: () => api.get('/admin/teams'),
    createTeam: (teamData) => api.post('/admin/teams', teamData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    updateTeam: (id, teamData) => api.put(`/admin/teams/${id}`, teamData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    deleteTeam: (id) => api.delete(`/admin/teams/${id}`),

    // Player Management (Admin)
    createPlayer: (playerData) => api.post('/admin/players', playerData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    updatePlayer: (id, playerData) => api.put(`/admin/players/${id}`, playerData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    removeFromQueue: (id) => api.post(`/admin/players/${id}/remove-queue`),

    getStats: () => api.get('/admin/stats'),
    getPendingPlayers: () => api.get('/admin/players/pending'),
    bulkUpdateMinBid: (sport, minBid) => api.post('/admin/bulk/min-bid', { sport, minBid }),
    bulkResetReleasedBids: () => api.post('/admin/bulk/reset-released')
};

// Teams API
export const teamsAPI = {
    getAllTeams: () => api.get('/teams'),
};

// Team Owner API
export const teamOwnerAPI = {
    getMyTeam: () => api.get('/team-owner/my-team'),
    getMyTeamPlayers: () => api.get('/team-owner/my-team/players'),
    getMyTeamBids: () => api.get('/team-owner/my-team/bids'),
};

export default api;
