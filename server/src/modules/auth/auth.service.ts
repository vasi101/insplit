import bcrypt from 'bcryptjs';
import { User, IUser } from './auth.model';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { createError } from '../../middleware/error.middleware';

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

function generateTokens(user: IUser): AuthTokens {
  const accessToken = signAccessToken({ userId: user._id.toString(), email: user.email });
  const refreshToken = signRefreshToken({ userId: user._id.toString() });
  return { accessToken, refreshToken };
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const existingUser = await User.findOne({ email: input.email.toLowerCase() });
  if (existingUser) {
    throw createError('Email is already registered', 409, 'EMAIL_ALREADY_EXISTS');
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await User.create({
    name: input.name.trim(),
    email: input.email.toLowerCase().trim(),
    passwordHash,
  });

  const tokens = generateTokens(user);

  // Store hashed refresh token
  await User.findByIdAndUpdate(user._id, { refreshToken: tokens.refreshToken });

  return { user, tokens };
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

  const tokens = generateTokens(user);
  await User.findByIdAndUpdate(user._id, { refreshToken: tokens.refreshToken });

  return { user, tokens };
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

export async function updatePushToken(userId: string, pushToken: string): Promise<void> {
  await User.findByIdAndUpdate(userId, { pushToken });
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
