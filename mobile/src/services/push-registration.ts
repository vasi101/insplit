import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './api/client';
import { updatePushToken } from './api/auth.api';

export const PUSH_TOKEN_KEY = 'insplit.expoPushToken';
let pending: Promise<void> = Promise.resolve();
function enqueue(action: () => Promise<void>): Promise<void> {
  const result = pending.then(action, action);
  pending = result.catch(() => {});
  return result;
}
export function registerPushToken(pushToken: string): Promise<void> {
  return enqueue(async () => {
    const previous = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, pushToken);
    await updatePushToken(pushToken);
    if (previous && previous !== pushToken) {
      await apiClient.delete('/auth/push-token', { data: { pushToken: previous } });
    }
  });
}
export function unregisterPushToken(): Promise<void> {
  return enqueue(async () => {
    const pushToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (!pushToken) return;
    await apiClient.delete('/auth/push-token', { data: { pushToken } });
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  });
}
