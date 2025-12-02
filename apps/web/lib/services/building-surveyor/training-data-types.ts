/**
 * Type definitions for SAM3-Enhanced Training Data Collection System
 */

import type { Phase1BuildingAssessment, SAM3SegmentationData } from './types';

// ============================================================================
// GPT-4 Training Labels
// ============================================================================

export interface GPT4TrainingLabel {
  id?: string;
  assessmentId: string;
  imageUrls: string[];
  gpt4Response: Phase1BuildingAssessment;
  damageType: string;
  severity: 'early' | 'midway' | 'full';
  confidence: number;
  safetyHazards: unknown[];
  complianceIssues: unknown[];
  insuranceRisk: unknown;
  contextData: Record<string, unknown>;
  usedInTraining: boolean;
  trainingVersion?: string;
  trainingJobId?: string;
  responseQuality?: 'high' | 'medium' | 'low' | 'uncertain';
  humanVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface GPT4TrainingLabelInput {
  assessmentId: string;
  imageUrls: string[];
  gpt4Response: Phase1BuildingAssessment;
  contextData?: Record<string, unknown>;
  responseQuality?: 'high' | 'medium' | 'low' | 'uncertain';
}

// ============================================================================
// SAM3 Training Masks
// ============================================================================

export interface SAM3TrainingMask {
  id?: string;
  assessmentId: string;
  imageUrl: string;
  imageIndex: number;
  damageType: string;
  masks: number[][][]; // [instance][height][width]
  boxes: number[][]; // [instance][x, y, w, h]
  scores: number[];
  numInstances: number;
  totalAffectedArea?: number;
  averageConfidence?: number;
  yoloCorrectionId?: string;
  usedInTraining: boolean;
  trainingVersion?: string;
  trainingJobId?: string;
  segmentationQuality?: 'excellent' | 'good' | 'fair' | 'poor';
  humanVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  verificationNotes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SAM3TrainingMaskInput {
  assessmentId: string;
  imageUrl: string;
  imageIndex?: number;
  damageType: string;
  masks: number[][][];
  boxes: number[][];
  scores: number[];
  numInstances: number;
  totalAffectedArea?: number;
  yoloCorrectionId?: string;
  segmentationQuality?: 'excellent' | 'good' | 'fair' | 'poor';
}

// ============================================================================
// Knowledge Distillation Jobs
// ============================================================================

export type KnowledgeDistillationJobType =
  | 'damage_classifier'
  | 'segmentation_model'
  | 'yolo_enhancement';

export type KnowledgeDistillationJobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface KnowledgeDistillationJob {
  id: string;
  jobType: KnowledgeDistillationJobType;
  status: KnowledgeDistillationJobStatus;
  config: TrainingConfig;
  trainingSamplesCount: number;
  validationSamplesCount?: number;
  gpt4LabelIds?: string[];
  sam3MaskIds?: string[];
  yoloCorrectionIds?: string[];
  modelVersion: string;
  baseModelVersion?: string;
  metricsJsonb: TrainingMetrics;
  outputModelPath?: string;
  startedAt?: Date;
  completedAt?: Date;
  durationSeconds?: number;
  errorMessage?: string;
  errorStack?: string;
  retryCount: number;
  triggeredBy: 'scheduled' | 'manual' | 'accuracy_drop' | 'threshold_reached';
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TrainingConfig {
  learningRate?: number;
  batchSize?: number;
  epochs?: number;
  optimizer?: string;
  lossFunction?: string;
  augmentation?: Record<string, unknown>;
  validationSplit?: number;
  earlyStopping?: {
    patience: number;
    minDelta: number;
  };
  [key: string]: unknown;
}

export interface TrainingMetrics {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  loss?: number;
  valLoss?: number;
  valAccuracy?: number;
  mAP?: number; // Mean Average Precision (for object detection)
  iou?: number; // Intersection over Union (for segmentation)
  confusionMatrix?: number[][];
  classMetrics?: Record<
    string,
    {
      precision: number;
      recall: number;
      f1: number;
      support: number;
    }
  >;
  [key: string]: unknown;
}

export interface KnowledgeDistillationJobInput {
  jobType: KnowledgeDistillationJobType;
  config: TrainingConfig;
  trainingSamplesCount: number;
  validationSamplesCount?: number;
  gpt4LabelIds?: string[];
  sam3MaskIds?: string[];
  yoloCorrectionIds?: string[];
  modelVersion: string;
  baseModelVersion?: string;
  triggeredBy?: 'scheduled' | 'manual' | 'accuracy_drop' | 'threshold_reached';
  notes?: string;
}

// ============================================================================
// SAM3 Pseudo Labels
// ============================================================================

export interface SAM3PseudoLabel {
  id?: string;
  imageUrl: string;
  imageHash?: string;
  damageTypesDetected: string[];
  segmentationData: Record<
    string,
    {
      masks: number[][][];
      boxes: number[][];
      scores: number[];
      numInstances: number;
    }
  >;
  overallConfidence?: number;
  minConfidence?: number;
  maxConfidence?: number;
  yoloLabels?: string;
  passesQualityThreshold: boolean;
  qualityScore?: number;
  usedInTraining: boolean;
  trainingVersion?: string;
  humanReviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewDecision?: 'approved' | 'rejected' | 'needs_revision';
  reviewNotes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SAM3PseudoLabelInput {
  imageUrl: string;
  imageHash?: string;
  damageTypesDetected: string[];
  segmentationData: Record<
    string,
    {
      masks: number[][][];
      boxes: number[][];
      scores: number[];
      numInstances: number;
    }
  >;
  yoloLabels?: string;
  qualityScore?: number;
}

// ============================================================================
// Enhanced Detection Types
// ============================================================================

export interface EnhancedYOLODetection {
  // Original YOLO data
  classId: number;
  className: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  // SAM3-enhanced data
  preciseMask?: number[][];
  preciseBox?: number[];
  segmentationConfidence?: number;
  affectedArea?: number;

  // Combined confidence
  fusedConfidence?: number;
  fusionMethod?: 'yolo_only' | 'sam3_only' | 'weighted_average' | 'max';
}

// ============================================================================
// Training Data Export
// ============================================================================

export interface YOLOTrainingExport {
  // Metadata
  exportId: string;
  exportDate: Date;
  totalSamples: number;
  classDistribution: Record<string, number>;

  // Data sources
  sources: {
    yoloCorrections: number;
    sam3Masks: number;
    pseudoLabels: number;
    baseDataset: number;
  };

  // Files
  files: {
    images: string[]; // Paths to image files
    labels: string[]; // Paths to YOLO label files
    dataYaml: string; // Path to data.yaml
  };

  // Quality metrics
  qualityMetrics: {
    averageConfidence: number;
    humanVerifiedRatio: number;
    sam3EnhancedRatio: number;
  };
}

export interface TrainingDataExportOptions {
  includeYOLOCorrections?: boolean;
  includeSAM3Masks?: boolean;
  includePseudoLabels?: boolean;
  minConfidence?: number;
  onlyHumanVerified?: boolean;
  onlySAM3Enhanced?: boolean;
  maxSamples?: number;
  outputDirectory: string;
}

// ============================================================================
// Distillation Statistics
// ============================================================================

export interface DistillationStats {
  gpt4Labels: {
    total: number;
    unused: number;
    verified: number;
    byDamageType: Record<string, number>;
    bySeverity: Record<string, number>;
    averageConfidence: number;
  };

  sam3Masks: {
    total: number;
    unused: number;
    verified: number;
    byDamageType: Record<string, number>;
    byQuality: Record<string, number>;
    averageNumInstances: number;
    totalAffectedArea: number;
  };

  pseudoLabels: {
    total: number;
    qualityPassing: number;
    approved: number;
    rejected: number;
    needsReview: number;
    averageQualityScore: number;
  };

  jobs: {
    active: number;
    completed: number;
    failed: number;
    byType: Record<KnowledgeDistillationJobType, number>;
    lastCompletedAt?: Date;
    averageDuration?: number;
  };

  readyForTraining: {
    gpt4LabelsCount: number;
    sam3MasksCount: number;
    pseudoLabelsCount: number;
    totalSamplesReady: number;
    estimatedTrainingTime?: number;
  };
}

// ============================================================================
// Pseudo-Labeling
// ============================================================================

export interface PseudoLabelGenerationOptions {
  damageTypes?: string[];
  threshold?: number;
  minConfidence?: number;
  maxImagesPerBatch?: number;
  qualityThreshold?: number;
  autoConvertToYOLO?: boolean;
  imageWidth?: number;
  imageHeight?: number;
}

export interface PseudoLabelResult {
  imageUrl: string;
  success: boolean;
  damageTypesDetected: string[];
  totalInstances: number;
  overallConfidence: number;
  passesQualityThreshold: boolean;
  yoloLabels?: string;
  error?: string;
}

// ============================================================================
// Training Job Results
// ============================================================================

export interface TrainingJobResult {
  jobId: string;
  success: boolean;
  modelVersion: string;
  metrics: TrainingMetrics;
  outputModelPath?: string;
  durationSeconds: number;
  samplesUsed: number;
  error?: string;
}
