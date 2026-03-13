import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAIPricing } from '../hooks/useAIPricing';
import { JobPricingInput, PricingAnalysis } from '../services/AIPricingEngine';
import { logger } from '../utils/logger';

interface AIPricingWidgetProps {
  jobInput: JobPricingInput;
  onPricingUpdate?: (analysis: PricingAnalysis) => void;
  showDetails?: boolean;
  autoAnalyze?: boolean;
}

export const AIPricingWidget: React.FC<AIPricingWidgetProps> = ({
  jobInput,
  onPricingUpdate,
  showDetails = true,
  autoAnalyze = false,
}) => {
  const {
    analysis,
    isLoading,
    analyzePricing,
    formatPricing,
    getHomeownerInsights,
  } = useAIPricing();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (
      autoAnalyze &&
      jobInput.title &&
      jobInput.description &&
      jobInput.category
    ) {
      handleAnalyzePricing();
    }
  }, [autoAnalyze, jobInput.title, jobInput.description, jobInput.category]);

  useEffect(() => {
    if (analysis && onPricingUpdate) {
      onPricingUpdate(analysis);
    }
  }, [analysis, onPricingUpdate]);

  const handleAnalyzePricing = () => {
    if (!jobInput.title.trim() || !jobInput.description.trim()) {
      Alert.alert(
        'Incomplete Information',
        'Please provide a job title and description for accurate pricing analysis.'
      );
      return;
    }

    analyzePricing(jobInput);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#10B981';
    if (confidence >= 0.6) return '#F59E0B';
    return '#EF4444';
  };

  const getComplexityIcon = (complexity: string) => {
    switch (complexity) {
      case 'simple':
        return 'checkmark-circle';
      case 'moderate':
        return 'warning';
      case 'complex':
        return 'alert-circle';
      case 'specialist':
        return 'star';
      default:
        return 'help-circle';
    }
  };

  if (!analysis && !isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name='analytics' size={24} color='#8B5CF6' />
          <Text style={styles.headerText}>AI Pricing Analysis</Text>
        </View>

        <Text style={styles.description}>
          Get intelligent pricing suggestions based on market data and job
          complexity
        </Text>

        <TouchableOpacity
          style={styles.analyzeButton}
          onPress={handleAnalyzePricing}
          disabled={isLoading}
        >
          <Ionicons
            name={'brain' as keyof typeof Ionicons.glyphMap}
            size={20}
            color='#FFFFFF'
            style={styles.buttonIcon}
          />
          <Text style={styles.analyzeButtonText}>Analyze Pricing</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size='large'
            color='#222222'
            testID='activity-indicator'
          />
          <Text style={styles.loadingText}>Analyzing job requirements...</Text>
          <Text style={styles.loadingSubtext}>This may take a few seconds</Text>
        </View>
      </View>
    );
  }

  if (!analysis) return null;

  const formatted = formatPricing(analysis);
  const insights = getHomeownerInsights(analysis);

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.headerLeft}>
          <Ionicons name='analytics' size={24} color='#8B5CF6' />
          <Text style={styles.headerText}>AI Pricing Analysis</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color='#717171'
        />
      </TouchableOpacity>

      {/* Main Pricing Display */}
      <View style={styles.pricingContainer}>
        <Text style={styles.priceLabel}>Suggested Price Range</Text>
        <Text style={styles.priceRange}>{formatted.priceRange}</Text>
        <Text style={styles.optimalPrice}>Optimal: {formatted.optimal}</Text>

        <View style={styles.metaInfo}>
          <View style={styles.metaItem}>
            <Ionicons
              name={getComplexityIcon(analysis.complexity)}
              size={16}
              color='#717171'
            />
            <Text style={styles.metaText}>{formatted.complexityLabel}</Text>
          </View>

          <View style={styles.metaItem}>
            <Ionicons
              name='checkmark-circle'
              size={16}
              color={getConfidenceColor(analysis.confidence)}
            />
            <Text
              style={[
                styles.metaText,
                { color: getConfidenceColor(analysis.confidence) },
              ]}
            >
              {formatted.confidence} confident
            </Text>
          </View>
        </View>
      </View>

      {/* Expanded Details */}
      {expanded && showDetails && (
        <View style={styles.expandedContent}>
          {/* Pricing Factors */}
          {formatted.topFactors.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Key Pricing Factors</Text>
              {formatted.topFactors.map((factor, index) => (
                <View key={index} style={styles.factorItem}>
                  <Ionicons
                    name={
                      factor.impact === 'increases'
                        ? 'trending-up'
                        : 'trending-down'
                    }
                    size={16}
                    color={
                      factor.impact === 'increases'
                        ? '#10B981'
                        : '#F59E0B'
                    }
                  />
                  <View style={styles.factorContent}>
                    <Text style={styles.factorName}>{factor.name}</Text>
                    <Text style={styles.factorDescription}>
                      {factor.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Market Context */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Market Context</Text>
            <View style={styles.marketGrid}>
              <View style={styles.marketItem}>
                <Text style={styles.marketLabel}>Average Price</Text>
                <Text style={styles.marketValue}>
                  £{Math.round(analysis.marketData.averagePrice)}
                </Text>
              </View>
              <View style={styles.marketItem}>
                <Text style={styles.marketLabel}>Demand Level</Text>
                <Text
                  style={[
                    styles.marketValue,
                    {
                      color:
                        analysis.marketData.demandLevel === 'high'
                          ? '#EF4444'
                          : analysis.marketData.demandLevel === 'low'
                            ? '#10B981'
                            : '#F59E0B',
                    },
                  ]}
                >
                  {analysis.marketData.demandLevel.charAt(0).toUpperCase() +
                    analysis.marketData.demandLevel.slice(1)}
                </Text>
              </View>
            </View>
          </View>

          {/* Insights for Homeowners */}
          {insights.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Budget Insights</Text>
              {insights.map((insight, index) => (
                <View
                  key={index}
                  style={[
                    styles.insightItem,
                    {
                      borderLeftColor:
                        insight.type === 'success'
                          ? '#10B981'
                          : insight.type === 'warning'
                            ? '#F59E0B'
                            : '#3B82F6',
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      insight.type === 'success'
                        ? 'checkmark-circle'
                        : insight.type === 'warning'
                          ? 'warning'
                          : 'information-circle'
                    }
                    size={16}
                    color={
                      insight.type === 'success'
                        ? '#10B981'
                        : insight.type === 'warning'
                          ? '#F59E0B'
                          : '#3B82F6'
                    }
                  />
                  <Text style={styles.insightText}>{insight.message}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recommendations</Text>
              {analysis.recommendations.map((recommendation, index) => (
                <View key={index} style={styles.recommendationItem}>
                  <Ionicons
                    name='bulb'
                    size={16}
                    color='#F59E0B'
                  />
                  <Text style={styles.recommendationText}>
                    {recommendation}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Re-analyze Button */}
          <TouchableOpacity
            style={styles.reanalyzeButton}
            onPress={handleAnalyzePricing}
          >
            <Ionicons name='refresh' size={16} color='#222222' />
            <Text style={styles.reanalyzeText}>Re-analyze</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222222',
    marginLeft: 8,
  },
  description: {
    fontSize: 13,
    color: '#717171',
    marginBottom: 16,
    lineHeight: 20,
  },
  analyzeButton: {
    backgroundColor: '#222222',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 28,
    minHeight: 56,
  },
  analyzeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 4,
  },
  buttonIcon: {
    marginRight: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#222222',
    marginTop: 12,
  },
  loadingSubtext: {
    fontSize: 13,
    color: '#717171',
    marginTop: 4,
  },
  pricingContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  priceLabel: {
    fontSize: 13,
    color: '#717171',
    marginBottom: 4,
  },
  priceRange: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 4,
  },
  optimalPrice: {
    fontSize: 15,
    color: '#717171',
    marginBottom: 12,
  },
  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 13,
    color: '#717171',
    marginLeft: 4,
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EBEBEB',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 8,
  },
  factorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  factorContent: {
    flex: 1,
    marginLeft: 8,
  },
  factorName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#222222',
  },
  factorDescription: {
    fontSize: 12,
    color: '#717171',
    lineHeight: 16,
  },
  marketGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  marketItem: {
    flex: 1,
    alignItems: 'center',
  },
  marketLabel: {
    fontSize: 12,
    color: '#717171',
    marginBottom: 4,
  },
  marketValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingLeft: 8,
    borderLeftWidth: 3,
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    color: '#222222',
    marginLeft: 8,
    lineHeight: 18,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recommendationText: {
    flex: 1,
    fontSize: 13,
    color: '#222222',
    marginLeft: 8,
    lineHeight: 18,
  },
  reanalyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    marginTop: 8,
  },
  reanalyzeText: {
    fontSize: 13,
    color: '#222222',
    marginLeft: 4,
  },
});
