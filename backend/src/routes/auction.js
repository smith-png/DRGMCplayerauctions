import express from 'express';
import {
    startAuction,
    placeBid,
    getCurrentAuction,
    markPlayerSold,
    markPlayerUnsold,
    getLeaderboard,
    getAuctionState,
    toggleAuctionState,
    skipPlayer
} from '../controllers/auctionController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

router.post('/start', authenticateToken, authorizeRoles('admin', 'auctioneer'), startAuction);
router.post('/bid', authenticateToken, placeBid);
router.get('/current', getCurrentAuction);
router.post('/sold', authenticateToken, authorizeRoles('admin', 'auctioneer'), markPlayerSold);
router.post('/unsold', authenticateToken, authorizeRoles('admin', 'auctioneer'), markPlayerUnsold);
router.get('/leaderboard', getLeaderboard);
router.get('/state', getAuctionState);
router.post('/state', authenticateToken, authorizeRoles('admin'), toggleAuctionState);
router.post('/skip', authenticateToken, authorizeRoles('admin', 'auctioneer'), skipPlayer);
router.post('/reset-bid', authenticateToken, authorizeRoles('admin', 'auctioneer'), resetAuctionBid);

export default router;
