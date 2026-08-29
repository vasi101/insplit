import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Spacing, ThemeColors } from '../../../constants/theme';
import { useThemeColors } from '../../store/theme.store';

export function NetworkErrorCard({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const isNetwork = /network|connect|timeout|offline|econn|server/i.test(message || '');
  return (
    <View style={styles.card}>
      <View style={styles.icon}><Ionicons name={isNetwork ? 'cloud-offline-outline' : 'alert-circle-outline'} size={22} color={Colors.danger} /></View>
      <View style={styles.copy}>
        <Text style={styles.title}>{isNetwork ? 'Connection lost' : 'Something went wrong'}</Text>
        <Text style={styles.message} numberOfLines={2}>{isNetwork ? 'Check your connection and try again.' : (message || 'Please try again.')}</Text>
      </View>
      {onRetry ? <TouchableOpacity style={styles.retry} onPress={onRetry} accessibilityLabel="Retry"><Ionicons name="refresh" size={19} color={Colors.primary} /></TouchableOpacity> : null}
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.dangerLight, marginBottom: Spacing.md },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.dangerLight },
  copy: { flex: 1, marginHorizontal: Spacing.md },
  title: { color: Colors.text, fontSize: 13, fontWeight: '800' },
  message: { color: Colors.textSecondary, fontSize: 11, lineHeight: 16, marginTop: 2 },
  retry: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceSubtle },
});
