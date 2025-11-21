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

export interface RoboflowDetection {
  id: string;
  className: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  imageUrl: string;
}

export interface VisionAnalysisSummary {
  provider: 'google-vision';
  confidence: number;
  labels: Array<{ description: string; score: number }>;
  objects: Array<{ name: string; score: number }>;
  detectedFeatures: string[];
  suggestedCategories: Array<{ category: string; confidence: number; reason: string }>;
  propertyType?: string;
  condition?: 'excellent' | 'good' | 'fair' | 'poor';
  complexity?: 'simple' | 'moderate' | 'complex';
}

export interface SAM3SegmentationData {
  preciseMasks?: number[][][]; // Pixel-perfect segmentation masks
  preciseBoxes?: number[][]; // [x, y, w, h] bounding boxes
  affectedArea?: number; // Total affected area in pixels
  segmentationConfidence?: number; // SAM 3 confidence score (0-100)
  masks?: Array<{
    mask: number[][];
    box: number[];
    score: number;
  }>;
}

export interface Phase1BuildingAssessment {
  damageAssessment: DamageAssessment;
  safetyHazards: SafetyHazards;
  compliance: Compliance;
  insuranceRisk: InsuranceRisk;
  urgency: Urgency;
  homeownerExplanation: HomeownerExplanation;
  contractorAdvice: ContractorAdvice;
  evidence?: {
    roboflowDetections?: RoboflowDetection[];
    visionAnalysis?: VisionAnalysisSummary | null;
    sam3Segmentation?: SAM3SegmentationData; // SAM 3 precise segmentation data
  };
}

export interface AssessmentContext {
  location?: string;
  propertyType?: 'residential' | 'commercial' | 'industrial';
  ageOfProperty?: number;
  propertyDetails?: string;
}

