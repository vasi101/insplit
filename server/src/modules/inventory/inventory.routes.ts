import { Router } from 'express';
import {
  getItems,
  addItem,
  updateItem,
  deleteItem,
  addItemValidation,
  updateItemValidation,
  approveItem,
  rejectItem,
} from './inventory.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

// All inventory routes require authentication
router.use(authMiddleware);

router.get('/:roomId', getItems);
router.post('/', addItemValidation, addItem);
router.patch('/:itemId', updateItemValidation, updateItem);
router.delete('/:itemId', deleteItem);
router.post('/:itemId/approve', approveItem);
router.post('/:itemId/reject', rejectItem);

export default router;
