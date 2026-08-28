import React from 'react';
import { Tabs } from 'expo-router';
import { Text, View, StyleSheet, Platform } from 'react-native';
import { Colors, Spacing } from '../../constants/theme';

function TabIcon({ label, focused, icon }: { label: string; focused: boolean; icon: string }) {
  return (
    <View style={styles.tabItem}>
      <Text style={[styles.iconText, focused && styles.iconFocused]}>{icon}</Text>
      <Text style={[styles.label, focused && styles.labelFocused]}>{label}</Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
        },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Feed" focused={focused} icon="🧾" />
          ),
        }}
      />
      <Tabs.Screen
        name="settlement"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Settlement" focused={focused} icon="⚖️" />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Inventory" focused={focused} icon="📦" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Profile" focused={focused} icon="👤" />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 20,
    marginBottom: 2,
    opacity: 0.6,
  },
  iconFocused: {
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  labelFocused: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
