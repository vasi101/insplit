import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  Platform,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../src/store/auth.store';
import { useRoomStore } from '../../../src/store/room.store';
import * as settlementApi from '../../../src/services/api/settlements.api';
import { BalanceSummaryResponse, Settlement } from '../../../src/types';
import { Avatar } from '../../../src/components/ui/Avatar';
import { Button } from '../../../src/components/ui/Button';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { formatCurrency, formatDate } from '../../../src/utils/format';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../constants/theme';

export default function SettlementScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const currentRoom = useRoomStore((state) => state.currentRoom);

  const [balancesData, setBalancesData] = useState<BalanceSummaryResponse | null>(null);
  const [history, setHistory] = useState<Settlement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async (isRefresh = false) => {
    if (!currentRoom) return;
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [bal, hist] = await Promise.all([
        settlementApi.getRoomBalances(currentRoom._id),
        settlementApi.getSettlementHistory(currentRoom._id),
      ]);
      setBalancesData(bal);
      setHistory(hist);
    } catch (err) {
      console.error('Error fetching settlement data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentRoom]);

  if (!currentRoom) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <EmptyState
          icon={<Text style={{ fontSize: 44 }}>🏠</Text>}
          title="No Room Selected"
          description="Select or create a room to view settlements and balances."
        />
      </SafeAreaView>
    );
  }

  const suggestions = balancesData?.suggestions || [];
  const balances = balancesData?.balances || [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadData(true)}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settlements & Balances</Text>
          <Text style={styles.subtitle}>
            Calculated automatically from verified expenses only.
          </Text>
        </View>

        {/* Settlement Suggestions (Who Owes Whom) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settlement Suggestions</Text>

          {suggestions.length === 0 ? (
            <View style={styles.allSettledBox}>
              <Text style={styles.allSettledEmoji}>🎉</Text>
              <Text style={styles.allSettledTitle}>All Settled Up!</Text>
              <Text style={styles.allSettledSubtitle}>
                No outstanding balances between room members.
              </Text>
            </View>
          ) : (
            suggestions.map((s, index) => {
              const isPayer = s.fromUserId === user?._id;
              const isReceiver = s.toUserId === user?._id;

              return (
                <View key={index} style={styles.suggestionCard}>
                  <View style={styles.suggestionHeader}>
                    <View style={styles.suggestionPeople}>
                      <Text style={styles.payerName}>{s.fromUserName}</Text>
                      <Text style={styles.owesText}>owes</Text>
                      <Text style={styles.receiverName}>{s.toUserName}</Text>
                    </View>
                    <Text style={styles.suggestionAmount}>
                      {formatCurrency(s.amount, s.currency)}
                    </Text>
                  </View>

                  {(isPayer || isReceiver) && (
                    <Button
                      title="Record Payment"
                      size="sm"
                      variant="primary"
                      onPress={() =>
                        router.push({
                          pathname: '/(tabs)/settlement/record',
                          params: {
                            fromUser: s.fromUserId,
                            toUser: s.toUserId,
                            amount: s.amount.toString(),
                          },
                        })
                      }
                      style={styles.settleBtn}
                    />
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Member Balances Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Member Breakdown</Text>
          <View style={styles.balancesCard}>
            {balances.map((b, idx) => {
              const isMe = b.userId === user?._id;
              const isPositive = b.balance > 0.01;
              const isNegative = b.balance < -0.01;

              return (
                <View
                  key={b.userId}
                  style={[
                    styles.balanceRow,
                    idx < balances.length - 1 && styles.balanceRowBorder,
                  ]}
                >
                  <View style={styles.memberMeta}>
                    <Avatar uri={b.profileImage} name={b.name} size={36} />
                    <View style={{ marginLeft: Spacing.sm }}>
                      <Text style={styles.memberName}>
                        {b.name} {isMe ? '(You)' : ''}
                      </Text>
                      <Text style={styles.totalPaid}>
                        Paid: {formatCurrency(b.totalPaid)} • Share: {formatCurrency(b.fairShare)}
                      </Text>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={[
                        styles.balanceAmount,
                        isPositive && styles.positiveBalance,
                        isNegative && styles.negativeBalance,
                      ]}
                    >
                      {isPositive ? '+' : ''}
                      {formatCurrency(b.balance)}
                    </Text>
                    <Text style={styles.balanceStatus}>
                      {isPositive ? 'gets back' : isNegative ? 'owes' : 'settled'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Settlement Payment History */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Payment History</Text>
            <Button
              title="+ Record Direct Pay"
              size="sm"
              variant="ghost"
              onPress={() => router.push('/(tabs)/settlement/record')}
            />
          </View>

          {history.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>No payments recorded yet.</Text>
            </View>
          ) : (
            history.map((item) => (
              <View key={item._id} style={styles.historyCard}>
                <View style={styles.historyLeft}>
                  <Text style={styles.historyTitle}>
                    {item.fromUser?.name || 'Someone'} paid {item.toUser?.name || 'Someone'}
                  </Text>
                  <Text style={styles.historyMeta}>
                    {formatDate(item.settlementDate)} • {item.method}
                    {item.note ? ` • "${item.note}"` : ''}
                  </Text>
                </View>
                <Text style={styles.historyAmount}>
                  {formatCurrency(item.amount, item.currency)}
                </Text>
              </View>
            ))
          )}
        </View>
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
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm + 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  allSettledBox: {
    backgroundColor: Colors.successLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allSettledEmoji: {
    fontSize: 32,
    marginBottom: Spacing.xs,
  },
  allSettledTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.successText,
    marginBottom: 2,
  },
  allSettledSubtitle: {
    fontSize: 13,
    color: Colors.successText,
    textAlign: 'center',
  },
  suggestionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  suggestionPeople: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
    marginRight: Spacing.sm,
  },
  payerName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.dangerText,
  },
  owesText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginHorizontal: Spacing.xs + 2,
  },
  receiverName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.successText,
  },
  suggestionAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  settleBtn: {
    marginTop: Spacing.xs,
  },
  balancesCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Shadows.card,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm + 2,
  },
  balanceRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  totalPaid: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  balanceAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  positiveBalance: {
    color: Colors.successText,
  },
  negativeBalance: {
    color: Colors.dangerText,
  },
  balanceStatus: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  emptyHistory: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  historyCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.card,
  },
  historyLeft: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  historyMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  historyAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
});
