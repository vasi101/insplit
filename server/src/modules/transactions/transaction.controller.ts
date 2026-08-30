import { Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import * as txService from './transaction.service';
import { successResponse, errorResponse } from '../../utils/response';

export const createTransactionValidation = [
  body('roomId').notEmpty().withMessage('roomId is required'),
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('paidBy').notEmpty().withMessage('paidBy is required'),
  body('expenseDate').isISO8601().withMessage('expenseDate must be a valid date'),
  body('category').optional().isIn(['GROCERY', 'UTILITIES', 'RENT', 'CLEANING', 'FOOD', 'TRANSPORT', 'MEDICAL', 'ENTERTAINMENT', 'OTHER']),
];

function handleValidationErrors(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, error: 'VALIDATION_ERROR', details: errors.array() });
    return true;
  }
  return false;
}

export async function createTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (handleValidationErrors(req, res)) return;
  try {
    const transaction = await txService.createTransaction({
      ...req.body,
      createdBy: req.user!.userId,
    });
    res.status(201).json(successResponse({ transaction }, 'Transaction created'));
  } catch (error) {
    next(error);
  }
}

export async function listTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.query.roomId) {
    res.status(400).json(errorResponse('VALIDATION_ERROR', 'roomId query parameter is required'));
    return;
  }
  try {
    const result = await txService.listTransactions({
      roomId: req.query.roomId as string,
      userId: req.user!.userId,
      status: req.query.status as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    });
    res.status(200).json(successResponse(result));
  } catch (error) {
    next(error);
  }
}

export async function getTransactionById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const transaction = await txService.getTransactionById(req.params.transactionId, req.user!.userId);
    res.status(200).json(successResponse({ transaction }));
  } catch (error) {
    next(error);
  }
}

export async function updateTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const transaction = await txService.updateTransaction(req.params.transactionId, req.user!.userId, req.body);
    res.status(200).json(successResponse({ transaction }, 'Transaction updated'));
  } catch (error) {
    next(error);
  }
}

export async function deleteTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await txService.deleteTransaction(req.params.transactionId, req.user!.userId);
    res.status(200).json(successResponse({}, 'Transaction deleted'));
  } catch (error) {
    next(error);
  }
}

export async function approveTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const transaction = await txService.approveTransaction(req.params.transactionId, req.user!.userId);
    res.status(200).json(successResponse({ transaction }, 'Transaction approved'));
  } catch (error) {
    next(error);
  }
}

export async function rejectTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const transaction = await txService.rejectTransaction(
      req.params.transactionId,
      req.user!.userId,
      req.body.reason
    );
    res.status(200).json(successResponse({ transaction }, 'Transaction rejected'));
  } catch (error) {
    next(error);
  }
}

export async function voidTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const transaction = await txService.voidTransaction(req.params.transactionId, req.user!.userId);
    res.status(200).json(successResponse({ transaction }, 'Transaction voided'));
  } catch (error) {
    next(error);
  }
}
