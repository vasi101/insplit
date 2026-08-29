import React, { useMemo } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { BorderRadius, Shadows, Spacing, ThemeColors } from '../../../constants/theme';
import { useThemeColors, useThemeStore } from '../../store/theme.store';

type NoticeKind = 'success' | 'error' | 'warning' | 'info';

interface NoticeModalProps {
  visible: boolean;
  title: string;
  message?: string;
  kind?: NoticeKind;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

const icons: Record<NoticeKind, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle', error: 'alert-circle', warning: 'warning', info: 'information-circle',
};

export function NoticeModal({ visible, title, message, kind = 'info', confirmLabel = 'Done', cancelLabel = 'Cancel', onConfirm, onCancel }: NoticeModalProps) {
  const Colors = useThemeColors();
  const mode = useThemeStore((state) => state.mode);
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const accent = kind === 'success' ? Colors.success : kind === 'error' ? Colors.danger : kind === 'warning' ? Colors.warning : Colors.info;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel || onConfirm}>
      <BlurView intensity={18} tint={mode === 'dark' ? 'dark' : 'light'} style={styles.backdrop}>
        <View style={styles.card}>
          <View style={[styles.icon, { backgroundColor: `${accent}1F` }]}><Ionicons name={icons[kind]} size={28} color={accent} /></View>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            {onCancel ? <TouchableOpacity style={styles.secondaryButton} onPress={onCancel}><Text style={styles.secondaryText}>{cancelLabel}</Text></TouchableOpacity> : null}
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: accent }]} onPress={onConfirm}><Text style={styles.primaryText}>{confirmLabel}</Text></TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(8,12,24,0.48)', alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  card: { width: '100%', maxWidth: 360, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: Colors.borderLight, ...Shadows.hover },
  icon: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.base },
  title: { color: Colors.text, fontSize: 19, fontWeight: '900', textAlign: 'center' },
  message: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: Spacing.sm },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xl, width: '100%' },
  primaryButton: { flex: 1, minHeight: 46, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  secondaryButton: { flex: 1, minHeight: 46, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceSubtle },
  secondaryText: { color: Colors.text, fontSize: 14, fontWeight: '700' },
});
