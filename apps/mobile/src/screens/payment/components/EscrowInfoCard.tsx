import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

export const EscrowInfoCard: React.FC = () => {
  return (
    <View style={styles.escrowCard}>
      <View style={styles.escrowHeader}>
        <View style={styles.shieldIcon}>
          <Ionicons
            name='shield-checkmark-outline'
            size={20}
            color={theme.colors.primary}
          />
        </View>
        <Text style={styles.escrowTitle}>Protected Payment</Text>
      </View>
      <Text style={styles.escrowDescription}>
        Your payment is held securely. Funds will be released to the contractor
        only after:
      </Text>
      <View style={styles.escrowConditions}>
        <Text style={styles.conditionItem}>Job is marked as completed</Text>
        <Text style={styles.conditionItem}>You approve the work</Text>
        <Text style={styles.conditionItem}>
          No disputes are raised within 48 hours
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  escrowCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  escrowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  shieldIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  escrowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  escrowDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  escrowConditions: {
    paddingLeft: 14,
  },
  conditionItem: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
});
