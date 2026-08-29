import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BorderRadius, Shadows, Spacing, ThemeColors } from '../../../constants/theme';
import { useThemeColors } from '../../../src/store/theme.store';
import { useRoomStore } from '../../../src/store/room.store';
import * as settlementApi from '../../../src/services/api/settlements.api';
import { Settlement } from '../../../src/types';
import { formatCurrency, formatDateTime } from '../../../src/utils/format';

export default function SettlementDetailsScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentRoom = useRoomStore((state) => state.currentRoom);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!currentRoom?._id || !id) {
        setError('Payment details are unavailable.');
        setLoading(false);
        return;
      }
      try {
        const history = await settlementApi.getSettlementHistory(currentRoom._id);
        const match = history.find((item) => item._id === id) || null;
        if (active) {
          setSettlement(match);
          setError(match ? '' : 'This payment could not be found.');
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Could not load payment details.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [currentRoom?._id, id]);

  if (loading) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color={Colors.primary} /></SafeAreaView>;
  }
  if (!settlement) {
    return <SafeAreaView style={styles.center}><Text style={styles.errorText}>{error}</Text></SafeAreaView>;
  }

  const status = settlement.status || 'VERIFIED';
  const statusStyle = status === 'REJECTED' ? styles.rejected : status === 'PENDING' ? styles.pending : styles.verified;

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.amountCard}>
          <View style={styles.iconCircle}><Ionicons name="swap-horizontal" size={25} color={Colors.primary} /></View>
          <Text style={styles.amount}>{formatCurrency(settlement.amount, settlement.currency)}</Text>
          <Text style={[styles.status, statusStyle]}>{status === 'PENDING' ? 'Awaiting approval' : status.toLowerCase()}</Text>
        </View>

        <View style={styles.card}>
          <DetailRow label="Paid by" value={settlement.fromUser?.name || 'Unknown member'} styles={styles} />
          <DetailRow label="Paid to" value={settlement.toUser?.name || 'Unknown member'} styles={styles} />
          <DetailRow label="Payment method" value={settlement.method.replaceAll('_', ' ')} styles={styles} />
          <DetailRow label="Payment date" value={formatDateTime(settlement.settlementDate)} styles={styles} />
          <DetailRow label="Recorded on" value={formatDateTime(settlement.createdAt)} styles={styles} last={!settlement.note} />
          {settlement.note ? <DetailRow label="Note" value={settlement.note} styles={styles} last /> : null}
        </View>

        {settlement.proofImage ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Payment proof</Text>
            <Image source={{ uri: settlement.proofImage }} style={styles.proofImage} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value, styles, last = false }: { label: string; value: string; styles: ReturnType<typeof createStyles>; last?: boolean }) {
  return (
    <View style={[styles.row, last && styles.lastRow]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, padding: Spacing.xl },
  content: { padding: Spacing.base, paddingBottom: Spacing.xxl },
  errorText: { color: Colors.dangerText, textAlign: 'center' },
  amountCard: { alignItems: 'center', paddingVertical: Spacing.xl },
  iconCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceSubtle, marginBottom: Spacing.md },
  amount: { color: Colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.7 },
  status: { marginTop: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: 5, borderRadius: BorderRadius.full, overflow: 'hidden', fontSize: 12, fontWeight: '800', textTransform: 'capitalize' },
  pending: { color: Colors.warningText, backgroundColor: Colors.warningLight },
  verified: { color: Colors.successText, backgroundColor: Colors.successLight },
  rejected: { color: Colors.dangerText, backgroundColor: Colors.dangerLight },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.borderLight, paddingHorizontal: Spacing.base, marginBottom: Spacing.base, ...Shadows.card },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.lg, paddingVertical: Spacing.base, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  lastRow: { borderBottomWidth: 0 },
  label: { color: Colors.textSecondary, fontSize: 13 },
  value: { flex: 1, color: Colors.text, fontSize: 13, fontWeight: '700', textAlign: 'right', textTransform: 'capitalize' },
  sectionTitle: { color: Colors.text, fontSize: 15, fontWeight: '800', marginVertical: Spacing.base },
  proofImage: { width: '100%', height: 240, borderRadius: BorderRadius.md, resizeMode: 'cover', marginBottom: Spacing.base, backgroundColor: Colors.surfaceSubtle },
});
