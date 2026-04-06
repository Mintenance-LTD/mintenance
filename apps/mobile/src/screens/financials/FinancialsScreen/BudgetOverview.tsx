import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import { fmt } from './constants';
import { styles } from './styles';

interface BudgetOverviewProps {
  budgeted: number;
  spent: number;
  left: number;
  spentPct: number;
}

export const BudgetOverview: React.FC<BudgetOverviewProps> = ({ budgeted, spent, left, spentPct }) => {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Budget Overview</Text>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
      </View>

      <View style={styles.budgetRow}>
        <View style={styles.budgetItem}>
          <Text style={styles.budgetLabel}>Budgeted</Text>
          <Text style={styles.budgetValue}>{fmt(budgeted)}</Text>
        </View>
        <View style={styles.budgetItem}>
          <Text style={styles.budgetLabel}>Spent</Text>
          <Text style={[styles.budgetValue, { color: theme.colors.error }]}>{fmt(spent)}</Text>
        </View>
        <View style={styles.budgetItem}>
          <Text style={styles.budgetLabel}>Left</Text>
          <Text style={[styles.budgetValue, { color: theme.colors.primary }]}>{fmt(left)}</Text>
        </View>
      </View>

      <View style={styles.budgetBarBg}>
        <View style={[styles.budgetBarFill, { width: `${spentPct}%` }]} />
      </View>
      <Text style={styles.budgetHint}>
        {spentPct < 80 ? 'You are on track!' : spentPct < 100 ? 'Getting close to budget' : 'Over budget'}
      </Text>
    </View>
  );
};
