import React, { useEffect } from 'react';
import { Stack, router, useRootNavigationState, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/auth.store';
import { useRoomStore } from '../src/store/room.store';
import { useThemeColors, useThemeStore } from '../src/store/theme.store';
import { Platform, AppState } from 'react-native';
import Constants from 'expo-constants';
import { isDevice } from 'expo-device';
import { registerPushToken } from '../src/services/push-registration';
import { checkForUpdate, releaseChannel } from '../src/services/updates';

export default function RootLayout() {
  const navigationState = useRootNavigationState();
  const segments = useSegments();
  const inTabs = segments[0] === '(tabs)';
  const isInitialized = useAuthStore(state => state.isInitialized);
  const initializeAuth = useAuthStore((state) => state.initialize);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const fetchRooms = useRoomStore((state) => state.fetchRooms);
  const colors = useThemeColors();
  const themeMode = useThemeStore((state) => state.mode);
  const initializeTheme = useThemeStore((state) => state.initialize);

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchRooms();
    }
  }, [isAuthenticated, fetchRooms]);

  useEffect(() => {
    if (!isAuthenticated || Platform.OS === 'web' || !isDevice || Constants.appOwnership === 'expo') return;
    let cancelled = false;
    let busy = false;
    let tokenListener: { remove: () => void } | undefined;
    const register = async () => {
      if (busy || cancelled) return;
      busy = true;
      try {
        const notifications = await import('expo-notifications');
        if (cancelled) return;
        notifications.setNotificationHandler({ handleNotification: async () => ({
          shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
        }) });
        if (!tokenListener) tokenListener = notifications.addPushTokenListener(() => { void register(); });
        if (Platform.OS === 'android') {
          // A new ID is required because Android cannot change an existing channel's sound.
          await notifications.setNotificationChannelAsync('insplit-chime-v1', {
            name: 'Room updates', importance: notifications.AndroidImportance.HIGH,
            sound: 'insplit_chime.wav',
          });
        }
        let permission = await notifications.getPermissionsAsync();
        if (permission.status !== 'granted') permission = await notifications.requestPermissionsAsync();
        if (permission.status !== 'granted' || cancelled) return;
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        if (!projectId) throw new Error('Expo project ID is missing');
        const token = await notifications.getExpoPushTokenAsync({ projectId });
        if (cancelled || !useAuthStore.getState().isAuthenticated || useAuthStore.getState().isLoading) return;
        await registerPushToken(token.data);
      } catch (error) { console.warn('Could not register room notifications:', error); }
      finally { busy = false; }
    };
    void register();
    const appListener = AppState.addEventListener('change', state => {
      if (state === 'active') void register();
    });
    return () => { cancelled = true; tokenListener?.remove(); appListener.remove(); };
  }, [isAuthenticated]);


  useEffect(() => {
    if (!isInitialized || Platform.OS === 'web') return;
    void checkForUpdate();
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') void checkForUpdate();
    });
    return () => listener.remove();
  }, [isInitialized]);

  useEffect(() => {
    if (!isAuthenticated || !inTabs || !navigationState?.key || Platform.OS === 'web' || Constants.appOwnership === 'expo') return;
    let cancelled = false;
    let subscription: { remove: () => void } | undefined;
    let handled: string | undefined;
    void import('expo-notifications').then(async notifications => {
      if (cancelled) return;
      const handle = (response: import('expo-notifications').NotificationResponse | null) => {
        if (!response || cancelled || !useAuthStore.getState().isAuthenticated) return;
        const id = response.notification.request.identifier;
        if (handled === id) return;
        handled = id;
        const data = response.notification.request.content.data ?? {};
        if (data.type === 'APP_RELEASE') {
          if (data.channel === releaseChannel) void checkForUpdate(true);
        } else if (typeof data.type === 'string' && data.type.startsWith('TRANSACTION_') &&
                   typeof data.transactionId === 'string' && /^[a-f0-9]{24}$/i.test(data.transactionId)) {
          router.push({ pathname: '/(tabs)/feed/[id]', params: { id: data.transactionId } });
        }
        void notifications.clearLastNotificationResponseAsync();
      };
      subscription = notifications.addNotificationResponseReceivedListener(handle);
      handle(await notifications.getLastNotificationResponseAsync());
    }).catch(error => console.warn('Notification navigation unavailable:', error));
    return () => { cancelled = true; subscription?.remove(); };
  }, [isAuthenticated, inTabs, navigationState?.key]);

  return (
    <SafeAreaProvider>
      <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="rooms/create"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Create Room',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="rooms/join"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Join Room',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            headerShadowVisible: false,
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
