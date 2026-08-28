import React from 'react';
import { Stack } from 'expo-router';
import { Colors } from '../../../constants/theme';

export default function FeedLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="create"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Add Mutual Expense',
          headerStyle: { backgroundColor: Colors.surface },
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: true,
          title: 'Expense Details',
          headerStyle: { backgroundColor: Colors.surface },
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}
