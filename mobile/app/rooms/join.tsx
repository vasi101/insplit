import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useRoomStore } from '../../src/store/room.store';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';

export default function JoinRoomScreen() {
  const router = useRouter();
  const joinRoom = useRoomStore((state) => state.joinRoom);
  const isLoading = useRoomStore((state) => state.isLoading);
  const error = useRoomStore((state) => state.error);
  const clearError = useRoomStore((state) => state.clearError);

  const [inviteCode, setInviteCode] = useState('');
  const [codeError, setCodeError] = useState<string | undefined>();

  const handleJoin = async () => {
    clearError();
    const cleanCode = inviteCode.trim().toUpperCase();
    if (!cleanCode) {
      setCodeError('Invitation code is required');
      return;
    }

    try {
      const room = await joinRoom(cleanCode);
      Alert.alert('Joined Room! 🎉', `You are now a member of "${room.name}".`, [
        {
          text: 'Go to Feed',
          onPress: () => router.replace('/(tabs)/feed'),
        },
      ]);
    } catch {
      // error handled in store
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Join an Existing Room</Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <Input
            label="Invitation Code"
            placeholder="FLAT-7X92K"
            value={inviteCode}
            onChangeText={(text) => {
              setInviteCode(text);
              if (codeError) setCodeError(undefined);
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            error={codeError}
            style={styles.codeInput}
          />

          <Button
            title="Join Room"
            onPress={handleJoin}
            loading={isLoading}
            size="lg"
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
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
  },
  codeInput: {
    letterSpacing: 2,
    fontWeight: '700',
    fontSize: 17,
  },
  submitButton: {
    marginTop: Spacing.md,
  },
});
