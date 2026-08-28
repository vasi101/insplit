import { Router } from 'express';
import {
  createTransaction,
  listTransactions,
  getTransactionById,
  updateTransaction,
  approveTransaction,
  rejectTransaction,
  voidTransaction,
  createTransactionValidation,
} from './transaction.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/', createTransactionValidation, createTransaction);
router.get('/', listTransactions);
router.get('/:transactionId', getTransactionById);
router.patch('/:transactionId', updateTransaction);
router.post('/:transactionId/approve', approveTransaction);
router.post('/:transactionId/reject', rejectTransaction);
router.post('/:transactionId/void', voidTransaction);

export default router;
