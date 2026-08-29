import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Switch,
  ImageBackground,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../src/store/auth.store';
import { useRoomStore } from '../../../src/store/room.store';
import { Avatar } from '../../../src/components/ui/Avatar';
import { Badge } from '../../../src/components/ui/Badge';
import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';
import { Spacing, BorderRadius, Shadows, ThemeColors } from '../../../constants/theme';
import { useThemeColors, useThemeStore } from '../../../src/store/theme.store';
import { API_CONFIG, DEFAULT_BASE_URL } from '../../../constants/api';
import { uploadImages } from '../../../src/services/api/upload.api';
import { clearBiometricCredentials, isBiometricLoginEnabled } from '../../../src/utils/storage';
import { NoticeModal } from '../../../src/components/ui/NoticeModal';
import * as authApi from '../../../src/services/api/auth.api';

export default function ProfileScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const themeMode = useThemeStore((state) => state.mode);
  const toggleTheme = useThemeStore((state) => state.toggle);
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const customBaseUrl = useAuthStore((state) => state.customBaseUrl);
  const setCustomBaseUrl = useAuthStore((state) => state.setCustomBaseUrl);

  const currentRoom = useRoomStore((state) => state.currentRoom);
  const members = useRoomStore((state) => state.members);
  const regenerateCode = useRoomStore((state) => state.regenerateInviteCode);
  const leaveRoom = useRoomStore((state) => state.leaveRoom);

  const [urlModalVisible, setUrlModalVisible] = useState(false);
  const [newUrl, setNewUrl] = useState(customBaseUrl || DEFAULT_BASE_URL || '');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [signOutVisible, setSignOutVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [signOutPassword, setSignOutPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    isBiometricLoginEnabled().then(setBiometricEnabled).catch(() => setBiometricEnabled(false));
  }, []);

  const chooseProfilePhoto = () => {
    Alert.alert('Profile photo', 'Choose a source', [
      { text: 'Camera', onPress: () => void pickProfilePhoto(true) },
      { text: 'Photo library', onPress: () => void pickProfilePhoto(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickProfilePhoto = async (useCamera: boolean) => {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', `Allow ${useCamera ? 'camera' : 'photo'} access to continue.`);
      return;
    }
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (result.canceled) return;
    setIsUploadingPhoto(true);
    try {
      const asset = result.assets[0];
      const [url] = await uploadImages([{ uri: asset.uri, name: asset.fileName || 'profile.jpg', type: asset.mimeType || 'image/jpeg' }]);
      await updateProfile({ profileImage: url });
    } catch (err) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Could not update your photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim() });
      setEditModalVisible(false);
    } catch (err) {
      Alert.alert('Update failed', err instanceof Error ? err.message : 'Could not update your profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    if (!enabled) {
      await clearBiometricCredentials();
      setBiometricEnabled(false);
      return;
    }
    Alert.alert('Enable biometric login', 'Sign out, then select biometric login when you next sign in.');
  };

  const handleLogout = () => {
    setSignOutVisible(true);
  };

  const confirmLogout = async () => {
    setSignOutVisible(false);
    await logout();
    router.replace('/auth/login');
  };

  const authenticateLogout = async () => {
    setSignOutVisible(false);
    const canUseBiometric = Platform.OS !== 'web'
      && await LocalAuthentication.hasHardwareAsync()
      && await LocalAuthentication.isEnrolledAsync();
    if (canUseBiometric) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirm sign out',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use password',
        disableDeviceFallback: true,
      });
      if (result.success) {
        await confirmLogout();
        return;
      }
    }
    setSignOutPassword('');
    setPasswordError(undefined);
    setPasswordModalVisible(true);
  };

  const confirmPasswordLogout = async () => {
    if (!signOutPassword) {
      setPasswordError('Enter your password');
      return;
    }
    setIsVerifying(true);
    setPasswordError(undefined);
    try {
      await authApi.verifyPassword(signOutPassword);
      setPasswordModalVisible(false);
      setSignOutPassword('');
      await confirmLogout();
    } catch {
      setPasswordError('Incorrect password');
    } finally {
      setIsVerifying(false);
    }
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
        <ImageBackground source={user?.profileImage ? { uri: user.profileImage } : undefined} style={styles.userCard} imageStyle={styles.userCardImage}>
          {user?.profileImage ? <BlurView intensity={72} tint={themeMode === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} /> : null}
          <View style={styles.glassTint} />
          <TouchableOpacity style={styles.avatarButton} onPress={chooseProfilePhoto} disabled={isUploadingPhoto}>
            <Avatar uri={user?.profileImage} name={user?.name} size={76} style={styles.profileAvatar} />
            <View style={styles.cameraBadge}>
              {isUploadingPhoto ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="camera" size={15} color="#FFF" />}
            </View>
          </TouchableOpacity>
          <View style={styles.userMeta}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            {user?.phone ? <Text style={styles.userPhone}>{user.phone}</Text> : null}
          </View>
          <TouchableOpacity style={styles.editButton} onPress={() => { setName(user?.name || ''); setPhone(user?.phone || ''); setEditModalVisible(true); }}>
            <Ionicons name="pencil" size={17} color={Colors.text} />
          </TouchableOpacity>
        </ImageBackground>

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
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingIcon}><Ionicons name="moon" size={18} color={Colors.primary} /></View>
            <View style={styles.settingCopy}>
              <Text style={styles.settingLabel}>Dark theme</Text>
            </View>
            <Switch
              value={themeMode === 'dark'}
              onValueChange={() => void toggleTheme()}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.surface}
            />
          </View>
          <View style={styles.settingDivider} />
          <View style={styles.settingRow}>
            <View style={styles.settingIcon}><Ionicons name="finger-print" size={20} color={Colors.primary} /></View>
            <View style={styles.settingCopy}><Text style={styles.settingLabel}>Biometric login</Text></View>
            <Switch value={biometricEnabled} onValueChange={(value) => void handleBiometricToggle(value)} trackColor={{ false: Colors.border, true: Colors.primary }} thumbColor={Colors.surface} />
          </View>
        </View>

        {/* Server & Connection Settings */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Connection</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingIcon}><Ionicons name="server-outline" size={18} color={Colors.primary} /></View>
            <View style={styles.settingCopy}>
              <Text style={styles.settingLabel}>
                {API_CONFIG.ENVIRONMENT === 'development' ? 'Local development API' : 'Production API'}
              </Text>
              <Text style={styles.settingValue} numberOfLines={1}>
                {DEFAULT_BASE_URL}
              </Text>
            </View>
            <Text style={styles.environmentBadge}>{API_CONFIG.ENVIRONMENT}</Text>
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

        <NoticeModal
          visible={signOutVisible}
          title="Sign out?"
          message="You can sign back in at any time."
          kind="warning"
          confirmLabel="Sign out"
          cancelLabel="Stay"
          onConfirm={() => void authenticateLogout()}
          onCancel={() => setSignOutVisible(false)}
        />

        <Modal visible={passwordModalVisible} transparent animationType="fade" onRequestClose={() => setPasswordModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <View style={styles.passwordIcon}><Ionicons name="lock-closed" size={24} color={Colors.primary} /></View>
              <Text style={styles.passwordTitle}>Confirm it’s you</Text>
              <Text style={styles.passwordSubtitle}>Enter your password to sign out.</Text>
              <Input
                label="Password"
                value={signOutPassword}
                onChangeText={(value) => { setSignOutPassword(value); setPasswordError(undefined); }}
                secureTextEntry
                error={passwordError}
              />
              <View style={styles.modalActions}>
                <Button title="Cancel" variant="ghost" onPress={() => setPasswordModalVisible(false)} style={styles.passwordAction} />
                <Button title="Sign out" variant="danger" loading={isVerifying} onPress={confirmPasswordLogout} style={styles.passwordAction} />
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={editModalVisible} transparent animationType="fade" onRequestClose={() => setEditModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit profile</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}><Ionicons name="close" size={24} color={Colors.text} /></TouchableOpacity>
              </View>
              <Input label="Name" value={name} onChangeText={setName} />
              <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              <Button title="Save" onPress={handleSaveProfile} loading={isSaving} />
            </View>
          </View>
        </Modal>

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

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    minHeight: 116,
    ...Shadows.card,
  },
  userCardImage: { borderRadius: BorderRadius.lg },
  glassTint: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: Colors.surface, opacity: 0.46 },
  avatarButton: { position: 'relative', zIndex: 1 },
  profileAvatar: { borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)' },
  cameraBadge: { position: 'absolute', right: -2, bottom: -2, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderWidth: 2, borderColor: Colors.surface },
  userMeta: {
    marginLeft: Spacing.base,
    flex: 1,
    zIndex: 1,
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
  userPhone: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
  editButton: { zIndex: 1, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, opacity: 0.9 },
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
  settingIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceSubtle, marginRight: Spacing.sm },
  settingCopy: { flex: 1, marginRight: Spacing.sm },
  settingDivider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: Spacing.sm },
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
  environmentBadge: {
    color: Colors.primary,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
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
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.base },
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
  passwordIcon: { width: 52, height: 52, borderRadius: 26, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceSubtle, marginBottom: Spacing.md },
  passwordTitle: { color: Colors.text, fontSize: 19, fontWeight: '900', textAlign: 'center' },
  passwordSubtitle: { color: Colors.textSecondary, fontSize: 12, textAlign: 'center', marginTop: Spacing.xs, marginBottom: Spacing.lg },
  passwordAction: { flex: 1 },
});
