import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../../theme';
import { ResponsiveGrid } from '../../../components/responsive';

interface HomeownerStatsProps {
  totalJobs: number;
  completedJobs: number;
  activeJobs: number;
}

export const HomeownerStats: React.FC<HomeownerStatsProps> = ({
  totalJobs,
  completedJobs,
  activeJobs,
}) => {
  return (
    <View style={styles.statsSection}>
      <Text style={styles.sectionTitle} accessibilityRole='header'>Your Activity</Text>
      <ResponsiveGrid
        columns={3}
        gap={16}
        responsive={{
          mobile: 3,
          tablet: 3,
          desktop: 3,
        }}
        style={styles.statsGrid}
      >
        <View style={styles.statItem} accessibilityLabel={`${totalJobs} jobs posted`}>
          <Text style={styles.statNumber}>{totalJobs}</Text>
          <Text style={styles.statLabel}>Jobs Posted</Text>
        </View>
        <View style={styles.statItem} accessibilityLabel={`${completedJobs} jobs completed`}>
          <Text style={styles.statNumber}>{completedJobs}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statItem} accessibilityLabel={`${activeJobs} active jobs`}>
          <Text style={styles.statNumber}>{activeJobs}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
      </ResponsiveGrid>
    </View>
  );
};

const styles = StyleSheet.create({
  statsSection: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 20,
    borderRadius: 20,
    ...theme.shadows.base,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
});
