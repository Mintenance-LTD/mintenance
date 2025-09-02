import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { 
  useContractorESGScore, 
  useSustainabilityFormatters, 
  useSustainabilityGamification,
  sustainabilityUtils
} from '../hooks/useSustainability';
import { ESGScore } from '../services/SustainabilityEngine';

interface SustainabilityScoreWidgetProps {
  contractorId?: string;
  jobAnalysis?: any;
  showDetails?: boolean;
  onScorePress?: () => void;
  variant?: 'compact' | 'detailed' | 'gamified';
}

export const SustainabilityScoreWidget: React.FC<SustainabilityScoreWidgetProps> = ({
  contractorId,
  jobAnalysis,
  showDetails = true,
  onScorePress,
  variant = 'detailed'
}) => {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'score' | 'progress' | 'tips'>('score');

  const { 
    esgScore, 
    isLoading, 
    error, 
    recalculate, 
    isRecalculating 
  } = useContractorESGScore(contractorId || '', Boolean(contractorId));

  const { 
    formatESGScore, 
    getSustainabilityInsights,
    formatCarbonFootprint 
  } = useSustainabilityFormatters();

  const { 
    calculateLevel, 
    getNextMilestone, 
    achievements 
  } = useSustainabilityGamification(contractorId || '');

  if (isLoading && !esgScore) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Calculating sustainability score...</Text>
        </View>
      </View>
    );
  }

  if (error && !esgScore) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="leaf-outline" size={32} color={theme.colors.error} />
          <Text style={styles.errorText}>Unable to load sustainability data</Text>
        </View>
      </View>
    );
  }

  // Use job analysis if no contractor score available
  const scoreData = esgScore || (jobAnalysis ? {
    overall_score: jobAnalysis.sustainability_score,
    environmental_score: jobAnalysis.sustainability_score,
    social_score: 75,
    governance_score: 70,
    certification_level: jobAnalysis.sustainability_score >= 80 ? 'gold' : 'silver',
    last_calculated: new Date().toISOString()
  } as ESGScore : null);

  if (!scoreData) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="leaf-outline" size={32} color={theme.colors.textSecondary} />
          <Text style={styles.emptyText}>No sustainability data available</Text>
        </View>
      </View>
    );
  }

  const formatted = formatESGScore(scoreData);
  const insights = jobAnalysis ? getSustainabilityInsights(jobAnalysis) : [];
  const currentLevel = calculateLevel(scoreData.overall_score);
  const nextMilestone = getNextMilestone(scoreData.overall_score);

  if (variant === 'compact') {
    return (
      <TouchableOpacity 
        style={styles.compactContainer}
        onPress={onScorePress}
      >
        <View style={styles.compactScoreContainer}>
          <Text style={styles.compactScoreText}>{scoreData.overall_score}</Text>
          <Text style={styles.compactScoreLabel}>ESG</Text>
        </View>
        <View style={styles.compactInfo}>
          <Text style={styles.compactTitle}>Sustainability Score</Text>
          <View style={styles.compactMeta}>
            <Text style={styles.compactCertification}>
              {formatted.certificationIcon} {formatted.certificationLabel}
            </Text>
            <Text style={styles.compactGrade}>{formatted.overallGrade}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity 
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="leaf" size={24} color={theme.colors.success} />
          <Text style={styles.headerTitle}>Sustainability Score</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.scoreText, { color: formatted.overallColor }]}>
            {scoreData.overall_score}
          </Text>
          <Ionicons 
            name={expanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={theme.colors.textSecondary} 
          />
        </View>
      </TouchableOpacity>

      {/* Main Score Display */}
      <View style={styles.scoreContainer}>
        <View style={styles.mainScore}>
          <View style={[styles.scoreCircle, { borderColor: formatted.overallColor }]}>
            <Text style={[styles.scoreValue, { color: formatted.overallColor }]}>
              {scoreData.overall_score}
            </Text>
            <Text style={styles.scoreGrade}>{formatted.overallGrade}</Text>
          </View>
          
          <View style={styles.certificationType}>
            <Text style={styles.certificationIcon}>{formatted.certificationIcon}</Text>
            <Text style={styles.certificationText}>{formatted.certificationLabel}</Text>
          </View>
        </View>

        {/* Score Breakdown */}
        <View style={styles.breakdown}>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Environmental</Text>
            <View style={styles.breakdownScore}>
              <Text style={[styles.breakdownValue, { color: formatted.overallColor }]}>
                {scoreData.environmental_score}
              </Text>
              <Text style={styles.breakdownGrade}>{formatted.environmentalGrade}</Text>
            </View>
          </View>
          
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Social</Text>
            <View style={styles.breakdownScore}>
              <Text style={[styles.breakdownValue, { color: formatted.overallColor }]}>
                {scoreData.social_score}
              </Text>
              <Text style={styles.breakdownGrade}>{formatted.socialGrade}</Text>
            </View>
          </View>
          
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Governance</Text>
            <View style={styles.breakdownScore}>
              <Text style={[styles.breakdownValue, { color: formatted.overallColor }]}>
                {scoreData.governance_score}
              </Text>
              <Text style={styles.breakdownGrade}>{formatted.governanceGrade}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Gamification Elements */}
      {variant === 'gamified' && nextMilestone && (
        <View style={styles.gamificationContainer}>
          <View style={styles.levelContainer}>
            <Text style={styles.currentLevel}>
              Current Level: {currentLevel.icon} {currentLevel.level.toUpperCase()}
            </Text>
            <Text style={styles.nextMilestone}>
              Next: {nextMilestone.icon} {nextMilestone.level.toUpperCase()} 
              ({nextMilestone.pointsNeeded} points to go)
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${nextMilestone.progress}%`,
                  backgroundColor: currentLevel.color 
                }
              ]} 
            />
          </View>
        </View>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <View style={styles.insightsContainer}>
          {insights.slice(0, expanded ? insights.length : 2).map((insight, index) => (
            <View 
              key={index} 
              style={[
                styles.insightItem, 
                { borderLeftColor: 
                  insight.type === 'success' ? theme.colors.success :
                  insight.type === 'warning' ? theme.colors.warning :
                  theme.colors.info 
                }
              ]}
            >
              <Text style={styles.insightIcon}>{insight.icon}</Text>
              <Text style={styles.insightText}>{insight.message}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Expanded Details */}
      {expanded && showDetails && (
        <View style={styles.expandedContent}>
          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'score' && styles.activeTab]}
              onPress={() => setActiveTab('score')}
            >
              <Text style={[
                styles.tabText,
                activeTab === 'score' && styles.activeTabText
              ]}>
                Details
              </Text>
            </TouchableOpacity>

            {contractorId && (
              <TouchableOpacity
                style={[styles.tab, activeTab === 'progress' && styles.activeTab]}
                onPress={() => setActiveTab('progress')}
              >
                <Text style={[
                  styles.tabText,
                  activeTab === 'progress' && styles.activeTabText
                ]}>
                  Progress
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.tab, activeTab === 'tips' && styles.activeTab]}
              onPress={() => setActiveTab('tips')}
            >
              <Text style={[
                styles.tabText,
                activeTab === 'tips' && styles.activeTabText
              ]}>
                Tips
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          <View style={styles.tabContent}>
            {activeTab === 'score' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailTitle}>Environmental Impact</Text>
                  <Text style={styles.detailText}>
                    Measures carbon footprint, waste reduction, renewable energy usage, and sustainable material choices.
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailTitle}>Social Responsibility</Text>
                  <Text style={styles.detailText}>
                    Evaluates community impact, fair employment practices, client education, and local job creation.
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailTitle}>Governance Standards</Text>
                  <Text style={styles.detailText}>
                    Assesses certification compliance, transparency, ethical practices, and stakeholder engagement.
                  </Text>
                </View>

                {jobAnalysis && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailTitle}>Carbon Footprint</Text>
                    <Text style={styles.detailValue}>
                      {formatCarbonFootprint(jobAnalysis.predicted_impact.carbon_footprint_kg)}
                    </Text>
                    <Text style={styles.detailSubtext}>
                      Estimated for this job
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}

            {activeTab === 'progress' && (
              <View style={styles.progressContent}>
                <Text style={styles.comingSoonText}>
                  Progress tracking coming soon! 📊
                </Text>
                <Text style={styles.comingSoonSubtext}>
                  Track your sustainability improvements over time
                </Text>
              </View>
            )}

            {activeTab === 'tips' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.tipSection}>
                  <Text style={styles.tipTitle}>🌱 Reduce Environmental Impact</Text>
                  <Text style={styles.tipText}>
                    • Use eco-friendly materials when possible{'\n'}
                    • Minimize packaging and waste{'\n'}
                    • Choose energy-efficient tools{'\n'}
                    • Plan efficient travel routes
                  </Text>
                </View>

                <View style={styles.tipSection}>
                  <Text style={styles.tipTitle}>🤝 Strengthen Social Impact</Text>
                  <Text style={styles.tipText}>
                    • Support local suppliers{'\n'}
                    • Educate clients about sustainable options{'\n'}
                    • Participate in community projects{'\n'}
                    • Maintain fair employment practices
                  </Text>
                </View>

                <View style={styles.tipSection}>
                  <Text style={styles.tipTitle}>📊 Improve Governance</Text>
                  <Text style={styles.tipText}>
                    • Pursue relevant certifications{'\n'}
                    • Maintain transparent reporting{'\n'}
                    • Follow ethical business practices{'\n'}
                    • Engage with stakeholders regularly
                  </Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      )}

      {/* Footer Actions */}
      <View style={styles.footer}>
        {contractorId && (
          <TouchableOpacity
            style={styles.recalculateButton}
            onPress={recalculate}
            disabled={isRecalculating}
          >
            {isRecalculating ? (
              <ActivityIndicator color={theme.colors.primary} size="small" />
            ) : (
              <Ionicons name="refresh" size={16} color={theme.colors.primary} />
            )}
            <Text style={styles.recalculateText}>
              {isRecalculating ? 'Updating...' : 'Recalculate'}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.lastUpdated}>
          Last updated: {new Date(scoreData.last_calculated).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginVertical: theme.spacing[2],
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing[3],
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  compactScoreContainer: {
    alignItems: 'center',
    marginRight: theme.spacing[3],
  },
  compactScoreText: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.success,
  },
  compactScoreLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  compactInfo: {
    flex: 1,
  },
  compactTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[1],
  },
  compactMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactCertification: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  compactGrade: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.success,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing[6],
  },
  loadingText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing[2],
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing[6],
  },
  errorText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.error,
    marginTop: theme.spacing[2],
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing[6],
  },
  emptyText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing[2],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing[2],
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    marginRight: theme.spacing[2],
  },
  scoreContainer: {
    padding: theme.spacing[4],
  },
  mainScore: {
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  scoreValue: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
  },
  scoreGrade: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing[1],
  },
  certificationType: {
    alignItems: 'center',
  },
  certificationIcon: {
    fontSize: 24,
    marginBottom: theme.spacing[1],
  },
  certificationText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  breakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  breakdownItem: {
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing[1],
  },
  breakdownScore: {
    alignItems: 'center',
  },
  breakdownValue: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  breakdownGrade: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  gamificationContainer: {
    padding: theme.spacing[4],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  levelContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  currentLevel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[1],
  },
  nextMilestone: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  insightsContainer: {
    padding: theme.spacing[4],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[2],
    paddingLeft: theme.spacing[2],
    borderLeftWidth: 3,
  },
  insightIcon: {
    fontSize: 16,
    marginRight: theme.spacing[2],
  },
  insightText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
    lineHeight: 18,
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[2],
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
  },
  tabText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  activeTabText: {
    color: theme.colors.primary,
  },
  tabContent: {
    minHeight: 200,
    padding: theme.spacing[4],
  },
  detailSection: {
    marginBottom: theme.spacing[4],
  },
  detailTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[2],
  },
  detailText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  detailValue: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
    marginBottom: theme.spacing[1],
  },
  detailSubtext: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  progressContent: {
    alignItems: 'center',
    paddingVertical: theme.spacing[6],
  },
  comingSoonText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[2],
  },
  comingSoonSubtext: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  tipSection: {
    marginBottom: theme.spacing[4],
  },
  tipTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[2],
  },
  tipText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing[4],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  recalculateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  recalculateText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    marginLeft: theme.spacing[1],
  },
  lastUpdated: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
});

export default SustainabilityScoreWidget;