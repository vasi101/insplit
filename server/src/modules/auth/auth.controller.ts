import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import * as authService from './auth.service';
import { successResponse, errorResponse } from '../../utils/response';

// Validation rules
export const updateProfileValidation = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: 100 }),
  body('profileImage').optional().isURL().withMessage('profileImage must be a valid URL'),
  body('phone').optional().trim().isLength({ max: 24 }).withMessage('Phone number is too long'),
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

export const verifyPasswordValidation = [
  body('password').notEmpty().withMessage('Password is required'),
];

export const emailCodeValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('A 6-digit code is required'),
];

export const emailOnlyValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
];

export const resetPasswordValidation = [
  ...emailCodeValidation,
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
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
    const { email } = await authService.registerUser(req.body);
    res.status(201).json(
      successResponse({ email, verificationRequired: true }, 'Verification code sent')
    );
  } catch (error) {
    next(error);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (handleValidationErrors(req, res)) return;
  try {
    const { user, tokens } = await authService.verifyEmail(req.body.email, req.body.code);
    res.status(200).json(successResponse({ user, tokens }, 'Email verified successfully'));
  } catch (error) { next(error); }
}

export async function resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (handleValidationErrors(req, res)) return;
  try {
    await authService.resendVerification(req.body.email);
    res.status(200).json(successResponse(null, 'If the account needs verification, a new code has been sent'));
  } catch (error) { next(error); }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (handleValidationErrors(req, res)) return;
  try {
    await authService.requestPasswordReset(req.body.email);
    res.status(200).json(successResponse(null, 'If an account exists, a reset code has been sent'));
  } catch (error) { next(error); }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (handleValidationErrors(req, res)) return;
  try {
    await authService.resetPassword(req.body.email, req.body.code, req.body.password);
    res.status(200).json(successResponse(null, 'Password reset successfully'));
  } catch (error) { next(error); }
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

export async function verifyPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (handleValidationErrors(req, res)) return;
  try {
    await authService.verifyUserPassword(req.user!.userId, req.body.password);
    res.status(200).json(successResponse(null, 'Identity confirmed'));
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
  if (typeof pushToken !== 'string' || !/^(ExponentPushToken|ExpoPushToken)\[[\w-]+\]$/.test(pushToken) || pushToken.length > 256) {
    res.status(400).json(errorResponse('VALIDATION_ERROR', 'pushToken is required'));
    return;
  }
  try {
    if (req.body.channel !== undefined && !['production', 'development'].includes(req.body.channel)) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid release channel'));
      return;
    }
    await authService.updatePushToken(req.user!.userId, pushToken, req.body.channel);
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
      phone: req.body.phone,
    });
    res.status(200).json(successResponse({ user }, 'Profile updated successfully'));
  } catch (error) {
    next(error);
  }
}
