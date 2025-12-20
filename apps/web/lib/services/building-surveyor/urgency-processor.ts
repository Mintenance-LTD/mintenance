/**
 * Urgency Processor for Building Surveyor Service
 * Processes urgency data and calculates priority scores
 */

import type { UrgencyLevel } from './types';
import type { AiAssessmentPayload } from './validation-schemas';

/**
 * Process urgency data
 */
export function processUrgency(aiResponse: AiAssessmentPayload, urgency: UrgencyLevel): {
  urgency: UrgencyLevel;
  recommendedActionTimeline: string;
  estimatedTimeToWorsen?: string;
  reasoning: string;
  priorityScore: number;
} {
  const priorityScore = calculatePriorityScore(urgency, aiResponse);

  return {
    urgency,
    recommendedActionTimeline:
      aiResponse.recommendedActionTimeline || getDefaultTimeline(urgency),
    estimatedTimeToWorsen: aiResponse.estimatedTimeToWorsen,
    reasoning: aiResponse.urgencyReasoning || getDefaultReasoning(urgency),
    priorityScore,
  };
}

/**
 * Calculate priority score (0-100)
 */
export function calculatePriorityScore(urgency: UrgencyLevel, aiResponse: AiAssessmentPayload): number {
  const baseScores: Record<UrgencyLevel, number> = {
    immediate: 95,
    urgent: 80,
    soon: 60,
    planned: 40,
    monitor: 20,
  };

  let score = baseScores[urgency] || 50;

  // Adjust based on safety hazards
  if (aiResponse.safetyHazards?.some((h) => h.severity === 'critical')) {
    score = Math.min(100, score + 10);
  }

  // Adjust based on damage severity
  if (aiResponse.severity === 'full') {
    score = Math.min(100, score + 10);
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Get default timeline for urgency
 */
export function getDefaultTimeline(urgency: UrgencyLevel): string {
  const timelines: Record<UrgencyLevel, string> = {
    immediate: 'Within 24 hours',
    urgent: 'Within 1 week',
    soon: 'Within 2-4 weeks',
    planned: 'Within 1-3 months',
    monitor: 'Regular monitoring recommended',
  };
  return timelines[urgency];
}

/**
 * Get default reasoning for urgency
 */
export function getDefaultReasoning(urgency: UrgencyLevel): string {
  const reasonings: Record<UrgencyLevel, string> = {
    immediate: 'Critical safety hazard requires immediate attention',
    urgent: 'Damage is progressing and requires prompt repair',
    soon: 'Damage should be addressed to prevent further deterioration',
    planned: 'Damage can be scheduled for repair',
    monitor: 'Minor damage that should be monitored',
  };
  return reasonings[urgency];
}

