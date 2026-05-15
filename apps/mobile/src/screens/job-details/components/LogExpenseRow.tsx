import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';
import { styles } from '../jobDetailsStyles';

/**
 * Contractor-facing CTA row that deep-links to the Expenses screen
 * pre-bound to the current job. Closes the audit gap where
 * `contractor_expenses.job_id` existed in the schema but no UI ever
 * set it.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44c).
 */
export function LogExpenseRow({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.logExpenseRow}
      accessibilityRole='button'
      accessibilityLabel='Log expense for this job'
    >
      <Ionicons name='receipt-outline' size={18} color={me.brand} />
      <Text style={styles.logExpenseText}>Log Expense for this Job</Text>
      <Ionicons name='chevron-forward' size={18} color={me.ink3} />
    </TouchableOpacity>
  );
}
