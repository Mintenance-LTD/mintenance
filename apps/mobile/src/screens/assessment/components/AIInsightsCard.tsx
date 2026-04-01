import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../../../theme';
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
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Icon name='insights' size={18} color='#8B5CF6' />
        </View>
        <Text style={styles.headerTitle}>AI Analysis Preview</Text>
      </View>
      <View style={styles.insightsList}>
        <View style={styles.insightRow}>
          <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
          <Text style={styles.insightText}>
            {results.total_damages} potential issues detected
          </Text>
        </View>
        <View style={styles.insightRow}>
          <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.insightText}>
            Confidence: {results.confidence_level}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.viewButton}
        onPress={onViewFullAnalysis}
        activeOpacity={0.7}
      >
        <Text style={styles.viewButtonText}>View Full Analysis</Text>
        <Icon name='arrow-forward' size={16} color='#8B5CF6' />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  insightsList: {
    marginBottom: 14,
    gap: 8,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  insightText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDE9FE',
    borderRadius: 14,
    paddingVertical: 12,
    gap: 8,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
});
