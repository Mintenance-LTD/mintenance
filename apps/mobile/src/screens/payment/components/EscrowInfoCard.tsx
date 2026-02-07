import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

export const EscrowInfoCard: React.FC = () => {
  return (
    <View style={styles.escrowCard}>
      <View style={styles.escrowHeader}>
        <Ionicons name="shield-checkmark-outline" size={24} color={theme.colors.secondary} />
        <Text style={styles.escrowTitle}>Escrow Protection</Text>
      </View>
      <Text style={styles.escrowDescription}>
        Your payment is protected by escrow. Funds will be released to the contractor only after:
      </Text>
      <View style={styles.escrowConditions}>
        <Text style={styles.conditionItem}>Job is marked as completed</Text>
        <Text style={styles.conditionItem}>You approve the work</Text>
        <Text style={styles.conditionItem}>No disputes are raised within 48 hours</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  escrowCard: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.secondary,
  },
  escrowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  escrowTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing.sm,
  },
  escrowDescription: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  escrowConditions: {
    paddingLeft: theme.spacing.md,
  },
  conditionItem: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
});
