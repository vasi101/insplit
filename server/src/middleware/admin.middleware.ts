import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response';
import { User } from '../modules/auth/auth.model';

export async function adminMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user || !req.user.userId) {
    res.status(401).json(errorResponse('UNAUTHORIZED', 'Authentication required'));
    return;
  }

  try {
    // If JWT already has isAdmin claim, verify or double-check DB for revocation safety
    const user = await User.findById(req.user.userId).select('isAdmin');
    if (!user || !user.isAdmin) {
      res.status(403).json(errorResponse('FORBIDDEN', 'Administrator privileges required'));
      return;
    }

    req.user.isAdmin = true;
    next();
  } catch (error) {
    next(error);
  }
}
