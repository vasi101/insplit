import Constants from 'expo-constants';

const PRODUCTION_API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '')
  || 'https://insplit-wine.vercel.app';

function getDevApiUrl(): string {
  // Expo hostUri example: "192.168.18.21:8081"
  const hostUri = Constants.expoConfig?.hostUri;

  if (hostUri) {
    const host = hostUri.split(':')[0];

    if (host) {
      return `http://${host}:5000`;
    }
  }

  return 'http://localhost:5000';
}

export const DEFAULT_BASE_URL = __DEV__
  ? getDevApiUrl()
  : PRODUCTION_API_URL;

export const API_CONFIG = {
  BASE_URL: DEFAULT_BASE_URL,
  API_PREFIX: '/api',
  TIMEOUT: 15000,
};
