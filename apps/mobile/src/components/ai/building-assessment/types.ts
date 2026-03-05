// Building Assessment shared types

export interface BuildingAssessment {
  id: string;
  confidence: number;
  overallCondition: string;
  urgencyLevel: string;
  structuralIntegrity: number;
  damageAssessment: {
    damageType: string;
    severity: string;
    description: string;
    detectedIssues: { type: string; location: string; source: string; confidence: number }[];
  };
  safetyHazards: {
    hasSafetyHazards: boolean;
    riskLevel: string;
    criticalFlags: string[];
    details: string;
  };
  estimatedCost: {
    likely: number;
    min: number;
    max: number;
    breakdown?: { item: string; totalCost: number }[];
  };
  insuranceRisk: {
    riskScore: number;
    category: string;
    recommendedAction: string;
  };
  recommendations: string[];
  metadata: {
    model: string;
    version: string;
    processingTime: number;
    apiCalls: string[];
    costTracking: { actualCost: number };
  };
}

export interface BuildingAssessmentCardProps {
  images: string[];
  jobDetails?: { title: string; description: string; category: string; location: string };
  onAssessmentComplete?: (assessment: BuildingAssessment) => void;
  onCorrection?: (assessmentId: string, corrections: unknown[]) => void;
}