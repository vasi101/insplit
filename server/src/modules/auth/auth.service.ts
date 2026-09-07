import bcrypt from 'bcryptjs';
import { User, IUser } from './auth.model';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { createError } from '../../middleware/error.middleware';
import crypto from 'crypto';
import { sendCodeEmail } from '../../notifications/email.service';

const SALT_ROUNDS = 12;

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: IUser;
  tokens: AuthTokens;
}

const CODE_TTL_MS = 10 * 60 * 1000;
const createCode = () => crypto.randomInt(100000, 1000000).toString();
const hashCode = (code: string) => crypto.createHash('sha256').update(code).digest('hex');

function generateTokens(user: IUser): AuthTokens {
  const accessToken = signAccessToken({
    userId: user._id.toString(),
    email: user.email,
    isAdmin: !!user.isAdmin,
  });
  const refreshToken = signRefreshToken({ userId: user._id.toString() });
  return { accessToken, refreshToken };
}

export async function registerUser(input: RegisterInput): Promise<{ email: string }> {
  const existingUser = await User.findOne({ email: input.email.toLowerCase() });
  if (existingUser) {
    throw createError('Email is already registered', 409, 'EMAIL_ALREADY_EXISTS');
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const code = createCode();
  const user = await User.create({
    name: input.name.trim(),
    email: input.email.toLowerCase().trim(),
    passwordHash,
    emailVerified: false,
    emailVerificationCodeHash: hashCode(code),
    emailVerificationExpiresAt: new Date(Date.now() + CODE_TTL_MS),
  });
  try {
    await sendCodeEmail({
      to: user.email,
      subject: 'Verify your Insplit email',
      heading: 'Welcome to Insplit',
      message: 'Enter this verification code to activate your account:',
      code,
    });
  } catch (error) {
    await User.findByIdAndDelete(user._id);
    throw error;
  }
  return { email: user.email };
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  // Explicitly select passwordHash since it's excluded by default
  const user = await User.findOne({ email: input.email.toLowerCase() }).select('+passwordHash');

  if (!user) {
    throw createError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const isPasswordValid = await user.comparePassword(input.password);
  if (!isPasswordValid) {
    throw createError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }
  if (!user.emailVerified) {
    throw createError('Please verify your email before signing in', 403, 'EMAIL_NOT_VERIFIED');
  }

  const tokens = generateTokens(user);
  await User.findByIdAndUpdate(user._id, { refreshToken: tokens.refreshToken });

  return { user, tokens };
}

export async function verifyEmail(email: string, code: string): Promise<AuthResult> {
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    '+emailVerificationCodeHash +emailVerificationExpiresAt'
  );
  if (!user || user.emailVerified || user.emailVerificationCodeHash !== hashCode(code)
    || !user.emailVerificationExpiresAt || user.emailVerificationExpiresAt.getTime() < Date.now()) {
    throw createError('Invalid or expired verification code', 400, 'INVALID_VERIFICATION_CODE');
  }
  user.emailVerified = true;
  user.emailVerificationCodeHash = undefined;
  user.emailVerificationExpiresAt = undefined;
  const tokens = generateTokens(user);
  user.refreshToken = tokens.refreshToken;
  await user.save();
  return { user, tokens };
}

export async function resendVerification(email: string): Promise<void> {
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    '+emailVerificationCodeHash +emailVerificationExpiresAt'
  );
  if (!user || user.emailVerified) return;
  const code = createCode();
  user.emailVerificationCodeHash = hashCode(code);
  user.emailVerificationExpiresAt = new Date(Date.now() + CODE_TTL_MS);
  await user.save();
  await sendCodeEmail({ to: user.email, subject: 'Your new Insplit verification code', heading: 'Verify your email', message: 'Enter this code to activate your account:', code });
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    '+passwordResetCodeHash +passwordResetExpiresAt'
  );
  if (!user) return;
  const code = createCode();
  user.passwordResetCodeHash = hashCode(code);
  user.passwordResetExpiresAt = new Date(Date.now() + CODE_TTL_MS);
  await user.save();
  await sendCodeEmail({ to: user.email, subject: 'Reset your Insplit password', heading: 'Password reset', message: 'Enter this code in Insplit to choose a new password:', code });
}

export async function resetPassword(email: string, code: string, password: string): Promise<void> {
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    '+passwordHash +passwordResetCodeHash +passwordResetExpiresAt +refreshToken'
  );
  if (!user || user.passwordResetCodeHash !== hashCode(code) || !user.passwordResetExpiresAt
    || user.passwordResetExpiresAt.getTime() < Date.now()) {
    throw createError('Invalid or expired reset code', 400, 'INVALID_RESET_CODE');
  }
  user.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  user.passwordResetCodeHash = undefined;
  user.passwordResetExpiresAt = undefined;
  user.refreshToken = undefined;
  await user.save();
}

export async function refreshTokens(oldRefreshToken: string): Promise<AuthTokens> {
  let payload;
  try {
    payload = verifyRefreshToken(oldRefreshToken);
  } catch {
    throw createError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  const user = await User.findById(payload.userId).select('+refreshToken');
  if (!user || user.refreshToken !== oldRefreshToken) {
    throw createError('Refresh token revoked', 401, 'REFRESH_TOKEN_REVOKED');
  }

  const tokens = generateTokens(user);
  await User.findByIdAndUpdate(user._id, { refreshToken: tokens.refreshToken });

  return tokens;
}

export async function logoutUser(userId: string): Promise<void> {
  await User.findByIdAndUpdate(userId, { refreshToken: null });
}

export async function verifyUserPassword(userId: string, password: string): Promise<void> {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user || !(await user.comparePassword(password))) {
    throw createError('Incorrect password', 401, 'INVALID_CREDENTIALS');
  }
}

export async function updatePushToken(userId: string, pushToken: string, channel: 'production' | 'development' = 'production'): Promise<void> {
  // A device belongs to the currently signed-in account only.
  await User.updateMany({ _id: { $ne: userId } }, { $pull: { pushTokens: pushToken, pushDevices: { token: pushToken } } });
  await User.updateMany({ pushToken }, { $unset: { pushToken: 1 } });
  await User.findByIdAndUpdate(userId, { $addToSet: { pushTokens: pushToken, pushDevices: { token: pushToken, channel } } });
}

export async function getUserById(userId: string): Promise<IUser | null> {
  return User.findById(userId);
}

export interface UpdateProfileInput {
  name?: string;
  profileImage?: string;
  phone?: string;
}

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<IUser> {
  const updates: Partial<{ name: string; profileImage: string; phone: string }> = {};
  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.profileImage !== undefined) updates.profileImage = input.profileImage;
  if (input.phone !== undefined) updates.phone = input.phone.trim();

  const user = await User.findByIdAndUpdate(userId, updates, { new: true });
  if (!user) throw createError('User not found', 404, 'NOT_FOUND');
  return user;
}
