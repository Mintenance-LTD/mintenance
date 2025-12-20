/**
 * PaymentMethodOption Component
 * 
 * Single payment method option with icon and selection state.
 * 
 * @filesize Target: <70 lines
 * @compliance Single Responsibility
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import type { PaymentMethod } from '../viewmodels/PaymentMethodsViewModel';

interface PaymentMethodOptionProps {
  method: PaymentMethod;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export const PaymentMethodOption: React.FC<PaymentMethodOptionProps> = ({
  method,
  isSelected,
  onSelect,
}) => {
  return (
    <TouchableOpacity
      style={[styles.container, isSelected && styles.selected]}
      onPress={() => onSelect(method.id)}
    >
      <View style={styles.left}>
        <View style={styles.iconContainer}>
          <Ionicons name={method.icon} size={24} color={theme.colors.textSecondary} />
        </View>
        <Text style={styles.text}>{method.name}</Text>
      </View>
      <View style={[styles.radio, isSelected && styles.radioSelected]} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selected: {
    borderColor: theme.colors.primary,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.base,
    backgroundColor: theme.colors.surfaceTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  text: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  radioSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
});
