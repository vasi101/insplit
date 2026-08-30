import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import * as authApi from '../../src/services/api/auth.api';
import { BorderRadius, Spacing, ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../src/store/theme.store';

export default function ResetPasswordScreen() {
  const { email = '' } = useLocalSearchParams<{ email: string }>(); const router = useRouter(); const colors = useThemeColors(); const styles = useMemo(() => createStyles(colors), [colors]);
  const [code, setCode] = useState(''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!/^\d{6}$/.test(code)) return Alert.alert('Invalid code', 'Enter the 6-digit reset code.');
    if (password.length < 8) return Alert.alert('Password too short', 'Use at least 8 characters.');
    if (password !== confirm) return Alert.alert('Passwords do not match', 'Enter the same password twice.');
    setLoading(true);
    try { await authApi.resetPassword(email, code, password); Alert.alert('Password updated', 'You can now sign in with your new password.', [{ text: 'Sign in', onPress: () => router.replace('/auth/login') }]); }
    catch (err) { Alert.alert('Could not reset password', err instanceof Error ? err.message : 'Please try again.'); }
    finally { setLoading(false); }
  };
  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View style={styles.card}>
    <Text style={styles.title}>Create new password</Text>
    <Input label="Reset code" placeholder="123456" value={code} onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" />
    <Input label="New password" placeholder="At least 8 characters" value={password} onChangeText={setPassword} secureTextEntry />
    <Input label="Confirm password" placeholder="Repeat password" value={confirm} onChangeText={setConfirm} secureTextEntry />
    <Button title="Reset password" onPress={submit} loading={loading} size="lg" />
  </View></KeyboardAvoidingView></SafeAreaView>;
}
const createStyles = (c: ThemeColors) => StyleSheet.create({ safe: { flex: 1, backgroundColor: c.background }, container: { flex: 1, justifyContent: 'center', padding: Spacing.lg }, card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderLight, borderRadius: BorderRadius.xl, padding: Spacing.lg, maxWidth: 520, width: '100%', alignSelf: 'center' }, title: { color: c.text, fontSize: 28, fontWeight: '800', marginBottom: Spacing.sm }, subtitle: { color: c.textSecondary, fontSize: 15, lineHeight: 22, marginBottom: Spacing.lg } });
