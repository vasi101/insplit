import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import * as roomService from './room.service';
import { successResponse, errorResponse } from '../../utils/response';

export const createRoomValidation = [
  body('name').trim().notEmpty().withMessage('Room name is required').isLength({ max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
];

function handleValidationErrors(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, error: 'VALIDATION_ERROR', details: errors.array() });
    return true;
  }
  return false;
}

export async function createRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (handleValidationErrors(req, res)) return;
  try {
    const room = await roomService.createRoom({
      name: req.body.name,
      description: req.body.description,
      creatorId: req.user!.userId,
    });
    res.status(201).json(successResponse({ room }, 'Room created successfully'));
  } catch (error) {
    next(error);
  }
}

export async function getUserRooms(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rooms = await roomService.getUserRooms(req.user!.userId);
    res.status(200).json(successResponse({ rooms }));
  } catch (error) {
    next(error);
  }
}

export async function getRoomById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const room = await roomService.getRoomById(req.params.roomId, req.user!.userId);
    res.status(200).json(successResponse({ room }));
  } catch (error) {
    next(error);
  }
}

export async function joinRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { inviteCode } = req.body;
  if (!inviteCode) {
    res.status(400).json(errorResponse('VALIDATION_ERROR', 'inviteCode is required'));
    return;
  }
  try {
    const room = await roomService.joinRoom(req.user!.userId, inviteCode);
    res.status(200).json(successResponse({ room }, 'Joined room successfully'));
  } catch (error) {
    next(error);
  }
}

export async function getRoomMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const room = await roomService.getRoomById(req.params.roomId, req.user!.userId);
    res.status(200).json(successResponse({ members: room.members }));
  } catch (error) {
    next(error);
  }
}

export async function regenerateInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const inviteCode = await roomService.regenerateInviteCode(req.params.roomId, req.user!.userId);
    res.status(200).json(successResponse({ inviteCode }, 'New invite code generated'));
  } catch (error) {
    next(error);
  }
}

export async function leaveRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await roomService.leaveRoom(req.params.roomId, req.user!.userId);
    res.status(200).json(successResponse(null, 'You have left the room'));
  } catch (error) {
    next(error);
  }
}

export async function removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await roomService.removeMember(req.params.roomId, req.user!.userId, req.params.userId);
    res.status(200).json(successResponse(null, 'Member removed from room'));
  } catch (error) {
    next(error);
  }
}
