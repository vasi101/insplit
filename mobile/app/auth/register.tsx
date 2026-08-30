import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/auth.store';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Spacing, BorderRadius, ThemeColors, Shadows } from '../../constants/theme';
import { useThemeColors } from '../../src/store/theme.store';

export default function RegisterScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const router = useRouter();
  const registerUser = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});

  const validate = () => {
    const errors: { name?: string; email?: string; password?: string } = {};
    if (!name.trim()) {
      errors.name = 'Full name is required';
    }
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async () => {
    clearError();
    if (!validate()) return;

    try {
      const registeredEmail = await registerUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      router.replace({ pathname: '/auth/verify-email', params: { email: registeredEmail } });
    } catch {
      // error is handled and displayed from store
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>Insplit</Text>
          </View>
          <Text style={styles.title}>Create an account</Text>
          <Text style={styles.subtitle}>
            Join Insplit to effortlessly split expenses with your roommates.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <Input
            label="Full Name"
            placeholder="Shiv Sharma"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (validationErrors.name) setValidationErrors((prev) => ({ ...prev, name: undefined }));
            }}
            autoCapitalize="words"
            error={validationErrors.name}
          />

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
            placeholder="At least 8 characters"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (validationErrors.password) setValidationErrors((prev) => ({ ...prev, password: undefined }));
            }}
            secureTextEntry
            error={validationErrors.password}
          />

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={isLoading}
            size="lg"
            style={styles.submitButton}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.signupLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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
    marginBottom: Spacing.xl,
  },
  logoBadge: {
    backgroundColor: Colors.primary,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.base,
  },
  logoText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  errorBanner: {
    backgroundColor: Colors.dangerLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.base,
  },
  errorBannerText: {
    color: Colors.dangerText,
    fontSize: 14,
    fontWeight: '500',
  },
  form: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  submitButton: {
    marginTop: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
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
