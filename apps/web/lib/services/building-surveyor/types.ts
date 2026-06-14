/**
 * Type definitions for Building Surveyor AI Assessment System
 */

/**
 * 4-tier damage severity aligned with UK landlord compliance urgency.
 * - early: Cosmetic/minor — routine maintenance
 * - developing: Progressing — needs attention within weeks
 * - significant: Serious — risk of spread, repair soon
 * - dangerous: Structural/safety risk — urgent repair required
 */
export type DamageSeverity =
  | 'early'
  | 'developing'
  | 'significant'
  | 'dangerous';

/**
 * 15 canonical damage types from damage-type-mapping.ts.
 * All GPT-4o and Qwen outputs are normalized to one of these.
 */
export type CanonicalDamageType =
  | 'pipe_leak'
  | 'water_damage'
  | 'wall_crack'
  | 'roof_damage'
  | 'electrical_fault'
  | 'mold_damp'
  | 'fire_damage'
  | 'window_broken'
  | 'door_damaged'
  | 'floor_damage'
  | 'ceiling_damage'
  | 'foundation_crack'
  | 'hvac_issue'
  | 'gutter_blocked'
  | 'general_damage'
  | 'none';

/**
 * Contractor trades for structured repair recommendations.
 */
export type ContractorTrade =
  | 'plumber'
  | 'electrician'
  | 'roofer'
  | 'structural_engineer'
  | 'plasterer'
  | 'general_builder'
  | 'damp_specialist'
  | 'gas_engineer'
  | 'drainage'
  | 'locksmith'
  | 'glazier'
  | 'pest_control';

export type UrgencyLevel =
  | 'immediate'
  | 'urgent'
  | 'soon'
  | 'planned'
  | 'monitor';

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

  // Database enrichment fields (optional for backward compatibility)
  material_id?: string; // Database UUID
  unit_price?: number; // Per-unit price from database
  total_cost?: number; // Calculated: quantity × unit_price
  source?: 'ai' | 'database'; // Enrichment source
  sku?: string; // Product SKU from database
  supplier_name?: string; // Supplier name from database
  unit?: string; // Unit type from database (meter, sqm, liter, etc.)
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
  /** Structured contractor trade recommendations */
  recommendedTrades?: ContractorTrade[];
}

/** RICS Condition Rating (1 = Green/routine, 2 = Amber/repair soon, 3 = Red/urgent) */
export type RICSConditionRating = 1 | 2 | 3;

/**
 * One distinct defect within an assessment. A scene usually has several
 * (e.g. exposed wiring + decaying timber + perished masonry), so the AI
 * returns a `findings[]` array instead of collapsing to a single defect.
 * The singular top-level fields (damageAssessment, taxonomyClassId,
 * ricsConditionRating, …) are derived from this list for back-compat:
 * the most serious finding becomes the "primary".
 */
export interface AssessmentFinding {
  /** Building element affected, e.g. 'electrical_services', 'roof_timbers', 'main_walls', 'ceilings'. */
  element: string;
  /** v3 surveyor taxonomy class id (taxonomy/taxonomy_v3.json), if one fits. */
  taxonomyClassId?: string;
  /** Legacy free-text damage type vocabulary (back-compat with single-defect consumers). */
  damageType: string;
  severity: DamageSeverity;
  /** RICS condition rating for this specific finding. */
  conditionRating?: RICSConditionRating;
  description: string;
  /** Probable cause in surveyor diagnostic language. */
  probableCause?: string;
  /** 0-100. */
  confidence: number;
  /** True for the single most serious finding (the one mirrored into the top-level fields). */
  isPrimary?: boolean;
}

export interface SpecialistReferral {
  /** Type of specialist needed (e.g. 'structural_engineer', 'asbestos_surveyor') */
  specialistType: string;
  /** Why this specialist is needed */
  reason: string;
  /** How urgent the referral is */
  urgency: 'routine' | 'soon' | 'urgent' | 'immediate';
}

export interface PropertyPatternInsight {
  /** Connected defects from previous assessments on the same property */
  connectedDefects: string[];
  /** Root cause hypothesis linking multiple defects */
  rootCauseHypothesis: string;
  /** Recommended investigation based on the pattern */
  recommendedInvestigation: string;
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
  suggestedCategories: Array<{
    category: string;
    confidence: number;
    reason: string;
  }>;
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
  /** RICS Condition Rating aligned with UK building surveying standards */
  ricsConditionRating?: RICSConditionRating;
  /** Specialist referrals — "know what you don't know" */
  specialistReferrals?: SpecialistReferral[];
  /** v3 surveyor taxonomy class id (taxonomy/taxonomy_v3.json) */
  taxonomyClassId?: string;
  /** Most likely cause in surveyor diagnostic language */
  probableCause?: string;
  /** Abstention: photos insufficient for a reliable diagnosis */
  needsOnsiteInspection?: boolean;
  /** Why the photos were insufficient (set when needsOnsiteInspection) */
  onsiteInspectionReason?: string;
  /**
   * All distinct defects across the visible building elements. The singular
   * fields above (damageAssessment, taxonomyClassId, ricsConditionRating) are
   * the derived "primary" finding; ricsConditionRating is the worst rating
   * across this list. Empty/absent on legacy single-defect rows.
   */
  findings?: AssessmentFinding[];
  /** Whole-scene narrative — what the property looks like overall (incl. work-in-progress vs defect). */
  sceneSummary?: string;
  /** Cross-property pattern insights from previous assessments */
  patternInsights?: PropertyPatternInsight;
  evidence?: {
    roboflowDetections?: RoboflowDetection[];
    visionAnalysis?: VisionAnalysisSummary | null;
    sam3Segmentation?:
      | SAM3SegmentationData
      | import('./SAM3Service').DamageTypeSegmentation
      | null; // SAM 3 precise segmentation data
    sceneGraphFeatures?:
      | import('./scene_graph_features').SceneGraphFeatures
      | null; // Scene graph features for Bayesian fusion
  };
  decisionResult?: DecisionResult; // Safe-LUCB decision with uncertainty metrics
}

export interface AssessmentContext {
  location?: string;
  propertyType?: 'residential' | 'commercial' | 'industrial';
  ageOfProperty?: number;
  propertyDetails?: string;
  propertyAge?: number;
  region?: string;
  shadowMode?: boolean;
  assessmentId?: string;
  userId?: string;
  /** Before photos fetched from job_photos_metadata for before/after comparison. */
  beforeImageUrls?: string[];
}

/**
 * Decision result from Safe-LUCB Critic
 * Contains the automate/escalate decision along with uncertainty metrics
 */
export interface DecisionResult {
  decision: 'automate' | 'escalate';
  reason?: string;
  safetyUcb: number;
  rewardUcb: number;
  safetyThreshold: number;
  exploration: boolean;
  cpStratum: string;
  cpPredictionSet: string[];
  fusionMean: number;
  fusionVariance: number;
}
