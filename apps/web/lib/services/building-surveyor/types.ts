/**
 * Type definitions for Building Surveyor AI Assessment System
 */

export type DamageSeverity = 'early' | 'midway' | 'full';

export type UrgencyLevel = 'immediate' | 'urgent' | 'soon' | 'planned' | 'monitor';

export type SafetyHazardSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ComplianceSeverity = 'info' | 'warning' | 'violation';

export type PremiumImpact = 'none' | 'low' | 'medium' | 'high';

export interface DamageAssessment {
  damageType: string;
  severity: DamageSeverity;
  confidence: number; // 0-100
  location: string;
  description: string;
  detectedItems: string[];
}

export interface SafetyHazard {
  type: string;
  severity: SafetyHazardSeverity;
  location: string;
  description: string;
  immediateAction?: string;
  urgency: UrgencyLevel;
}

export interface SafetyHazards {
  hazards: SafetyHazard[];
  hasCriticalHazards: boolean;
  overallSafetyScore: number; // 0-100
}

export interface ComplianceIssue {
  issue: string;
  regulation?: string;
  severity: ComplianceSeverity;
  description: string;
  recommendation: string;
}

export interface Compliance {
  complianceIssues: ComplianceIssue[];
  requiresProfessionalInspection: boolean;
  complianceScore: number; // 0-100
}

export interface RiskFactor {
  factor: string;
  severity: 'low' | 'medium' | 'high';
  impact: string;
}

export interface InsuranceRisk {
  riskFactors: RiskFactor[];
  riskScore: number; // 0-100
  premiumImpact: PremiumImpact;
  mitigationSuggestions: string[];
}

export interface Urgency {
  urgency: UrgencyLevel;
  recommendedActionTimeline: string;
  estimatedTimeToWorsen?: string;
  reasoning: string;
  priorityScore: number; // 0-100
}

export interface HomeownerExplanation {
  whatIsIt: string;
  whyItHappened: string;
  whatToDo: string;
}

export interface Material {
  name: string;
  quantity: string;
  estimatedCost: number;
}

export interface ContractorAdvice {
  repairNeeded: string[];
  materials: Material[];
  tools: string[];
  estimatedTime: string;
  estimatedCost: {
    min: number;
    max: number;
    recommended: number;
  };
  complexity: 'low' | 'medium' | 'high';
}

export interface Phase1BuildingAssessment {
  damageAssessment: DamageAssessment;
  safetyHazards: SafetyHazards;
  compliance: Compliance;
  insuranceRisk: InsuranceRisk;
  urgency: Urgency;
  homeownerExplanation: HomeownerExplanation;
  contractorAdvice: ContractorAdvice;
}

export interface AssessmentContext {
  location?: string;
  propertyType?: 'residential' | 'commercial' | 'industrial';
  ageOfProperty?: number;
  propertyDetails?: string;
}

