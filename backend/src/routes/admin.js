import express from 'express';
import {
    getAllUsers,
    createUser,
    updateUser,
    deleteUser,
    createTeam,
    getAllTeams,
    updateTeam,
    deleteTeam,
    getDashboardStats,
    removeFromQueue,
    bulkUpdateMinBid,
    bulkResetReleasedBids,
    addToQueueById,
    releasePlayer,
    resetTeamWallet,
    resetAllWallets,
    exportPlayersToCSV
} from '../controllers/adminController.js';
import {
    createPlayer as adminCreatePlayer,
    updatePlayer as adminUpdatePlayer,
    upload
} from '../controllers/playerController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';



const router = express.Router();

// All admin routes require admin role
router.use(authenticateToken, authorizeRoles('admin'));

// User management
router.get('/users', getAllUsers);
router.post('/users', authenticateToken, authorizeRoles('admin'), createUser); // Changed to include middleware explicitly as reminder, though router.use already covers it
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Team management
router.post('/teams', upload.single('logo'), createTeam);
router.get('/teams', getAllTeams);
router.put('/teams/:id', upload.single('logo'), updateTeam);
router.delete('/teams/:id', deleteTeam);
router.post('/teams/:id/reset', resetTeamWallet);
router.post('/teams/reset-all', resetAllWallets);

// Player management (Admin Crud)
router.get('/players/export', exportPlayersToCSV);
router.post('/players', upload.single('photo'), adminCreatePlayer);
router.put('/players/:id', upload.single('photo'), adminUpdatePlayer);
router.post('/players/:id/remove-queue', removeFromQueue);
router.post('/players/:id/queue', addToQueueById);
router.post('/players/:id/release', releasePlayer);

// Bulk operations
router.post('/bulk/min-bid', bulkUpdateMinBid);
router.post('/bulk/reset-released', bulkResetReleasedBids);

// Dashboard stats
router.get('/stats', getDashboardStats);

export default router;
