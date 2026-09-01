import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BorderRadius, Spacing, ThemeColors } from '../../../constants/theme';
import { useThemeColors } from '../../store/theme.store';

export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const opacity = useRef(new Animated.Value(0.45)).current;
  const Colors = useThemeColors();

  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.9, duration: 650, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.45, duration: 650, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[{ backgroundColor: Colors.border, opacity }, style]} />;
}

export function CardListSkeleton({ count = 4 }: { count?: number }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.list} accessibilityRole="progressbar" accessibilityLabel="Loading content">
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.row}>
            <Skeleton style={styles.avatar} />
            <View style={styles.copy}>
              <Skeleton style={[styles.line, { width: index % 2 ? '58%' : '72%' }]} />
              <Skeleton style={[styles.lineSmall, { width: '42%' }]} />
            </View>
          </View>
          <Skeleton style={[styles.line, styles.bodyLine]} />
          <Skeleton style={[styles.lineSmall, { width: '64%' }]} />
        </View>
      ))}
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  list: { paddingHorizontal: Spacing.base, paddingTop: Spacing.sm },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: BorderRadius.full },
  copy: { flex: 1, marginLeft: Spacing.md, gap: Spacing.sm },
  line: { height: 13, borderRadius: BorderRadius.full },
  lineSmall: { height: 9, borderRadius: BorderRadius.full },
  bodyLine: { width: '88%', marginTop: Spacing.lg, marginBottom: Spacing.sm },
});
