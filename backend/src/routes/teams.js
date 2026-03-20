import express from 'express';
import { getAllTeams } from '../controllers/adminController.js';
import { optionalAuthenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Public route to get all teams (but with optional auth for owner features)
router.get('/', optionalAuthenticateToken, getAllTeams);

export default router;
