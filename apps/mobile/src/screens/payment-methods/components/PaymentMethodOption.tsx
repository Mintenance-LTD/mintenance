/**
 * PaymentMethodOption Component
 *
 * Single payment method option with icon and selection state.
 *
 * @filesize Target: <70 lines
 * @compliance Single Responsibility
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PaymentMethod } from '../viewmodels/PaymentMethodsViewModel';
import { theme } from '../../../theme';

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
      accessibilityRole='radio'
      accessibilityLabel={method.name}
      accessibilityState={{ selected: isSelected }}
      accessibilityHint={`Double tap to select ${method.name} as payment method`}
    >
      <View style={styles.left}>
        <View style={styles.iconContainer}>
          <Ionicons name={method.icon as keyof typeof Ionicons.glyphMap} size={24} color={theme.colors.textSecondary} />
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  selected: {
    backgroundColor: theme.colors.backgroundSecondary,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  text: {
    fontSize: 16,
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
    borderColor: theme.colors.textPrimary,
    backgroundColor: theme.colors.textPrimary,
  },
});
