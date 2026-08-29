import { Router } from 'express';
import { approveSettlement, getBalances, recordSettlement, getSettlementHistory, rejectSettlement } from './settlement.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

// Room-scoped balance and history
router.get('/:roomId/balances', getBalances);
router.get('/:roomId/history', getSettlementHistory);

// Record a new settlement payment
router.post('/', recordSettlement);
router.post('/:settlementId/approve', approveSettlement);
router.post('/:settlementId/reject', rejectSettlement);

export default router;
