import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import * as adminService from './admin.service';
import { successResponse, errorResponse } from '../../utils/response';

function handleValidationErrors(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      details: errors.array(),
    });
    return true;
  }
  return false;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await adminService.getDashboardStats();
    res.status(200).json(successResponse(stats));
  } catch (error) {
    next(error);
  }
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search, role, verified, page, limit } = req.query;
    const result = await adminService.getAllUsers({
      search: search as string,
      role: role as 'admin' | 'user' | 'all',
      verified: verified as 'true' | 'false' | 'all',
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });
    res.status(200).json(successResponse(result));
  } catch (error) {
    next(error);
  }
}

export async function getUserDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await adminService.getUserDetails(req.params.userId);
    res.status(200).json(successResponse(result));
  } catch (error) {
    next(error);
  }
}

export const createUserValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (handleValidationErrors(req, res)) return;
  try {
    const user = await adminService.createUser(req.body);
    res.status(201).json(successResponse({ user }, 'User created successfully'));
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (handleValidationErrors(req, res)) return;
  try {
    const user = await adminService.updateUser(req.params.userId, req.body);
    res.status(200).json(successResponse({ user }, 'User updated successfully'));
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await adminService.deleteUser(req.params.userId);
    res.status(200).json(successResponse(null, 'User deleted successfully'));
  } catch (error) {
    next(error);
  }
}

export async function setUserAdminRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { isAdmin } = req.body;
  if (typeof isAdmin !== 'boolean') {
    res.status(400).json(errorResponse('VALIDATION_ERROR', 'isAdmin boolean required'));
    return;
  }
  try {
    const user = await adminService.setUserAdminRole(req.params.userId, isAdmin);
    res.status(200).json(successResponse({ user }, 'Admin role updated'));
  } catch (error) {
    next(error);
  }
}

export async function sendUserVerificationEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await adminService.sendUserVerificationEmail(req.params.userId);
    res.status(200).json(successResponse(result, 'Verification email sent'));
  } catch (error) {
    next(error);
  }
}

export async function toggleUserVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { emailVerified } = req.body;
  if (typeof emailVerified !== 'boolean') {
    res.status(400).json(errorResponse('VALIDATION_ERROR', 'emailVerified boolean required'));
    return;
  }
  try {
    const user = await adminService.toggleUserVerification(req.params.userId, emailVerified);
    res.status(200).json(successResponse({ user }, 'Verification status updated'));
  } catch (error) {
    next(error);
  }
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function getAllTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search, roomId, status, category, page, limit } = req.query;
    const result = await adminService.getAllTransactions({
      search: search as string,
      roomId: roomId as string,
      status: status as any,
      category: category as any,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });
    res.status(200).json(successResponse(result));
  } catch (error) {
    next(error);
  }
}

export async function createTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tx = await adminService.createTransactionAdmin({
      ...req.body,
      createdBy: req.user!.userId,
    });
    res.status(201).json(successResponse({ transaction: tx }, 'Transaction created'));
  } catch (error) {
    next(error);
  }
}

export async function deleteTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await adminService.deleteTransaction(req.params.transactionId);
    res.status(200).json(successResponse(null, 'Transaction deleted'));
  } catch (error) {
    next(error);
  }
}

export async function updateTransactionStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { status } = req.body;
  if (!['PENDING', 'VERIFIED', 'REJECTED', 'VOIDED'].includes(status)) {
    res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid transaction status'));
    return;
  }
  try {
    const tx = await adminService.updateTransactionStatusAdmin(req.params.transactionId, status);
    res.status(200).json(successResponse({ transaction: tx }, 'Status updated'));
  } catch (error) {
    next(error);
  }
}

// ─── Rooms ────────────────────────────────────────────────────────────────────

export async function getAllRooms(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search, page, limit } = req.query;
    const result = await adminService.getAllRooms({
      search: search as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });
    res.status(200).json(successResponse(result));
  } catch (error) {
    next(error);
  }
}

export async function createRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const room = await adminService.createRoomAdmin({
      name: req.body.name,
      description: req.body.description,
      creatorId: req.body.creatorId || req.user!.userId,
    });
    res.status(201).json(successResponse({ room }, 'Room created'));
  } catch (error) {
    next(error);
  }
}

export async function deleteRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await adminService.deleteRoom(req.params.roomId);
    res.status(200).json(successResponse(null, 'Room deleted'));
  } catch (error) {
    next(error);
  }
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export async function getAllInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { roomId, category, search, page, limit } = req.query;
    const result = await adminService.getAllInventory({
      roomId: roomId as string,
      category: category as string,
      search: search as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 30,
    });
    res.status(200).json(successResponse(result));
  } catch (error) {
    next(error);
  }
}

export async function addInventoryItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await adminService.addInventoryItemAdmin(req.user!.userId, req.body);
    res.status(201).json(successResponse({ item }, 'Item added to inventory'));
  } catch (error) {
    next(error);
  }
}

export async function updateInventoryItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await adminService.updateInventoryItemAdmin(req.params.itemId, req.user!.userId, req.body);
    res.status(200).json(successResponse({ item }, 'Item updated'));
  } catch (error) {
    next(error);
  }
}

export async function deleteInventoryItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await adminService.deleteInventoryItemAdmin(req.params.itemId);
    res.status(200).json(successResponse(null, 'Item deleted'));
  } catch (error) {
    next(error);
  }
}
