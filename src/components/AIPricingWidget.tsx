import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
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
  autoAnalyze = false
}) => {
  const { analysis, isLoading, analyzePricing, formatPricing, getHomeownerInsights } = useAIPricing();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (autoAnalyze && jobInput.title && jobInput.description && jobInput.category) {
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
    if (confidence >= 0.8) return theme.colors.success;
    if (confidence >= 0.6) return theme.colors.warning;
    return theme.colors.error;
  };

  const getComplexityIcon = (complexity: string) => {
    switch (complexity) {
      case 'simple': return 'checkmark-circle';
      case 'moderate': return 'warning';
      case 'complex': return 'alert-circle';
      case 'specialist': return 'star';
      default: return 'help-circle';
    }
  };

  if (!analysis && !isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="analytics" size={24} color={theme.colors.primary} />
          <Text style={styles.headerText}>AI Pricing Analysis</Text>
        </View>
        
        <Text style={styles.description}>
          Get intelligent pricing suggestions based on market data and job complexity
        </Text>

        <TouchableOpacity 
          style={styles.analyzeButton}
          onPress={handleAnalyzePricing}
          disabled={isLoading}
        >
          <Ionicons name={"brain" as any} size={20} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.analyzeButtonText}>Analyze Pricing</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
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
          <Ionicons name="analytics" size={24} color={theme.colors.primary} />
          <Text style={styles.headerText}>AI Pricing Analysis</Text>
        </View>
        <Ionicons 
          name={expanded ? "chevron-up" : "chevron-down"} 
          size={20} 
          color={theme.colors.textSecondary} 
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
              color={theme.colors.textSecondary} 
            />
            <Text style={styles.metaText}>{formatted.complexityLabel}</Text>
          </View>
          
          <View style={styles.metaItem}>
            <Ionicons name="checkmark-circle" size={16} color={getConfidenceColor(analysis.confidence)} />
            <Text style={[styles.metaText, { color: getConfidenceColor(analysis.confidence) }]}>
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
                    name={factor.impact === 'increases' ? "trending-up" : "trending-down"} 
                    size={16} 
                    color={factor.impact === 'increases' ? theme.colors.success : theme.colors.warning} 
                  />
                  <View style={styles.factorContent}>
                    <Text style={styles.factorName}>{factor.name}</Text>
                    <Text style={styles.factorDescription}>{factor.description}</Text>
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
                <Text style={styles.marketValue}>£{Math.round(analysis.marketData.averagePrice)}</Text>
              </View>
              <View style={styles.marketItem}>
                <Text style={styles.marketLabel}>Demand Level</Text>
                <Text style={[styles.marketValue, { 
                  color: analysis.marketData.demandLevel === 'high' ? theme.colors.error : 
                         analysis.marketData.demandLevel === 'low' ? theme.colors.success : 
                         theme.colors.warning 
                }]}>
                  {analysis.marketData.demandLevel.charAt(0).toUpperCase() + analysis.marketData.demandLevel.slice(1)}
                </Text>
              </View>
            </View>
          </View>

          {/* Insights for Homeowners */}
          {insights.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Budget Insights</Text>
              {insights.map((insight, index) => (
                <View key={index} style={[styles.insightItem, { borderLeftColor: 
                  insight.type === 'success' ? theme.colors.success :
                  insight.type === 'warning' ? theme.colors.warning :
                  theme.colors.info
                }]}>
                  <Ionicons 
                    name={
                      insight.type === 'success' ? "checkmark-circle" :
                      insight.type === 'warning' ? "warning" :
                      "information-circle"
                    }
                    size={16} 
                    color={
                      insight.type === 'success' ? theme.colors.success :
                      insight.type === 'warning' ? theme.colors.warning :
                      theme.colors.info
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
                  <Ionicons name="bulb" size={16} color={theme.colors.warning} />
                  <Text style={styles.recommendationText}>{recommendation}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Re-analyze Button */}
          <TouchableOpacity 
            style={styles.reanalyzeButton}
            onPress={handleAnalyzePricing}
          >
            <Ionicons name="refresh" size={16} color={theme.colors.primary} />
            <Text style={styles.reanalyzeText}>Re-analyze</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    marginVertical: theme.spacing[2],
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing[3],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing[2],
  },
  description: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing[4],
    lineHeight: 20,
  },
  analyzeButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    borderRadius: theme.borderRadius.md,
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    marginLeft: theme.spacing[1],
  },
  buttonIcon: {
    marginRight: theme.spacing[1],
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing[6],
  },
  loadingText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing[3],
  },
  loadingSubtext: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing[1],
  },
  pricingContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing[2],
  },
  priceLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing[1],
  },
  priceRange: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing[1],
  },
  optimalPrice: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing[3],
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
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing[1],
  },
  expandedContent: {
    marginTop: theme.spacing[4],
    paddingTop: theme.spacing[4],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  section: {
    marginBottom: theme.spacing[4],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[2],
  },
  factorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[2],
  },
  factorContent: {
    flex: 1,
    marginLeft: theme.spacing[2],
  },
  factorName: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  factorDescription: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
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
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing[1],
  },
  marketValue: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[2],
    paddingLeft: theme.spacing[2],
    borderLeftWidth: 3,
  },
  insightText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing[2],
    lineHeight: 18,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[2],
  },
  recommendationText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing[2],
    lineHeight: 18,
  },
  reanalyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing[2],
  },
  reanalyzeText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    marginLeft: theme.spacing[1],
  },
});
