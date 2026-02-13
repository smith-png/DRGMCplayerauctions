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
    createPlayer,
    updatePlayer,
    removeFromQueue,
    bulkUpdateMinBid,
    bulkResetReleasedBids,

    addToQueueById,
    releasePlayer,
    resetTeamWallet,
    adjustTeamWallet,
    resetAllWallets,
    exportPlayersToCSV
} from '../controllers/adminController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { upload } from '../controllers/playerController.js';

const router = express.Router();

// All admin routes require admin role
router.use(authenticateToken, authorizeRoles('admin'));

// User management
router.get('/users', getAllUsers);
router.post('/users', authenticateToken, authorizeRoles('admin'), createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Team management
router.post('/teams', upload.single('logo'), createTeam);
router.get('/teams', getAllTeams);
router.put('/teams/:id', upload.single('logo'), updateTeam);
router.delete('/teams/:id', deleteTeam);
router.post('/teams/:id/wallet/adjust', adjustTeamWallet); // New route
router.post('/teams/:id/reset', resetTeamWallet);
router.post('/teams/reset-all', resetAllWallets);

// Player management (Admin Crud)
router.get('/players/export', exportPlayersToCSV);
router.post('/players', upload.single('photo'), createPlayer);
router.put('/players/:id', upload.single('photo'), updatePlayer);
router.post('/players/:id/remove-queue', removeFromQueue);
router.post('/players/:id/queue', addToQueueById);
router.post('/players/:id/release', releasePlayer);

// Bulk operations
router.post('/bulk/min-bid', bulkUpdateMinBid);
router.post('/bulk/reset-released', bulkResetReleasedBids);
router.post('/lockdown', async (req, res) => {
    const { isLocked } = req.body;
    try {
        await pool.query('UPDATE auction_state SET testgrounds_locked = $1', [isLocked]);
        res.json({ message: `Testgrounds ${isLocked ? 'Locked' : 'Unlocked'}`, isLocked });
    } catch (err) {
        res.status(500).json({ error: 'Failed to toggle lockdown' });
    }
});

// Dashboard stats
router.get('/stats', getDashboardStats);

export default router;
