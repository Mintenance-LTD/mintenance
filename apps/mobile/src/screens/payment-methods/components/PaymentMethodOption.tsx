/**
 * PaymentMethodOption Component — Direction A · Mint Editorial.
 *
 * Single payment method option with icon and selection state.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PaymentMethod } from '../viewmodels/PaymentMethodsViewModel';
import { me } from '../../../design-system/mint-editorial';

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
          <Ionicons
            name={method.icon as keyof typeof Ionicons.glyphMap}
            size={24}
            color={me.ink2}
          />
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
    backgroundColor: me.surface,
    borderRadius: me.radius.card,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: me.line,
    ...me.shadow.card,
  },
  selected: {
    backgroundColor: me.brandSoft,
    borderColor: me.brand,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: me.bg2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  text: {
    fontSize: 16,
    color: me.ink,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: me.line,
  },
  radioSelected: {
    borderColor: me.brand,
    backgroundColor: me.brand,
  },
});
