/**
 * ProfileStats Component
 * 
 * Displays contractor statistics (jobs, rating, reviews).
 * 
 * @filesize Target: <60 lines
 * @compliance Single Responsibility - Stats display
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../../theme';

interface ProfileStatsProps {
  jobsCompleted: number;
  rating: number;
  reviewCount: number;
}

export const ProfileStats: React.FC<ProfileStatsProps> = ({
  jobsCompleted,
  rating,
  reviewCount,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.stat}>
        <Text style={styles.statValue}>{jobsCompleted}</Text>
        <Text style={styles.statLabel}>Jobs</Text>
      </View>
      <View style={styles.stat}>
        <Text style={styles.statValue}>{rating}</Text>
        <Text style={styles.statLabel}>Rating</Text>
      </View>
      <View style={styles.stat}>
        <Text style={styles.statValue}>{reviewCount}</Text>
        <Text style={styles.statLabel}>Reviews</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: theme.spacing.xl,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  statLabel: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
});
