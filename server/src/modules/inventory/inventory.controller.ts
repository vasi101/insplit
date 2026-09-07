import { Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import * as inventoryService from './inventory.service';
import { successResponse, errorResponse } from '../../utils/response';

// ─── Validation Chains ────────────────────────────────────────────────────────

export const addItemValidation = [
  body('roomId').notEmpty().withMessage('roomId is required'),
  body('name').trim().notEmpty().withMessage('Item name is required').isLength({ max: 100 }),
  body('category')
    .optional()
    .isIn(['KITCHEN', 'CLEANING', 'BATHROOM', 'PANTRY', 'OTHER'])
    .withMessage('Invalid category'),
  body('quantity').isFloat({ min: 0 }).withMessage('Quantity must be a non-negative number'),
  body('unit')
    .optional()
    .isIn(['kg', 'g', 'L', 'pcs', 'packets', 'boxes', 'other'])
    .withMessage('Invalid unit'),
  body('minQuantity').optional({ nullable: true }).isFloat({ min: 0 }),
];

export const updateItemValidation = [
  param('itemId').isMongoId().withMessage('Invalid item ID'),
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('category')
    .optional()
    .isIn(['KITCHEN', 'CLEANING', 'BATHROOM', 'PANTRY', 'OTHER']),
  body('quantity').optional().isFloat({ min: 0 }),
  body('unit').optional().isIn(['kg', 'g', 'L', 'pcs', 'packets', 'boxes', 'other']),
  body('minQuantity').optional({ nullable: true }).isFloat({ min: 0 }),
];

function handleValidationErrors(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, error: 'VALIDATION_ERROR', details: errors.array() });
    return true;
  }
  return false;
}

// ─── Handlers ────────────────────────────────────────────────────────────────

export async function getItems(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { roomId } = req.params;
    const items = await inventoryService.getItemsByRoom(roomId, req.user!.userId);
    res.status(200).json(successResponse({ items }));
  } catch (error) {
    next(error);
  }
}

export async function addItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (handleValidationErrors(req, res)) return;
  try {
    const item = await inventoryService.addItem(req.user!.userId, {
      roomId: req.body.roomId,
      name: req.body.name,
      category: req.body.category,
      quantity: req.body.quantity,
      unit: req.body.unit,
      minQuantity: req.body.minQuantity,
    });
    res.status(201).json(successResponse({ item }, 'Item added to inventory'));
  } catch (error) {
    next(error);
  }
}

export async function updateItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (handleValidationErrors(req, res)) return;
  try {
    const item = await inventoryService.updateItem(req.params.itemId, req.user!.userId, {
      name: req.body.name,
      category: req.body.category,
      quantity: req.body.quantity,
      unit: req.body.unit,
      minQuantity: req.body.minQuantity,
    });
    if (!item) {
      res.status(404).json(errorResponse('NOT_FOUND', 'Item not found'));
      return;
    }
    res.status(200).json(successResponse({ item }, 'Item updated'));
  } catch (error) {
    next(error);
  }
}

export async function deleteItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await inventoryService.deleteItem(req.params.itemId, req.user!.userId);
    if (!item) {
      res.status(404).json(errorResponse('NOT_FOUND', 'Item not found'));
      return;
    }
    res.status(200).json(successResponse(null, 'Item removed from inventory'));
  } catch (error) {
    next(error);
  }
}

export async function approveItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await inventoryService.reviewItem(req.params.itemId, req.user!.userId, 'APPROVED');
    res.status(200).json(successResponse({ item }, 'Inventory item approved'));
  } catch (error) {
    next(error);
  }
}

export async function rejectItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await inventoryService.reviewItem(
      req.params.itemId,
      req.user!.userId,
      'REJECTED',
      req.body.reason
    );
    res.status(200).json(successResponse({ item }, 'Inventory item rejected'));
  } catch (error) {
    next(error);
  }
}
