import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PaymentMethod } from '../../../services/PaymentService';

interface PaymentMethodOptionProps {
  method: PaymentMethod;
  isSelected: boolean;
  onSelect: () => void;
}

const getMethodIcon = (type: string): string => {
  switch (type) {
    case 'card':
      return 'card-outline';
    case 'bank_account':
      return 'business-outline';
    case 'paypal':
      return 'logo-paypal';
    default:
      return 'card-outline';
  }
};

const getMethodDetails = (method: PaymentMethod): string => {
  if (method.type === 'card' && method.card) {
    return `${method.card.brand.toUpperCase()} \u2022\u2022\u2022\u2022 ${method.card.last4}`;
  }
  if (method.type === 'bank_account' && (method as PaymentMethod & { bankAccount?: { bankName: string; last4: string } }).bankAccount) {
    const bank = (method as PaymentMethod & { bankAccount: { bankName: string; last4: string } }).bankAccount;
    return `${bank.bankName} \u2022\u2022\u2022\u2022 ${bank.last4}`;
  }
  return 'Payment Method';
};

export const PaymentMethodOption: React.FC<PaymentMethodOptionProps> = ({
  method,
  isSelected,
  onSelect,
}) => {
  return (
    <TouchableOpacity
      style={[styles.paymentMethodOption, isSelected && styles.selectedMethod]}
      onPress={onSelect}
    >
      <View style={styles.methodContent}>
        <View style={styles.methodIcon}>
          <Ionicons
            name={getMethodIcon(method.type) as keyof typeof Ionicons.glyphMap}
            size={24}
            color="#717171"
          />
        </View>
        <View style={styles.methodDetails}>
          <Text style={styles.methodType}>{getMethodDetails(method)}</Text>
          {method.isDefault && (
            <Text style={styles.defaultLabel}>Default</Text>
          )}
        </View>
      </View>
      {isSelected && (
        <Ionicons name="checkmark-circle" size={24} color="#222222" />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  paymentMethodOption: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  selectedMethod: {
    backgroundColor: '#F7F7F7',
  },
  methodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  methodDetails: {
    flex: 1,
  },
  methodType: {
    fontSize: 15,
    fontWeight: '500',
    color: '#222222',
  },
  defaultLabel: {
    fontSize: 13,
    color: '#717171',
    marginTop: 2,
  },
});
