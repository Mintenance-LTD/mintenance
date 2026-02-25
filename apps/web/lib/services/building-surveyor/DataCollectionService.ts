/**
 * DataCollectionService
 *
 * Public API shell — all logic extracted into focused sub-services:
 *   DataCollectionQueryService      — read/export methods
 *   DataCollectionAutoValidateService — shadow-phase and auto-validation
 *   DataCollectionValidationService   — validate/reject/feedback workflow
 */

import type { Phase1BuildingAssessment } from '@/lib/services/building-surveyor/types';
import {
  getPendingAssessments,
  getValidatedAssessments,
  exportTrainingData,
  trackGPT4Accuracy,
  getGPT4AccuracyStatistics,
} from './DataCollectionQueryService';
import {
  isShadowPhaseEnabled,
  getShadowPhaseDecision,
  canAutoValidate,
  autoValidateIfHighConfidence,
  getStatistics,
} from './DataCollectionAutoValidateService';
import {
  collectAssessment,
  validateAssessment,
  rejectAssessment,
  recordFeedback,
} from './DataCollectionValidationService';

export class DataCollectionService {
  static isShadowPhaseEnabled(): boolean {
    return isShadowPhaseEnabled();
  }

  static async getShadowPhaseDecision(
    assessment: Phase1BuildingAssessment,
    assessmentId: string
  ) {
    return getShadowPhaseDecision(assessment, assessmentId);
  }

  static async canAutoValidate(
    assessment: Phase1BuildingAssessment,
    assessmentId: string
  ) {
    return canAutoValidate(assessment, assessmentId);
  }

  static async autoValidateIfHighConfidence(
    assessment: Phase1BuildingAssessment,
    assessmentId: string
  ) {
    return autoValidateIfHighConfidence(assessment, assessmentId);
  }

  static async getStatistics() {
    return getStatistics();
  }

  static async collectAssessment(
    assessment: Phase1BuildingAssessment,
    imageUrls: string[],
    userId: string
  ) {
    return collectAssessment(assessment, imageUrls, userId);
  }

  static async validateAssessment(
    assessmentId: string,
    validatedBy: string,
    notes?: string
  ) {
    return validateAssessment(assessmentId, validatedBy, notes);
  }

  static async rejectAssessment(
    assessmentId: string,
    rejectedBy: string,
    reason: string
  ) {
    return rejectAssessment(assessmentId, rejectedBy, reason);
  }

  static async recordFeedback(
    assessmentId: string,
    aiDecision: 'automate' | 'escalate',
    humanDecision: 'automate' | 'escalate',
    actualOutcome: { hasCriticalHazard: boolean; wasCorrect: boolean }
  ) {
    return recordFeedback(assessmentId, aiDecision, humanDecision, actualOutcome);
  }

  static async getPendingAssessments(limit = 50, offset = 0) {
    return getPendingAssessments(limit, offset);
  }

  static async getValidatedAssessments(limit = 100, offset = 0) {
    return getValidatedAssessments(limit, offset);
  }

  static async exportTrainingData(
    format: 'jsonl' | 'json' = 'jsonl',
    limit = 10000
  ): Promise<string> {
    return exportTrainingData(format, limit);
  }

  static async trackGPT4Accuracy(
    assessmentId: string,
    humanValidatedAssessment: Phase1BuildingAssessment
  ) {
    return trackGPT4Accuracy(assessmentId, humanValidatedAssessment);
  }

  static async getGPT4AccuracyStatistics() {
    return getGPT4AccuracyStatistics();
  }
}
