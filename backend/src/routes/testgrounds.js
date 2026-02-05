import express from 'express';
import {
    createTestPlayer,
    getAllTestPlayers,
    updateTestPlayer,
    deleteTestPlayer,
    createTestTeam,
    getAllTestTeams,
    updateTestTeam,
    deleteTestTeam,
    createPseudoOwner,
    getAllPseudoOwners,
    updatePseudoOwner,
    deletePseudoOwner,
    addTestPlayerToQueue,
    removeTestPlayerFromQueue,
    getTestgroundsState,
    toggleTestgroundsLockdown,
    clearAllTestData
} from '../controllers/testgroundsController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { upload } from '../controllers/playerController.js';

const router = express.Router();

// All testgrounds routes require admin role
router.use(authenticateToken, authorizeRoles('admin'));

// Test Player Management
router.post('/players', upload.single('photo'), createTestPlayer);
router.get('/players', getAllTestPlayers);
router.put('/players/:id', upload.single('photo'), updateTestPlayer);
router.delete('/players/:id', deleteTestPlayer);

// Test Team Management
router.post('/teams', upload.single('logo'), createTestTeam);
router.get('/teams', getAllTestTeams);
router.put('/teams/:id', upload.single('logo'), updateTestTeam);
router.delete('/teams/:id', deleteTestTeam);

// Pseudo Owner Management
router.post('/owners', createPseudoOwner);
router.get('/owners', getAllPseudoOwners);
router.put('/owners/:id', updatePseudoOwner);
router.delete('/owners/:id', deletePseudoOwner);

// Queue Management
router.post('/queue/:id', addTestPlayerToQueue);
router.delete('/queue/:id', removeTestPlayerFromQueue);

// Lockdown Management
router.get('/state', getTestgroundsState);
router.post('/toggle-lockdown', toggleTestgroundsLockdown);

// Bulk Operations
router.delete('/clear-all', clearAllTestData);

export default router;
