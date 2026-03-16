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
      <View
        style={styles.card}
        accessibilityLabel={`Visa card preview. Card holder: ${holderName || 'Esther Howard'}. Number ending in ${(number || '8047').slice(-4)}. Expires ${expiry || '02/30'}`}
        accessibilityRole='summary'
      >
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
            <Ionicons name="card" size={32} color={theme.colors.textInverse} />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  card: {
    backgroundColor: theme.colors.textPrimary,
    borderRadius: 20,
    padding: 24,
    height: 200,
  },
  visa: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textInverse,
    alignSelf: 'flex-end',
  },
  number: {
    fontSize: 22,
    fontWeight: '600',
    color: theme.colors.textInverse,
    letterSpacing: 2,
    marginTop: 40,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 20,
  },
  label: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
  chipIcon: {
    opacity: 0.5,
  },
});
