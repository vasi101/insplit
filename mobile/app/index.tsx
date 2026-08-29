import React, { useEffect, useMemo } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/auth.store';
import { ThemeColors } from '../constants/theme';
import { useThemeColors } from '../src/store/theme.store';

export default function Index() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const router = useRouter();
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isInitialized) return;

    if (isAuthenticated) {
      router.replace('/(tabs)/feed');
    } else {
      router.replace('/auth/login');
    }
  }, [isInitialized, isAuthenticated, router]);

  return (
    <View style={styles.container}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      <View style={styles.brandMark}>
        <View style={styles.brandPanelLeft} />
        <View style={styles.brandPanelRight} />
        <Text style={styles.brandSymbol}>÷</Text>
      </View>
      <Text style={styles.brandName}>Insplit</Text>
      <Text style={styles.tagline}>Shared living, made simple.</Text>
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.loadingText}>Preparing your space</Text>
      </View>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glowTop: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: Colors.primary,
    opacity: 0.1,
    top: -100,
    right: -90,
  },
  glowBottom: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: Colors.primaryLight,
    opacity: 0.1,
    bottom: -100,
    left: -70,
  },
  brandMark: {
    width: 78,
    height: 78,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  brandPanelLeft: {
    position: 'absolute', width: 22, height: 38, left: 15, top: 20,
    borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.22)',
  },
  brandPanelRight: {
    position: 'absolute', width: 22, height: 38, right: 15, top: 20,
    borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.22)',
  },
  brandSymbol: { color: '#FFFFFF', fontSize: 34, fontWeight: '900', zIndex: 2 },
  brandName: { color: Colors.text, fontSize: 34, fontWeight: '900', letterSpacing: -1 },
  tagline: { color: Colors.textSecondary, fontSize: 14, marginTop: 5 },
  loadingRow: {
    position: 'absolute',
    bottom: 62,
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: { color: Colors.textMuted, fontSize: 12, marginLeft: 9, fontWeight: '600' },
});
