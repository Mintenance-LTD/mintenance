import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '../../../../components/ui/Badge';
import { theme } from '../../../../theme';
import { styles } from '../theme/styles';
import { CATEGORY_COLORS, type Expense } from '../types';

/**
 * Single expense list item.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44a).
 */
export function ExpenseRow({
  expense,
  onDelete,
}: {
  expense: Expense;
  onDelete: (expense: Expense) => void;
}) {
  return (
    <View style={styles.expenseRow}>
      <View
        style={[
          styles.categoryDot,
          {
            backgroundColor:
              CATEGORY_COLORS[expense.category] || theme.colors.textSecondary,
          },
        ]}
      />
      <View style={styles.expenseInfo}>
        <Text style={styles.expenseDesc} numberOfLines={1}>
          {expense.description}
        </Text>
        <Text style={styles.expenseDate}>
          {new Date(expense.date).toLocaleDateString('en-GB')}
        </Text>
      </View>
      <View style={styles.expenseRight}>
        <Text style={styles.expenseAmount}>£{expense.amount.toFixed(2)}</Text>
        {expense.billable && (
          <Badge variant='success' size='sm'>
            Billable
          </Badge>
        )}
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => onDelete(expense)}
        accessibilityRole='button'
        accessibilityLabel={`Delete expense ${expense.description}`}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name='trash-outline'
          size={16}
          color={theme.colors.textTertiary}
        />
      </TouchableOpacity>
    </View>
  );
}
