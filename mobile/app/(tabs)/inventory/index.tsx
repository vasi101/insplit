import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../../constants/theme';
import { useThemeColors } from '../../../src/store/theme.store';
import { useRoomStore } from '../../../src/store/room.store';
import { useInventoryStore } from '../../../src/store/inventory.store';
import { useAuthStore } from '../../../src/store/auth.store';
import { InventoryItem, InventoryUnit } from '../../../src/types';
import { inventoryBalances } from '../../../src/utils/inventory-balances';
const STOCK = ['Rice', 'Daal', 'Chilly Powder', 'Dhani Powder', 'Oil'];
const unitsFor = (name: string): InventoryUnit[] => name.trim().toLowerCase() === 'oil' ? ['packets', 'L'] : ['kg', 'g'];
const unitLabel = (unit: string) => unit === 'g' ? 'grams' : unit === 'L' ? 'liters' : unit;
const amount = (q: number, u: string) => u === 'kg' && q > 0 && q < 1 ? `${Number((q * 1000).toFixed(3))} g` : `${Number(q.toFixed(6))} ${unitLabel(u)}`;
const creatorId = (item: InventoryItem) => typeof item.addedBy === 'string' ? item.addedBy : item.addedBy?._id;
export default function InventoryScreen() {
    const colors = useThemeColors();
    const s = useMemo(() => styles(colors), [colors]);
    const { currentRoom } = useRoomStore();
    const user = useAuthStore(state => state.user);
    const { items, isLoading, error, fetchItems, addItem, updateItem, deleteItem, approveItem, rejectItem } = useInventoryStore();
    const [tab, setTab] = useState<'Roommates' | 'Balances' | 'Verification'>('Roommates');
    const [filter, setFilter] = useState('All');
    const [visible, setVisible] = useState(false);
    const [editing, setEditing] = useState<InventoryItem | null>(null);
    const [name, setName] = useState('Rice');
    const [custom, setCustom] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unit, setUnit] = useState<InventoryUnit>('kg');
    const [busy, setBusy] = useState(false);
    const [formError, setFormError] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [reviewing, setReviewing] = useState<string | null>(null);
    const roomItems = useMemo(() => items.filter(item => item.roomId === currentRoom?._id && item.isActive), [items, currentRoom?._id]);
    const balances = useMemo(() => inventoryBalances(roomItems, currentRoom?.members ?? [], currentRoom?._id ?? ''), [roomItems, currentRoom]);
    const catalog = useMemo(() => [...STOCK, ...roomItems.map(item => item.name.trim()).filter((value, index, all) => !STOCK.some(stock => stock.toLowerCase() === value.toLowerCase()) && all.findIndex(other => other.toLowerCase() === value.toLowerCase()) === index)], [roomItems]);
    const groups = balances.filter(group => filter === 'All' || group.item.name.toLowerCase() === filter.toLowerCase());
    const members = (currentRoom?.members ?? []).filter(member => member.status === 'ACTIVE').flatMap(member => {
        const id = typeof member.userId === 'string' ? member.userId : member.userId?._id;
        return id ? [{ id, name: typeof member.userId === 'string' ? (id === user?._id ? user.name : 'Roommate') : member.userId?.name || 'Roommate' }] : [];
    });
    const pending = roomItems.filter(item => item.status === 'PENDING' && item.quantity > 0);
    const actualName = name === 'Other' ? custom.trim() : name;
    useEffect(() => { setVisible(false); setFilter('All'); if (currentRoom)
        void fetchItems(currentRoom._id); }, [currentRoom?._id, fetchItems]);
    const refresh = async () => { if (!currentRoom)
        return; setRefreshing(true); try {
        await fetchItems(currentRoom._id);
    }
    finally {
        setRefreshing(false);
    } };
    const openAdd = (itemName = 'Rice', itemUnit?: InventoryUnit) => {
        setEditing(null);
        setName(itemName);
        setCustom('');
        setQuantity('');
        setFormError('');
        setUnit(itemUnit && unitsFor(itemName).includes(itemUnit) ? itemUnit : unitsFor(itemName)[0]);
        setVisible(true);
    };
    const openEdit = (item: InventoryItem) => { setEditing(item); setName(item.name); setCustom(''); setQuantity(String(item.quantity)); setUnit(item.unit); setFormError(''); setVisible(true); };
    const save = async () => {
        if (busy || !currentRoom)
            return;
        const qty = Number(quantity);
        if (!actualName || actualName.length > 100) {
            setFormError('Enter an item name (up to 100 characters).');
            return;
        }
        if (!quantity.trim() || !Number.isFinite(qty) || qty <= 0) {
            setFormError('Enter a quantity greater than zero.');
            return;
        }
        if (!unitsFor(actualName).includes(unit)) {
            setFormError('Choose a valid unit for this item.');
            return;
        }
        if (unit === 'packets' && !Number.isInteger(qty)) {
            setFormError('Enter a whole number of oil packets.');
            return;
        }
        setBusy(true);
        setFormError('');
        try {
            const canonicalName = catalog.find(item => item.toLowerCase() === actualName.toLowerCase()) ?? actualName;
            const payload = { name: canonicalName, quantity: qty, unit, category: 'KITCHEN' as const };
            if (editing)
                await updateItem(editing._id, payload);
            else
                await addItem({ ...payload, roomId: currentRoom._id });
            setVisible(false);
        }
        catch (err) {
            setFormError(err instanceof Error ? err.message : 'Could not save. Please try again.');
        }
        finally {
            setBusy(false);
        }
    };
    const review = async (item: InventoryItem, approve: boolean) => {
        if (reviewing)
            return;
        setReviewing(item._id);
        try {
            if (approve)
                await approveItem(item._id);
            else
                await rejectItem(item._id);
        }
        catch (err) {
            Alert.alert('Could not review', err instanceof Error ? err.message : 'Please try again.');
        }
        finally {
            setReviewing(null);
        }
    };
    const remove = (item: InventoryItem) => Alert.alert('Remove delivery?', 'This will recalculate item balances.', [
        { text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: async () => {
                try {
                    await deleteItem(item._id);
                }
                catch (err) {
                    Alert.alert('Could not remove', err instanceof Error ? err.message : 'Please try again.');
                }
            } },
    ]);
    if (!currentRoom)
        return <SafeAreaView style={s.screen}><Text style={s.empty}>Select a room to see shared stock.</Text></SafeAreaView>;
    return <SafeAreaView style={s.screen}>
    <View style={s.header}><View style={s.flex}><Text style={s.title}>Shared stock</Text><Text style={s.muted}>{currentRoom.name}</Text></View><TouchableOpacity accessibilityLabel="Record what you brought" style={s.primary} onPress={() => openAdd()}><Ionicons name="add" size={18} color={colors.textInverted}/><Text style={s.primaryText}>I brought</Text></TouchableOpacity></View>
    <View style={s.tabs}>{(['Roommates', 'Balances', 'Verification'] as const).map(value => <TouchableOpacity key={value} style={[s.tab, tab === value && s.activeTab]} onPress={() => setTab(value)}><Text style={[s.tabText, tab === value && s.activeText]}>{value}{value === 'Verification' && pending.length > 0 ? ` (${pending.length})` : ''}</Text></TouchableOpacity>)}</View>
    {tab !== 'Verification' && <View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>{['All', ...catalog].map(value => <TouchableOpacity key={value} onPress={() => setFilter(value)} style={[s.chip, filter === value && s.selected]}><Text style={filter === value ? s.activeText : s.muted}>{value}</Text></TouchableOpacity>)}</ScrollView></View>}
    <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary}/>}>
      {error && <TouchableOpacity onPress={refresh}><Text style={s.error}>{error} · Tap to retry</Text></TouchableOpacity>}
      {isLoading && roomItems.length === 0 && <ActivityIndicator color={colors.primary}/>}
      {tab !== 'Verification' && <Text style={s.note}>Everyone matches the highest contribution for each item. * Pending deliveries are provisional until reviewed.</Text>}
      {tab === 'Roommates' && members.map(member => {
            const rows = groups.map(group => ({ group, person: group.people.find(person => person.id === member.id) })).filter(row => row.person);
            const owed = rows.filter(row => row.person!.remaining > 0).length;
            return <View key={member.id} style={s.card}>
          <View style={s.row}><View style={s.avatar}><Text style={s.avatarText}>{member.name.charAt(0).toUpperCase()}</Text></View><View style={s.flex}><Text style={s.heading}>{member.name}{member.id === user?._id ? ' (You)' : ''}</Text><Text style={s.muted}>{owed ? `${owed} item${owed === 1 ? '' : 's'} to bring` : rows.length ? 'All items matched' : 'No contributions yet'}</Text></View></View>
          {rows.length > 0 && <View style={s.tableHeader}><Text style={[s.caption, s.flex]}>ITEM</Text><Text style={s.column}>BROUGHT</Text><Text style={s.column}>STILL OWES</Text></View>}
          {rows.map(({ group, person }) => <View key={group.key} style={s.tableRow}><Text style={[s.itemName, s.flex]}>{group.item.name}{group.pending ? ' *' : ''}</Text><Text style={s.columnValue}>{amount(person!.brought, group.unit)}</Text><Text style={[s.columnValue, { color: person!.remaining ? colors.warningText : colors.successText }]}>{person!.remaining ? amount(person!.remaining, group.unit) : 'Settled'}</Text></View>)}
          {rows.length === 0 && <Text style={s.note}>Rice, daal, oil and other supplies will appear here when recorded.</Text>}
          {member.id === user?._id && <TouchableOpacity style={s.linkButton} onPress={() => openAdd(filter === 'All' ? 'Rice' : filter)}><Text style={s.link}>+ Record what I brought</Text></TouchableOpacity>}
        </View>;
        })}
      {tab === 'Balances' && groups.map(group => <View key={group.key} style={s.card}>
        <Text style={s.heading}>{group.item.name}</Text><Text style={s.muted}>{amount(group.total, group.unit)} brought together</Text><Text style={s.note}>Target: {amount(group.target, group.unit)} per roommate{group.pending ? ' · Provisional' : ''}</Text>
        {group.people.map(person => <View key={person.id} style={s.balanceRow}><View style={s.flex}><Text style={s.itemName}>{person.id === user?._id ? 'You' : person.name}</Text><Text style={s.muted}>Brought {amount(person.brought, group.unit)}</Text></View><View style={s.balanceRight}><Text style={{ color: person.remaining ? colors.warningText : colors.successText, fontWeight: '700' }}>{person.remaining ? `Owes ${amount(person.remaining, group.unit)}` : 'Settled'}</Text>{person.id === user?._id && person.remaining > 0 && <TouchableOpacity onPress={() => openAdd(group.item.name, group.unit)}><Text style={s.link}>Record delivery</Text></TouchableOpacity>}</View></View>)}
      </View>)}
      {tab === 'Balances' && groups.length === 0 && <View style={s.card}><Text style={s.heading}>No deliveries yet</Text><Text style={s.note}>Record what you brought to start comparing contributions.</Text><TouchableOpacity onPress={() => openAdd(filter === 'All' ? 'Rice' : filter)}><Text style={s.link}>+ Add first delivery</Text></TouchableOpacity></View>}
      {tab === 'Balances' && <Text style={s.note}>Grams and kg are combined. Oil packets and liters are tracked separately because packet sizes can differ.</Text>}
      {tab === 'Verification' && <>
        <Text style={s.heading}>Deliveries & verification</Text><Text style={s.note}>All roommates can review a delivery. One other roommate's decision completes verification.</Text>
        {[...roomItems].filter(item => item.quantity > 0).sort((a, b) => Number(b.status === 'PENDING') - Number(a.status === 'PENDING') || b.createdAt.localeCompare(a.createdAt)).map(item => {
                const own = !!user?._id && creatorId(item) === user._id;
                const by = typeof item.addedBy === 'string' ? members.find(member => member.id === item.addedBy)?.name : item.addedBy?.name;
                return <View key={item._id} style={s.card}><View style={s.row}><Text style={[s.heading, s.flex]}>{item.name}</Text><Text style={s.link}>{amount(item.quantity, item.unit)}</Text></View><Text style={s.note}>{own ? 'You' : by || 'Former roommate'} brought this · {new Date(item.createdAt).toLocaleDateString()}</Text>
            <Text style={{ color: item.status === 'REJECTED' ? colors.dangerText : item.status === 'PENDING' ? colors.warningText : colors.successText }}>{item.status === 'PENDING' ? 'Awaiting verification' : item.status === 'REJECTED' ? 'Rejected · not counted' : 'Verified'}</Text>
            <View style={s.actions}>{own ? <><TouchableOpacity onPress={() => openEdit(item)}><Text style={s.link}>Edit</Text></TouchableOpacity><TouchableOpacity onPress={() => remove(item)}><Text style={s.error}>Remove</Text></TouchableOpacity></> : item.status === 'PENDING' ? <><TouchableOpacity disabled={!!reviewing} onPress={() => review(item, false)}><Text style={s.error}>Reject</Text></TouchableOpacity><TouchableOpacity disabled={!!reviewing} onPress={() => review(item, true)} style={s.primary}><Text style={s.primaryText}>{reviewing === item._id ? 'Saving…' : 'Approve'}</Text></TouchableOpacity></> : null}</View>
          </View>;
            })}
        {roomItems.filter(item => item.quantity > 0).length === 0 && <Text style={s.empty}>New deliveries will appear here for review.</Text>}
      </>}
    </ScrollView>
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { if (!busy)
        setVisible(false); }}><KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.sheet}><View style={s.row}><Text style={[s.heading, s.flex]}>{editing ? 'Edit delivery' : 'What did you bring?'}</Text><TouchableOpacity accessibilityLabel="Close" disabled={busy} onPress={() => setVisible(false)}><Ionicons name="close" size={24} color={colors.text}/></TouchableOpacity></View>
        <ScrollView keyboardShouldPersistTaps="handled"><Text style={s.note}>Recorded under {user?.name || 'your name'} and sent to roommates for verification.</Text><Text style={s.label}>Stock item</Text>
          <View style={s.wrap}>{[...catalog.filter(value => value !== 'Other'), 'Other'].map(value => <TouchableOpacity key={value} style={[s.chip, name === value && s.selected]} onPress={() => { setName(value); setUnit(unitsFor(value === 'Other' ? custom : value)[0]); }}><Text style={name === value ? s.activeText : s.muted}>{value === 'Other' ? '+ Other item' : value}</Text></TouchableOpacity>)}</View>
          {name === 'Other' && <TextInput accessibilityLabel="Custom item name" style={s.input} placeholder="Item name, e.g. Sugar" placeholderTextColor={colors.textMuted} value={custom} maxLength={100} onChangeText={value => { setCustom(value); setUnit(unitsFor(value)[0]); }}/>}
          <Text style={s.label}>Quantity you brought</Text><TextInput accessibilityLabel="Quantity you brought" style={s.input} placeholder="e.g. 5" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" value={quantity} onChangeText={setQuantity}/>
          <View style={s.wrap}>{unitsFor(actualName).map(value => <TouchableOpacity key={value} style={[s.chip, unit === value && s.selected]} onPress={() => setUnit(value)}><Text style={unit === value ? s.activeText : s.muted}>{unitLabel(value)}</Text></TouchableOpacity>)}</View>
          {!!formError && <Text style={s.error}>{formError}</Text>}<TouchableOpacity disabled={busy} style={[s.primary, s.submit, busy && { opacity: 0.6 }]} onPress={save}>{busy ? <ActivityIndicator color={colors.textInverted}/> : <Text style={s.primaryText}>Send for verification</Text>}</TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView></Modal>
  </SafeAreaView>;
}
const styles = (c: ThemeColors) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background }, header: { padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    title: { fontSize: 26, fontWeight: '800', color: c.text }, heading: { fontSize: 17, fontWeight: '700', color: c.text }, muted: { fontSize: 13, color: c.textSecondary },
    note: { fontSize: 13, lineHeight: 20, color: c.textSecondary, marginVertical: 12 }, empty: { color: c.textSecondary, padding: 32, textAlign: 'center' },
    primary: { backgroundColor: c.primary, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }, primaryText: { color: c.textInverted, fontWeight: '700', fontSize: 14 },
    tabs: { flexDirection: 'row', marginHorizontal: 16, borderRadius: 12, backgroundColor: c.surfaceSubtle, padding: 4 }, tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 9 }, activeTab: { backgroundColor: c.surface }, tabText: { color: c.textSecondary, fontSize: 12, fontWeight: '600' }, activeText: { color: c.primary, fontWeight: '700' },
    filters: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 }, chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }, selected: { borderColor: c.primary, backgroundColor: c.infoLight },
    content: { paddingHorizontal: 16, paddingBottom: 100 }, card: { backgroundColor: c.surface, borderRadius: 18, borderWidth: 1, borderColor: c.borderLight, padding: 16, marginBottom: 14 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, flex: { flex: 1 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.infoLight, justifyContent: 'center', alignItems: 'center' }, avatarText: { fontSize: 20, color: c.primary, fontWeight: '700' },
    tableHeader: { flexDirection: 'row', marginTop: 20, paddingBottom: 8, gap: 6 }, caption: { color: c.textMuted, fontSize: 10, fontWeight: '700' }, column: { width: 86, textAlign: 'right', color: c.textMuted, fontSize: 10, fontWeight: '700' }, columnValue: { width: 86, textAlign: 'right', color: c.text, fontSize: 12, fontWeight: '600' }, tableRow: { flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, borderColor: c.borderLight, paddingVertical: 14 }, itemName: { fontSize: 14, color: c.text, fontWeight: '600' },
    link: { color: c.primary, fontSize: 13, fontWeight: '700' }, linkButton: { paddingTop: 16 }, balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderTopWidth: 1, borderColor: c.borderLight }, balanceRight: { alignItems: 'flex-end', gap: 8 }, actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 24, marginTop: 12 }, error: { color: c.dangerText, fontSize: 13 },
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }, sheet: { maxHeight: '90%', backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }, label: { color: c.text, fontSize: 14, fontWeight: '600', marginBottom: 10 }, input: { borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 14, color: c.text, fontSize: 16, marginBottom: 16 }, submit: { marginTop: 20 },
});
