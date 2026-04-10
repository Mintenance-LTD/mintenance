'use client';

import React from 'react';
import { Icon } from '@/components/ui/Icon';
import type { Phase1BuildingAssessment } from '@/lib/services/building-surveyor/types';
import { DamageAssessmentCard } from './BuildingAssessment/DamageSection';
import { SafetyHazardsCard } from './BuildingAssessment/SafetySection';
import { ComplianceFlagsCard } from './BuildingAssessment/ComplianceSection';
import { ContractorAdviceCard } from './BuildingAssessment/CostSection';
import {
  AIDisclaimerBanner,
  UrgencyBadge,
  InsuranceRiskCard,
  HomeownerExplanationCard,
} from './BuildingAssessment/SupplementarySections';

// Re-export extracted sections to preserve public API
interface BuildingAssessmentDisplayProps {
  assessment: Phase1BuildingAssessment;
  onUseAssessment?: () => void;
}

/**
 * Main component to display building assessment results
 */
export function BuildingAssessmentDisplay({
  assessment,
  onUseAssessment,
}: BuildingAssessmentDisplayProps) {
  return (
    <div className='space-y-4'>
      {/* AI Disclaimer - Legal requirement */}
      <AIDisclaimerBanner />

      {/* Urgency Badge - Always visible at top */}
      <UrgencyBadge urgency={assessment.urgency} />

      {/* Damage Assessment - Main card */}
      <DamageAssessmentCard damageAssessment={assessment.damageAssessment} />

      {/* Safety Hazards - Critical if hasCriticalHazards */}
      {assessment.safetyHazards.hasCriticalHazards && (
        <SafetyHazardsCard safetyHazards={assessment.safetyHazards} />
      )}

      {/* Compliance Flags */}
      {assessment.compliance.complianceIssues.length > 0 && (
        <ComplianceFlagsCard compliance={assessment.compliance} />
      )}

      {/* Insurance Risk */}
      <InsuranceRiskCard insuranceRisk={assessment.insuranceRisk} />

      {/* Homeowner Explanation */}
      <HomeownerExplanationCard explanation={assessment.homeownerExplanation} />

      {/* Contractor Advice */}
      <ContractorAdviceCard advice={assessment.contractorAdvice} />

      {/* Use Assessment Button */}
      {onUseAssessment && (
        <div className='pt-4'>
          <button
            onClick={onUseAssessment}
            className='w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-[560] rounded-lg transition-colors duration-200 flex items-center justify-center gap-2'
          >
            <Icon name='check' size={20} />
            Use AI Assessment in Job Posting
          </button>
        </div>
      )}

      {/* Repeated disclaimer at bottom */}
      <div className='text-xs font-[460] text-gray-500 text-center px-4 pt-2'>
        This AI-generated assessment is for informational purposes only and does
        not constitute a professional building survey, structural engineering
        report, or legal/insurance advice. Always consult a qualified
        professional.
      </div>
    </div>
  );
}
