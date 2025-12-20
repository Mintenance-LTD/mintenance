/**
 * CreditCardPreview Component
 * 
 * Visual credit card preview showing card details.
 * 
 * @filesize Target: <80 lines
 * @compliance Single Responsibility - Card display
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

interface CreditCardPreviewProps {
  holderName: string;
  number: string;
  expiry: string;
}

export const CreditCardPreview: React.FC<CreditCardPreviewProps> = ({
  holderName,
  number,
  expiry,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.visa}>VISA</Text>
        <Text style={styles.number}>{number || '4716 9627 1635 8047'}</Text>
        <View style={styles.footer}>
          <View>
            <Text style={styles.label}>Card holder name</Text>
            <Text style={styles.value}>{holderName || 'Esther Howard'}</Text>
          </View>
          <View>
            <Text style={styles.label}>Expiry date</Text>
            <Text style={styles.value}>{expiry || '02/30'}</Text>
          </View>
          <View style={styles.chipIcon}>
            <Ionicons name="card" size={32} color={theme.colors.white} />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing['2xl'],
  },
  card: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    height: 200,
  },
  visa: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.white,
    alignSelf: 'flex-end',
  },
  number: {
    fontSize: 22,
    fontWeight: '600',
    color: theme.colors.white,
    letterSpacing: 2,
    marginTop: 40,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: theme.spacing.lg,
  },
  label: {
    fontSize: 10,
    color: '#D0D0D0',
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.white,
  },
  chipIcon: {
    opacity: 0.5,
  },
});
