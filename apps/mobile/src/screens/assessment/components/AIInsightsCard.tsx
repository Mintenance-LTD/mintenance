import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AssessmentResults } from '../types';

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
        <Icon name="insights" size={24} color="#007AFF" />
        <Text style={styles.insightsTitle}>AI Analysis Preview</Text>
      </View>
      <View style={styles.insightsList}>
        <View style={styles.insightItem}>
          <Icon name="warning" size={16} color="#FF9800" />
          <Text style={styles.insightText}>
            {results.total_damages} potential issues detected
          </Text>
        </View>
        <View style={styles.insightItem}>
          <Icon name="trending-up" size={16} color="#4CAF50" />
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
        <Icon name="arrow-forward" size={16} color="#007AFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  insightsCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
  },
  insightsList: {
    marginBottom: 12,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  insightText: {
    fontSize: 14,
    color: '#333',
  },
  viewInsightsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  viewInsightsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
});
