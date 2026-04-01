import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../../theme';

interface ProgressBarProps {
  percentage: number;
  completedSteps?: number;
  totalSteps?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  completedSteps,
  totalSteps,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.percentage}>{percentage}%</Text>
        {completedSteps != null && totalSteps != null && (
          <Text style={styles.stepCount}>
            {completedSteps} of {totalSteps} steps
          </Text>
        )}
      </View>
      <View style={styles.barTrack}>
        <View
          style={[styles.barFill, { width: `${Math.min(percentage, 100)}%` }]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  percentage: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  stepCount: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  barTrack: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
});
