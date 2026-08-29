import React, { useMemo } from 'react';
import { Stack } from 'expo-router';
import { useThemeColors } from '../../../src/store/theme.store';

export default function SettlementLayout() {
  const Colors = useThemeColors();
  const screenOptions = useMemo(() => ({
    headerShown: false,
    contentStyle: { backgroundColor: Colors.background },
    headerStyle: { backgroundColor: Colors.background },
    headerTintColor: Colors.text,
    headerTitleStyle: { fontWeight: '800' as const },
    headerShadowVisible: false,
  }), [Colors]);

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: true,
          title: 'Payment Details',
          headerStyle: { backgroundColor: Colors.background },
        }}
      />
      <Stack.Screen
        name="record"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Record Settlement Payment',
          headerStyle: { backgroundColor: Colors.background },
        }}
      />
    </Stack>
  );
}
