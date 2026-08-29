import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Spacing, BorderRadius, Shadows, ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../src/store/theme.store';
import { getBiometricCredentials, isBiometricLoginEnabled, saveBiometricCredentials } from '../../src/utils/storage';
import { NetworkErrorCard } from '../../src/components/ui/NetworkErrorCard';

export default function LoginScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string }>({});
  const [rememberBiometric, setRememberBiometric] = useState(false);
  const [canUseBiometrics, setCanUseBiometrics] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometric login');

  useEffect(() => {
    const checkBiometrics = async () => {
      if (Platform.OS === 'web') return;
      const [hardware, enrolled, enabled, types] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        isBiometricLoginEnabled(),
        LocalAuthentication.supportedAuthenticationTypesAsync(),
      ]);
      setCanUseBiometrics(hardware && enrolled);
      setBiometricAvailable(hardware && enrolled && enabled);
      setBiometricLabel(types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) ? 'Sign in with Face ID' : 'Sign in with fingerprint');
    };
    checkBiometrics().catch(() => setBiometricAvailable(false));
  }, []);

  const validate = () => {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!password) {
      errors.password = 'Password is required';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async () => {
    clearError();
    if (!validate()) return;

    try {
      const normalizedEmail = email.trim().toLowerCase();
      await login({ email: normalizedEmail, password });
      if (rememberBiometric) {
        try {
          await saveBiometricCredentials(normalizedEmail, password);
        } catch {
          Alert.alert('Biometric setup skipped', 'You are signed in, but biometric login could not be enabled on this device.');
        }
      }
      router.replace('/(tabs)/feed');
    } catch {
      // error is handled and displayed from store
    }
  };

  const handleBiometricLogin = async () => {
    clearError();
    try {
      const credentials = await getBiometricCredentials();
      if (!credentials) {
        Alert.alert('Biometric login unavailable', 'Sign in with your password and enable biometric login again.');
        return;
      }
      await login(credentials);
      router.replace('/(tabs)/feed');
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (!message.toLowerCase().includes('cancel')) {
        Alert.alert('Could not sign in', 'Please try your fingerprint or sign in with your password.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.logoBadge}>
              <Ionicons name="git-compare-outline" size={21} color="#FFFFFF" />
            </View>
            <Text style={styles.logoText}>Insplit</Text>
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue to your shared space.</Text>
        </View>

        <View style={styles.form}>
          {error && /network|connect|timeout|offline|econn|server/i.test(error) ? (
            <NetworkErrorCard message={error} onRetry={handleLogin} />
          ) : error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorIcon}>!</Text>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          <Input
            label="Email Address"
            placeholder="you@example.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (validationErrors.email) setValidationErrors((prev) => ({ ...prev, email: undefined }));
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={validationErrors.email}
          />

          <Input
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (validationErrors.password) setValidationErrors((prev) => ({ ...prev, password: undefined }));
            }}
            secureTextEntry
            error={validationErrors.password}
          />

          {canUseBiometrics ? (
            <TouchableOpacity style={styles.biometricOption} onPress={() => setRememberBiometric((value) => !value)} activeOpacity={0.75}>
              <Ionicons name={rememberBiometric ? 'checkbox' : 'square-outline'} size={21} color={rememberBiometric ? Colors.primary : Colors.textMuted} />
              <Text style={styles.biometricOptionText}>Enable fingerprint or Face ID login</Text>
            </TouchableOpacity>
          ) : null}

          <Button
            title="Sign in"
            onPress={handleLogin}
            loading={isLoading}
            size="lg"
            style={styles.submitButton}
          />

          {biometricAvailable ? (
            <TouchableOpacity style={styles.biometricButton} onPress={handleBiometricLogin} disabled={isLoading} activeOpacity={0.75}>
              <Ionicons name="finger-print" size={24} color={Colors.primary} />
              <Text style={styles.biometricButtonText}>{biometricLabel}</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/auth/register')}>
              <Text style={styles.signupLink}>Create an account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  header: {
    marginBottom: Spacing.lg,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xl },
  logoBadge: {
    backgroundColor: Colors.primary,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginRight: Spacing.sm,
  },
  logoText: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 21,
    maxWidth: 430,
  },
  form: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.card,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.base,
  },
  errorIcon: { width: 22, height: 22, textAlign: 'center', textAlignVertical: 'center', borderRadius: 11, backgroundColor: Colors.danger, color: '#FFF', fontWeight: '900', marginRight: Spacing.sm },
  errorBannerText: {
    color: Colors.dangerText,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  submitButton: {
    marginTop: Spacing.sm,
  },
  biometricOption: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  biometricOptionText: { flex: 1, color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  biometricButton: { minHeight: 48, marginTop: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.surfaceSubtle },
  biometricButtonText: { color: Colors.primary, fontSize: 13, fontWeight: '800' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  signupLink: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '700',
  },
});
