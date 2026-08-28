import { Router } from 'express';
import {
  createRoom,
  getUserRooms,
  getRoomById,
  joinRoom,
  getRoomMembers,
  regenerateInvite,
  leaveRoom,
  removeMember,
  createRoomValidation,
} from './room.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

// All room routes require authentication
router.use(authMiddleware);

router.post('/', createRoomValidation, createRoom);
router.get('/', getUserRooms);
router.get('/:roomId', getRoomById);
router.post('/join', joinRoom);
router.get('/:roomId/members', getRoomMembers);
router.post('/:roomId/invite', regenerateInvite);
router.post('/:roomId/leave', leaveRoom);
router.delete('/:roomId/members/:userId', removeMember);

export default router;
