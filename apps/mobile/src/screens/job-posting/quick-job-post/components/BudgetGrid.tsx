import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from '../theme/styles';
import { BUDGET_RANGES } from '../theme/templates';

/**
 * Four-chip budget range picker.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44b).
 */
export function BudgetGrid({
  budget,
  onChange,
}: {
  budget: string;
  onChange: (next: string) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Budget Range</Text>
      <View style={styles.budgetGrid}>
        {BUDGET_RANGES.map((range) => (
          <TouchableOpacity
            key={range.value}
            style={[
              styles.budgetChip,
              budget === range.value && styles.budgetChipActive,
            ]}
            onPress={() => onChange(range.value)}
          >
            <Text
              style={[
                styles.budgetText,
                budget === range.value && styles.budgetTextActive,
              ]}
            >
              {range.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
