import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/auth.store';

export default function Index() {
  const router = useRouter();
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isInitialized) return;
    router.replace(isAuthenticated ? '/(tabs)/feed' : '/auth/login');
  }, [isInitialized, isAuthenticated, router]);

  return (
    <View style={styles.container}>
      <View style={styles.orbitLarge} />
      <View style={styles.orbitSmall} />
      <View style={styles.logoFrame}>
        <Image
          source={require('../assets/icon-insplit-balance.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.brandName}>Insplit</Text>
      <ActivityIndicator style={styles.loader} size="small" color="#8EA2FF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080D22',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  orbitLarge: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    borderWidth: 1,
    borderColor: 'rgba(142,162,255,0.12)',
  },
  orbitSmall: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 1,
    borderColor: 'rgba(76,201,240,0.12)',
  },
  logoFrame: {
    width: 108,
    height: 108,
    borderRadius: 30,
    backgroundColor: '#10165B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    shadowColor: '#4361EE',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 22,
    elevation: 10,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 27,
  },
  brandName: {
    color: '#F8FAFC',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1.2,
  },
  loader: {
    position: 'absolute',
    bottom: 62,
  },
});
