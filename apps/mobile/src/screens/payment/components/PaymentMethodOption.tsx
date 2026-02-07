import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PaymentMethod } from '../../../services/PaymentService';
import { theme } from '../../../theme';

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
  if (method.type === 'bank_account' && method.bankAccount) {
    return `${method.bankAccount.bankName} \u2022\u2022\u2022\u2022 ${method.bankAccount.last4}`;
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
            color={theme.colors.primary}
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
        <Ionicons name="checkmark-circle" size={24} color={theme.colors.secondary} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  paymentMethodOption: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  selectedMethod: {
    borderColor: theme.colors.secondary,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  methodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodIcon: {
    marginRight: theme.spacing.md,
  },
  methodDetails: {
    flex: 1,
  },
  methodType: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  defaultLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.secondary,
    marginTop: theme.spacing.xs,
  },
});
