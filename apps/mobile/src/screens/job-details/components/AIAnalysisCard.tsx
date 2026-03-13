/**
 * AIAnalysisCard Component
 *
 * Displays AI analysis results for job photos.
 *
 * @filesize Target: <90 lines
 * @compliance Single Responsibility - AI analysis display
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
          <Ionicons name="sparkles" size={20} color="#8B5CF6" accessible={false} />
          <Text style={styles.title} accessibilityRole='header'>AI Analysis</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#222222" accessibilityLabel='Analyzing job photos' />
          <Text style={styles.loadingText}>Analyzing job photos...</Text>
        </View>
      </View>
    );
  }

  if (!aiAnalysis) {
    return null;
  }

  // Normalize confidence: if >1, assume it's already a percentage (e.g. 85); otherwise multiply by 100
  const confidencePercent = Math.min(100, Math.round(
    aiAnalysis.confidence > 1 ? aiAnalysis.confidence : aiAnalysis.confidence * 100
  ));

  return (
    <View style={styles.container} accessibilityLabel={`AI Analysis: ${aiAnalysis.estimatedComplexity} complexity, estimated ${aiAnalysis.estimatedDuration}, ${confidencePercent}% confidence`}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={20} color="#8B5CF6" accessible={false} />
        <Text style={styles.title} accessibilityRole='header'>AI Analysis</Text>
        <View style={styles.confidenceBadge}>
          <Text style={styles.confidenceText}>
            {confidencePercent}% confidence
          </Text>
        </View>
      </View>

      <View style={styles.analysisContent}>
        <Text style={styles.categoryTitle}>Estimated Complexity</Text>
        <Text style={styles.categoryValue}>{aiAnalysis.estimatedComplexity}</Text>

        <Text style={styles.categoryTitle}>Estimated Duration</Text>
        <Text style={styles.categoryValue}>{aiAnalysis.estimatedDuration}</Text>

        {aiAnalysis.suggestedTools && aiAnalysis.suggestedTools.length > 0 && (
          <>
            <Text style={styles.categoryTitle}>Suggested Tools</Text>
            <View style={styles.toolsList}>
              {aiAnalysis.suggestedTools.map((tool: string, index: number) => (
                <View key={index} style={styles.toolTag}>
                  <Text style={styles.toolText}>{tool}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {aiAnalysis.recommendedActions && aiAnalysis.recommendedActions.length > 0 && (
          <>
            <Text style={styles.categoryTitle}>Recommended Actions</Text>
            {aiAnalysis.recommendedActions.map((action: string, index: number) => (
              <Text key={index} style={styles.notesText}>{action}</Text>
            ))}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
    flex: 1,
  },
  confidenceBadge: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 15,
    color: '#717171',
  },
  analysisContent: {
    gap: 12,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B0B0B0',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  categoryValue: {
    fontSize: 15,
    color: '#222222',
    fontWeight: '500',
  },
  toolsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  toolTag: {
    backgroundColor: '#F7F7F7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  toolText: {
    fontSize: 13,
    color: '#222222',
  },
  notesText: {
    fontSize: 15,
    color: '#717171',
    lineHeight: 20,
  },
});
