import React, { useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../../src/store/auth.store';
import { useRoomStore } from '../../../src/store/room.store';
import * as settlementApi from '../../../src/services/api/settlements.api';
import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';
import { Colors, Spacing, BorderRadius } from '../../../constants/theme';
import { PaymentMethod } from '../../../src/types';

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: string }[] = [
  { key: 'CASH', label: 'Cash', icon: '💵' },
  { key: 'ESEWA', label: 'eSewa', icon: '🟢' },
  { key: 'KHALTI', label: 'Khalti', icon: '🟣' },
  { key: 'BANK_TRANSFER', label: 'Bank Transfer', icon: '🏦' },
  { key: 'OTHER', label: 'Other', icon: '💳' },
];

export default function RecordSettlementScreen() {
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

  const handleSubmit = async () => {
    if (!currentRoom) return;

    if (!fromUser || !toUser) {
      Alert.alert('Missing Info', 'Please select both payer and receiver.');
      return;
    }
    if (fromUser === toUser) {
      Alert.alert('Invalid Selection', 'Payer and receiver cannot be the same person.');
      return;
    }
    const num = parseFloat(amount);
    if (!amount.trim() || isNaN(num) || num <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      await settlementApi.recordSettlement({
        roomId: currentRoom._id,
        fromUser,
        toUser,
        amount: num,
        currency: 'NPR',
        settlementDate: new Date().toISOString(),
        method,
        note: note.trim() || undefined,
      });

      Alert.alert('Settlement Recorded! ✅', 'Payment added and balances updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to record settlement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
                  <Text style={styles.methodIcon}>{m.icon}</Text>
                  <Text style={[styles.methodText, isSelected && styles.methodTextSelected]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
  methodText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  methodTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  submitBtn: {
    marginTop: Spacing.lg,
  },
});
