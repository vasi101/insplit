import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  User,
  DashboardStats,
  Transaction,
  Room,
  InventoryItem,
  ApiResponse,
} from '../types';

export function getApiBaseUrl(): string {
  const custom = localStorage.getItem('insplit_custom_api_url');
  if (custom && custom.trim()) {
    const trimmed = custom.trim().replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Default to production Vercel backend if not on local dev server
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://insplit-wine.vercel.app/api';
  }
  return 'http://localhost:5000/api';
}

export function setCustomApiUrl(url: string | null) {
  if (url && url.trim()) {
    localStorage.setItem('insplit_custom_api_url', url.trim());
  } else {
    localStorage.removeItem('insplit_custom_api_url');
  }
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Storage helpers
export const getStoredTokens = () => ({
  accessToken: localStorage.getItem('insplit_admin_token'),
  refreshToken: localStorage.getItem('insplit_admin_refresh_token'),
});

export const setStoredTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem('insplit_admin_token', accessToken);
  localStorage.setItem('insplit_admin_refresh_token', refreshToken);
};

export const clearStoredTokens = () => {
  localStorage.removeItem('insplit_admin_token');
  localStorage.removeItem('insplit_admin_refresh_token');
  localStorage.removeItem('insplit_admin_user');
};

// Request interceptor: attach token & dynamic baseURL
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config.baseURL = getApiBaseUrl();
  const { accessToken } = getStoredTokens();
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor: handle 401 & auto-refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token!);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { refreshToken } = getStoredTokens();
        if (!refreshToken) throw new Error('No refresh token');

        const res = await axios.post(`${getApiBaseUrl()}/auth/refresh`, { refreshToken });
        const { tokens } = res.data.data;
        setStoredTokens(tokens.accessToken, tokens.refreshToken);

        processQueue(null, tokens.accessToken);
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
        }
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        clearStoredTokens();
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ─── API Methods ──────────────────────────────────────────────────────────────

// Auth
export async function adminLogin(email: string, password: string) {
  const res = await api.post<ApiResponse<{ user: User; tokens: { accessToken: string; refreshToken: string } }>>(
    '/auth/login',
    { email, password }
  );
  if (!res.data.data?.user.isAdmin) {
    throw new Error('This account does not have Administrator privileges.');
  }
  return res.data.data;
}

export async function getMe() {
  const res = await api.get<ApiResponse<{ user: User }>>('/auth/me');
  return res.data.data!.user;
}

// Analytics
export async function fetchDashboardStats() {
  const res = await api.get<ApiResponse<DashboardStats>>('/admin/stats');
  return res.data.data!;
}

// Users
export async function fetchUsers(params: {
  search?: string;
  role?: string;
  verified?: string;
  page?: number;
  limit?: number;
}) {
  const res = await api.get<ApiResponse<{ users: User[]; total: number; page: number; pages: number }>>(
    '/admin/users',
    { params }
  );
  return res.data.data!;
}

export async function fetchUserDetails(userId: string) {
  const res = await api.get<ApiResponse<{ user: User; rooms: Room[]; stats: { transactionsCount: number; totalSpent: number } }>>(
    `/admin/users/${userId}`
  );
  return res.data.data!;
}

export async function createNewUser(data: { name: string; email: string; password?: string; phone?: string; isAdmin?: boolean }) {
  const res = await api.post<ApiResponse<{ user: User }>>('/admin/users', data);
  return res.data.data!.user;
}

export async function updateUserDetails(userId: string, data: Partial<User>) {
  const res = await api.patch<ApiResponse<{ user: User }>>(`/admin/users/${userId}`, data);
  return res.data.data!.user;
}

export async function deleteUser(userId: string) {
  await api.delete(`/admin/users/${userId}`);
}

export async function toggleAdminRole(userId: string, isAdmin: boolean) {
  const res = await api.patch<ApiResponse<{ user: User }>>(`/admin/users/${userId}/role`, { isAdmin });
  return res.data.data!.user;
}

export async function sendUserVerificationEmail(userId: string) {
  const res = await api.post<ApiResponse<{ email: string }>>(`/admin/users/${userId}/send-verification`);
  return res.data;
}

export async function toggleUserVerification(userId: string, emailVerified: boolean) {
  const res = await api.patch<ApiResponse<{ user: User }>>(`/admin/users/${userId}/verification`, { emailVerified });
  return res.data.data!.user;
}

// Transactions
export async function fetchTransactions(params: {
  search?: string;
  roomId?: string;
  status?: string;
  category?: string;
  page?: number;
  limit?: number;
}) {
  const res = await api.get<ApiResponse<{ transactions: Transaction[]; total: number; page: number; pages: number }>>(
    '/admin/transactions',
    { params }
  );
  return res.data.data!;
}

export async function createTransaction(data: any) {
  const res = await api.post<ApiResponse<{ transaction: Transaction }>>('/admin/transactions', data);
  return res.data.data!.transaction;
}

export async function updateTransactionStatus(transactionId: string, status: string) {
  const res = await api.patch<ApiResponse<{ transaction: Transaction }>>(
    `/admin/transactions/${transactionId}/status`,
    { status }
  );
  return res.data.data!.transaction;
}

export async function deleteTransaction(transactionId: string) {
  await api.delete(`/admin/transactions/${transactionId}`);
}

// Rooms
export async function fetchRooms(params: { search?: string; page?: number; limit?: number }) {
  const res = await api.get<ApiResponse<{ rooms: Room[]; total: number; page: number; pages: number }>>(
    '/admin/rooms',
    { params }
  );
  return res.data.data!;
}

export async function createRoom(data: { name: string; description?: string; creatorId?: string }) {
  const res = await api.post<ApiResponse<{ room: Room }>>('/admin/rooms', data);
  return res.data.data!.room;
}

export async function deleteRoom(roomId: string) {
  await api.delete(`/admin/rooms/${roomId}`);
}

// Inventory
export async function fetchInventory(params: {
  search?: string;
  roomId?: string;
  category?: string;
  page?: number;
  limit?: number;
}) {
  const res = await api.get<ApiResponse<{ items: InventoryItem[]; total: number; page: number; pages: number }>>(
    '/admin/inventory',
    { params }
  );
  return res.data.data!;
}

export async function addInventoryItem(data: {
  roomId: string;
  name: string;
  category?: string;
  quantity: number;
  unit?: string;
  minQuantity?: number | null;
}) {
  const res = await api.post<ApiResponse<{ item: InventoryItem }>>('/admin/inventory', data);
  return res.data.data!.item;
}

export async function updateInventoryItem(itemId: string, data: Partial<InventoryItem>) {
  const res = await api.patch<ApiResponse<{ item: InventoryItem }>>(`/admin/inventory/${itemId}`, data);
  return res.data.data!.item;
}

export async function deleteInventoryItem(itemId: string) {
  await api.delete(`/admin/inventory/${itemId}`);
}
