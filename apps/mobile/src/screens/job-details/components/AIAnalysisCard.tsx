/**
 * AIAnalysisCard Component
 * 
 * Displays AI analysis results for job photos.
 * 
 * @filesize Target: <90 lines
 * @compliance Single Responsibility - AI analysis display
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import type { AIAnalysis } from '../../../services/AIAnalysisService';

interface AIAnalysisCardProps {
  aiAnalysis: AIAnalysis | null;
  aiLoading: boolean;
}

export const AIAnalysisCard: React.FC<AIAnalysisCardProps> = ({
  aiAnalysis,
  aiLoading,
}) => {
  if (aiLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="sparkles" size={20} color={theme.colors.accent} />
          <Text style={styles.title}>AI Analysis</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Analyzing job photos...</Text>
        </View>
      </View>
    );
  }

  if (!aiAnalysis) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={20} color={theme.colors.accent} />
        <Text style={styles.title}>AI Analysis</Text>
        <View style={styles.confidenceBadge}>
          <Text style={styles.confidenceText}>
            {Math.round(aiAnalysis.confidence * 100)}% confidence
          </Text>
        </View>
      </View>

      <View style={styles.analysisContent}>
        <Text style={styles.categoryTitle}>Job Category</Text>
        <Text style={styles.categoryValue}>{aiAnalysis.category}</Text>

        <Text style={styles.categoryTitle}>Estimated Complexity</Text>
        <Text style={styles.categoryValue}>{aiAnalysis.complexity}</Text>

        <Text style={styles.categoryTitle}>Estimated Duration</Text>
        <Text style={styles.categoryValue}>{aiAnalysis.estimatedDuration}</Text>

        {aiAnalysis.recommendedTools && aiAnalysis.recommendedTools.length > 0 && (
          <>
            <Text style={styles.categoryTitle}>Recommended Tools</Text>
            <View style={styles.toolsList}>
              {aiAnalysis.recommendedTools.map((tool, index) => (
                <View key={index} style={styles.toolTag}>
                  <Text style={styles.toolText}>{tool}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {aiAnalysis.notes && (
          <>
            <Text style={styles.categoryTitle}>Additional Notes</Text>
            <Text style={styles.notesText}>{aiAnalysis.notes}</Text>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  confidenceBadge: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  confidenceText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textInverse,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  loadingText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
  },
  analysisContent: {
    gap: theme.spacing.md,
  },
  categoryTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryValue: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  toolsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  toolTag: {
    backgroundColor: theme.colors.surfaceTertiary,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  toolText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  notesText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
});
