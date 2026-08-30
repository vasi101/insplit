import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../../src/store/auth.store';
import { useFeedStore } from '../../../src/store/feed.store';
import * as txApi from '../../../src/services/api/transactions.api';
import { Avatar } from '../../../src/components/ui/Avatar';
import { Badge } from '../../../src/components/ui/Badge';
import { Button } from '../../../src/components/ui/Button';
import { formatCurrency, formatDateTime, formatDate } from '../../../src/utils/format';
import { Spacing, BorderRadius, Shadows, ThemeColors } from '../../../constants/theme';
import { useThemeColors } from '../../../src/store/theme.store';
import { Transaction } from '../../../src/types';

export default function TransactionDetailsScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const approveTx = useFeedStore((state) => state.approveTransaction);
  const rejectTx = useFeedStore((state) => state.rejectTransaction);
  const deleteTx = useFeedStore((state) => state.deleteTransaction);

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    txApi
      .getTransactionById(id)
      .then(setTransaction)
      .catch((err) => {
        Alert.alert('Error', err.message || 'Failed to load transaction details');
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!transaction) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.notFoundText}>Transaction not found</Text>
      </View>
    );
  }

  const isCreator = transaction.createdBy?._id === user?._id;
  const isPending = transaction.status === 'PENDING';
  const correctionSeconds = Math.max(
    0,
    Math.ceil((new Date(transaction.createdAt).getTime() + 30_000 - now) / 1000)
  );
  const canCorrect = isCreator && isPending && correctionSeconds > 0;
  const canVerify = !isCreator && isPending && correctionSeconds === 0;

  const handleDelete = () => {
    Alert.alert('Delete expense?', 'This permanently removes the pending expense.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsActing(true);
          try {
            await deleteTx(transaction._id);
            router.back();
          } catch (err: unknown) {
            Alert.alert('Could not delete', err instanceof Error ? err.message : 'Delete failed');
          } finally {
            setIsActing(false);
          }
        },
      },
    ]);
  };

  const handleApprove = async () => {
    setIsActing(true);
    try {
      await approveTx(transaction._id);
      const updated = await txApi.getTransactionById(transaction._id);
      setTransaction(updated);
      Alert.alert('Approved ✅', 'Expense verified and added to shared records.');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setIsActing(false);
    }
  };

  const handleReject = async () => {
    Alert.prompt
      ? Alert.prompt(
          'Reject Expense',
          'Enter an optional reason for rejecting this transaction:',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Reject',
              style: 'destructive',
              onPress: async (reason?: string) => {
                setIsActing(true);
                try {
                  await rejectTx(transaction._id, reason?.trim() || undefined);
                  const updated = await txApi.getTransactionById(transaction._id);
                  setTransaction(updated);
                } finally {
                  setIsActing(false);
                }
              },
            },
          ]
        )
      : Alert.alert('Reject Expense', 'Are you sure you want to reject this expense?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reject',
            style: 'destructive',
            onPress: async () => {
              setIsActing(true);
              try {
                await rejectTx(transaction._id);
                const updated = await txApi.getTransactionById(transaction._id);
                setTransaction(updated);
              } finally {
                setIsActing(false);
              }
            },
          },
        ]);
  };

  const verifiedBy = transaction.verification?.verifiedBy;
  const verifierName =
    verifiedBy && typeof verifiedBy === 'object'
      ? verifiedBy.name
      : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Banner Card */}
      <View style={styles.card}>
        <View style={styles.topRow}>
          <Badge status={transaction.status} size="md" />
          <Text style={styles.dateText}>{formatDateTime(transaction.createdAt)}</Text>
        </View>

        <Text style={styles.title}>{transaction.title}</Text>
        <Text style={styles.amount}>
          {formatCurrency(transaction.amount, transaction.currency)}
        </Text>

        {transaction.description ? (
          <Text style={styles.description}>{transaction.description}</Text>
        ) : null}
      </View>

      {/* Details List Card */}
      <View style={styles.card}>
        <Text style={styles.sectionHeading}>Transaction Information</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Category</Text>
          <Text style={styles.infoValue}>{transaction.category}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Expense Date</Text>
          <Text style={styles.infoValue}>{formatDate(transaction.expenseDate)}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Paid By</Text>
          <View style={styles.userRow}>
            <Avatar name={transaction.paidBy?.name} size={22} />
            <Text style={styles.userName}>{transaction.paidBy?.name}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Added By</Text>
          <View style={styles.userRow}>
            <Avatar name={transaction.createdBy?.name} size={22} />
            <Text style={styles.userName}>{transaction.createdBy?.name}</Text>
          </View>
        </View>
      </View>

      {/* Verification Details */}
      <View style={styles.card}>
        <Text style={styles.sectionHeading}>Verification Status</Text>
        {transaction.status === 'VERIFIED' ? (
          <View style={styles.statusBoxSuccess}>
            <Text style={[styles.statusBoxTitle, styles.statusTitleSuccess]}>✅ Official Shared Expense</Text>
            <Text style={styles.statusMeta}>Verified by {verifierName || 'Roommate'}</Text>
          </View>
        ) : transaction.status === 'REJECTED' ? (
          <View style={styles.statusBoxDanger}>
            <Text style={[styles.statusBoxTitle, styles.statusTitleDanger]}>❌ Transaction Rejected</Text>
            <Text style={styles.statusMeta}>Rejected by {verifierName || 'Roommate'}</Text>
          </View>
        ) : (
          <View style={styles.statusBoxWarning}>
            <Text style={[styles.statusBoxTitle, styles.statusTitleWarning]}>⏳ Pending Cross-Verification</Text>
          </View>
        )}
      </View>

      {/* Attached Images */}
      {transaction.images && transaction.images.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Attached Receipts / Photos</Text>
          {transaction.images.map((img, index) => (
            <Image
              key={index}
              source={{ uri: img }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          ))}
        </View>
      )}

      {/* Verification Actions */}
      {!isCreator && isPending && correctionSeconds > 0 && (
        <View style={styles.correctionCard}>
          <Text style={styles.correctionTitle}>Review available in {correctionSeconds}s</Text>
          <Text style={styles.correctionSubtitle}>
            The creator can correct this expense during this time.
          </Text>
        </View>
      )}

      {isCreator && isPending && (
        <View style={styles.correctionCard}>
          <Text style={styles.correctionTitle}>
            {canCorrect ? `Correction window: ${correctionSeconds}s` : 'Correction window expired'}
          </Text>
          <Text style={styles.correctionSubtitle}>
            {canCorrect
              ? 'You can edit or delete this expense before the timer ends.'
              : 'This pending expense can no longer be changed.'}
          </Text>
          {canCorrect && (
            <View style={styles.actionsCard}>
              <Button
                title="Delete"
                variant="danger"
                size="lg"
                onPress={handleDelete}
                loading={isActing}
                style={{ flex: 1 }}
              />
              <Button
                title={`Edit (${correctionSeconds}s)`}
                size="lg"
                onPress={() =>
                  router.push({ pathname: '/(tabs)/feed/create', params: { editId: transaction._id } })
                }
                disabled={isActing}
                style={{ flex: 1 }}
              />
            </View>
          )}
        </View>
      )}

      {canVerify && (
        <View style={styles.actionsCard}>
          <Button
            title="Reject Transaction"
            variant="danger"
            size="lg"
            onPress={handleReject}
            loading={isActing}
            style={{ flex: 1 }}
          />
          <Button
            title="Approve Expense"
            variant="success"
            size="lg"
            onPress={handleApprove}
            loading={isActing}
            style={{ flex: 1 }}
          />
        </View>
      )}
    </ScrollView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxl * 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  notFoundText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  amount: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginTop: Spacing.xs,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  statusBoxSuccess: {
    backgroundColor: Colors.successLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  statusBoxDanger: {
    backgroundColor: Colors.dangerLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  statusBoxWarning: {
    backgroundColor: Colors.warningLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  statusBoxTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  statusTitleSuccess: {
    color: Colors.successText,
  },
  statusTitleDanger: {
    color: Colors.dangerText,
  },
  statusTitleWarning: {
    color: Colors.warningText,
  },
  statusBoxSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  statusMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  fullImage: {
    width: '100%',
    height: 240,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceSubtle,
    marginBottom: Spacing.md,
  },
  actionsCard: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  correctionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  correctionTitle: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  correctionSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: Spacing.xs,
  },
});
