import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getProfile, updateHomeZone, updatePushToken } from '../controllers/userController.js';

const router = Router();

router.get('/profile', requireAuth, getProfile);
router.put('/home-zone', requireAuth, updateHomeZone);
router.post('/home-zone', requireAuth, updateHomeZone);
router.post('/push-token', requireAuth, updatePushToken);

export default router;
