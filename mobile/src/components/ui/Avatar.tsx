import React from 'react';
import { View, Text, Image, StyleSheet, StyleProp, ImageStyle, ViewStyle } from 'react-native';
import { Colors } from '../../../constants/theme';
import { getInitials } from '../../utils/format';

export interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
  style?: StyleProp<ImageStyle & ViewStyle>;
}

export function Avatar({
  uri,
  name,
  size = 40,
  style,
}: AvatarProps) {
  const borderRadius = size / 2;
  const safeName = name || 'User';

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[
          styles.image,
          { width: size, height: size, borderRadius },
          style,
        ]}
      />
    );
  }

  const initials = getInitials(safeName);

  // Generate deterministic background color based on name
  const bgColors = [
    '#4361EE',
    '#3A0CA3',
    '#7209B7',
    '#F72585',
    '#4CC9F0',
    '#10B981',
    '#F59E0B',
    '#6366F1',
  ];
  let hash = 0;
  for (let i = 0; i < safeName.length; i++) {
    hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % bgColors.length;
  const backgroundColor = bgColors[colorIndex];

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.initials,
          { fontSize: Math.max(12, Math.floor(size * 0.4)) },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: Colors.surfaceSubtle,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: Colors.textInverted,
    fontWeight: '700',
  },
});
