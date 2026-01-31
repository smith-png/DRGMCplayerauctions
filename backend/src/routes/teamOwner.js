import express from 'express';
import {
    getMyTeam,
    getMyTeamPlayers,
    getMyTeamBids
} from '../controllers/teamOwnerController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// All team owner routes require team_owner role
router.use(authenticateToken, authorizeRoles('team_owner'));

// Team owner routes
router.get('/my-team', getMyTeam);
router.get('/my-team/players', getMyTeamPlayers);
router.get('/my-team/bids', getMyTeamBids);

export default router;
