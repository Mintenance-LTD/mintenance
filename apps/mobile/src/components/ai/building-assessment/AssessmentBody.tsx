import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import { BuildingAssessment } from './types';

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return '#FF3B30';
    case 'severe': return '#FF9500';
    case 'moderate': return '#FFCC00';
    case 'minimal': return '#34C759';
    default: return theme.colors.textSecondary;
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
interface Props { assessment: BuildingAssessment; onSubmitCorrections: () => void; onRerun: () => void }

export const AssessmentBody: React.FC<Props> = ({ assessment, onSubmitCorrections, onRerun }) => (
  <ScrollView style={styles.content}>
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Damage Assessment</Text>
      <View style={styles.damageInfo}>
        <View style={styles.damageRow}>
          <Text style={styles.label}>Type:</Text>
          <Text style={styles.value}>{assessment.damageAssessment.damageType.replace(/_/g, ' ')}</Text>
        </View>
        <View style={styles.damageRow}>
          <Text style={styles.label}>Severity:</Text>
          <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(assessment.damageAssessment.severity) }]}>
            <Text style={styles.severityText}>{assessment.damageAssessment.severity.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.description}>{assessment.damageAssessment.description}</Text>
      </View>
      {assessment.damageAssessment.detectedIssues.length > 0 && (
        <View style={styles.issuesList}>
          <Text style={styles.issuesTitle}>Detected Issues:</Text>
          {assessment.damageAssessment.detectedIssues.map((issue, index) => (
            <View key={index} style={styles.issueItem}>
              <Text style={styles.issueType}>{issue.type}</Text>
              <Text style={styles.issueLocation}>Location: {issue.location}</Text>
              <Text style={styles.issueSource}>Source: {issue.source} ({Math.round(issue.confidence * 100)}%)</Text>
            </View>
          ))}
        </View>
      )}
    </View>
    {assessment.safetyHazards.hasSafetyHazards && (
      <View style={[styles.section, styles.safetySection]}>
        <View style={styles.sectionHeader}>
          <Ionicons name={getRiskLevelIcon(assessment.safetyHazards.riskLevel)} size={24} color={getSeverityColor(assessment.safetyHazards.riskLevel)} />
          <Text style={styles.sectionTitle}>Safety Hazards</Text>
        </View>
        <View style={styles.safetyContent}>
          <Text style={styles.riskLevel}>Risk Level: {assessment.safetyHazards.riskLevel.toUpperCase()}</Text>
          {assessment.safetyHazards.criticalFlags.map((flag, index) => (
            <View key={index} style={styles.criticalFlag}>
              <Ionicons name='alert-circle' size={16} color='#FF3B30' />
              <Text style={styles.criticalFlagText}>{flag}</Text>
            </View>
          ))}
          <Text style={styles.safetyDetails}>{assessment.safetyHazards.details}</Text>
        </View>
      </View>
    )}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Estimated Cost</Text>
      <View style={styles.costEstimate}>
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>Likely:</Text>
          <Text style={styles.costValue}>£{assessment.estimatedCost.likely.toLocaleString()}</Text>
        </View>
        <View style={styles.costRange}>
          <Text style={styles.costRangeText}>Range: £{assessment.estimatedCost.min.toLocaleString()} - £{assessment.estimatedCost.max.toLocaleString()}</Text>
        </View>
        {assessment.estimatedCost.breakdown && (
          <View style={styles.costBreakdown}>
            {assessment.estimatedCost.breakdown.map((item, index) => (
              <View key={index} style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>{item.item}</Text>
                <Text style={styles.breakdownValue}>£{item.totalCost.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Insurance Assessment</Text>
      <View style={styles.insuranceInfo}>
        <View style={styles.riskScore}>
          <Text style={styles.label}>Risk Score:</Text>
          <Text style={styles.value}>{assessment.insuranceRisk.riskScore}/100</Text>
        </View>
        <View style={styles.riskCategory}>
          <Text style={styles.label}>Category:</Text>
          <View style={[styles.categoryBadge, { backgroundColor: getSeverityColor(assessment.insuranceRisk.category) }]}>
            <Text style={styles.categoryText}>{assessment.insuranceRisk.category.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.recommendedAction}>{assessment.insuranceRisk.recommendedAction}</Text>
      </View>
    </View>
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>AI Recommendations</Text>
      <View style={styles.recommendations}>
        {assessment.recommendations.map((rec, index) => (
          <View key={index} style={styles.recommendationItem}>
            <Ionicons name='checkmark-circle' size={16} color={theme.colors.success} />
            <Text style={styles.recommendationText}>{rec}</Text>
          </View>
        ))}
      </View>
    </View>
    <View style={styles.metadata}>
      <Text style={styles.metadataTitle}>Assessment Details</Text>
      <Text style={styles.metadataItem}>Model: {assessment.metadata.model} v{assessment.metadata.version}</Text>
      <Text style={styles.metadataItem}>Processing Time: {assessment.metadata.processingTime}ms</Text>
      <Text style={styles.metadataItem}>API Calls: {assessment.metadata.apiCalls.length}</Text>
      <Text style={styles.metadataItem}>Cost: ${assessment.metadata.costTracking.actualCost.toFixed(4)}</Text>
    </View>
    <View style={styles.actions}>
      <TouchableOpacity style={styles.correctionButton} onPress={onSubmitCorrections}>
        <Ionicons name='create-outline' size={20} color={theme.colors.primary} />
        <Text style={styles.correctionButtonText}>Correct Assessment</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.refreshButton} onPress={onRerun}>
        <Ionicons name='refresh' size={20} color={theme.colors.primary} />
        <Text style={styles.refreshButtonText}>Re-run Analysis</Text>
      </TouchableOpacity>
    </View>
  </ScrollView>
);

const styles = StyleSheet.create({
  content: { maxHeight: 400 },
  section: { padding: 16 },
  safetySection: { backgroundColor: "#FFF5F5" },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: 12 },
  damageInfo: { gap: 8 },
  damageRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  label: { fontSize: 14, color: theme.colors.textSecondary, width: 80 },
  value: { fontSize: 14, color: theme.colors.textPrimary, flex: 1 },
  severityBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  severityText: { color: "#FFF", fontSize: 12, fontWeight: "600" },
  description: { fontSize: 14, color: theme.colors.textPrimary, lineHeight: 20, marginTop: 8 },
  issuesList: { marginTop: 12 },
  issuesTitle: { fontSize: 13, fontWeight: "600", marginBottom: 8, color: theme.colors.textSecondary },
  issueItem: { backgroundColor: theme.colors.background, padding: 8, borderRadius: 8, marginBottom: 8 },
  issueType: { fontSize: 13, fontWeight: "600", color: theme.colors.textPrimary },
  issueLocation: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  issueSource: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 2 },
  safetyContent: { gap: 8 },
  riskLevel: { fontSize: 14, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: 8 },
  criticalFlag: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  criticalFlagText: { fontSize: 13, color: "#FF3B30", marginLeft: 8 },
  safetyDetails: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 8, lineHeight: 18 },
  costEstimate: { gap: 8 },
  costRow: { flexDirection: "row", alignItems: "center" },
  costLabel: { fontSize: 14, color: theme.colors.textSecondary, width: 80 },
  costValue: { fontSize: 18, fontWeight: "700", color: theme.colors.textPrimary },
  costRange: { marginTop: 4 },
  costRangeText: { fontSize: 12, color: theme.colors.textSecondary },
  costBreakdown: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border },
  breakdownItem: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  breakdownLabel: { fontSize: 13, color: theme.colors.textSecondary },
  breakdownValue: { fontSize: 13, color: theme.colors.textPrimary, fontWeight: "500" },
  insuranceInfo: { gap: 8 },
  riskScore: { flexDirection: "row", alignItems: "center" },
  riskCategory: { flexDirection: "row", alignItems: "center" },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  categoryText: { fontSize: 11, color: "#FFF", fontWeight: "600" },
  recommendedAction: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 8, lineHeight: 18 },
  recommendations: { gap: 8 },
  recommendationItem: { flexDirection: "row", alignItems: "flex-start" },
  recommendationText: { fontSize: 13, color: theme.colors.textPrimary, marginLeft: 8, flex: 1, lineHeight: 18 },
  metadata: { padding: 16, backgroundColor: theme.colors.background },
  metadataTitle: { fontSize: 12, fontWeight: "600", color: theme.colors.textTertiary, marginBottom: 8 },
  metadataItem: { fontSize: 11, color: theme.colors.textTertiary, marginBottom: 2 },
  actions: { flexDirection: "row", padding: 16, gap: 12 },
  correctionButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border },
  correctionButtonText: { fontSize: 14, color: theme.colors.textPrimary, marginLeft: 4 },
  refreshButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 12, borderRadius: 8, backgroundColor: theme.colors.primary + "10" },
  refreshButtonText: { fontSize: 14, color: theme.colors.primary, marginLeft: 4 },
});