import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { connectSocket, subscribeSocketConnect } from '../../../src/services/socket/socket.service';
import { useAuthStore } from '../../../src/store/auth.store';
import { useRoomStore } from '../../../src/store/room.store';
import { useFeedStore, FeedFilter } from '../../../src/store/feed.store';
import { TransactionCard } from '../../../src/components/feed/TransactionCard';
import { Button } from '../../../src/components/ui/Button';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { CardListSkeleton } from '../../../src/components/ui/Skeleton';
import { Spacing, BorderRadius, Shadows, ThemeColors } from '../../../constants/theme';
import { useThemeColors } from '../../../src/store/theme.store';
import { Transaction } from '../../../src/types';

const FILTERS: { key: FeedFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'VERIFIED', label: 'Verified' },
  { key: 'REJECTED', label: 'Rejected' },
];

export default function FeedScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const rooms = useRoomStore((state) => state.rooms);
  const currentRoom = useRoomStore((state) => state.currentRoom);
  const selectRoom = useRoomStore((state) => state.selectRoom);
  const isRoomLoading = useRoomStore((state) => state.isLoading);

  const transactions = useFeedStore((state) => state.transactions);
  const filter = useFeedStore((state) => state.filter);
  const setFilter = useFeedStore((state) => state.setFilter);
  const fetchFeed = useFeedStore((state) => state.fetchFeed);
  const isFeedLoading = useFeedStore((state) => state.isLoading);
  const isRefreshing = useFeedStore((state) => state.isRefreshing);
  const approveTransaction = useFeedStore((state) => state.approveTransaction);
  const rejectTransaction = useFeedStore((state) => state.rejectTransaction);

  const [roomModalVisible, setRoomModalVisible] = useState(false);

  useEffect(() => {
    if (currentRoom) {
      fetchFeed(currentRoom._id, 1);
    }
  }, [currentRoom, fetchFeed]);

  useFocusEffect(useCallback(() => {
    if (!currentRoom) return;
    const sync = () => {
      const feed = useFeedStore.getState();
      if (AppState.currentState !== 'active' || feed.isLoading || feed.isRefreshing) return;
      void fetchFeed(currentRoom._id, 1, true);
    };
    const resume = () => {
      sync();
      void connectSocket().catch(error => console.warn('Socket reconnect failed:', error));
    };
    const unsubscribe = subscribeSocketConnect(sync);
    resume();
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') resume();
    });
    return () => {
      unsubscribe();
      listener.remove();
    };
  }, [currentRoom?._id, fetchFeed]));

  const onRefresh = () => {
    if (currentRoom) {
      fetchFeed(currentRoom._id, 1, true);
    }
  };

  const handleTransactionPress = (transaction: Transaction) => {
    router.push(`/(tabs)/feed/${transaction._id}`);
  };

  // If user has no rooms at all
  if (!isRoomLoading && rooms.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🏠</Text>
          <Text style={styles.emptyTitle}>You haven't joined a room yet</Text>
          <View style={styles.emptyActions}>
            <Button
              title="Create a Room"
              size="lg"
              onPress={() => router.push('/rooms/create')}
              style={styles.emptyBtn}
            />
            <Button
              title="Join with Code"
              variant="outline"
              size="lg"
              onPress={() => router.push('/rooms/join')}
              style={styles.emptyBtn}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.roomSelector}
            onPress={() => setRoomModalVisible(true)}
            activeOpacity={0.7}
          >
            <View>
              <Text style={styles.roomLabel}>CURRENT ROOM</Text>
              <View style={styles.roomNameRow}>
                <Text style={styles.roomName} numberOfLines={1}>
                  {currentRoom ? currentRoom.name : 'Select Room'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addRoomBtn}
            onPress={() => router.push('/rooms/create')}
          >
            <Text style={styles.addRoomBtnText}>+ Room</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterContainer}>
          {FILTERS.map((f) => {
            const isActive = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                activeOpacity={0.7}
                onPress={() => currentRoom && setFilter(f.key, currentRoom._id)}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Feed List */}
        <FlatList
          data={isFeedLoading && transactions.length === 0 ? [] : transactions}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TransactionCard
              transaction={item}
              currentUserId={user?._id || ''}
              onApprove={approveTransaction}
              onReject={rejectTransaction}
              onPress={handleTransactionPress}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            isFeedLoading ? (
              <CardListSkeleton />
            ) : (
              <EmptyState
                icon={<Text style={{ fontSize: 44 }}>🧾</Text>}
                title={filter === 'ALL' ? 'No expenses yet' : `No ${filter.toLowerCase()} expenses`}
                actionTitle={filter === 'ALL' ? '+ Add First Expense' : undefined}
                onAction={filter === 'ALL' ? () => router.push('/(tabs)/feed/create') : undefined}
              />
            )
          }
        />

        {/* Floating Action Button for Adding Expense */}
        {currentRoom && (
          <TouchableOpacity
            style={styles.fab}
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/feed/create')}
          >
            <Text style={styles.fabIcon}>+</Text>
          </TouchableOpacity>
        )}

        {/* Room Switcher Modal */}
        <Modal
          visible={roomModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setRoomModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setRoomModalVisible(false)}
          >
            <View style={styles.modalSheet}>
              <Text style={styles.sheetTitle}>Your Rooms</Text>
              {rooms.map((room) => {
                const isSelected = currentRoom?._id === room._id;
                return (
                  <TouchableOpacity
                    key={room._id}
                    style={[styles.sheetItem, isSelected && styles.sheetItemSelected]}
                    onPress={() => {
                      selectRoom(room._id);
                      setRoomModalVisible(false);
                    }}
                  >
                    <View>
                      <Text style={[styles.sheetItemName, isSelected && styles.sheetItemNameSelected]}>
                        {room.name}
                      </Text>
                      <Text style={styles.sheetItemInvite}>Invite: {room.inviteCode}</Text>
                    </View>
                    {isSelected && <Text style={styles.checkIcon}>✓</Text>}
                  </TouchableOpacity>
                );
              })}

              <View style={styles.sheetActions}>
                <Button
                  title="Create New Room"
                  size="sm"
                  variant="outline"
                  onPress={() => {
                    setRoomModalVisible(false);
                    router.push('/rooms/create');
                  }}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Join Room"
                  size="sm"
                  variant="secondary"
                  onPress={() => {
                    setRoomModalVisible(false);
                    router.push('/rooms/join');
                  }}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  roomSelector: {
    flex: 1,
    marginRight: Spacing.md,
  },
  roomLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  roomNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    maxWidth: '85%',
  },
  dropdownArrow: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  addRoomBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceSubtle,
  },
  addRoomBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm + 2,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.xs + 2,
  },
  filterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSubtle,
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterPillTextActive: {
    color: Colors.textInverted,
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: 90,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.xl,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.hover,
  },
  fabIcon: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '300',
    lineHeight: 34,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: Spacing.base,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xxl,
  },
  emptyActions: {
    width: '100%',
    gap: Spacing.md,
  },
  emptyBtn: {
    width: '100%',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    maxHeight: '60%',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.base,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  sheetItemSelected: {
    backgroundColor: Colors.surfaceSubtle,
  },
  sheetItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  sheetItemNameSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  sheetItemInvite: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  checkIcon: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.base,
    paddingTop: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
});
