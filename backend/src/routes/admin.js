import express from 'express';
import {
    getAllUsers,
    updateUserRole,
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
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

// Team management
router.post('/teams', upload.single('logo'), createTeam);
router.get('/teams', getAllTeams);
router.put('/teams/:id', updateTeam);
router.delete('/teams/:id', deleteTeam);

// Dashboard stats
router.get('/stats', getDashboardStats);

export default router;
