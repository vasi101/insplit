import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuthStore } from '../../../src/store/auth.store';
import { useRoomStore } from '../../../src/store/room.store';
import * as settlementApi from '../../../src/services/api/settlements.api';
import * as transactionsApi from '../../../src/services/api/transactions.api';
import { extractErrorMessage } from '../../../src/services/api/client';
import { BalanceSummaryResponse, MemberBalance, Settlement, Transaction } from '../../../src/types';
import { Avatar } from '../../../src/components/ui/Avatar';
import { Button } from '../../../src/components/ui/Button';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { NetworkErrorCard } from '../../../src/components/ui/NetworkErrorCard';
import { formatCurrency, formatDate } from '../../../src/utils/format';
import { Spacing, BorderRadius, Shadows, ThemeColors } from '../../../constants/theme';
import { useThemeColors } from '../../../src/store/theme.store';

import { ReportPeriod, localDateKey, getPeriodKey, reportDate, weekDates } from '../../../src/utils/expense-report';

function formatPeriodLabel(key: string, period: ReportPeriod): string {
  if (period === 'MONTH') {
    const [year, month] = key.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  const date = new Date(`${key}T00:00:00`);
  if (period === 'WEEK') {
    const end = new Date(date);
    end.setDate(end.getDate() + 6);
    return `${formatDate(date)} – ${formatDate(end)}`;
  }
  return formatDate(date);
}

export default function SettlementScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const currentRoom = useRoomStore((state) => state.currentRoom);
  const roomMembers = useRoomStore((state) => state.members);

  const [balancesData, setBalancesData] = useState<BalanceSummaryResponse | null>(null);
  const [history, setHistory] = useState<Settlement[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('WEEK');
  const [selectedChartDay, setSelectedChartDay] = useState(localDateKey(new Date()));
  const [reviewingSettlementId, setReviewingSettlementId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!currentRoom) return;
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    setLoadError(null);
    try {
      const [balResult, historyResult, transactionsResult] = await Promise.allSettled([
        settlementApi.getRoomBalances(currentRoom._id),
        settlementApi.getSettlementHistory(currentRoom._id),
        transactionsApi.listAllVerifiedTransactions(currentRoom._id),
      ]);
      if (balResult.status === 'fulfilled') setBalancesData(balResult.value);
      if (historyResult.status === 'fulfilled') setHistory(historyResult.value);
      if (transactionsResult.status === 'fulfilled') setTransactions(transactionsResult.value);

      const failures = [balResult, historyResult, transactionsResult]
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected');
      if (failures.length > 0) {
        setLoadError(failures.length === 3
          ? extractErrorMessage(failures[0].reason)
          : 'Some settlement information could not be refreshed. Pull down to retry.');
        failures.forEach((failure) => console.error('Settlement request failed:', failure.reason));
      }
    } catch (err) {
      console.error('Error fetching settlement data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentRoom]);

  const reviewSettlement = async (settlementId: string, approve: boolean) => {
    setReviewingSettlementId(settlementId);
    try {
      if (approve) await settlementApi.approveSettlement(settlementId);
      else await settlementApi.rejectSettlement(settlementId);
      await loadData();
    } catch (err) {
      setLoadError(extractErrorMessage(err));
    } finally {
      setReviewingSettlementId(null);
    }
  };

  useFocusEffect(useCallback(() => {
    void loadData();
  }, [loadData]));

  if (!currentRoom) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <EmptyState
          icon={<Text style={{ fontSize: 44 }}>🏠</Text>}
          title="No Room Selected"
        />
      </SafeAreaView>
    );
  }

  const suggestions = balancesData?.suggestions || [];
  const fallbackBalances: MemberBalance[] = roomMembers
    .filter((member) => member.status === 'ACTIVE' && typeof member.userId === 'object' && member.userId)
    .map((member) => {
      const memberUser = member.userId as Exclude<typeof member.userId, string>;
      return {
        userId: memberUser._id,
        name: memberUser.name,
        email: memberUser.email,
        profileImage: memberUser.profileImage,
        totalPaid: 0,
        fairShare: 0,
        balance: 0,
      };
    });
  const balances = balancesData?.balances?.length ? balancesData.balances : fallbackBalances;
  const transactionsByMember = transactions.reduce<Record<string, Transaction[]>>((groups, transaction) => {
      const payerId = typeof transaction.paidBy === 'string'
        ? transaction.paidBy
        : transaction.paidBy?._id;
      if (payerId) groups[payerId] = [...(groups[payerId] || []), transaction];
      return groups;
    }, {});
  const reportRows = (() => {
    const grouped = transactions.reduce<Record<string, { total: number; count: number }>>((result, transaction) => {
      const key = getPeriodKey(transaction.expenseDate, reportPeriod);
      const current = result[key] || { total: 0, count: 0 };
      result[key] = { total: current.total + transaction.amount, count: current.count + 1 };
      return result;
    }, {});
    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, value]) => ({ key, ...value }));
  })();
  const totalSpent = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const dailyChartRows = weekDates(selectedChartDay).map((date) => {
    const key = localDateKey(date);
    const dayTransactions = transactions.filter(
      (transaction) => getPeriodKey(transaction.expenseDate, 'DAY') === key
    );
    return {
      key,
      date,
      transactions: dayTransactions,
      total: dayTransactions.reduce((sum, transaction) => sum + transaction.amount, 0),
    };
  });
  const highestDailyTotal = Math.max(...dailyChartRows.map((row) => row.total), 1);
  const selectedDayReport = dailyChartRows.find((row) => row.key === selectedChartDay) || dailyChartRows[6];
  const chartColors = [
    Colors.primaryLight,
    Colors.info,
    Colors.secondary,
    Colors.primary,
    Colors.success,
    Colors.warning,
    Colors.primaryDark,
  ];
  const currentPeriodKey = getPeriodKey(selectedChartDay, reportPeriod);
  const periodExpense = reportRows.find((row) => row.key === currentPeriodKey)?.total ?? 0;
  const periodExpenseLabel = reportPeriod === 'DAY' ? 'DAILY EXPENSE' : reportPeriod === 'WEEK' ? 'WEEKLY EXPENSE' : 'MONTHLY EXPENSE';
  const periodSpendingByMember = transactions.reduce<Record<string, number>>((result, transaction) => {
    if (getPeriodKey(transaction.expenseDate, reportPeriod) !== currentPeriodKey) return result;
    const payerId = typeof transaction.paidBy === 'string' ? transaction.paidBy : transaction.paidBy?._id;
    if (payerId) result[payerId] = (result[payerId] || 0) + transaction.amount;
    return result;
  }, {});
  const highestMemberPeriodPaid = Math.max(
    ...balances.map((balance) => periodSpendingByMember[balance.userId] || 0),
    1
  );
  const periodName = formatPeriodLabel(currentPeriodKey, reportPeriod);

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
          <Text style={styles.eyebrow}>{currentRoom.name}</Text>
          <Text style={styles.title}>Settlement overview</Text>
        </View>

        {isLoading && !balancesData ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.loadingText}>Calculating room totals...</Text>
          </View>
        ) : null}

        {loadError ? <NetworkErrorCard message={loadError} onRetry={() => loadData()} /> : null}

        {/* Settlement Suggestions (Who Owes Whom) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settlement Suggestions</Text>

          {!balancesData ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>
                {isLoading ? 'Loading balance information...' : 'Balance information is unavailable. Tap Retry above.'}
              </Text>
            </View>
          ) : suggestions.length === 0 ? (
            <View style={styles.allSettledBox}>
              <Text style={styles.allSettledEmoji}>🎉</Text>
              <Text style={styles.allSettledTitle}>No settlement needed</Text>
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

        {/* Verified expense report */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expense report</Text>
          <View style={styles.metricGrid}>
            <View style={[styles.metricCard, styles.metricCardPrimary]}>
              <Text style={styles.metricLabelPrimary}>TOTAL SPENT</Text>
              <Text style={styles.metricValuePrimary}>{formatCurrency(totalSpent, balancesData?.currency)}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>VERIFIED</Text>
              <Text style={styles.metricValue}>{transactions.length}</Text>
              <Text style={styles.metricFoot}>transactions</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>{periodExpenseLabel}</Text>
              <Text style={styles.metricValueSmall}>{formatCurrency(periodExpense, balancesData?.currency)}</Text>
              <Text style={styles.metricFoot}>{periodName}</Text>
            </View>
          </View>
          <View style={styles.reportTabs}>
            {(['DAY', 'WEEK', 'MONTH'] as ReportPeriod[]).map((period) => (
              <TouchableOpacity
                key={period}
                style={[styles.reportTab, reportPeriod === period && styles.reportTabActive]}
                onPress={() => setReportPeriod(period)}
              >
                <Text style={[styles.reportTabText, reportPeriod === period && styles.reportTabTextActive]}>
                  {period === 'DAY' ? 'Daily' : period === 'WEEK' ? 'Weekly' : 'Monthly'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>Monday – Sunday</Text>
                <Text style={styles.reportMeta}>{formatPeriodLabel(getPeriodKey(selectedChartDay, 'WEEK'), 'WEEK')}</Text>
              </View>
              <Text style={styles.chartHeaderTotal}>{formatCurrency(selectedDayReport.total, balancesData?.currency)}</Text>
            </View>
            <View style={styles.chartHeader}>
              <TouchableOpacity accessibilityLabel="Previous week" onPress={() => {
                const date = reportDate(selectedChartDay);
                date.setDate(date.getDate() - 7);
                setSelectedChartDay(localDateKey(date));
              }}><Text style={styles.reportTabText}>‹ Previous week</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setSelectedChartDay(localDateKey(new Date()))}><Text style={styles.reportTabText}>Today</Text></TouchableOpacity>
              <TouchableOpacity accessibilityLabel="Next week" onPress={() => {
                const date = reportDate(selectedChartDay);
                date.setDate(date.getDate() + 7);
                setSelectedChartDay(localDateKey(date));
              }}><Text style={styles.reportTabText}>Next week ›</Text></TouchableOpacity>
            </View>
            <View style={styles.chartPlot}>
              {dailyChartRows.map((row, index) => {
                const isSelected = selectedChartDay === row.key;
                const barHeight = row.total === 0 ? 4 : Math.max((row.total / highestDailyTotal) * 88, 10);
                return (
                  <TouchableOpacity key={row.key} style={[styles.chartColumn, isSelected && styles.chartColumnSelected]} activeOpacity={0.75} onPress={() => setSelectedChartDay(row.key)}>
                    <Text style={[styles.chartValue, isSelected && styles.chartValueSelected]} numberOfLines={1}>
                      {row.total > 0 ? Math.round(row.total).toLocaleString() : '0'}
                    </Text>
                    <View style={styles.chartBarArea}>
                      <View style={[styles.chartBar, { height: barHeight, backgroundColor: chartColors[index], opacity: row.total === 0 ? 0.28 : isSelected ? 1 : 0.72 }]} />
                    </View>
                    <Text style={[styles.chartLabel, isSelected && styles.chartLabelSelected]}>{row.date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)}</Text>
                    <Text style={styles.chartDate}>{row.date.getDate()}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.dayDetail}>
              <View style={styles.dayDetailHeader}>
                <View>
                  <Text style={styles.dayDetailTitle}>{formatDate(selectedDayReport.date)}</Text>
                  <Text style={styles.dayDetailCount}>{selectedDayReport.transactions.length} {selectedDayReport.transactions.length === 1 ? 'transaction' : 'transactions'}</Text>
                </View>
                <Text style={styles.dayDetailTotal}>{formatCurrency(selectedDayReport.total, balancesData?.currency)}</Text>
              </View>
              {selectedDayReport.transactions.length === 0 ? (
                <Text style={styles.dayEmpty}>No verified expenses on this day.</Text>
              ) : selectedDayReport.transactions.map((transaction) => (
                <TouchableOpacity key={transaction._id} style={styles.dayTransactionRow} onPress={() => router.push(`/(tabs)/feed/${transaction._id}`)}>
                  <View style={styles.dayTransactionCopy}>
                    <Text style={styles.dayTransactionTitle} numberOfLines={1}>{transaction.title}</Text>
                    <Text style={styles.dayTransactionMeta}>{transaction.category} · {transaction.paidBy?.name || 'Roommate'}</Text>
                  </View>
                  <Text style={styles.dayTransactionAmount}>{formatCurrency(transaction.amount, transaction.currency)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.reportCard}>
            {reportRows.length === 0 ? (
              <Text style={styles.noTransactions}>No verified expenses to report yet.</Text>
            ) : reportRows.map((row, index) => (
              <View key={row.key} style={[styles.reportRow, index < reportRows.length - 1 && styles.reportRowBorder]}>
                <View style={styles.reportCopy}>
                  <Text style={styles.reportLabel}>{formatPeriodLabel(row.key, reportPeriod)}</Text>
                  <Text style={styles.reportMeta}>
                    {row.count} {row.count === 1 ? 'transaction' : 'transactions'} · Avg {formatCurrency(row.total / row.count, balancesData?.currency)}
                  </Text>
                </View>
                <Text style={styles.reportTotal}>{formatCurrency(row.total, balancesData?.currency)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Member Balances Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spending by person · {balances.length}</Text>
          <View style={styles.balancesCard}>
            {balances.length === 0 ? (
              <Text style={styles.noTransactions}>No member spending data yet.</Text>
            ) : null}
            {balances.map((b, idx) => {
              const isMe = b.userId === user?._id;
              const isPositive = b.balance > 0.01;
              const isNegative = b.balance < -0.01;
              const memberTransactions = transactionsByMember[b.userId] || [];
              const periodPaid = periodSpendingByMember[b.userId] || 0;
              const isExpanded = expandedMemberId === b.userId;

              return (
                <View
                  key={b.userId}
                  style={idx < balances.length - 1 && styles.balanceRowBorder}
                >
                  <TouchableOpacity
                    style={styles.balanceRow}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isExpanded }}
                    onPress={() => setExpandedMemberId(isExpanded ? null : b.userId)}
                  >
                    <View style={styles.memberMeta}>
                      <Avatar uri={b.profileImage} name={b.name} size={40} />
                      <View style={styles.memberCopy}>
                        <Text style={styles.memberName}>
                          {b.name} {isMe ? '(You)' : ''}
                        </Text>
                        <Text style={styles.transactionCount}>
                          {formatCurrency(periodPaid, balancesData?.currency)} {periodName}
                        </Text>
                        <Text style={styles.totalPaid}>
                          All-time spending: {formatCurrency(b.totalPaid, balancesData?.currency)} · {memberTransactions.length} verified
                        </Text>
                        <View style={styles.memberBarTrack}>
                          <View
                            style={[
                              styles.memberBarFill,
                              { width: periodPaid === 0 ? '0%' : `${Math.max((periodPaid / highestMemberPeriodPaid) * 100, 3)}%` },
                            ]}
                          />
                        </View>
                      </View>
                    </View>

                    <View style={styles.balanceSummary}>
                      <Text
                        style={[
                          styles.balanceAmount,
                          isPositive && styles.positiveBalance,
                          isNegative && styles.negativeBalance,
                        ]}
                      >
                        {isPositive ? '+' : ''}
                        {formatCurrency(b.balance, balancesData?.currency)}
                      </Text>
                      <Text style={styles.balanceStatus}>
                        {isPositive ? 'gets back' : isNegative ? 'owes' : 'settled'} · {isExpanded ? '▲' : '▼'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.transactionList}>
                      <View style={styles.shareRow}>
                        <Text style={styles.shareLabel}>Equal share to date</Text>
                        <Text style={styles.shareValue}>{formatCurrency(b.fairShare, balancesData?.currency)}</Text>
                      </View>
                      {memberTransactions.length === 0 ? (
                        <Text style={styles.noTransactions}>No verified transactions from this person yet.</Text>
                      ) : memberTransactions.map((transaction) => (
                        <TouchableOpacity
                          key={transaction._id}
                          style={styles.transactionRow}
                          onPress={() => router.push(`/(tabs)/feed/${transaction._id}`)}
                        >
                          <View style={styles.transactionInfo}>
                            <Text style={styles.transactionTitle} numberOfLines={1}>{transaction.title}</Text>
                            <Text style={styles.transactionMeta}>{formatDate(transaction.expenseDate)} · {transaction.category}</Text>
                          </View>
                          <Text style={styles.transactionAmount}>{formatCurrency(transaction.amount, transaction.currency)}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
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
            history.map((item) => {
              const isPending = item.status === 'PENDING';
              const canReview = isPending && item.toUser?._id === user?._id;
              return (
              <TouchableOpacity
                key={item._id}
                style={styles.historyCard}
                activeOpacity={0.72}
                onPress={() => router.push(`/(tabs)/settlement/${item._id}`)}
              >
                <View style={styles.historyLeft}>
                  <Text style={styles.historyTitle}>
                    {item.fromUser?.name || 'Someone'} paid {item.toUser?.name || 'Someone'}
                  </Text>
                  <Text style={styles.historyMeta}>
                    {formatDate(item.settlementDate)} • {item.method}
                    {item.note ? ` • "${item.note}"` : ''}
                  </Text>
                  <Text style={[styles.historyStatus, item.status === 'REJECTED' ? styles.historyStatusRejected : isPending ? styles.historyStatusPending : styles.historyStatusVerified]}>
                    {item.status === 'REJECTED' ? 'Rejected' : isPending ? 'Awaiting approval' : 'Verified'}
                  </Text>
                  {canReview ? (
                    <View style={styles.reviewActions}>
                      <Button title="Reject" size="sm" variant="ghost" disabled={reviewingSettlementId === item._id} onPress={() => void reviewSettlement(item._id, false)} />
                      <Button title="Approve" size="sm" variant="success" loading={reviewingSettlementId === item._id} onPress={() => void reviewSettlement(item._id, true)} />
                    </View>
                  ) : null}
                </View>
                <Text style={styles.historyAmount}>
                  {formatCurrency(item.amount, item.currency)}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} style={styles.historyChevron} />
              </TouchableOpacity>
            );})
          )}
        </View>
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
  header: {
    marginBottom: Spacing.lg,
  },
  eyebrow: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
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
    lineHeight: 19,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginLeft: Spacing.sm,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  errorCopy: { flex: 1, marginRight: Spacing.sm },
  errorTitle: { color: Colors.dangerText, fontSize: 13, fontWeight: '800' },
  errorText: { color: Colors.dangerText, fontSize: 11, marginTop: 2, lineHeight: 16 },
  retryText: { color: Colors.dangerText, fontSize: 12, fontWeight: '800' },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm + 2,
  },
  sectionHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: -Spacing.xs,
    marginBottom: Spacing.sm + 2,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  metricCard: {
    flexGrow: 1,
    minWidth: '30%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.card,
  },
  metricCardPrimary: {
    minWidth: '100%',
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  metricLabel: { color: Colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  metricLabelPrimary: { color: Colors.textInverted, opacity: 0.8, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  metricValue: { color: Colors.text, fontSize: 24, fontWeight: '900', marginTop: Spacing.xs },
  metricValueSmall: { color: Colors.text, fontSize: 15, fontWeight: '900', marginTop: Spacing.sm },
  metricValuePrimary: { color: Colors.textInverted, fontSize: 27, fontWeight: '900', marginTop: Spacing.xs },
  metricFoot: { color: Colors.textSecondary, fontSize: 10, marginTop: 2 },
  reportTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  reportTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  reportTabActive: {
    backgroundColor: Colors.primary,
  },
  reportTabText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  reportTabTextActive: {
    color: Colors.textInverted,
  },
  reportCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    ...Shadows.card,
  },
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  chartTitle: { color: Colors.text, fontSize: 14, fontWeight: '800' },
  chartSubtitle: { color: Colors.textSecondary, fontSize: 10, marginTop: 2 },
  chartHeaderTotal: { color: Colors.primary, fontSize: 15, fontWeight: '900' },
  chartPlot: {
    height: 142,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
  chartColumn: { flex: 1, alignItems: 'center', marginHorizontal: 2, paddingTop: 4, borderRadius: BorderRadius.sm },
  chartColumnSelected: { backgroundColor: Colors.surfaceSubtle },
  chartValue: { color: Colors.textSecondary, fontSize: 9, marginBottom: 3, maxWidth: '100%' },
  chartValueSelected: { color: Colors.primary, fontWeight: '800' },
  chartBarArea: { height: 88, width: '56%', justifyContent: 'flex-end' },
  chartBar: { width: '100%', borderRadius: BorderRadius.sm },
  chartLabel: { color: Colors.textMuted, fontSize: 9, fontWeight: '700', marginTop: 4 },
  chartLabelSelected: { color: Colors.primary },
  chartDate: { color: Colors.textMuted, fontSize: 8, marginTop: 1 },
  dayDetail: { backgroundColor: Colors.surfaceSubtle, borderRadius: BorderRadius.md, padding: Spacing.md, marginTop: Spacing.md },
  dayDetailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dayDetailTitle: { color: Colors.text, fontSize: 13, fontWeight: '800' },
  dayDetailCount: { color: Colors.textSecondary, fontSize: 10, marginTop: 2 },
  dayDetailTotal: { color: Colors.primary, fontSize: 14, fontWeight: '900' },
  dayEmpty: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', paddingVertical: Spacing.md },
  dayTransactionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  dayTransactionCopy: { flex: 1, marginRight: Spacing.sm },
  dayTransactionTitle: { color: Colors.text, fontSize: 12, fontWeight: '700' },
  dayTransactionMeta: { color: Colors.textSecondary, fontSize: 9, marginTop: 2 },
  dayTransactionAmount: { color: Colors.text, fontSize: 11, fontWeight: '800' },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  reportRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  reportCopy: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  reportLabel: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  reportMeta: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 3,
  },
  reportTotal: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '800',
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
    paddingVertical: Spacing.md,
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
  memberCopy: {
    flex: 1,
    marginLeft: Spacing.sm,
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
  transactionCount: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  memberBarTrack: {
    height: 4,
    backgroundColor: Colors.borderLight,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xs,
    overflow: 'hidden',
  },
  memberBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  balanceSummary: {
    alignItems: 'flex-end',
    marginLeft: Spacing.xs,
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
  transactionList: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  shareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  shareLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  shareValue: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '700',
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  transactionInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  transactionTitle: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '600',
  },
  transactionMeta: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '700',
  },
  noTransactions: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: 12,
    padding: Spacing.md,
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
  historyChevron: { marginLeft: Spacing.xs },
  historyStatus: { alignSelf: 'flex-start', fontSize: 10, fontWeight: '800', marginTop: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.full, overflow: 'hidden' },
  historyStatusPending: { color: Colors.warningText, backgroundColor: Colors.warningLight },
  historyStatusVerified: { color: Colors.successText, backgroundColor: Colors.successLight },
  historyStatusRejected: { color: Colors.dangerText, backgroundColor: Colors.dangerLight },
  reviewActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
});
