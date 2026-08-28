import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'insplit_access_token';
const REFRESH_TOKEN_KEY = 'insplit_refresh_token';
const CURRENT_ROOM_KEY = 'insplit_current_room_id';
const BASE_URL_KEY = 'insplit_base_url_custom';

export async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore web storage errors
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return await SecureStore.getItemAsync(key);
}

export async function removeItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

// Token specific helpers
export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  await setItem(ACCESS_TOKEN_KEY, accessToken);
  await setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export async function getAccessToken(): Promise<string | null> {
  return getItem(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return getItem(REFRESH_TOKEN_KEY);
}

export async function clearTokens(): Promise<void> {
  await removeItem(ACCESS_TOKEN_KEY);
  await removeItem(REFRESH_TOKEN_KEY);
}

// Active room persistence
export async function saveCurrentRoomId(roomId: string): Promise<void> {
  await setItem(CURRENT_ROOM_KEY, roomId);
}

export async function getCurrentRoomId(): Promise<string | null> {
  return getItem(CURRENT_ROOM_KEY);
}

export async function clearCurrentRoomId(): Promise<void> {
  await removeItem(CURRENT_ROOM_KEY);
}

// Custom base url override
export async function saveCustomBaseUrl(url: string): Promise<void> {
  await setItem(BASE_URL_KEY, url);
}

export async function getCustomBaseUrl(): Promise<string | null> {
  return getItem(BASE_URL_KEY);
}
