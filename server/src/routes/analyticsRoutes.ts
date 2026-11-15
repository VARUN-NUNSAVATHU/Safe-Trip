import { Router } from 'express';
import { getTripAnalytics } from '../controllers/analyticsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

/**
 * @route   GET /api/analytics/trip-stats
 * @desc    Get aggregated travel analytics via MongoDB Aggregation Pipeline ($match, $group, $sort)
 * @access  Private
 */
router.get('/trip-stats', authenticateToken, getTripAnalytics);

export default router;
