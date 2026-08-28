import { create } from 'zustand';
import { User } from '../types';
import * as authApi from '../services/api/auth.api';
import { syncBaseUrl, extractErrorMessage } from '../services/api/client';
import {
  saveTokens,
  clearTokens,
  getAccessToken,
  saveCustomBaseUrl,
  getCustomBaseUrl,
} from '../utils/storage';
import { connectSocket, disconnectSocket } from '../services/socket/socket.service';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  customBaseUrl: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (payload: authApi.LoginPayload) => Promise<void>;
  register: (payload: authApi.RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (payload: { name?: string; profileImage?: string }) => Promise<void>;
  setCustomBaseUrl: (url: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,
  customBaseUrl: null,

  initialize: async () => {
    try {
      await syncBaseUrl();
      const customUrl = await getCustomBaseUrl();
      const token = await getAccessToken();

      if (token) {
        const user = await authApi.getMe();
        set({ user, isAuthenticated: true, customBaseUrl: customUrl });
        await connectSocket();
      } else {
        set({ user: null, isAuthenticated: false, customBaseUrl: customUrl });
      }
    } catch {
      await clearTokens();
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isInitialized: true });
    }
  },

  login: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const { user, tokens } = await authApi.login(payload);
      await saveTokens(tokens.accessToken, tokens.refreshToken);
      set({ user, isAuthenticated: true, isLoading: false });
      await connectSocket();
    } catch (err) {
      const message = extractErrorMessage(err);
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  register: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const { user, tokens } = await authApi.register(payload);
      await saveTokens(tokens.accessToken, tokens.refreshToken);
      set({ user, isAuthenticated: true, isLoading: false });
      await connectSocket();
    } catch (err) {
      const message = extractErrorMessage(err);
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authApi.logout().catch(() => {});
    } finally {
      disconnectSocket();
      await clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    }
  },

  updateProfile: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const updatedUser = await authApi.updateProfile(payload);
      set({ user: updatedUser, isLoading: false });
    } catch (err) {
      const message = extractErrorMessage(err);
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  setCustomBaseUrl: async (url: string) => {
    await saveCustomBaseUrl(url);
    await syncBaseUrl();
    set({ customBaseUrl: url });
  },

  clearError: () => set({ error: null }),
}));
