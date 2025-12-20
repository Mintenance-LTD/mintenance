/**
 * CreditCardForm Component
 * 
 * Form inputs for credit card details.
 * 
 * @filesize Target: <140 lines
 * @compliance Single Responsibility - Card form
 */

import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import type { CardDetails } from '../viewmodels/PaymentMethodsViewModel';

interface CreditCardFormProps {
  cardDetails: CardDetails;
  saveCard: boolean;
  onUpdateDetails: (details: Partial<CardDetails>) => void;
  onToggleSaveCard: () => void;
  formatCardNumber: (text: string) => string;
  formatExpiry: (text: string) => string;
}

export const CreditCardForm: React.FC<CreditCardFormProps> = ({
  cardDetails,
  saveCard,
  onUpdateDetails,
  onToggleSaveCard,
  formatCardNumber,
  formatExpiry,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Card Holder Name</Text>
        <TextInput
          style={styles.input}
          value={cardDetails.holderName}
          onChangeText={(text) => onUpdateDetails({ holderName: text })}
          placeholder="Esther Howard"
          placeholderTextColor={theme.colors.textTertiary}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Card Number</Text>
        <TextInput
          style={styles.input}
          value={cardDetails.number}
          onChangeText={(text) => onUpdateDetails({ number: formatCardNumber(text) })}
          placeholder="4716 9627 1635 8047"
          placeholderTextColor={theme.colors.textTertiary}
          keyboardType="numeric"
          maxLength={19}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>Expiry Date</Text>
          <TextInput
            style={styles.input}
            value={cardDetails.expiry}
            onChangeText={(text) => onUpdateDetails({ expiry: formatExpiry(text) })}
            placeholder="02/30"
            placeholderTextColor={theme.colors.textTertiary}
            keyboardType="numeric"
            maxLength={5}
          />
        </View>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>CVV</Text>
          <TextInput
            style={styles.input}
            value={cardDetails.cvv}
            onChangeText={(text) => onUpdateDetails({ cvv: text.replace(/\D/g, '') })}
            placeholder="000"
            placeholderTextColor={theme.colors.textTertiary}
            keyboardType="numeric"
            maxLength={3}
            secureTextEntry
          />
        </View>
      </View>

      <TouchableOpacity style={styles.saveCardContainer} onPress={onToggleSaveCard}>
        <View style={[styles.checkbox, saveCard && styles.checkboxSelected]}>
          {saveCard && <Ionicons name="checkmark" size={16} color={theme.colors.white} />}
        </View>
        <Text style={styles.saveCardText}>Save Card</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.base,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  saveCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  checkboxSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  saveCardText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
});
