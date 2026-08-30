import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import * as authApi from '../../src/services/api/auth.api';
import { BorderRadius, Spacing, ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../src/store/theme.store';

export default function ForgotPasswordScreen() {
  const router = useRouter(); const colors = useThemeColors(); const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState(''); const [loading, setLoading] = useState(false);
  const submit = async () => {
    const normalized = email.trim().toLowerCase();
    if (!/\S+@\S+\.\S+/.test(normalized)) return Alert.alert('Invalid email', 'Enter a valid email address.');
    setLoading(true);
    try { await authApi.forgotPassword(normalized); router.push({ pathname: '/auth/reset-password', params: { email: normalized } }); }
    catch (err) { Alert.alert('Could not send code', err instanceof Error ? err.message : 'Please try again.'); }
    finally { setLoading(false); }
  };
  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View style={styles.card}>
    <Text style={styles.title}>Forgot password?</Text><Text style={styles.subtitle}>Enter your email and we’ll send a 6-digit reset code.</Text>
    <Input label="Email address" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
    <Button title="Send reset code" onPress={submit} loading={loading} size="lg" />
    <TouchableOpacity onPress={() => router.back()}><Text style={styles.link}>Back to sign in</Text></TouchableOpacity>
  </View></KeyboardAvoidingView></SafeAreaView>;
}
const createStyles = (c: ThemeColors) => StyleSheet.create({ safe: { flex: 1, backgroundColor: c.background }, container: { flex: 1, justifyContent: 'center', padding: Spacing.lg }, card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderLight, borderRadius: BorderRadius.xl, padding: Spacing.lg, maxWidth: 520, width: '100%', alignSelf: 'center' }, title: { color: c.text, fontSize: 28, fontWeight: '800', marginBottom: Spacing.sm }, subtitle: { color: c.textSecondary, fontSize: 15, lineHeight: 22, marginBottom: Spacing.lg }, link: { color: c.primary, fontWeight: '700', textAlign: 'center', marginTop: Spacing.lg } });
