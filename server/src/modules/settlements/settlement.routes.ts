import { Router } from 'express';
import { getBalances, recordSettlement, getSettlementHistory } from './settlement.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

// Room-scoped balance and history
router.get('/:roomId/balances', getBalances);
router.get('/:roomId/history', getSettlementHistory);

// Record a new settlement payment
router.post('/', recordSettlement);

export default router;
