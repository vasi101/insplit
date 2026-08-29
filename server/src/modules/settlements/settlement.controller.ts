import { Request, Response, NextFunction } from 'express';
import * as settlementService from './settlement.service';
import { successResponse } from '../../utils/response';

export async function getBalances(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { startDate, endDate } = req.query;
    const result = await settlementService.calculateBalances(
      req.params.roomId,
      req.user!.userId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    res.status(200).json(successResponse(result));
  } catch (error) {
    next(error);
  }
}

export async function recordSettlement(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const settlement = await settlementService.recordSettlement({
      ...req.body,
      createdBy: req.user!.userId,
    });
    res.status(201).json(successResponse({ settlement }, 'Settlement recorded'));
  } catch (error) {
    next(error);
  }
}

export async function getSettlementHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const settlements = await settlementService.getSettlementHistory(req.params.roomId, req.user!.userId);
    res.status(200).json(successResponse({ settlements }));
  } catch (error) {
    next(error);
  }
}

export async function approveSettlement(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const settlement = await settlementService.verifySettlement(req.params.settlementId, req.user!.userId, true);
    res.status(200).json(successResponse({ settlement }, 'Settlement approved'));
  } catch (error) { next(error); }
}

export async function rejectSettlement(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const settlement = await settlementService.verifySettlement(req.params.settlementId, req.user!.userId, false);
    res.status(200).json(successResponse({ settlement }, 'Settlement rejected'));
  } catch (error) { next(error); }
}
