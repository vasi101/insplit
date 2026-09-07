import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/auth.store';
import { useRoomStore } from '../src/store/room.store';
import { useThemeColors, useThemeStore } from '../src/store/theme.store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { isDevice } from 'expo-device';
import { updatePushToken } from '../src/services/api/auth.api';

export default function RootLayout() {
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
    void (async () => {
      const notifications = await import('expo-notifications');
      if (Platform.OS === 'android') {
        await notifications.setNotificationChannelAsync('default', {
          name: 'Room updates', importance: notifications.AndroidImportance.HIGH,
        });
      }
      let permission = await notifications.getPermissionsAsync();
      if (permission.status !== 'granted') permission = await notifications.requestPermissionsAsync();
      if (permission.status !== 'granted' || cancelled) return;
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId) return;
      const token = await notifications.getExpoPushTokenAsync({ projectId });
      if (!cancelled) await updatePushToken(token.data);
    })().catch(error => console.warn('Could not register room notifications:', error));
    return () => { cancelled = true; };
  }, [isAuthenticated]);

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
