import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { BorderRadius, Shadows, Spacing, ThemeColors } from '../../../constants/theme';
import { useThemeColors } from '../../store/theme.store';

export interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'elevated' | 'outlined' | 'flat';
}

export function Card({
  children,
  style,
  onPress,
  variant = 'elevated',
}: CardProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const cardStyles = [
    styles.base,
    variant === 'elevated' && styles.elevated,
    variant === 'outlined' && styles.outlined,
    variant === 'flat' && styles.flat,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={cardStyles}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyles}>{children}</View>;
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  base: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginVertical: Spacing.xs + 2,
  },
  elevated: {
    ...Shadows.card,
  },
  outlined: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  flat: {
    backgroundColor: Colors.surfaceSubtle,
  },
});
