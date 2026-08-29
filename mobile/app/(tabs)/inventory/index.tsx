import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Spacing, BorderRadius, Shadows, ThemeColors } from '../../../constants/theme';
import { useThemeColors } from '../../../src/store/theme.store';

export default function InventoryScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Shared Flat Inventory</Text>
          <Text style={styles.subtitle}>
            Track groceries, household supplies, and physical stock in your flat.
          </Text>
        </View>

        {/* Info Card */}
        <View style={styles.previewCard}>
          <Text style={styles.previewEmoji}>📦</Text>
          <Text style={styles.previewTitle}>Inventory Module (Phase 3)</Text>
          <Text style={styles.previewText}>
            This module will allow you and your roommates to track physical household items like Rice, Cooking Oil, Gas Cylinders, Detergent, and Soap.
          </Text>
        </View>

        {/* Feature Highlights */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresHeading}>Upcoming Capabilities</Text>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🗂️</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Custom Groups</Text>
              <Text style={styles.featureSubtitle}>
                Organize items by Kitchen, Cleaning, Bathroom, and Pantry.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>⚖️</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Quantity & Unit Tracking</Text>
              <Text style={styles.featureSubtitle}>
                Keep track of kilograms, liters, pieces, and packets in stock.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🔗</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Link to Mutual Expenses</Text>
              <Text style={styles.featureSubtitle}>
                Automatically update stock when an expense receipt is verified.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxl * 2,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  previewCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    ...Shadows.card,
  },
  previewEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  previewText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  featuresSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Shadows.card,
  },
  featuresHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  featureSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
