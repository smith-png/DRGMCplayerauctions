import express from 'express';
import { login, register, changePassword, getMe } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', authLimiter, login);

// POST /api/auth/register
router.post('/register', authLimiter, register);

// GET /api/auth/me - Get current user
router.get('/me', authenticateToken, getMe);

router.post('/change-password', authenticateToken, changePassword);


export default router;
