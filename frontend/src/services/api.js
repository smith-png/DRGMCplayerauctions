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
    toggleAuctionState: (isActive) => api.post('/auction/state', { isActive })
};

// Admin API
export const adminAPI = {
    getAllUsers: () => api.get('/admin/users'),
    updateUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
    deleteUser: (id) => api.delete(`/admin/users/${id}`),
    getAllTeams: () => api.get('/admin/teams'),
    createTeam: (teamData) => api.post('/admin/teams', teamData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    updateTeam: (id, teamData) => api.put(`/admin/teams/${id}`, teamData),
    deleteTeam: (id) => api.delete(`/admin/teams/${id}`),
    getStats: () => api.get('/admin/stats'),
    getPendingPlayers: () => api.get('/admin/players/pending')
};

// Teams API
export const teamsAPI = {
    getAllTeams: () => api.get('/teams'),
};

export default api;
