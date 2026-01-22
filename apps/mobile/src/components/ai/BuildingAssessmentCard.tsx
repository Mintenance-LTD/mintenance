/**
 * Building Assessment Card Component
 * Displays comprehensive AI building assessment results
 * Matches web's advanced Building Surveyor functionality
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import UnifiedAIServiceMobile from '../../services/UnifiedAIServiceMobile';
import { BuildingAssessment } from '@mintenance/ai-core/types';
import { theme } from '../../theme';
import { logger } from '@mintenance/shared';

interface BuildingAssessmentCardProps {
  images: string[];
  jobDetails?: {
    title: string;
    description: string;
    category: string;
    location: string;
  };
  onAssessmentComplete?: (assessment: BuildingAssessment) => void;
  onCorrection?: (assessmentId: string, corrections: unknown[]) => void;
}

export const BuildingAssessmentCard: React.FC<BuildingAssessmentCardProps> = ({
  images,
  jobDetails,
  onAssessmentComplete,
  onCorrection
}) => {
  const [assessment, setAssessment] = useState<BuildingAssessment | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [showCorrections, setShowCorrections] = useState(false);

  const runAssessment = async () => {
    if (images.length === 0) {
      Alert.alert('No Images', 'Please add photos to run AI assessment');
      return;
    }

    setLoading(true);
    try {
      // Run comprehensive building assessment
      const result = await UnifiedAIServiceMobile.assessBuilding(images, jobDetails);

      if (result) {
        setAssessment(result);
        onAssessmentComplete?.(result);

        // Show alert for critical safety hazards
        if (result.safetyHazards.criticalFlags.length > 0) {
          Alert.alert(
            '⚠️ Safety Hazards Detected',
            `Critical safety issues found:\n${result.safetyHazards.criticalFlags.join('\n')}`,
            [
              { text: 'Acknowledge', style: 'default' }
            ]
          );
        }
      }
    } catch (error) {
      logger.error('Assessment failed:', error, { service: 'ui' });
      Alert.alert('Assessment Failed', 'Unable to analyze images. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#FF3B30';
      case 'severe': return '#FF9500';
      case 'moderate': return '#FFCC00';
      case 'minimal': return '#34C759';
      default: return theme.colors.text.secondary;
    }
  };

  const getRiskLevelIcon = (level: string) => {
    switch (level) {
      case 'critical': return 'alert-circle';
      case 'high': return 'warning';
      case 'medium': return 'information-circle';
      case 'low': return 'checkmark-circle';
      default: return 'help-circle';
    }
  };

  const submitCorrections = async () => {
    if (!assessment) return;

    // Example corrections - in real app, this would be user input
    const corrections = [
      {
        field: 'damageType',
        originalValue: assessment.damageAssessment.damageType,
        correctedValue: 'water_damage',
        userId: 'user_id',
        timestamp: new Date().toISOString(),
        confidence: 0.9
      }
    ];

    const success = await UnifiedAIServiceMobile.submitCorrections(
      assessment.id,
      corrections
    );

    if (success) {
      Alert.alert('Success', 'Your corrections have been submitted for model training');
      onCorrection?.(assessment.id, corrections);
    }
  };

  if (!assessment && !loading) {
    return (
      <TouchableOpacity
        style={styles.runAssessmentButton}
        onPress={runAssessment}
        disabled={loading || images.length === 0}
      >
        <Ionicons name="sparkles" size={24} color="#FFF" />
        <Text style={styles.runAssessmentText}>
          Run AI Building Assessment
        </Text>
        <Text style={styles.runAssessmentSubtext}>
          GPT-4 Vision + YOLO + SAM3 + Bayesian Fusion
        </Text>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Analyzing with advanced AI...</Text>
        <Text style={styles.loadingSubtext}>
          Running multiple AI models in parallel
        </Text>
      </View>
    );
  }

  if (!assessment) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={20} color={theme.colors.accent} />
          <Text style={styles.title}>AI Building Assessment</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.confidenceBadge}>
            <Text style={styles.confidenceText}>
              {Math.round(assessment.confidence)}% confidence
            </Text>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.colors.text.secondary}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <ScrollView style={styles.content}>
          {/* Damage Assessment */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Damage Assessment</Text>
            <View style={styles.damageInfo}>
              <View style={styles.damageRow}>
                <Text style={styles.label}>Type:</Text>
                <Text style={styles.value}>
                  {assessment.damageAssessment.damageType.replace(/_/g, ' ')}
                </Text>
              </View>
              <View style={styles.damageRow}>
                <Text style={styles.label}>Severity:</Text>
                <View style={[
                  styles.severityBadge,
                  { backgroundColor: getSeverityColor(assessment.damageAssessment.severity) }
                ]}>
                  <Text style={styles.severityText}>
                    {assessment.damageAssessment.severity.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.description}>
                {assessment.damageAssessment.description}
              </Text>
            </View>

            {/* Detected Issues */}
            {assessment.damageAssessment.detectedIssues.length > 0 && (
              <View style={styles.issuesList}>
                <Text style={styles.issuesTitle}>Detected Issues:</Text>
                {assessment.damageAssessment.detectedIssues.map((issue, index) => (
                  <View key={index} style={styles.issueItem}>
                    <Text style={styles.issueType}>{issue.type}</Text>
                    <Text style={styles.issueLocation}>Location: {issue.location}</Text>
                    <Text style={styles.issueSource}>
                      Source: {issue.source} ({Math.round(issue.confidence * 100)}%)
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Safety Hazards */}
          {assessment.safetyHazards.hasSafetyHazards && (
            <View style={[styles.section, styles.safetySection]}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name={getRiskLevelIcon(assessment.safetyHazards.riskLevel)}
                  size={24}
                  color={getSeverityColor(assessment.safetyHazards.riskLevel)}
                />
                <Text style={styles.sectionTitle}>Safety Hazards</Text>
              </View>
              <View style={styles.safetyContent}>
                <Text style={styles.riskLevel}>
                  Risk Level: {assessment.safetyHazards.riskLevel.toUpperCase()}
                </Text>
                {assessment.safetyHazards.criticalFlags.map((flag, index) => (
                  <View key={index} style={styles.criticalFlag}>
                    <Ionicons name="alert-circle" size={16} color="#FF3B30" />
                    <Text style={styles.criticalFlagText}>{flag}</Text>
                  </View>
                ))}
                <Text style={styles.safetyDetails}>
                  {assessment.safetyHazards.details}
                </Text>
              </View>
            </View>
          )}

          {/* Cost Estimate */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estimated Cost</Text>
            <View style={styles.costEstimate}>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Likely:</Text>
                <Text style={styles.costValue}>
                  £{assessment.estimatedCost.likely.toLocaleString()}
                </Text>
              </View>
              <View style={styles.costRange}>
                <Text style={styles.costRangeText}>
                  Range: £{assessment.estimatedCost.min.toLocaleString()} -
                  £{assessment.estimatedCost.max.toLocaleString()}
                </Text>
              </View>
              {assessment.estimatedCost.breakdown && (
                <View style={styles.costBreakdown}>
                  {assessment.estimatedCost.breakdown.map((item, index) => (
                    <View key={index} style={styles.breakdownItem}>
                      <Text style={styles.breakdownLabel}>{item.item}</Text>
                      <Text style={styles.breakdownValue}>
                        £{item.totalCost.toLocaleString()}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Insurance Risk */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Insurance Assessment</Text>
            <View style={styles.insuranceInfo}>
              <View style={styles.riskScore}>
                <Text style={styles.label}>Risk Score:</Text>
                <Text style={styles.value}>{assessment.insuranceRisk.riskScore}/100</Text>
              </View>
              <View style={styles.riskCategory}>
                <Text style={styles.label}>Category:</Text>
                <View style={[
                  styles.categoryBadge,
                  { backgroundColor: getSeverityColor(assessment.insuranceRisk.category) }
                ]}>
                  <Text style={styles.categoryText}>
                    {assessment.insuranceRisk.category.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.recommendedAction}>
                {assessment.insuranceRisk.recommendedAction}
              </Text>
            </View>
          </View>

          {/* Recommendations */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI Recommendations</Text>
            <View style={styles.recommendations}>
              {assessment.recommendations.map((rec, index) => (
                <View key={index} style={styles.recommendationItem}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                  <Text style={styles.recommendationText}>{rec}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Metadata */}
          <View style={styles.metadata}>
            <Text style={styles.metadataTitle}>Assessment Details</Text>
            <Text style={styles.metadataItem}>
              Model: {assessment.metadata.model} v{assessment.metadata.version}
            </Text>
            <Text style={styles.metadataItem}>
              Processing Time: {assessment.metadata.processingTime}ms
            </Text>
            <Text style={styles.metadataItem}>
              API Calls: {assessment.metadata.apiCalls.length}
            </Text>
            <Text style={styles.metadataItem}>
              Cost: ${assessment.metadata.costTracking.actualCost.toFixed(4)}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.correctionButton}
              onPress={() => setShowCorrections(true)}
            >
              <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.correctionButtonText}>Correct Assessment</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.refreshButton}
              onPress={runAssessment}
            >
              <Ionicons name="refresh" size={20} color={theme.colors.primary} />
              <Text style={styles.refreshButtonText}>Re-run Analysis</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  runAssessmentButton: {
    backgroundColor: theme.colors.primary,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 8,
  },
  runAssessmentText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  runAssessmentSubtext: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  loadingSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: theme.colors.text.primary,
  },
  confidenceBadge: {
    backgroundColor: theme.colors.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  confidenceText: {
    fontSize: 12,
    color: theme.colors.success,
    fontWeight: '600',
  },
  content: {
    maxHeight: 400,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  safetySection: {
    backgroundColor: '#FFF5F5',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  damageInfo: {
    gap: 8,
  },
  damageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    width: 80,
  },
  value: {
    fontSize: 14,
    color: theme.colors.text.primary,
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: theme.colors.text.primary,
    lineHeight: 20,
    marginTop: 8,
  },
  issuesList: {
    marginTop: 12,
  },
  issuesTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    color: theme.colors.text.secondary,
  },
  issueItem: {
    backgroundColor: theme.colors.background,
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  issueType: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  issueLocation: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  issueSource: {
    fontSize: 11,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },
  safetyContent: {
    gap: 8,
  },
  riskLevel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  criticalFlag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  criticalFlagText: {
    fontSize: 13,
    color: '#FF3B30',
    marginLeft: 8,
  },
  safetyDetails: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginTop: 8,
    lineHeight: 18,
  },
  costEstimate: {
    gap: 8,
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  costLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    width: 80,
  },
  costValue: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  costRange: {
    marginTop: 4,
  },
  costRangeText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  costBreakdown: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  breakdownLabel: {
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
  breakdownValue: {
    fontSize: 13,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  insuranceInfo: {
    gap: 8,
  },
  riskScore: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskCategory: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '600',
  },
  recommendedAction: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginTop: 8,
    lineHeight: 18,
  },
  recommendations: {
    gap: 8,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  recommendationText: {
    fontSize: 13,
    color: theme.colors.text.primary,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  metadata: {
    padding: 16,
    backgroundColor: theme.colors.background,
  },
  metadataTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.tertiary,
    marginBottom: 8,
  },
  metadataItem: {
    fontSize: 11,
    color: theme.colors.text.tertiary,
    marginBottom: 2,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  correctionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  correctionButtonText: {
    fontSize: 14,
    color: theme.colors.primary,
    marginLeft: 4,
  },
  refreshButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.primary + '10',
  },
  refreshButtonText: {
    fontSize: 14,
    color: theme.colors.primary,
    marginLeft: 4,
  },
});