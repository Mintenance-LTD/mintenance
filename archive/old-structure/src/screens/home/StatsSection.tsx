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
      <Text style={styles.sectionTitle}>Your Stats</Text>
      <Text style={styles.sectionSubtitle}>Track your performance</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <Ionicons name="cash" size={20} color={theme.colors.successDark} />
          </View>
          <Text style={styles.statValue}>
            ${stats?.totalEarnings?.toFixed(0) || '0'}
          </Text>
          <Text style={styles.statLabel}>Total Earnings</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
          </View>
          <Text style={styles.statValue}>
            {stats?.jobsCompleted || 0}
          </Text>
          <Text style={styles.statLabel}>Jobs Completed</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <Ionicons name="star" size={20} color={theme.colors.ratingGold} />
          </View>
          <Text style={styles.statValue}>
            {stats?.averageRating?.toFixed(1) || 'New'}
          </Text>
          <Text style={styles.statLabel}>Average Rating</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <Ionicons name="time" size={20} color={theme.colors.infoDark} />
          </View>
          <Text style={styles.statValue}>
            {stats?.responseTimeMinutes || 'N/A'}
          </Text>
          <Text style={styles.statLabel}>Avg Response Time</Text>
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
    fontSize: 18,
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
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: theme.colors.surface,
    width: '48%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    ...theme.shadows.base,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
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
