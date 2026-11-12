import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  startTrip,
  advanceTripLeg,
  finishTrip,
  cancelTripHandler,
  updateLocation,
  getActiveTrip,
  getTripHistory,
  deleteTripHandler,
  clearTripHistoryHandler,
} from '../controllers/tripController.js';

const router = Router();

// In MVP foundation, auth is supported with soft fallback for local development & testing
router.post('/start', requireAuth, startTrip);
router.post('/:id/advance-leg', requireAuth, advanceTripLeg);
router.post('/:id/location', requireAuth, updateLocation);
router.post('/:id/complete', requireAuth, finishTrip);
router.post('/:id/cancel', requireAuth, cancelTripHandler);
router.get('/active', requireAuth, getActiveTrip);
router.get('/history', requireAuth, getTripHistory);
router.delete('/history/clear', requireAuth, clearTripHistoryHandler);
router.delete('/:id', requireAuth, deleteTripHandler);

export default router;
