import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
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
        <View style={styles.insightsIconWrap}>
          <Icon name="insights" size={20} color="#8B5CF6" />
        </View>
        <Text style={styles.insightsTitle}>AI Analysis Preview</Text>
      </View>
      <View style={styles.insightsList}>
        <View style={styles.insightItem}>
          <Icon name="warning" size={16} color="#F59E0B" />
          <Text style={styles.insightText}>
            {results.total_damages} potential issues detected
          </Text>
        </View>
        <View style={styles.insightItem}>
          <Icon name="trending-up" size={16} color="#10B981" />
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
        <Icon name="arrow-forward" size={16} color="#8B5CF6" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  insightsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  insightsIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8B5CF6',
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
    fontSize: 13,
    color: '#222222',
  },
  viewInsightsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDE9FE',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  viewInsightsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5CF6',
  },
});
