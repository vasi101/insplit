import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import * as authService from './auth.service';
import { successResponse, errorResponse } from '../../utils/response';

// Validation rules
export const updateProfileValidation = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: 100 }),
  body('profileImage').optional().isURL().withMessage('profileImage must be a valid URL'),
];

// Validation rules
export const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

function handleValidationErrors(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Invalid input data',
      details: errors.array(),
    });
    return true;
  }
  return false;
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (handleValidationErrors(req, res)) return;
  try {
    const { user, tokens } = await authService.registerUser(req.body);
    res.status(201).json(
      successResponse({ user, tokens }, 'Account created successfully')
    );
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (handleValidationErrors(req, res)) return;
  try {
    const { user, tokens } = await authService.loginUser(req.body);
    res.status(200).json(
      successResponse({ user, tokens }, 'Login successful')
    );
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json(errorResponse('VALIDATION_ERROR', 'Refresh token is required'));
    return;
  }
  try {
    const tokens = await authService.refreshTokens(refreshToken);
    res.status(200).json(successResponse({ tokens }));
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.logoutUser(req.user!.userId);
    res.status(200).json(successResponse(null, 'Logged out successfully'));
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.getUserById(req.user!.userId);
    if (!user) {
      res.status(404).json(errorResponse('NOT_FOUND', 'User not found'));
      return;
    }
    res.status(200).json(successResponse({ user }));
  } catch (error) {
    next(error);
  }
}

export async function updatePushToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { pushToken } = req.body;
  if (!pushToken) {
    res.status(400).json(errorResponse('VALIDATION_ERROR', 'pushToken is required'));
    return;
  }
  try {
    await authService.updatePushToken(req.user!.userId, pushToken);
    res.status(200).json(successResponse(null, 'Push token updated'));
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (handleValidationErrors(req, res)) return;
  try {
    const user = await authService.updateProfile(req.user!.userId, {
      name: req.body.name,
      profileImage: req.body.profileImage,
    });
    res.status(200).json(successResponse({ user }, 'Profile updated successfully'));
  } catch (error) {
    next(error);
  }
}
