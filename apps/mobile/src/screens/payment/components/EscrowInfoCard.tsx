import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';

/**
 * Escrow / protected-payment explainer card — Direction A · Mint
 * Editorial. Token-styled.
 */
export const EscrowInfoCard: React.FC = () => {
  return (
    <View style={styles.escrowCard}>
      <View style={styles.escrowHeader}>
        <View style={styles.shieldIcon}>
          <Ionicons
            name='shield-checkmark-outline'
            size={20}
            color={me.brand}
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
    backgroundColor: me.surface,
    borderRadius: me.radius.card,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: me.line,
    borderLeftWidth: 4,
    borderLeftColor: me.brand,
    ...me.shadow.card,
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
    backgroundColor: me.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  escrowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: me.ink,
  },
  escrowDescription: {
    fontSize: 14,
    color: me.ink2,
    marginBottom: 12,
    lineHeight: 20,
  },
  escrowConditions: {
    paddingLeft: 14,
  },
  conditionItem: {
    fontSize: 13,
    color: me.ink2,
    marginBottom: 4,
  },
});
