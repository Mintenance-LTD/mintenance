// Building Assessment shared types - re-export from canonical ai-core package
export type {
  BuildingAssessment,
  DamageAssessment,
  DetectedIssue,
  SafetyHazards,
  InsuranceRisk,
  CostEstimate,
  CostBreakdown,
  AssessmentMetadata,
  ComplianceFlag,
} from '@mintenance/ai-core';

export interface BuildingAssessmentCardProps {
  images: string[];
  jobDetails?: { title: string; description: string; category: string; location: string };
  onAssessmentComplete?: (assessment: import('@mintenance/ai-core').BuildingAssessment) => void;
  onCorrection?: (assessmentId: string, corrections: unknown[]) => void;
}
