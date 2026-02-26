/**
 * StatsSection Component
 * 
 * Displays contractor statistics including earnings, jobs completed, and rating.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { ContractorStats } from '../../services/UserService';

interface StatsSectionProps {
  stats: ContractorStats | null;
}

export const StatsSection: React.FC<StatsSectionProps> = ({ stats }) => {
  return (
    <View style={styles.statsSection}>
      <Text style={styles.sectionTitle} accessibilityRole='header'>Your Stats</Text>
      <Text style={styles.sectionSubtitle}>Track your performance</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statCard} accessibilityLabel={`Earnings: £${stats?.monthlyEarnings?.toFixed(0) || '0'}`}>
          <View style={styles.statIcon}>
            <Ionicons name="cash" size={20} color={theme.colors.successDark} accessible={false} />
          </View>
          <Text style={styles.statValue}>
            £{stats?.monthlyEarnings?.toFixed(0) || '0'}
          </Text>
          <Text style={styles.statLabel}>Earnings</Text>
        </View>

        <View style={styles.statCard} accessibilityLabel={`${stats?.completedJobs || 0} jobs completed`}>
          <View style={styles.statIcon}>
            <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} accessible={false} />
          </View>
          <Text style={styles.statValue}>
            {stats?.completedJobs || 0}
          </Text>
          <Text style={styles.statLabel}>Jobs Completed</Text>
        </View>

        <View style={styles.statCard} accessibilityLabel={`Average rating: ${stats?.rating?.toFixed(1) || 'New'}`}>
          <View style={styles.statIcon}>
            <Ionicons name="star" size={20} color={theme.colors.ratingGold} accessible={false} />
          </View>
          <Text style={styles.statValue}>
            {stats?.rating?.toFixed(1) || 'New'}
          </Text>
          <Text style={styles.statLabel}>Average Rating</Text>
        </View>

        <View style={styles.statCard} accessibilityLabel={`Response time: ${stats?.responseTime || 'N/A'}`}>
          <View style={styles.statIcon}>
            <Ionicons name="time" size={20} color={theme.colors.infoDark} accessible={false} />
          </View>
          <Text style={styles.statValue}>
            {stats?.responseTime || 'N/A'}
          </Text>
          <Text style={styles.statLabel}>Response Time</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  statsSection: {
    marginBottom: 32,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: theme.colors.surface,
    flex: 1,
    minWidth: '45%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
