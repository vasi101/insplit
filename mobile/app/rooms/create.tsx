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

export default function CreateRoomScreen() {
  const router = useRouter();
  const createRoom = useRoomStore((state) => state.createRoom);
  const isLoading = useRoomStore((state) => state.isLoading);
  const error = useRoomStore((state) => state.error);
  const clearError = useRoomStore((state) => state.clearError);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();

  const handleCreate = async () => {
    clearError();
    if (!name.trim()) {
      setNameError('Room name is required');
      return;
    }

    try {
      const room = await createRoom({
        name: name.trim(),
        description: description.trim() || undefined,
      });

      Alert.alert(
        'Room Created! 🎉',
        `Your invite code is: ${room.inviteCode}\n\nShare this code with your roommates so they can join!`,
        [
          {
            text: 'Go to Feed',
            onPress: () => router.replace('/(tabs)/feed'),
          },
        ]
      );
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
          <Text style={styles.title}>Create a Shared Room</Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <Input
            label="Room Name"
            placeholder="e.g. Flat 203, Kathmandu Apartment"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (nameError) setNameError(undefined);
            }}
            error={nameError}
          />

          <Input
            label="Description (Optional)"
            placeholder="e.g. 2-bedroom flat with Shiv and User B"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            style={styles.textArea}
          />

          <Button
            title="Create Room"
            onPress={handleCreate}
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
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginTop: Spacing.md,
  },
});
