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
  /**
   * Walkthrough provenance — which keyframe this finding came from.
   *
   * A survey merges findings from up to 20 frames, so a claim like "mould above
   * the cabinets" arrives with no way to check it against what the camera
   * actually saw. These carry the frame identity through the merge so the UI
   * can show the picture the claim was made from.
   *
   * Frame INDEX, not URL: frame URLs are signed and expire, whereas the index
   * maps stably onto assessment_images.image_index for the life of the row.
   *
   * Undefined for single-photo assessments, which have only one image anyway.
   */
  /** The frame whose sighting supplied this finding's description. */
  sourceFrameIndex?: number;
  /**
   * Every frame the defect was seen in, ascending. Length is a credibility
   * signal in its own right — something spotted in one frame of twelve is
   * weaker evidence than something seen in five.
   */
  sourceFrameIndexes?: number[];
  /**
   * The finding asserts nothing is wrong ("the wall appears to be in good
   * condition"). RICS rating 1 means no repair is needed, so these are the
   * absence of a defect, not a defect — kept so "we looked and it was fine" is
   * still on the record, but flagged so the UI never lists them beside real
   * defects. Listing both made one walkthrough report the same window as
   * misaligned AND in good condition, as peers.
   */
  isClear?: boolean;
  /**
   * Seen in exactly one frame of a multi-frame walkthrough.
   *
   * A defect eleven frames disagreed with is not the same claim as one five
   * frames saw. This is where shadow-on-a-white-ceiling false positives land,
   * so it is surfaced rather than silently trusted.
   */
  unconfirmed?: boolean;
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
  /** Exact generator identity for auditability; never infer this from branding. */
  modelMetadata?: {
    provider: 'openai' | 'mint-ai';
    model: string;
    routingMode: 'teacher_only' | 'shadow_only' | 'auto' | 'student_only';
    promptVersion: string;
    latencyMs: number;
    fallbackReason?: string;
  };
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
  /**
   * Set when the walkthrough covers one room rather than the whole property,
   * so the surveyor model knows it is looking at (say) a kitchen instead of an
   * anonymous interior. The id is verified against the anchored property
   * before it is persisted — never trust it as an anchor on its own.
   */
  room?: { id?: string; name?: string; type?: string };
  /**
   * Set when this image is one keyframe of a video walkthrough.
   *
   * The surveyor prompt tells the model to report every defect it can see,
   * which is right for a single submitted photo and wrong when the same room is
   * assessed a dozen times over: it becomes a dozen independent invitations to
   * find something, and the merge keeps the worst of them. Knowing it is frame
   * 3 of 12 lets the model leave a marginal call to the frames that see it
   * better instead of guessing.
   */
  walkthroughFrame?: { index: number; total: number };
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
