/**
 * SpendingAnalytics - Monthly spending breakdown for a property
 */
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { theme } from '../../../theme';

interface Job {
  id: string;
  status: string;
  budget: number;
  created_at: string;
}

interface Props {
  jobs: Job[];
}

interface MonthData {
  label: string;
  amount: number;
}

export const SpendingAnalytics: React.FC<Props> = ({ jobs }) => {
  const completed = jobs.filter(
    (j) => j.status === 'completed' && j.budget > 0
  );
  const totalSpent = completed.reduce((s, j) => s + j.budget, 0);

  if (completed.length === 0) return null;

  // Group by month (last 6 months)
  const now = new Date();
  const months: MonthData[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString('en-GB', { month: 'short' });
    const monthJobs = completed.filter((j) => {
      const jd = new Date(j.created_at);
      return (
        jd.getMonth() === d.getMonth() && jd.getFullYear() === d.getFullYear()
      );
    });
    months.push({ label, amount: monthJobs.reduce((s, j) => s + j.budget, 0) });
  }

  const maxAmount = Math.max(...months.map((m) => m.amount), 1);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>SPENDING</Text>
        <View style={styles.totalBadge}>
          <Text style={styles.totalText}>
            {'\u00A3'}
            {totalSpent.toLocaleString('en-GB')}
          </Text>
        </View>
      </View>

      <View style={styles.chartRow}>
        {months.map((m, i) => (
          <View key={i} style={styles.barCol}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    height:
                      m.amount > 0
                        ? Math.max((m.amount / maxAmount) * 80, 6)
                        : 0,
                    backgroundColor:
                      m.amount > 0 ? theme.colors.primary : 'transparent',
                  },
                ]}
              />
            </View>
            <Text style={styles.barLabel}>{m.label}</Text>
            {m.amount > 0 && (
              <Text style={styles.barAmount}>
                {'\u00A3'}
                {m.amount >= 1000
                  ? `${(m.amount / 1000).toFixed(1)}k`
                  : m.amount}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  totalBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  totalText: { fontSize: 13, fontWeight: '700', color: theme.colors.primary },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  barCol: { flex: 1, alignItems: 'center' },
  barTrack: {
    width: 20,
    height: 80,
    borderRadius: 10,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: { width: 20, borderRadius: 10 },
  barLabel: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 6 },
  barAmount: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 2 },
});
