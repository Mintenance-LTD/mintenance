import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';

interface Props {
  contractorName?: string;
  homeownerName?: string;
}

export function ContractPartiesSection({
  contractorName,
  homeownerName,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Ionicons name='people-outline' size={16} color={me.brand} />
        <Text style={styles.sectionLabel}>PARTIES</Text>
      </View>
      <View style={styles.partiesRow}>
        <View style={styles.partyCard}>
          <Text style={styles.partyRole}>CONTRACTOR</Text>
          <Text style={styles.partyName}>
            {contractorName || 'Not assigned'}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.partyCard}>
          <Text style={styles.partyRole}>HOMEOWNER</Text>
          <Text style={styles.partyName}>
            {homeownerName || 'Not assigned'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: me.brand,
  },
  partiesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partyCard: {
    flex: 1,
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: me.line,
    marginHorizontal: 12,
  },
  partyRole: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: me.brand,
    marginBottom: 4,
  },
  partyName: {
    fontSize: 15,
    fontWeight: '600',
    color: me.ink,
  },
});
