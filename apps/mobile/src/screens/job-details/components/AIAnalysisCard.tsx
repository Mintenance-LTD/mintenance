/**
 * AIAnalysisCard (Building Assessment Card)
 *
 * Rich display of AI building assessment data matching the web
 * BuildingAssessmentDisplay. Falls back to simpler view when only
 * basic AIAnalysis fields are available.
 *
 * @filesize Target: <300 lines
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AIAnalysis } from '../../../services/AIAnalysisService';
import { me } from '../../../design-system/mint-editorial';
import {
  DamageSection,
  HomeownerSection,
  SafetySection,
  CostSection,
  InsuranceSection,
  RepairsSection,
  UrgencyFooter,
} from './AssessmentSections';
import { SurveyorSection, InspectionNeededSection } from './SurveyorSections';

interface AssessmentData {
  damageAssessment?: {
    damageType: string;
    severity: string;
    confidence: number;
    description: string;
    detectedItems?: string[];
  };
  ricsConditionRating?: number;
  taxonomyClassId?: string;
  probableCause?: string;
  needsOnsiteInspection?: boolean;
  onsiteInspectionReason?: string;
  safetyHazards?: {
    hasCriticalHazards: boolean;
    overallSafetyScore: number;
    hazards: Array<{ type: string; description: string }>;
  };
  homeownerExplanation?: { whatIsIt: string; whatToDo: string };
  contractorAdvice?: {
    estimatedCost?: { min: number; recommended: number; max: number };
    estimatedTime?: string;
    materials?: Array<{
      name: string;
      quantity: string;
      estimatedCost: number;
    }>;
    repairNeeded?: string[];
  };
  insuranceRisk?: {
    riskScore: number;
    premiumImpact: string;
    mitigationSuggestions?: string[];
  };
  urgency?: { urgency: string; recommendedActionTimeline: string };
}

interface BuildingAssessmentCardProps {
  aiAnalysis:
    | (AIAnalysis & {
        assessmentData?: Record<string, unknown>;
        source?: string;
      })
    | null;
  aiLoading: boolean;
}

export const AIAnalysisCard: React.FC<BuildingAssessmentCardProps> = ({
  aiAnalysis,
  aiLoading,
}) => {
  const [expanded, setExpanded] = useState(true);

  if (aiLoading) {
    return (
      <View style={st.container}>
        <View style={st.header}>
          <Ionicons
            name='sparkles'
            size={20}
            color='#8B5CF6'
            accessible={false}
          />
          <Text style={st.title} accessibilityRole='header'>
            Building Assessment
          </Text>
        </View>
        <View style={st.loadingRow}>
          <ActivityIndicator
            size='small'
            color={me.ink}
            accessibilityLabel='Analyzing job photos'
          />
          <Text style={st.loadingText}>Analyzing job photos...</Text>
        </View>
      </View>
    );
  }

  if (!aiAnalysis) return null;

  const data = aiAnalysis.assessmentData as AssessmentData | undefined;
  const hasRichData = Boolean(data?.damageAssessment);
  const rawConf = data?.damageAssessment?.confidence ?? aiAnalysis.confidence;
  const confPct = Math.min(
    100,
    Math.round(rawConf > 1 ? rawConf : rawConf * 100)
  );

  if (!hasRichData)
    return <LegacyCard aiAnalysis={aiAnalysis} confPct={confPct} />;

  const a = data!;
  return (
    <View
      style={st.container}
      accessibilityLabel={`Building Assessment: ${confPct}% confidence`}
    >
      <TouchableOpacity
        style={st.header}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel={
          expanded ? 'Collapse assessment' : 'Expand assessment'
        }
      >
        <Ionicons
          name='sparkles'
          size={20}
          color='#8B5CF6'
          accessible={false}
        />
        <Text style={st.title} accessibilityRole='header'>
          Building Assessment
        </Text>
        <View style={st.badge}>
          <Text style={st.badgeText}>{confPct}% confidence</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={me.ink3}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={st.body}>
          {a.needsOnsiteInspection && (
            <InspectionNeededSection reason={a.onsiteInspectionReason} />
          )}
          {a.damageAssessment && (
            <DamageSection
              damageType={a.damageAssessment.damageType}
              severity={a.damageAssessment.severity}
              description={a.damageAssessment.description}
              detectedItems={a.damageAssessment.detectedItems}
            />
          )}
          <SurveyorSection
            ricsConditionRating={a.ricsConditionRating}
            taxonomyClassId={a.taxonomyClassId}
            probableCause={a.probableCause}
          />
          {a.homeownerExplanation && (
            <HomeownerSection
              whatIsIt={a.homeownerExplanation.whatIsIt}
              whatToDo={a.homeownerExplanation.whatToDo}
            />
          )}
          {a.safetyHazards?.hasCriticalHazards && (
            <SafetySection
              safetyScore={a.safetyHazards.overallSafetyScore}
              hazards={a.safetyHazards.hazards}
            />
          )}
          {a.contractorAdvice?.estimatedCost && (
            <CostSection
              min={a.contractorAdvice.estimatedCost.min}
              recommended={a.contractorAdvice.estimatedCost.recommended}
              max={a.contractorAdvice.estimatedCost.max}
              estimatedTime={a.contractorAdvice.estimatedTime}
              materials={a.contractorAdvice.materials}
            />
          )}
          {a.insuranceRisk && (
            <InsuranceSection
              riskScore={a.insuranceRisk.riskScore}
              premiumImpact={a.insuranceRisk.premiumImpact}
              mitigationSuggestions={a.insuranceRisk.mitigationSuggestions}
            />
          )}
          {(a.contractorAdvice?.repairNeeded?.length ?? 0) > 0 && (
            <RepairsSection repairs={a.contractorAdvice!.repairNeeded!} />
          )}
          {a.urgency && (
            <UrgencyFooter
              urgency={a.urgency.urgency}
              timeline={a.urgency.recommendedActionTimeline}
            />
          )}
        </View>
      )}
    </View>
  );
};

// --- Legacy fallback for basic AIAnalysis (no assessmentData) ---

function LegacyCard({
  aiAnalysis,
  confPct,
}: {
  aiAnalysis: AIAnalysis;
  confPct: number;
}) {
  return (
    <View
      style={st.container}
      accessibilityLabel={`AI Analysis: ${aiAnalysis.estimatedComplexity} complexity, ${confPct}% confidence`}
    >
      <View style={st.header}>
        <Ionicons
          name='sparkles'
          size={20}
          color='#8B5CF6'
          accessible={false}
        />
        <Text style={st.title} accessibilityRole='header'>
          AI Analysis
        </Text>
        <View style={st.badge}>
          <Text style={st.badgeText}>{confPct}% confidence</Text>
        </View>
      </View>
      <View style={st.body}>
        <Text style={st.label}>Estimated Complexity</Text>
        <Text style={st.value}>{aiAnalysis.estimatedComplexity}</Text>
        <Text style={st.label}>Estimated Duration</Text>
        <Text style={st.value}>{aiAnalysis.estimatedDuration}</Text>
        {aiAnalysis.suggestedTools && aiAnalysis.suggestedTools.length > 0 && (
          <>
            <Text style={st.label}>Suggested Tools</Text>
            <View style={st.chipRow}>
              {aiAnalysis.suggestedTools.map((tool: string, i: number) => (
                <View key={i} style={st.chip}>
                  <Text style={st.chipText}>{tool}</Text>
                </View>
              ))}
            </View>
          </>
        )}
        {aiAnalysis.recommendedActions &&
          aiAnalysis.recommendedActions.length > 0 && (
            <>
              <Text style={st.label}>Recommended Actions</Text>
              {aiAnalysis.recommendedActions.map(
                (action: string, i: number) => (
                  <Text key={i} style={st.actionText}>
                    {action}
                  </Text>
                )
              )}
            </>
          )}
      </View>
    </View>
  );
}

// --- Styles ---

const st = StyleSheet.create({
  container: {
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...me.shadow.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: { fontSize: 18, fontWeight: '700', color: me.ink, flex: 1 },
  badge: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '600', color: me.onBrand },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingText: { fontSize: 15, color: me.ink2 },
  body: { marginTop: 4 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 12,
  },
  value: { fontSize: 15, color: me.ink, fontWeight: '500', marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  chip: {
    backgroundColor: me.bg2,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipText: { fontSize: 13, color: me.ink },
  actionText: { fontSize: 15, color: me.ink2, lineHeight: 20, marginTop: 2 },
});
