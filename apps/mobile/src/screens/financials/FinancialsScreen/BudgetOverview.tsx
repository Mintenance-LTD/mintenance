import React from 'react';
import { View, Text } from 'react-native';
import { styles } from './styles';

/** Payment totals do not establish a spending budget or available balance. */
export const BudgetOverview: React.FC = () => (
  <View style={styles.sectionCard}>
    <Text style={styles.sectionTitle}>Budget information</Text>
    <Text style={styles.budgetHint}>
      No spending budget is available here. Released payments, escrow and
      refunds are payment records; they do not show a budget or money available
      to spend. The monthly figure groups released records by their creation
      date, not the date money reached a bank.
    </Text>
  </View>
);
