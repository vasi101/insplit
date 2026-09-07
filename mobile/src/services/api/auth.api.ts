import { apiClient } from './client';
import { User, AuthTokens, ApiResponse } from '../../types';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponseData {
  user: User;
  tokens: AuthTokens;
}

export async function register(payload: RegisterPayload): Promise<{ email: string; verificationRequired: boolean }> {
  const res = await apiClient.post<ApiResponse<{ email: string; verificationRequired: boolean }>>('/auth/register', payload);
  return res.data.data!;
}

export async function verifyEmail(email: string, code: string): Promise<AuthResponseData> {
  const res = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/verify-email', { email, code });
  return res.data.data!;
}

export async function resendVerification(email: string): Promise<void> {
  await apiClient.post<ApiResponse<null>>('/auth/resend-verification', { email });
}

export async function forgotPassword(email: string): Promise<void> {
  await apiClient.post<ApiResponse<null>>('/auth/forgot-password', { email });
}

export async function resetPassword(email: string, code: string, password: string): Promise<void> {
  await apiClient.post<ApiResponse<null>>('/auth/reset-password', { email, code, password });
}

export async function login(payload: LoginPayload): Promise<AuthResponseData> {
  const res = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/login', payload);
  return res.data.data!;
}

export async function logout(): Promise<void> {
  await apiClient.post<ApiResponse<null>>('/auth/logout');
}

export async function verifyPassword(password: string): Promise<void> {
  await apiClient.post<ApiResponse<null>>('/auth/verify-password', { password });
}

export async function getMe(): Promise<User> {
  const res = await apiClient.get<ApiResponse<{ user: User }>>('/auth/me');
  return res.data.data!.user;
}

export async function updateProfile(payload: { name?: string; profileImage?: string; phone?: string }): Promise<User> {
  const res = await apiClient.patch<ApiResponse<{ user: User }>>('/auth/me', payload);
  return res.data.data!.user;
}

export async function updatePushToken(pushToken: string): Promise<void> {
  await apiClient.patch<ApiResponse<null>>('/auth/push-token', { pushToken, channel: __DEV__ ? 'development' : 'production' });
}
