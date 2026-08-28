import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../src/store/auth.store';
import { useRoomStore } from '../../../src/store/room.store';
import { Avatar } from '../../../src/components/ui/Avatar';
import { Badge } from '../../../src/components/ui/Badge';
import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import { DEFAULT_BASE_URL } from '../../../constants/api';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const customBaseUrl = useAuthStore((state) => state.customBaseUrl);
  const setCustomBaseUrl = useAuthStore((state) => state.setCustomBaseUrl);

  const currentRoom = useRoomStore((state) => state.currentRoom);
  const members = useRoomStore((state) => state.members);
  const regenerateCode = useRoomStore((state) => state.regenerateInviteCode);
  const leaveRoom = useRoomStore((state) => state.leaveRoom);

  const [urlModalVisible, setUrlModalVisible] = useState(false);
  const [newUrl, setNewUrl] = useState(customBaseUrl || DEFAULT_BASE_URL || '');
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of Insplit?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/auth/login');
        },
      },
    ]);
  };

  const handleRegenerateInvite = async () => {
    if (!currentRoom) return;
    setIsRegenerating(true);
    try {
      const code = await regenerateCode(currentRoom._id);
      Alert.alert('New Invite Code Generated', `The new room code is: ${code}`);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to regenerate code');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleLeaveRoom = () => {
    if (!currentRoom) return;
    Alert.alert('Leave Room', `Are you sure you want to leave "${currentRoom.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveRoom(currentRoom._id);
            Alert.alert('Left Room', 'You have left the room.');
          } catch (err: unknown) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Could not leave room');
          }
        },
      },
    ]);
  };

  const handleSaveUrl = async () => {
    if (!newUrl.trim()) return;
    await setCustomBaseUrl(newUrl.trim());
    setUrlModalVisible(false);
    Alert.alert('Server URL Updated', `API base URL set to: ${newUrl.trim()}`);
  };

  const isOwner = currentRoom && members.some((m) => {
    const u = typeof m.userId === 'object' ? m.userId : null;
    return u?._id === user?._id && m.role === 'OWNER';
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* User Card */}
        <View style={styles.userCard}>
          <Avatar uri={user?.profileImage} name={user?.name} size={64} />
          <View style={styles.userMeta}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </View>

        {/* Current Room Section */}
        {currentRoom ? (
          <View style={styles.card}>
            <View style={styles.roomHeader}>
              <View>
                <Text style={styles.sectionLabel}>ACTIVE ROOM</Text>
                <Text style={styles.roomTitle}>{currentRoom.name}</Text>
                {currentRoom.description ? (
                  <Text style={styles.roomDesc}>{currentRoom.description}</Text>
                ) : null}
              </View>
            </View>

            {/* Invite Code Box */}
            <View style={styles.inviteBox}>
              <View>
                <Text style={styles.inviteLabel}>INVITATION CODE</Text>
                <Text style={styles.inviteCode}>{currentRoom.inviteCode}</Text>
              </View>
              {isOwner && (
                <Button
                  title="New Code"
                  size="sm"
                  variant="outline"
                  loading={isRegenerating}
                  onPress={handleRegenerateInvite}
                />
              )}
            </View>

            {/* Members List */}
            <Text style={styles.membersHeading}>Room Members ({members.length})</Text>
            {members.map((member, i) => {
              const u = typeof member.userId === 'object' ? member.userId : null;
              if (!u) return null;
              const isMe = u._id === user?._id;

              return (
                <View
                  key={u._id}
                  style={[styles.memberRow, i < members.length - 1 && styles.memberRowBorder]}
                >
                  <View style={styles.memberInfo}>
                    <Avatar uri={u.profileImage} name={u.name} size={32} />
                    <View style={{ marginLeft: Spacing.sm }}>
                      <Text style={styles.memberNameText}>
                        {u.name} {isMe ? '(You)' : ''}
                      </Text>
                      <Text style={styles.memberEmailText}>{u.email}</Text>
                    </View>
                  </View>
                  <Badge status={member.role} size="sm" />
                </View>
              );
            })}

            {!isOwner && (
              <Button
                title="Leave Room"
                variant="outline"
                size="sm"
                onPress={handleLeaveRoom}
                style={styles.leaveRoomBtn}
                textStyle={{ color: Colors.danger }}
              />
            )}
          </View>
        ) : null}

        {/* Server & Connection Settings */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Network & Server Config</Text>
          <View style={styles.settingRow}>
            <View style={{ flex: 1, marginRight: Spacing.sm }}>
              <Text style={styles.settingLabel}>Backend API URL</Text>
              <Text style={styles.settingValue} numberOfLines={1}>
                {customBaseUrl || DEFAULT_BASE_URL}
              </Text>
            </View>
            <Button
              title="Change"
              size="sm"
              variant="secondary"
              onPress={() => setUrlModalVisible(true)}
            />
          </View>
        </View>

        {/* Sign Out Button */}
        <Button
          title="Sign Out"
          variant="outline"
          size="lg"
          onPress={handleLogout}
          style={styles.logoutBtn}
          textStyle={{ color: Colors.danger }}
        />

        {/* Edit Server URL Modal */}
        <Modal
          visible={urlModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setUrlModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Set Backend Server URL</Text>
              <Text style={styles.modalSubtitle}>
                If testing with Expo Go on a physical phone, set your PC's Wi-Fi IP (e.g. http://192.168.1.100:5000).
              </Text>
              <Input
                label="API URL"
                value={newUrl}
                onChangeText={setNewUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="ghost"
                  size="sm"
                  onPress={() => setUrlModalVisible(false)}
                />
                <Button title="Save URL" size="sm" onPress={handleSaveUrl} />
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxl * 2,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  userMeta: {
    marginLeft: Spacing.base,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  userEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  roomHeader: {
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  roomTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 2,
  },
  roomDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  inviteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.base,
  },
  inviteLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  inviteCode: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 2,
    marginTop: 2,
  },
  membersHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  memberRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  memberEmailText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  leaveRoomBtn: {
    marginTop: Spacing.md,
    borderColor: Colors.danger,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  settingValue: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  logoutBtn: {
    borderColor: Colors.danger,
    marginTop: Spacing.sm,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 380,
    ...Shadows.hover,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.base,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
});
