import React, { ComponentProps, useMemo } from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../src/store/theme.store';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

function TabIcon({ focused, activeIcon, icon }: {
  focused: boolean;
  activeIcon: IoniconName;
  icon: IoniconName;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.tabItem, focused && styles.tabItemFocused]}>
      <Ionicons
        name={focused ? activeIcon : icon}
        size={focused ? 24 : 23}
        color={focused ? colors.textInverted : colors.textMuted}
      />
      {focused ? <View style={styles.activeDot} /> : null}
    </View>
  );
}

export default function TabLayout() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const horizontalGap = 16;
  const bottomOffset = Platform.OS === 'ios' ? Math.max(insets.bottom, 8) : 0;
  const tabBarHeight = Platform.OS === 'ios' ? 64 : 62;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderTopColor: colors.border,
          borderWidth: 1,
          left: horizontalGap,
          right: horizontalGap,
          height: tabBarHeight,
          paddingTop: 6,
          paddingBottom: 6,
          position: 'absolute',
          bottom: bottomOffset,
          borderRadius: 24,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          elevation: 10,
        },
        tabBarItemStyle: { borderRadius: 20 },
        sceneStyle: {
          paddingBottom: tabBarHeight + bottomOffset + 4,
          backgroundColor: colors.background,
        },
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, styles.tabBarBackground, { backgroundColor: colors.surface }]} />
        ),
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarAccessibilityLabel: 'Expense feed',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="receipt-outline" activeIcon="receipt" />
          ),
        }}
      />
      <Tabs.Screen
        name="settlement"
        options={{
          title: 'Settlement',
          tabBarAccessibilityLabel: 'Settlements and balances',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="swap-horizontal-outline" activeIcon="swap-horizontal" />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventory',
          tabBarAccessibilityLabel: 'Shared inventory',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="cube-outline" activeIcon="cube" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarAccessibilityLabel: 'Profile and settings',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="person-circle-outline" activeIcon="person-circle" />
          ),
        }}
      />
    </Tabs>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  tabBarBackground: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  tabItem: {
    width: 48,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  tabItemFocused: {
    backgroundColor: Colors.primary,
  },
  activeDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textInverted,
    opacity: 0.8,
  },
});
