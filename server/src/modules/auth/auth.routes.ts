import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  getMe,
  updatePushToken,
  updateProfile,
  registerValidation,
  loginValidation,
  updateProfileValidation,
  verifyPassword,
  verifyPasswordValidation,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  emailCodeValidation,
  emailOnlyValidation,
  resetPasswordValidation,
} from './auth.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/refresh', refresh);
router.post('/verify-email', emailCodeValidation, verifyEmail);
router.post('/resend-verification', emailOnlyValidation, resendVerification);
router.post('/forgot-password', emailOnlyValidation, forgotPassword);
router.post('/reset-password', resetPasswordValidation, resetPassword);

// Protected routes
router.post('/logout', authMiddleware, logout);
router.post('/verify-password', authMiddleware, verifyPasswordValidation, verifyPassword);
router.get('/me', authMiddleware, getMe);
router.patch('/me', authMiddleware, updateProfileValidation, updateProfile);
router.patch('/push-token', authMiddleware, updatePushToken);

export default router;
