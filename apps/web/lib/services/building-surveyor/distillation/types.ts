/**
 * Type definitions for the Teacher-Student VLM Distillation System
 *
 * Shared across: StudentShadowService, ExperienceBufferService,
 * TrainingDataExporter, StudentRoutingGate, SafetyRecallGate,
 * CalibrationFeedbackService.
 */

import type { Phase1BuildingAssessment } from '../types';

// ============================================================================
// Shadow Comparison (Phase 1)
// ============================================================================

export interface ShadowComparisonResult {
  assessmentId: string;
  teacherModel: string;
  studentModel: string;
  damageTypeMatch: boolean;
  severityMatch: boolean;
  urgencyMatch: boolean;
  confidenceDelta: number;
  safetyRecall: number;
  safetyPrecision: number;
  overallAgreement: number;
  studentConfidence: number;
  teacherConfidence: number;
  studentParseSuccess: boolean;
  latencyMs: number;
  costUsd: number;
  damageCategory: string;
  imageCount: number;
}

// ============================================================================
// Experience Buffer (Phase 2)
// ============================================================================

export interface VLMTrainingExample {
  id: string;
  assessmentId: string;
  imageUrls: string[];
  systemPrompt: string;
  userPrompt: string;
  teacherResponse: Phase1BuildingAssessment;
  studentResponse: Phase1BuildingAssessment | null;
  surpriseScore: number;
  priorityScore: number;
  difficultyScore: number | null;
  damageCategory: string;
  severity: string | null;
  teacherConfidence: number;
  teacherQuality: 'high' | 'medium' | 'low' | 'uncertain' | null;
  humanVerified: boolean;
  usedInTraining: boolean;
  trainingRound: number | null;
  createdAt: Date;
}

export interface ExperienceBufferStats {
  total: number;
  unused: number;
  byCategory: Record<string, number>;
  avgSurprise: number;
  avgPriority: number;
}

// ============================================================================
// Student Routing (Phase 4)
// ============================================================================

export type StudentRoutingDecision = 'student_only' | 'teacher_only' | 'shadow_compare';

export interface StudentRoutingResult {
  decision: StudentRoutingDecision;
  reasoning: string;
  studentAccuracy?: number;
  safetyRecall?: number;
  category?: string;
}

// ============================================================================
// Student Calibration (Phase 5)
// ============================================================================

export interface StudentCalibrationEntry {
  category: string;
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  safetyRecall: number;
  safetyTotal: number;
  safetyCorrect: number;
  emaAccuracy: number;
  emaSafetyRecall: number;
  lastUpdated: Date;
}

// ============================================================================
// Safety Gate (Phase 5)
// ============================================================================

export interface SafetyValidationResult {
  safe: boolean;
  failReason?: string;
}
