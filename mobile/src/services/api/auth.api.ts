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

export async function register(payload: RegisterPayload): Promise<AuthResponseData> {
  const res = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/register', payload);
  return res.data.data!;
}

export async function login(payload: LoginPayload): Promise<AuthResponseData> {
  const res = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/login', payload);
  return res.data.data!;
}

export async function logout(): Promise<void> {
  await apiClient.post<ApiResponse<null>>('/auth/logout');
}

export async function getMe(): Promise<User> {
  const res = await apiClient.get<ApiResponse<{ user: User }>>('/auth/me');
  return res.data.data!.user;
}

export async function updateProfile(payload: { name?: string; profileImage?: string }): Promise<User> {
  const res = await apiClient.patch<ApiResponse<{ user: User }>>('/auth/me', payload);
  return res.data.data!.user;
}

export async function updatePushToken(pushToken: string): Promise<void> {
  await apiClient.patch<ApiResponse<null>>('/auth/push-token', { pushToken });
}
