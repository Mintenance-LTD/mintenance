import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const EscrowInfoCard: React.FC = () => {
  return (
    <View style={styles.escrowCard}>
      <View style={styles.escrowHeader}>
        <View style={styles.shieldIcon}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#10B981" />
        </View>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
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
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  escrowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
  },
  escrowDescription: {
    fontSize: 14,
    color: '#717171',
    marginBottom: 12,
    lineHeight: 20,
  },
  escrowConditions: {
    paddingLeft: 14,
  },
  conditionItem: {
    fontSize: 13,
    color: '#717171',
    marginBottom: 4,
  },
});
