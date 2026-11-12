import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getDestinations,
  addDestination,
  deleteDestination,
  geocodeDestination,
  searchPlaces,
} from '../controllers/destinationController.js';

const router = Router();

router.get('/search', searchPlaces);
router.get('/geocode', geocodeDestination);
router.get('/', requireAuth, getDestinations);
router.post('/', requireAuth, addDestination);
router.delete('/:id', requireAuth, deleteDestination);

export default router;
