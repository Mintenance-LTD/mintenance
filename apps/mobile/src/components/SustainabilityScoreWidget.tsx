import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { styles } from './sustainabilityScoreWidgetStyles';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import {
  useContractorESGScore,
  useSustainabilityFormatters,
  useSustainabilityGamification,
  sustainabilityUtils,
} from '../hooks/useSustainability';
import { ESGScore } from '../services/SustainabilityEngine';

interface SustainabilityScoreWidgetProps {
  contractorId?: string;
  jobAnalysis?: {
    materials?: unknown[];
    carbonFootprint?: number;
    recyclingRate?: number;
    energyEfficiency?: number;
  };
  showDetails?: boolean;
  onScorePress?: () => void;
  variant?: 'compact' | 'detailed' | 'gamified';
}

export const SustainabilityScoreWidget: React.FC<
  SustainabilityScoreWidgetProps
> = ({
  contractorId,
  jobAnalysis,
  showDetails = true,
  onScorePress,
  variant = 'detailed',
}) => {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'score' | 'progress' | 'tips'>(
    'score'
  );

  const { esgScore, isLoading, error, recalculate, isRecalculating } =
    useContractorESGScore(contractorId || '', Boolean(contractorId));

  const { formatESGScore, getSustainabilityInsights, formatCarbonFootprint } =
    useSustainabilityFormatters();

  const { calculateLevel, getNextMilestone, achievements } =
    useSustainabilityGamification(contractorId || '');

  if (isLoading && !esgScore) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={theme.colors.primary} />
          <Text style={styles.loadingText}>
            Calculating sustainability score...
          </Text>
        </View>
      </View>
    );
  }

  if (error && !esgScore) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name='leaf-outline' size={32} color={theme.colors.error} />
          <Text style={styles.errorText}>
            Unable to load sustainability data
          </Text>
        </View>
      </View>
    );
  }

  // Use job analysis if no contractor score available
  const scoreData =
    esgScore ||
    (jobAnalysis
      ? ({
          overall_score: jobAnalysis.sustainability_score,
          environmental_score: jobAnalysis.sustainability_score,
          social_score: 75,
          governance_score: 70,
          certification_level:
            jobAnalysis.sustainability_score >= 80 ? 'gold' : 'silver',
          last_calculated: new Date().toISOString(),
        } as ESGScore)
      : null);

  if (!scoreData) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons
            name='leaf-outline'
            size={32}
            color={theme.colors.textSecondary}
          />
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
      <TouchableOpacity style={styles.compactContainer} onPress={onScorePress}>
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
          <Ionicons name='leaf' size={24} color={theme.colors.success} />
          <Text style={styles.headerTitle}>Sustainability Score</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.scoreText, { color: formatted.overallColor }]}>
            {scoreData.overall_score}
          </Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.colors.textSecondary}
          />
        </View>
      </TouchableOpacity>

      {/* Main Score Display */}
      <View style={styles.scoreContainer}>
        <View style={styles.mainScore}>
          <View
            style={[
              styles.scoreCircle,
              { borderColor: formatted.overallColor },
            ]}
          >
            <Text
              style={[styles.scoreValue, { color: formatted.overallColor }]}
            >
              {scoreData.overall_score}
            </Text>
            <Text style={styles.scoreGrade}>{formatted.overallGrade}</Text>
          </View>

          <View style={styles.certificationType}>
            <Text style={styles.certificationIcon}>
              {formatted.certificationIcon}
            </Text>
            <Text style={styles.certificationText}>
              {formatted.certificationLabel}
            </Text>
          </View>
        </View>

        {/* Score Breakdown */}
        <View style={styles.breakdown}>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Environmental</Text>
            <View style={styles.breakdownScore}>
              <Text
                style={[
                  styles.breakdownValue,
                  { color: formatted.overallColor },
                ]}
              >
                {scoreData.environmental_score}
              </Text>
              <Text style={styles.breakdownGrade}>
                {formatted.environmentalGrade}
              </Text>
            </View>
          </View>

          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Social</Text>
            <View style={styles.breakdownScore}>
              <Text
                style={[
                  styles.breakdownValue,
                  { color: formatted.overallColor },
                ]}
              >
                {scoreData.social_score}
              </Text>
              <Text style={styles.breakdownGrade}>{formatted.socialGrade}</Text>
            </View>
          </View>

          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Governance</Text>
            <View style={styles.breakdownScore}>
              <Text
                style={[
                  styles.breakdownValue,
                  { color: formatted.overallColor },
                ]}
              >
                {scoreData.governance_score}
              </Text>
              <Text style={styles.breakdownGrade}>
                {formatted.governanceGrade}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Gamification Elements */}
      {variant === 'gamified' && nextMilestone && (
        <View style={styles.gamificationContainer}>
          <View style={styles.levelContainer}>
            <Text style={styles.currentLevel}>
              Current Level: {currentLevel.icon}{' '}
              {currentLevel.level.toUpperCase()}
            </Text>
            <Text style={styles.nextMilestone}>
              Next: {nextMilestone.icon} {nextMilestone.level.toUpperCase()}(
              {nextMilestone.pointsNeeded} points to go)
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${nextMilestone.progress}%`,
                  backgroundColor: currentLevel.color,
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <View style={styles.insightsContainer}>
          {insights
            .slice(0, expanded ? insights.length : 2)
            .map((insight, index) => (
              <View
                key={index}
                style={[
                  styles.insightItem,
                  {
                    borderLeftColor:
                      insight.type === 'success'
                        ? theme.colors.success
                        : insight.type === 'warning'
                          ? theme.colors.warning
                          : theme.colors.info,
                  },
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
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'score' && styles.activeTabText,
                ]}
              >
                Details
              </Text>
            </TouchableOpacity>

            {contractorId && (
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'progress' && styles.activeTab,
                ]}
                onPress={() => setActiveTab('progress')}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'progress' && styles.activeTabText,
                  ]}
                >
                  Progress
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.tab, activeTab === 'tips' && styles.activeTab]}
              onPress={() => setActiveTab('tips')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'tips' && styles.activeTabText,
                ]}
              >
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
                    Measures carbon footprint, waste reduction, renewable energy
                    usage, and sustainable material choices.
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailTitle}>Social Responsibility</Text>
                  <Text style={styles.detailText}>
                    Evaluates community impact, fair employment practices,
                    client education, and local job creation.
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailTitle}>Governance Standards</Text>
                  <Text style={styles.detailText}>
                    Assesses certification compliance, transparency, ethical
                    practices, and stakeholder engagement.
                  </Text>
                </View>

                {jobAnalysis && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailTitle}>Carbon Footprint</Text>
                    <Text style={styles.detailValue}>
                      {formatCarbonFootprint(
                        jobAnalysis.predicted_impact.carbon_footprint_kg
                      )}
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
                  <Text style={styles.tipTitle}>
                    🌱 Reduce Environmental Impact
                  </Text>
                  <Text style={styles.tipText}>
                    • Use eco-friendly materials when possible{'\n'}• Minimize
                    packaging and waste{'\n'}• Choose energy-efficient tools
                    {'\n'}• Plan efficient travel routes
                  </Text>
                </View>

                <View style={styles.tipSection}>
                  <Text style={styles.tipTitle}>
                    🤝 Strengthen Social Impact
                  </Text>
                  <Text style={styles.tipText}>
                    • Support local suppliers{'\n'}• Educate clients about
                    sustainable options{'\n'}• Participate in community projects
                    {'\n'}• Maintain fair employment practices
                  </Text>
                </View>

                <View style={styles.tipSection}>
                  <Text style={styles.tipTitle}>📊 Improve Governance</Text>
                  <Text style={styles.tipText}>
                    • Pursue relevant certifications{'\n'}• Maintain transparent
                    reporting{'\n'}• Follow ethical business practices{'\n'}•
                    Engage with stakeholders regularly
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
            onPress={() => recalculate()}
            disabled={isRecalculating}
          >
            {isRecalculating ? (
              <ActivityIndicator color={theme.colors.primary} size='small' />
            ) : (
              <Ionicons name='refresh' size={16} color={theme.colors.primary} />
            )}
            <Text style={styles.recalculateText}>
              {isRecalculating ? 'Updating...' : 'Recalculate'}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.lastUpdated}>
          Last updated:{' '}
          {new Date(scoreData.last_calculated).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
};


export default SustainabilityScoreWidget;
