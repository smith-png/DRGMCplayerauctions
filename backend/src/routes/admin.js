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
    getDashboardStats
} from '../controllers/adminController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

import { upload } from '../controllers/playerController.js';

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
router.put('/teams/:id', updateTeam);
router.delete('/teams/:id', deleteTeam);

// Dashboard stats
router.get('/stats', getDashboardStats);

export default router;
