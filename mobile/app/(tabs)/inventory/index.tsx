import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, BorderRadius, Shadows, ThemeColors } from '../../../constants/theme';
import { useThemeColors } from '../../../src/store/theme.store';
import { useRoomStore } from '../../../src/store/room.store';
import { useInventoryStore } from '../../../src/store/inventory.store';
import { useAuthStore } from '../../../src/store/auth.store';
import { InventoryCategory, InventoryUnit, InventoryItem } from '../../../src/types';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { CardListSkeleton } from '../../../src/components/ui/Skeleton';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { key: InventoryCategory | 'ALL'; label: string; icon: string }[] = [
  { key: 'ALL', label: 'All', icon: '🗂️' },
  { key: 'KITCHEN', label: 'Kitchen', icon: '🍳' },
  { key: 'CLEANING', label: 'Cleaning', icon: '🧹' },
  { key: 'BATHROOM', label: 'Bathroom', icon: '🚿' },
  { key: 'PANTRY', label: 'Pantry', icon: '🥫' },
  { key: 'OTHER', label: 'Other', icon: '📦' },
];

const UNITS: InventoryUnit[] = ['pcs', 'kg', 'L', 'packets', 'boxes', 'other'];
const UNIT_LABELS: Record<InventoryUnit, string> = {
  pcs: 'pcs',
  kg: 'kg',
  L: 'L',
  packets: 'pkts',
  boxes: 'boxes',
  other: 'units',
};

const CATEGORY_ICONS: Record<InventoryCategory, string> = {
  KITCHEN: '🍳',
  CLEANING: '🧹',
  BATHROOM: '🚿',
  PANTRY: '🥫',
  OTHER: '📦',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ItemForm {
  name: string;
  category: InventoryCategory;
  quantity: string;
  unit: InventoryUnit;
  minQuantity: string;
}

const DEFAULT_FORM: ItemForm = {
  name: '',
  category: 'KITCHEN',
  quantity: '',
  unit: 'pcs',
  minQuantity: '',
};

// ─── Subcomponents ────────────────────────────────────────────────────────────

function InventoryItemCard({
  item,
  Colors,
  styles,
  onEdit,
  onDelete,
  onApprove,
  onReject,
  currentUserId,
}: {
  item: InventoryItem;
  Colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
  onApprove: (item: InventoryItem) => void;
  onReject: (item: InventoryItem) => void;
  currentUserId?: string;
}) {
  const isLow = item.minQuantity != null && item.quantity <= item.minQuantity;
  const creator = typeof item.addedBy === 'object' ? item.addedBy : null;
  const isCreator = creator?._id === currentUserId || item.addedBy === currentUserId;
  const status = item.status || 'VERIFIED';
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={() => onEdit(item)}
        style={[styles.itemCard, isLow && styles.itemCardLow]}
      >
        <View style={styles.itemCardHeader}>
          <View style={styles.itemLeft}>
          <View style={[styles.itemEmojiWrap, isLow && styles.itemEmojiWrapLow]}>
            <Text style={styles.itemEmoji}>{CATEGORY_ICONS[item.category]}</Text>
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.itemMeta}>
              <Text style={styles.itemCategoryLabel}>
                {CATEGORIES.find((c) => c.key === item.category)?.label ?? item.category}
              </Text>
              {isLow && (
                <View style={styles.lowBadge}>
                  <Ionicons name="warning" size={10} color={Colors.warningText} />
                  <Text style={styles.lowBadgeText}>Low</Text>
                </View>
              )}
            </View>
            <Text style={styles.addedByText}>Added by {creator?.name || 'Room member'}</Text>
          </View>
        </View>
          <View style={[
            styles.statusBadge,
            status === 'VERIFIED' ? styles.statusVerified : status === 'REJECTED' ? styles.statusRejected : styles.statusPending,
          ]}>
            <Text style={styles.statusText}>{status}</Text>
          </View>
        </View>

        <View style={styles.stockSummary}>
          <View>
            <Text style={styles.stockLabel}>CURRENT STOCK</Text>
            <Text style={styles.stockValue}>{item.quantity} <Text style={styles.stockUnit}>{UNIT_LABELS[item.unit]}</Text></Text>
          </View>
          <View style={styles.thresholdBlock}>
            <Text style={styles.stockLabel}>LOW-STOCK ALERT</Text>
            <Text style={styles.thresholdValue}>
              {item.minQuantity == null ? 'Not set' : `Below ${item.minQuantity} ${UNIT_LABELS[item.unit]}`}
            </Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          {isCreator && (
          <TouchableOpacity
            style={styles.editAction}
            onPress={() => onEdit(item)}
          >
            <Ionicons name="create-outline" size={17} color={Colors.primary} />
            <Text style={styles.editActionText}>Edit item</Text>
          </TouchableOpacity>
          )}
          {!isCreator && status === 'PENDING' && (
            <>
              <TouchableOpacity style={styles.rejectAction} onPress={() => onReject(item)}>
                <Text style={styles.rejectActionText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.approveAction} onPress={() => onApprove(item)}>
                <Text style={styles.approveActionText}>Approve</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Add/Edit Modal ───────────────────────────────────────────────────────────

function ItemModal({
  visible,
  editingItem,
  Colors,
  styles,
  onClose,
  onSave,
  onDelete,
  isSaving,
}: {
  visible: boolean;
  editingItem: InventoryItem | null;
  Colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  onClose: () => void;
  onSave: (form: ItemForm) => void;
  onDelete?: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<ItemForm>(DEFAULT_FORM);

  useEffect(() => {
    if (editingItem) {
      setForm({
        name: editingItem.name,
        category: editingItem.category,
        quantity: String(editingItem.quantity),
        unit: editingItem.unit,
        minQuantity: editingItem.minQuantity != null ? String(editingItem.minQuantity) : '',
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [editingItem, visible]);

  const set = (key: keyof ItemForm, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalSheet}>
          {/* Handle */}
          <View style={styles.modalHandle} />

          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingItem ? 'Edit Item' : 'Add Item'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Name */}
            <Text style={styles.fieldLabel}>Item Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Rice, Dish Soap, Shampoo"
              placeholderTextColor={Colors.textMuted}
              value={form.name}
              onChangeText={(v) => set('name', v)}
            />

            {/* Category picker */}
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.filter((c) => c.key !== 'ALL').map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.chip, form.category === c.key && styles.chipActive]}
                  onPress={() => set('category', c.key as InventoryCategory)}
                >
                  <Text style={styles.chipEmoji}>{c.icon}</Text>
                  <Text
                    style={[styles.chipText, form.category === c.key && styles.chipTextActive]}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Quantity & Unit */}
            <View style={styles.rowFields}>
              <View style={{ flex: 1, marginRight: Spacing.sm }}>
                <Text style={styles.fieldLabel}>Quantity *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  value={form.quantity}
                  onChangeText={(v) => set('quantity', v)}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Unit</Text>
                <View style={styles.unitPicker}>
                  {UNITS.map((u) => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.unitChip, form.unit === u && styles.unitChipActive]}
                      onPress={() => set('unit', u)}
                    >
                      <Text
                        style={[styles.unitChipText, form.unit === u && styles.unitChipTextActive]}
                      >
                        {UNIT_LABELS[u]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Min quantity */}
            <Text style={styles.fieldLabel}>
              Low-stock threshold{' '}
              <Text style={styles.fieldOptional}>(optional)</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="Alert when below this quantity"
              placeholderTextColor={Colors.textMuted}
              value={form.minQuantity}
              onChangeText={(v) => set('minQuantity', v)}
              keyboardType="decimal-pad"
            />

            {/* Action buttons */}
            <View style={styles.modalActions}>
              {editingItem && onDelete && (
                <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
                  <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
                onPress={() => onSave(form)}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={Colors.textInverted} />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingItem ? 'Save Changes' : 'Add Item'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function InventoryScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const { currentRoom } = useRoomStore();
  const user = useAuthStore((state) => state.user);
  const { items, isLoading, fetchItems, addItem, updateItem, deleteItem, approveItem, rejectItem } = useInventoryStore();

  const [activeCategory, setActiveCategory] = useState<InventoryCategory | 'ALL'>('ALL');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch items when room changes
  useEffect(() => {
    if (currentRoom) {
      fetchItems(currentRoom._id);
    }
  }, [currentRoom?._id]);

  const onRefresh = useCallback(async () => {
    if (!currentRoom) return;
    setRefreshing(true);
    await fetchItems(currentRoom._id);
    setRefreshing(false);
  }, [currentRoom]);

  // Filter items by category
  const filteredItems = useMemo(() => {
    if (activeCategory === 'ALL') return items;
    return items.filter((i) => i.category === activeCategory);
  }, [items, activeCategory]);

  // Group filtered items by category for display
  const groupedItems = useMemo(() => {
    if (activeCategory !== 'ALL') return null;
    const groups: Record<string, InventoryItem[]> = {};
    items.forEach((item) => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [items, activeCategory]);

  const lowStockCount = useMemo(
    () => items.filter((i) => i.minQuantity != null && i.quantity <= i.minQuantity).length,
    [items]
  );

  const handleOpenAdd = () => {
    setEditingItem(null);
    setModalVisible(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setModalVisible(true);
  };

  const handleClose = () => {
    setModalVisible(false);
    setEditingItem(null);
  };

  const handleSave = async (form: ItemForm) => {
    if (!form.name.trim()) {
      Alert.alert('Missing field', 'Please enter an item name.');
      return;
    }
    const qty = parseFloat(form.quantity);
    if (isNaN(qty) || qty < 0) {
      Alert.alert('Invalid quantity', 'Please enter a valid non-negative number.');
      return;
    }
    const minQty = form.minQuantity.trim() ? parseFloat(form.minQuantity) : undefined;

    setIsSaving(true);
    try {
      if (editingItem) {
        await updateItem(editingItem._id, {
          name: form.name.trim(),
          category: form.category,
          quantity: qty,
          unit: form.unit,
          minQuantity: minQty ?? null,
        });
      } else {
        if (!currentRoom) return;
        await addItem({
          roomId: currentRoom._id,
          name: form.name.trim(),
          category: form.category,
          quantity: qty,
          unit: form.unit,
          minQuantity: minQty,
        });
      }
      handleClose();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editingItem) return;
    Alert.alert(
      'Remove Item',
      `Remove "${editingItem.name}" from inventory?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            handleClose();
            await deleteItem(editingItem._id);
          },
        },
      ]
    );
  };

  const handleApprove = async (item: InventoryItem) => {
    try {
      await approveItem(item._id);
    } catch (error) {
      Alert.alert('Could not approve', error instanceof Error ? error.message : 'Approval failed.');
    }
  };

  const handleReject = (item: InventoryItem) => {
    Alert.alert('Reject inventory item?', `Reject "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            await rejectItem(item._id);
          } catch (error) {
            Alert.alert('Could not reject', error instanceof Error ? error.message : 'Rejection failed.');
          }
        },
      },
    ]);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!currentRoom) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <EmptyState
          icon={<Text style={{ fontSize: 48 }}>🏠</Text>}
          title="No Room Selected"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Inventory</Text>
          <Text style={styles.subtitle}>{currentRoom.name}</Text>
        </View>
        <View style={styles.headerRight}>
          {lowStockCount > 0 && (
            <View style={styles.warnBadge}>
              <Ionicons name="warning" size={13} color={Colors.warningText} />
              <Text style={styles.warnBadgeText}>{lowStockCount} low</Text>
            </View>
          )}
          <Text style={styles.totalBadge}>{items.length} item{items.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {CATEGORIES.map((cat) => {
          const count =
            cat.key === 'ALL'
              ? items.length
              : items.filter((i) => i.category === cat.key).length;
          const active = activeCategory === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setActiveCategory(cat.key as InventoryCategory | 'ALL')}
            >
              <Text style={styles.filterChipEmoji}>{cat.icon}</Text>
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {cat.label}
              </Text>
              {count > 0 && (
                <View style={[styles.filterCount, active && styles.filterCountActive]}>
                  <Text style={[styles.filterCountText, active && styles.filterCountTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Item List */}
      {isLoading && !refreshing ? (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          <CardListSkeleton />
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
        >
          {filteredItems.length === 0 ? (
            <EmptyState
              icon={<Text style={{ fontSize: 48 }}>📦</Text>}
              title={activeCategory === 'ALL' ? 'No Items Yet' : `No ${CATEGORIES.find(c => c.key === activeCategory)?.label} Items`}
            />
          ) : groupedItems ? (
            // Grouped view (ALL category)
            Object.entries(groupedItems).map(([cat, catItems]) => (
              <View key={cat} style={styles.group}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupEmoji}>
                    {CATEGORY_ICONS[cat as InventoryCategory]}
                  </Text>
                  <Text style={styles.groupTitle}>
                    {CATEGORIES.find((c) => c.key === cat)?.label ?? cat}
                  </Text>
                  <Text style={styles.groupCount}>{catItems.length}</Text>
                </View>
                {catItems.map((item) => (
                  <InventoryItemCard
                    key={item._id}
                    item={item}
                    Colors={Colors}
                    styles={styles}
                    onEdit={handleOpenEdit}
                    onDelete={handleDelete}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    currentUserId={user?._id}
                  />
                ))}
              </View>
            ))
          ) : (
            // Flat view (single category)
            filteredItems.map((item) => (
              <InventoryItemCard
                key={item._id}
                item={item}
                Colors={Colors}
                styles={styles}
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
                onApprove={handleApprove}
                onReject={handleReject}
                currentUserId={user?._id}
              />
            ))
          )}
          <View style={{ height: Spacing.xxl * 2 }} />
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleOpenAdd} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <ItemModal
        visible={modalVisible}
        editingItem={editingItem}
        Colors={Colors}
        styles={styles}
        onClose={handleClose}
        onSave={handleSave}
        onDelete={editingItem ? handleDelete : undefined}
        isSaving={isSaving}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: Colors.background,
    },

    // ── Header ────────────────────────────────────────────────────────────────
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.base,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.md,
    },
    title: {
      fontSize: 26,
      fontWeight: '800',
      color: Colors.text,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 13,
      color: Colors.textSecondary,
      marginTop: 1,
    },
    headerRight: {
      alignItems: 'flex-end',
      gap: 4,
    },
    warnBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.warningLight,
      borderRadius: BorderRadius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      gap: 3,
    },
    warnBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: Colors.warningText,
    },
    totalBadge: {
      fontSize: 12,
      color: Colors.textMuted,
    },

    // ── Filter ────────────────────────────────────────────────────────────────
    filterScroll: {
      flexGrow: 0,
    },
    filterRow: {
      paddingHorizontal: Spacing.base,
      paddingBottom: Spacing.md,
      gap: Spacing.sm,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.surface,
      borderRadius: BorderRadius.full,
      paddingVertical: Spacing.xs + 1,
      paddingHorizontal: Spacing.md,
      borderWidth: 1.5,
      borderColor: Colors.border,
      gap: 4,
      ...Shadows.card,
    },
    filterChipActive: {
      backgroundColor: Colors.primary,
      borderColor: Colors.primary,
    },
    filterChipEmoji: {
      fontSize: 13,
    },
    filterChipText: {
      fontSize: 13,
      fontWeight: '500',
      color: Colors.textSecondary,
    },
    filterChipTextActive: {
      color: '#fff',
      fontWeight: '700',
    },
    filterCount: {
      backgroundColor: Colors.surfaceSubtle,
      borderRadius: BorderRadius.full,
      minWidth: 18,
      height: 18,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    filterCountActive: {
      backgroundColor: 'rgba(255,255,255,0.25)',
    },
    filterCountText: {
      fontSize: 10,
      fontWeight: '700',
      color: Colors.textSecondary,
    },
    filterCountTextActive: {
      color: '#fff',
    },

    // ── List ──────────────────────────────────────────────────────────────────
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: Spacing.base,
    },

    // ── Group ─────────────────────────────────────────────────────────────────
    group: {
      marginBottom: Spacing.lg,
    },
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.sm,
      gap: Spacing.xs,
    },
    groupEmoji: {
      fontSize: 16,
    },
    groupTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: Colors.textSecondary,
      flex: 1,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    groupCount: {
      fontSize: 12,
      color: Colors.textMuted,
    },

    // ── Item Card ─────────────────────────────────────────────────────────────
    itemCard: {
      width: '100%',
      flexDirection: 'column',
      alignItems: 'stretch',
      backgroundColor: Colors.surface,
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      borderWidth: 1,
      borderColor: Colors.border,
      overflow: 'hidden',
      ...Shadows.card,
    },
    itemCardLow: {
      borderColor: Colors.warning,
      borderWidth: 1.5,
    },
    itemCardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      width: '100%',
    },
    itemLeft: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    itemEmojiWrap: {
      width: 42,
      height: 42,
      borderRadius: BorderRadius.md,
      backgroundColor: Colors.surfaceSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemEmojiWrapLow: {
      backgroundColor: Colors.warningLight,
    },
    itemEmoji: {
      fontSize: 22,
    },
    itemInfo: {
      flex: 1,
      minWidth: 0,
    },
    itemName: {
      fontSize: 15,
      fontWeight: '600',
      color: Colors.text,
      flexShrink: 1,
    },
    itemMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      marginTop: 2,
    },
    itemCategoryLabel: {
      fontSize: 12,
      color: Colors.textMuted,
    },
    addedByText: {
      fontSize: 11,
      color: Colors.textMuted,
      marginTop: 3,
    },
    statusBadge: {
      borderRadius: BorderRadius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      marginLeft: Spacing.sm,
      flexShrink: 0,
    },
    statusPending: {
      backgroundColor: Colors.warningLight,
    },
    statusVerified: {
      backgroundColor: Colors.successLight,
    },
    statusRejected: {
      backgroundColor: Colors.dangerLight,
    },
    statusText: {
      color: Colors.text,
      fontSize: 10,
      fontWeight: '800',
    },
    stockSummary: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: Colors.borderLight,
      marginTop: Spacing.md,
      paddingVertical: Spacing.md,
      width: '100%',
    },
    stockLabel: {
      color: Colors.textMuted,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    stockValue: {
      color: Colors.primary,
      fontSize: 24,
      fontWeight: '800',
      marginTop: 2,
    },
    stockUnit: {
      color: Colors.textSecondary,
      fontSize: 13,
      fontWeight: '500',
    },
    thresholdBlock: {
      flex: 1,
      alignItems: 'flex-end',
      marginLeft: Spacing.md,
    },
    thresholdValue: {
      color: Colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
      marginTop: 4,
      textAlign: 'right',
      flexShrink: 1,
    },
    cardActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: Spacing.sm,
      marginTop: Spacing.md,
      width: '100%',
      flexWrap: 'wrap',
    },
    editAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      borderWidth: 1,
      borderColor: Colors.primary,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    editActionText: {
      color: Colors.primary,
      fontSize: 13,
      fontWeight: '700',
    },
    rejectAction: {
      flex: 1,
      borderWidth: 1,
      borderColor: Colors.danger,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.sm,
    },
    rejectActionText: {
      color: Colors.danger,
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'center',
    },
    approveAction: {
      flex: 1,
      backgroundColor: Colors.success,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.sm,
    },
    approveActionText: {
      color: Colors.textInverted,
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'center',
    },
    lowBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.warningLight,
      borderRadius: BorderRadius.full,
      paddingHorizontal: 5,
      paddingVertical: 1,
      gap: 2,
    },
    lowBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: Colors.warningText,
    },
    itemRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    adjustBtn: {
      width: 28,
      height: 28,
      borderRadius: BorderRadius.sm,
      backgroundColor: Colors.surfaceSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    qtyBox: {
      alignItems: 'center',
      minWidth: 44,
    },
    qtyValue: {
      fontSize: 17,
      fontWeight: '700',
      color: Colors.text,
    },
    qtyUnit: {
      fontSize: 10,
      color: Colors.textMuted,
      marginTop: -2,
    },
    menuBtn: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 2,
    },

    // ── FAB ───────────────────────────────────────────────────────────────────
    fab: {
      position: 'absolute',
      right: Spacing.base + 4,
      bottom: Spacing.xxl + Spacing.xl,
      width: 56,
      height: 56,
      borderRadius: BorderRadius.full,
      backgroundColor: Colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...Shadows.hover,
      elevation: 8,
    },

    // ── Modal ─────────────────────────────────────────────────────────────────
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    modalSheet: {
      backgroundColor: Colors.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: Spacing.base,
      paddingBottom: Platform.OS === 'ios' ? 36 : Spacing.xl,
      maxHeight: '90%',
    },
    modalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: Colors.border,
      alignSelf: 'center',
      marginTop: Spacing.md,
      marginBottom: Spacing.sm,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: Spacing.sm,
      marginBottom: Spacing.md,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: Colors.text,
    },
    modalCloseBtn: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: BorderRadius.full,
      backgroundColor: Colors.surfaceSubtle,
    },

    // ── Form ──────────────────────────────────────────────────────────────────
    fieldLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: Colors.textSecondary,
      marginBottom: Spacing.xs,
      letterSpacing: 0.2,
    },
    fieldOptional: {
      fontWeight: '400',
      color: Colors.textMuted,
    },
    textInput: {
      backgroundColor: Colors.surfaceSubtle,
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm + 2,
      fontSize: 15,
      color: Colors.text,
      marginBottom: Spacing.base,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      marginBottom: Spacing.base,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.xs + 1,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.full,
      borderWidth: 1.5,
      borderColor: Colors.border,
      backgroundColor: Colors.surfaceSubtle,
      gap: 4,
    },
    chipActive: {
      borderColor: Colors.primary,
      backgroundColor: Colors.primary + '18',
    },
    chipEmoji: {
      fontSize: 14,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '500',
      color: Colors.textSecondary,
    },
    chipTextActive: {
      color: Colors.primary,
      fontWeight: '700',
    },
    rowFields: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    unitPicker: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
      marginBottom: Spacing.base,
    },
    unitChip: {
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.sm,
      borderRadius: BorderRadius.sm,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.surfaceSubtle,
    },
    unitChipActive: {
      borderColor: Colors.primary,
      backgroundColor: Colors.primary + '18',
    },
    unitChipText: {
      fontSize: 12,
      fontWeight: '500',
      color: Colors.textSecondary,
    },
    unitChipTextActive: {
      color: Colors.primary,
      fontWeight: '700',
    },
    modalActions: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.sm,
    },
    deleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.base,
      borderRadius: BorderRadius.md,
      borderWidth: 1.5,
      borderColor: Colors.danger,
    },
    deleteBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: Colors.danger,
    },
    saveBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.md,
      backgroundColor: Colors.primary,
    },
    saveBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#fff',
    },
  });
