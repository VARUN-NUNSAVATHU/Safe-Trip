import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getContacts, addContact, deleteContact } from '../controllers/contactController.js';

const router = Router();

router.get('/', requireAuth, getContacts);
router.post('/', requireAuth, addContact);
router.delete('/:id', requireAuth, deleteContact);

export default router;
