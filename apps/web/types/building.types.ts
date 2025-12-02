/**
 * Building assessment and ML engine types
 */

/**
 * Building assessment result
 */
export interface BuildingAssessmentResult {
  id: string;
  property_id?: string;
  user_id: string;
  assessment_type: 'exterior' | 'interior' | 'roof' | 'foundation' | 'electrical' | 'plumbing' | 'full';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  images: AssessmentImage[];
  detections: YOLODetection[];
  analysis: AssessmentAnalysis;
  recommendations: AssessmentRecommendation[];
  confidence_score: number;
  processing_time_ms: number;
  model_version: string;
  created_at: string;
  updated_at: string;
}

/**
 * Image used in assessment
 */
export interface AssessmentImage {
  id: string;
  assessment_id: string;
  url: string;
  thumbnail_url?: string;
  original_filename: string;
  file_size: number;
  width: number;
  height: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  captured_at?: string;
  annotations?: ImageAnnotation[];
}

/**
 * Image annotation for detected issues
 */
export interface ImageAnnotation {
  id: string;
  image_id: string;
  detection_id: string;
  bounding_box: BoundingBox;
  label: string;
  color: string;
}

/**
 * Bounding box for detection
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * YOLO detection result
 */
export interface YOLODetection {
  id: string;
  assessment_id: string;
  image_id: string;
  class_name: string;
  class_id: number;
  confidence: number;
  bounding_box: BoundingBox;
  severity: 'minor' | 'moderate' | 'severe' | 'critical';
  category: string;
  description?: string;
  requires_attention: boolean;
  estimated_cost_range?: {
    min: number;
    max: number;
    currency: string;
  };
}

/**
 * Assessment analysis summary
 */
export interface AssessmentAnalysis {
  overall_condition: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  condition_score: number; // 0-100
  issues_found: number;
  critical_issues: number;
  categories: {
    category: string;
    condition: string;
    issues_count: number;
    details: string;
  }[];
  summary: string;
  next_assessment_recommended: string;
}

/**
 * Recommendation from assessment
 */
export interface AssessmentRecommendation {
  id: string;
  assessment_id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  title: string;
  description: string;
  estimated_cost: {
    min: number;
    max: number;
    currency: string;
  };
  estimated_duration: string;
  contractor_type: string;
  diy_possible: boolean;
  safety_concern: boolean;
}

/**
 * Titans feedback for model improvement
 */
export interface TitansFeedback {
  id: string;
  assessment_id: string;
  detection_id?: string;
  feedback_type: 'correct' | 'incorrect' | 'missed' | 'false_positive';
  user_id: string;
  original_label?: string;
  corrected_label?: string;
  corrected_bounding_box?: BoundingBox;
  notes?: string;
  used_for_training: boolean;
  training_batch_id?: string;
  created_at: string;
}

/**
 * Model training batch
 */
export interface TrainingBatch {
  id: string;
  model_version: string;
  feedback_count: number;
  status: 'pending' | 'training' | 'completed' | 'failed';
  accuracy_before?: number;
  accuracy_after?: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  created_at: string;
}

/**
 * A/B test for feature extraction
 */
export interface FeatureABTest {
  id: string;
  name: string;
  description: string;
  variant_a: FeatureVariant;
  variant_b: FeatureVariant;
  traffic_split: number; // 0-1, percentage to variant B
  status: 'draft' | 'running' | 'paused' | 'completed';
  start_date?: string;
  end_date?: string;
  results?: ABTestResults;
  created_at: string;
  updated_at: string;
}

export interface FeatureVariant {
  id: string;
  name: string;
  config: Record<string, unknown>;
  model_version?: string;
}

export interface ABTestResults {
  variant_a: {
    samples: number;
    accuracy: number;
    avg_confidence: number;
    false_positives: number;
    false_negatives: number;
  };
  variant_b: {
    samples: number;
    accuracy: number;
    avg_confidence: number;
    false_positives: number;
    false_negatives: number;
  };
  winner?: 'a' | 'b' | 'tie';
  statistical_significance: number;
}

/**
 * Memory entry for ML engine
 */
export interface MemoryEntry {
  id: string;
  session_id: string;
  user_id: string;
  entry_type: 'interaction' | 'preference' | 'feedback' | 'context';
  content: string;
  embedding?: number[];
  metadata: Record<string, unknown>;
  importance_score: number;
  decay_rate: number;
  expires_at?: string;
  created_at: string;
  accessed_at: string;
}

/**
 * Memory session
 */
export interface MemorySession {
  id: string;
  user_id: string;
  context: string;
  entries_count: number;
  total_interactions: number;
  started_at: string;
  last_activity_at: string;
  ended_at?: string;
}

/**
 * Analytics event from ML engine
 */
export interface AnalyticsEvent {
  id: string;
  event_type: string;
  user_id?: string;
  session_id?: string;
  properties: Record<string, unknown>;
  timestamp: string;
}

/**
 * Memory analytics summary
 */
export interface MemoryAnalytics {
  total_entries: number;
  entries_by_type: Record<string, number>;
  average_importance: number;
  memory_utilization: number;
  retrieval_accuracy: number;
  top_topics: { topic: string; count: number }[];
  activity_over_time: { date: string; count: number }[];
}

/**
 * Insurance risk assessment
 */
export interface InsuranceRiskAssessment {
  id: string;
  assessment_id: string;
  property_id?: string;
  risk_score: number; // 0-100
  risk_level: 'low' | 'medium' | 'high' | 'very_high';
  risk_factors: RiskFactor[];
  estimated_premium_impact: number;
  recommendations: string[];
  valid_until: string;
  created_at: string;
}

export interface RiskFactor {
  category: string;
  factor: string;
  severity: 'low' | 'medium' | 'high';
  impact_score: number;
  description: string;
  mitigations?: string[];
}

/**
 * Compliance check result
 */
export interface ComplianceCheck {
  id: string;
  assessment_id: string;
  regulation: string;
  jurisdiction: string;
  status: 'compliant' | 'non_compliant' | 'needs_review' | 'not_applicable';
  issues: ComplianceIssue[];
  checked_at: string;
}

export interface ComplianceIssue {
  id: string;
  code: string;
  description: string;
  severity: 'minor' | 'major' | 'critical';
  regulation_reference: string;
  recommended_action: string;
}

/**
 * Safety analysis result
 */
export interface SafetyAnalysis {
  id: string;
  assessment_id: string;
  overall_safety_score: number;
  hazards: SafetyHazard[];
  immediate_actions: string[];
  created_at: string;
}

export interface SafetyHazard {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  description: string;
  detection_id?: string;
  recommended_action: string;
  requires_evacuation: boolean;
}

/**
 * Correction data for assessment
 */
export interface CorrectionData {
  assessment_id: string;
  corrections: DetectionCorrection[];
  additional_issues: ManualIssue[];
  notes?: string;
  submitted_by: string;
  submitted_at: string;
}

export interface DetectionCorrection {
  detection_id: string;
  action: 'confirm' | 'reject' | 'modify';
  corrected_label?: string;
  corrected_severity?: string;
  corrected_bounding_box?: BoundingBox;
  notes?: string;
}

export interface ManualIssue {
  image_id: string;
  label: string;
  severity: string;
  bounding_box: BoundingBox;
  description?: string;
}

