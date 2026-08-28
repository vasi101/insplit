import React from 'react';
import { Stack } from 'expo-router';
import { Colors } from '../../../constants/theme';

export default function SettlementLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="record"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Record Settlement Payment',
          headerStyle: { backgroundColor: Colors.surface },
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}
