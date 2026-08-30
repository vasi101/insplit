import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { useAuthStore } from '../../src/store/auth.store';
import * as authApi from '../../src/services/api/auth.api';
import { BorderRadius, Spacing, ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../src/store/theme.store';

export default function VerifyEmailScreen() {
  const { email = '' } = useLocalSearchParams<{ email: string }>();
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const verifyEmail = useAuthStore((state) => state.verifyEmail);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);
  const [code, setCode] = useState('');

  const submit = async () => {
    clearError();
    if (!/^\d{6}$/.test(code)) return Alert.alert('Invalid code', 'Enter the 6-digit code from your email.');
    try {
      await verifyEmail(email, code);
      router.replace('/(tabs)/feed');
    } catch {}
  };

  const resend = async () => {
    try {
      await authApi.resendVerification(email);
      Alert.alert('Code sent', 'Check your email for a new verification code.');
    } catch (err) {
      Alert.alert('Could not resend', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={styles.card}>
      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.subtitle}>We sent a 6-digit code to {email}.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Input label="Verification code" placeholder="123456" value={code} onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" />
      <Button title="Verify email" onPress={submit} loading={isLoading} size="lg" />
      <TouchableOpacity onPress={resend}><Text style={styles.link}>Resend code</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => router.replace('/auth/login')}><Text style={styles.secondaryLink}>Back to sign in</Text></TouchableOpacity>
    </View>
  </KeyboardAvoidingView></SafeAreaView>;
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background }, container: { flex: 1, justifyContent: 'center', padding: Spacing.lg },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderLight, borderRadius: BorderRadius.xl, padding: Spacing.lg, maxWidth: 520, width: '100%', alignSelf: 'center' },
  title: { color: c.text, fontSize: 28, fontWeight: '800', marginBottom: Spacing.sm }, subtitle: { color: c.textSecondary, fontSize: 15, lineHeight: 22, marginBottom: Spacing.lg },
  error: { color: c.dangerText, backgroundColor: c.dangerLight, padding: Spacing.sm, borderRadius: BorderRadius.md, marginBottom: Spacing.md },
  link: { color: c.primary, textAlign: 'center', fontWeight: '700', marginTop: Spacing.lg }, secondaryLink: { color: c.textSecondary, textAlign: 'center', marginTop: Spacing.md },
});
