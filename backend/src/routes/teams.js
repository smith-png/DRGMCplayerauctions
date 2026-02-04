import express from 'express';
import { getAllTeams } from '../controllers/adminController.js';

const router = express.Router();

// Public route to get all teams
router.get('/', getAllTeams);

export default router;
