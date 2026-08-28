import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors, BorderRadius, Spacing } from '../../../constants/theme';
import { TransactionStatus } from '../../types';

export interface BadgeProps {
  label?: string;
  status?: TransactionStatus | 'OWNER' | 'MEMBER' | 'ACTIVE' | 'PENDING' | 'REMOVED';
  size?: 'sm' | 'md';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Badge({
  label,
  status,
  size = 'md',
  style,
  textStyle,
}: BadgeProps) {
  let bgColor = Colors.surfaceSubtle;
  let textColor = Colors.textSecondary;
  let displayLabel = label;

  if (status === 'VERIFIED' || status === 'ACTIVE') {
    bgColor = Colors.successLight;
    textColor = Colors.successText;
    displayLabel = displayLabel || 'Verified';
  } else if (status === 'PENDING') {
    bgColor = Colors.warningLight;
    textColor = Colors.warningText;
    displayLabel = displayLabel || 'Pending';
  } else if (status === 'REJECTED' || status === 'REMOVED') {
    bgColor = Colors.dangerLight;
    textColor = Colors.dangerText;
    displayLabel = displayLabel || 'Rejected';
  } else if (status === 'OWNER') {
    bgColor = Colors.infoLight;
    textColor = Colors.infoText;
    displayLabel = displayLabel || 'Owner';
  } else if (status === 'MEMBER') {
    bgColor = Colors.surfaceSubtle;
    textColor = Colors.textSecondary;
    displayLabel = displayLabel || 'Member';
  }

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bgColor },
        size === 'sm' ? styles.badge_sm : styles.badge_md,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: textColor },
          size === 'sm' ? styles.text_sm : styles.text_md,
          textStyle,
        ]}
      >
        {displayLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge_sm: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  badge_md: {
    paddingHorizontal: Spacing.md - 2,
    paddingVertical: Spacing.xs,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  text_sm: {
    fontSize: 11,
  },
  text_md: {
    fontSize: 12,
  },
});
