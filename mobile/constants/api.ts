import Constants from 'expo-constants';

const normalizeUrl = (value?: string): string | undefined =>
  value?.trim().replace(/\/+$/, '') || undefined;

const DEV_API_URL = normalizeUrl(process.env.EXPO_PUBLIC_DEV_API_URL);
const PRODUCTION_API_URL = normalizeUrl(process.env.EXPO_PUBLIC_PRODUCTION_API_URL)
  // Backward compatibility for existing mobile/.env and hosted Expo variables.
  || normalizeUrl(process.env.EXPO_PUBLIC_API_URL)
  || 'https://insplit-server.onrender.com';

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
  ? (DEV_API_URL || getDevApiUrl())
  : PRODUCTION_API_URL;

export const API_CONFIG = {
  BASE_URL: DEFAULT_BASE_URL,
  // Environment selection is authoritative. Do not let a URL saved on the
  // device accidentally send development traffic to production or vice versa.
  HAS_ENV_OVERRIDE: true,
  ENVIRONMENT: __DEV__ ? 'development' : 'production',
  API_PREFIX: '/api',
  TIMEOUT: 15000,
};
