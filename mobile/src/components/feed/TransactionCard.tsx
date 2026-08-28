import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '../../../constants/theme';
import { Transaction } from '../../types';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatCurrency, formatRelativeTime, formatDate } from '../../utils/format';

export interface TransactionCardProps {
  transaction: Transaction;
  currentUserId: string;
  onApprove?: (id: string) => Promise<void>;
  onReject?: (id: string, reason?: string) => Promise<void>;
  onPress?: (transaction: Transaction) => void;
}

export function TransactionCard({
  transaction,
  currentUserId,
  onApprove,
  onReject,
  onPress,
}: TransactionCardProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const creator = typeof transaction?.createdBy === 'object' ? transaction?.createdBy : null;
  const creatorId = creator?._id || (typeof transaction?.createdBy === 'string' ? transaction?.createdBy : '');
  const isCreator = !!creatorId && creatorId === currentUserId;
  const isPending = transaction?.status === 'PENDING';
  const canVerify = !isCreator && isPending;

  const creatorName = creator?.name || 'Roommate';
  const creatorImage = creator?.profileImage || null;
  const paidByName =
    (typeof transaction?.paidBy === 'object' ? transaction?.paidBy?.name : '') || 'Roommate';

  const handleApprove = async () => {
    if (!onApprove) return;
    setIsApproving(true);
    try {
      await onApprove(transaction._id);
    } catch {
      // error handled in store
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!onReject) return;
    setIsRejecting(true);
    setRejectModalVisible(false);
    try {
      await onReject(transaction._id, rejectReason.trim() || undefined);
    } catch {
      // error handled in store
    } finally {
      setIsRejecting(false);
      setRejectReason('');
    }
  };

  const verifierName =
    typeof transaction?.verification?.verifiedBy === 'object' && transaction.verification.verifiedBy
      ? transaction.verification.verifiedBy.name
      : null;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onPress?.(transaction)}
      style={styles.card}
    >
      {/* Header: Creator Info + Status */}
      <View style={styles.header}>
        <View style={styles.creatorInfo}>
          <Avatar
            uri={creatorImage}
            name={creatorName}
            size={38}
          />
          <View style={styles.creatorMeta}>
            <Text style={styles.creatorName}>{creatorName}</Text>
            <Text style={styles.timeAgo}>
              {formatRelativeTime(transaction.createdAt)} • {formatDate(transaction.expenseDate)}
            </Text>
          </View>
        </View>
        <Badge status={transaction.status} />
      </View>

      {/* Body: Title, Amount & Category */}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {transaction.title || 'Untitled Expense'}
          </Text>
          <Text style={styles.amount}>
            {formatCurrency(transaction.amount, transaction.currency)}
          </Text>
        </View>

        {transaction.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {transaction.description}
          </Text>
        ) : null}

        <View style={styles.detailsRow}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>{transaction.category || 'OTHER'}</Text>
          </View>
          <Text style={styles.paidByText}>
            Paid by <Text style={styles.bold}>{paidByName}</Text>
          </Text>
        </View>
      </View>

      {/* Attached Images */}
      {transaction.images && transaction.images.length > 0 ? (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: transaction.images[0] }}
            style={styles.receiptImage}
            resizeMode="cover"
          />
          {transaction.images.length > 1 && (
            <View style={styles.imageBadge}>
              <Text style={styles.imageBadgeText}>+{transaction.images.length - 1}</Text>
            </View>
          )}
        </View>
      ) : null}

      {/* Verification footer / Decision Status */}
      {transaction.status === 'VERIFIED' && verifierName && (
        <View style={styles.verifiedFooter}>
          <Text style={styles.verifiedText}>✓ Verified by {verifierName}</Text>
        </View>
      )}

      {transaction.status === 'REJECTED' && (
        <View style={styles.rejectedFooter}>
          <Text style={styles.rejectedText}>
            ✕ Rejected {verifierName ? `by ${verifierName}` : ''}
            {transaction.verification?.reason ? `: "${transaction.verification.reason}"` : ''}
          </Text>
        </View>
      )}

      {/* Pending status message for creator */}
      {isPending && isCreator && (
        <View style={styles.pendingCreatorFooter}>
          <Text style={styles.pendingCreatorText}>
            ⏳ Waiting for room member to verify
          </Text>
        </View>
      )}

      {/* Verification Action Buttons for other members */}
      {canVerify && (
        <View style={styles.actions}>
          <Button
            title="Reject"
            variant="outline"
            size="sm"
            style={styles.actionButtonReject}
            textStyle={styles.rejectButtonText}
            loading={isRejecting}
            onPress={() => setRejectModalVisible(true)}
          />
          <Button
            title="Approve"
            variant="success"
            size="sm"
            style={styles.actionButtonApprove}
            loading={isApproving}
            onPress={handleApprove}
          />
        </View>
      )}

      {/* Reject Reason Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Expense</Text>
            <Text style={styles.modalSubtitle}>
              Optionally provide a reason for rejecting "{transaction.title}".
            </Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="e.g. Amount is incorrect, duplicate entry"
              placeholderTextColor={Colors.textMuted}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="ghost"
                size="sm"
                onPress={() => setRejectModalVisible(false)}
              />
              <Button
                title="Confirm Reject"
                variant="danger"
                size="sm"
                onPress={handleRejectConfirm}
              />
            </View>
          </View>
        </View>
      </Modal>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  creatorMeta: {
    marginLeft: Spacing.sm + 2,
    flex: 1,
  },
  creatorName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  timeAgo: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  body: {
    marginBottom: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    marginRight: Spacing.sm,
  },
  amount: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.primary,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    lineHeight: 19,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  categoryPill: {
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paidByText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  bold: {
    fontWeight: '600',
    color: Colors.text,
  },
  imageContainer: {
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    maxHeight: 180,
  },
  receiptImage: {
    width: '100%',
    height: 160,
    backgroundColor: Colors.surfaceSubtle,
  },
  imageBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  imageBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  verifiedFooter: {
    marginTop: Spacing.md - 2,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  verifiedText: {
    fontSize: 13,
    color: Colors.successText,
    fontWeight: '500',
  },
  rejectedFooter: {
    marginTop: Spacing.md - 2,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  rejectedText: {
    fontSize: 13,
    color: Colors.dangerText,
    fontWeight: '500',
  },
  pendingCreatorFooter: {
    marginTop: Spacing.md - 2,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  pendingCreatorText: {
    fontSize: 12,
    color: Colors.warningText,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  actionButtonReject: {
    borderColor: Colors.danger,
    minWidth: 80,
  },
  rejectButtonText: {
    color: Colors.danger,
  },
  actionButtonApprove: {
    minWidth: 90,
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
  reasonInput: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 14,
    color: Colors.text,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: Spacing.base,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
});
