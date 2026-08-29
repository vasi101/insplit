import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../../src/store/auth.store';
import { useRoomStore } from '../../../src/store/room.store';
import * as settlementApi from '../../../src/services/api/settlements.api';
import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';
import { Spacing, BorderRadius, ThemeColors } from '../../../constants/theme';
import { useThemeColors } from '../../../src/store/theme.store';
import { PaymentMethod } from '../../../src/types';
import { NoticeModal } from '../../../src/components/ui/NoticeModal';
import { uploadImages } from '../../../src/services/api/upload.api';

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: string }[] = [
  { key: 'CASH', label: 'Cash', icon: '💵' },
  { key: 'ESEWA', label: 'eSewa', icon: '🟢' },
  { key: 'KHALTI', label: 'Khalti', icon: '🟣' },
  { key: 'BANK_TRANSFER', label: 'Bank Transfer', icon: '🏦' },
  { key: 'CARD', label: 'Card', icon: 'card' },
];

export default function RecordSettlementScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const router = useRouter();
  const params = useLocalSearchParams<{
    fromUser?: string;
    toUser?: string;
    amount?: string;
  }>();

  const user = useAuthStore((state) => state.user);
  const currentRoom = useRoomStore((state) => state.currentRoom);
  const members = useRoomStore((state) => state.members);

  const [fromUser, setFromUser] = useState<string>(params.fromUser || user?._id || '');
  const [toUser, setToUser] = useState<string>(params.toUser || '');
  const [amount, setAmount] = useState<string>(params.amount || '');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ title: string; message: string; kind: 'success' | 'error' | 'warning'; closeScreen?: boolean } | null>(null);
  const [proofUri, setProofUri] = useState<string | null>(null);

  const pickProof = async (camera: boolean) => {
    const permission = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setNotice({ title: 'Permission needed', message: `Allow ${camera ? 'camera' : 'photo'} access to attach payment proof.`, kind: 'warning' });
      return;
    }
    const result = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
    if (!result.canceled) setProofUri(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!currentRoom) return;

    if (!fromUser || !toUser) {
      setNotice({ title: 'Choose people', message: 'Select both payer and receiver.', kind: 'warning' });
      return;
    }
    if (fromUser === toUser) {
      setNotice({ title: 'Choose another person', message: 'Payer and receiver must be different.', kind: 'warning' });
      return;
    }
    const num = parseFloat(amount);
    if (!amount.trim() || isNaN(num) || num <= 0) {
      setNotice({ title: 'Check the amount', message: 'Enter an amount greater than zero.', kind: 'warning' });
      return;
    }

    setIsSubmitting(true);
    try {
      let proofImage: string | undefined;
      if (proofUri) {
        [proofImage] = await uploadImages([{ uri: proofUri, name: 'settlement-proof.jpg', type: 'image/jpeg' }]);
      }
      await settlementApi.recordSettlement({
        roomId: currentRoom._id,
        fromUser,
        toUser,
        amount: num,
        currency: 'NPR',
        settlementDate: new Date().toISOString(),
        method,
        note: note.trim() || undefined,
        proofImage,
      });

      setNotice({ title: 'Sent for approval', message: 'The receiver must verify this payment before balances update.', kind: 'success', closeScreen: true });
    } catch (err: unknown) {
      setNotice({ title: 'Could not save', message: err instanceof Error ? err.message : 'Try again in a moment.', kind: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
        {/* Payer (From) */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Paid By (Payer)</Text>
          <View style={styles.chipsRow}>
            {members.map((m) => {
              const u = typeof m?.userId === 'object' && m.userId !== null ? m.userId : null;
              if (!u) return null;
              const isSelected = fromUser === u._id;
              return (
                <TouchableOpacity
                  key={u._id}
                  activeOpacity={0.7}
                  onPress={() => setFromUser(u._id)}
                  style={[styles.memberChip, isSelected && styles.memberChipSelected]}
                >
                  <Text style={[styles.memberChipText, isSelected && styles.memberChipTextSelected]}>
                    {u.name || 'Member'} {user && u._id === user._id ? '(You)' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Receiver (To) */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Paid To (Receiver)</Text>
          <View style={styles.chipsRow}>
            {members.map((m) => {
              const u = typeof m?.userId === 'object' && m.userId !== null ? m.userId : null;
              if (!u) return null;
              const isSelected = toUser === u._id;
              return (
                <TouchableOpacity
                  key={u._id}
                  activeOpacity={0.7}
                  onPress={() => setToUser(u._id)}
                  style={[styles.memberChip, isSelected && styles.memberChipSelected]}
                >
                  <Text style={[styles.memberChipText, isSelected && styles.memberChipTextSelected]}>
                    {u.name || 'Member'} {user && u._id === user._id ? '(You)' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Amount */}
        <Input
          label="Amount Paid (NPR)"
          placeholder="2000"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          style={styles.amountInput}
        />

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Payment Method</Text>
          <View style={styles.methodsRow}>
            {PAYMENT_METHODS.map((m) => {
              const isSelected = method === m.key;
              return (
                <TouchableOpacity
                  key={m.key}
                  activeOpacity={0.7}
                  onPress={() => setMethod(m.key)}
                  style={[styles.methodChip, isSelected && styles.methodChipSelected]}
                >
                  {m.key === 'ESEWA' || m.key === 'KHALTI' ? (
                    <View style={[styles.brandIcon, { backgroundColor: m.key === 'ESEWA' ? '#60BB46' : '#5C2D91' }]}>
                      <Text style={styles.brandText}>{m.key === 'ESEWA' ? 'e' : 'K'}</Text>
                    </View>
                  ) : (
                    <Ionicons
                      name={m.key === 'CASH' ? 'cash-outline' : m.key === 'BANK_TRANSFER' ? 'business-outline' : 'card-outline'}
                      size={18}
                      color={isSelected ? Colors.primary : Colors.textSecondary}
                    />
                  )}
                  <Text style={[styles.methodText, isSelected && styles.methodTextSelected]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Payment screenshot</Text>
          {proofUri ? (
            <View style={styles.proofPreview}>
              <Image source={{ uri: proofUri }} style={styles.proofImage} />
              <TouchableOpacity style={styles.removeProof} onPress={() => setProofUri(null)}>
                <Ionicons name="close" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.proofActions}>
              <TouchableOpacity style={styles.proofButton} onPress={() => void pickProof(false)}>
                <Ionicons name="image-outline" size={21} color={Colors.primary} />
                <Text style={styles.proofButtonText}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.proofButton} onPress={() => void pickProof(true)}>
                <Ionicons name="camera-outline" size={21} color={Colors.primary} />
                <Text style={styles.proofButtonText}>Camera</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Note */}
        <Input
          label="Note (Optional)"
          placeholder="e.g. Paid via eSewa for last week groceries"
          value={note}
          onChangeText={setNote}
        />

        <Button
          title="Confirm & Record Settlement"
          onPress={handleSubmit}
          loading={isSubmitting}
          size="lg"
          style={styles.submitBtn}
        />
      </ScrollView>
      <NoticeModal
        visible={Boolean(notice)}
        title={notice?.title || ''}
        message={notice?.message}
        kind={notice?.kind}
        confirmLabel={notice?.closeScreen ? 'Done' : 'OK'}
        onConfirm={() => {
          const closeScreen = notice?.closeScreen;
          setNotice(null);
          if (closeScreen) router.back();
        }}
      />
    </KeyboardAvoidingView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl * 2,
  },
  section: {
    marginBottom: Spacing.base,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: Spacing.xs + 2,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  memberChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  memberChipSelected: {
    backgroundColor: Colors.surfaceSubtle,
    borderColor: Colors.primary,
  },
  memberChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  memberChipTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  amountInput: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  methodsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  methodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  methodChipSelected: {
    backgroundColor: Colors.surfaceSubtle,
    borderColor: Colors.primary,
  },
  methodIcon: {
    fontSize: 16,
    marginRight: Spacing.xs,
  },
  brandIcon: { width: 20, height: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  brandText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
  methodText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  methodTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  submitBtn: {
    marginTop: Spacing.lg,
  },
  proofActions: { flexDirection: 'row', gap: Spacing.sm },
  proofButton: { flex: 1, minHeight: 62, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: BorderRadius.md, backgroundColor: Colors.surface, flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', justifyContent: 'center' },
  proofButtonText: { color: Colors.text, fontSize: 13, fontWeight: '700' },
  proofPreview: { height: 150, borderRadius: BorderRadius.md, overflow: 'hidden', backgroundColor: Colors.surfaceSubtle },
  proofImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  removeProof: { position: 'absolute', top: Spacing.sm, right: Spacing.sm, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.68)' },
});
