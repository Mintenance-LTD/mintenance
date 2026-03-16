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
import type { CardDetails } from '../viewmodels/PaymentMethodsViewModel';
import { theme } from '../../../theme';

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
          accessibilityLabel='Card holder name'
          accessibilityHint='Enter the name as it appears on your card'
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
          accessibilityLabel='Card number'
          accessibilityHint='Enter your 16-digit card number'
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
            accessibilityLabel='Expiry date'
            accessibilityHint='Enter expiry date in month and year format'
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
            accessibilityLabel='CVV security code'
            accessibilityHint='Enter the 3-digit security code from the back of your card'
          />
        </View>
      </View>

      <TouchableOpacity
        style={styles.saveCardContainer}
        onPress={onToggleSaveCard}
        accessibilityRole='checkbox'
        accessibilityLabel='Save card for future payments'
        accessibilityState={{ checked: saveCard }}
      >
        <View style={[styles.checkbox, saveCard && styles.checkboxSelected]}>
          {saveCard && <Ionicons name="checkmark" size={16} color={theme.colors.textInverse} />}
        </View>
        <Text style={styles.saveCardText}>Save Card</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
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
    marginBottom: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxSelected: {
    borderColor: theme.colors.textPrimary,
    backgroundColor: theme.colors.textPrimary,
  },
  saveCardText: {
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
});
