import express from 'express';
import {
    createPlayer,
    getAllPlayers,
    getPlayerById,
    updatePlayer,
    deletePlayer,
    upload,
    markEligible,
    getEligiblePlayers
} from '../controllers/playerController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticateToken, upload.single('photo'), createPlayer);
router.get('/', getAllPlayers);
router.get('/eligible', authenticateToken, getEligiblePlayers);
router.put('/:id/eligible', authenticateToken, authorizeRoles('admin'), markEligible);
router.get('/:id', getPlayerById);
router.put('/:id', authenticateToken, authorizeRoles('admin'), updatePlayer);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), deletePlayer);

export default router;
