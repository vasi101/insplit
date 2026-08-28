import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Auto-detect the computer's Wi-Fi IP from Expo when running on a physical phone
function getDevServerIp(): string {
  // hostUri looks like "192.168.18.21:8081"
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip) return `http://${ip}:5000`;
  }
  
  return Platform.select({
    android: 'http://192.168.18.21:5000',
    ios: 'http://192.168.18.21:5000',
    default: 'http://localhost:5000',
  }) as string;
}

export const DEFAULT_BASE_URL = getDevServerIp();

export const API_CONFIG = {
  BASE_URL: DEFAULT_BASE_URL,
  API_PREFIX: '/api',
  TIMEOUT: 15000,
};
