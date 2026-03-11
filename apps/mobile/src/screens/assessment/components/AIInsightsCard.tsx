import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AssessmentResults } from '../types';
import { theme } from '../../../theme';

interface AIInsightsCardProps {
  results: AssessmentResults;
  onViewFullAnalysis: () => void;
}

export const AIInsightsCard: React.FC<AIInsightsCardProps> = ({
  results,
  onViewFullAnalysis,
}) => {
  return (
    <View style={styles.insightsCard}>
      <View style={styles.insightsHeader}>
        <Icon name="insights" size={24} color={theme.colors.info} />
        <Text style={styles.insightsTitle}>AI Analysis Preview</Text>
      </View>
      <View style={styles.insightsList}>
        <View style={styles.insightItem}>
          <Icon name="warning" size={16} color={theme.colors.warning} />
          <Text style={styles.insightText}>
            {results.total_damages} potential issues detected
          </Text>
        </View>
        <View style={styles.insightItem}>
          <Icon name="trending-up" size={16} color={theme.colors.success} />
          <Text style={styles.insightText}>
            Confidence: {results.confidence_level}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.viewInsightsButton}
        onPress={onViewFullAnalysis}
      >
        <Text style={styles.viewInsightsText}>View Full Analysis</Text>
        <Icon name="arrow-forward" size={16} color={theme.colors.info} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  insightsCard: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
    gap: theme.spacing.sm,
  },
  insightsTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.info,
  },
  insightsList: {
    marginBottom: theme.spacing[3],
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  insightText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  viewInsightsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing[3],
    gap: theme.spacing.sm,
  },
  viewInsightsText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.info,
  },
});
