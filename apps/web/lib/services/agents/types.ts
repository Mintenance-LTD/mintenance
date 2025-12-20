/**
 * Shared types and interfaces for agent services
 */

export type AgentName =
  | 'predictive'
  | 'scheduling'
  | 'job-status'
  | 'bid-acceptance'
  | 'dispute-resolution'
  | 'learning-matching'
  | 'pricing'
  | 'escrow-release'
  | 'notification'
  // Phase 2B agents (planned but not yet implemented)
  | 'review'
  | 'verification'
  | 'quality-assurance'
  // Phase 2C agents (planned but not yet implemented)
  | 'contract-generation'
  | 'marketplace-health';

export type DecisionType =
  | 'risk-prediction'
  | 'schedule-suggestion'
  | 'status-transition'
  | 'auto-accept'
  | 'auto-resolve'
  | 'match-adjustment'
  | 'pricing_recommendation'
  | 'photo_verification'
  | 'auto_release_approved'
  | 'learn_from_bid'
  | 'notification_routing'
  | 'notification_timing'
  | 'notification_batching'
  // Phase 2B decision types (planned but not yet implemented)
  | 'review_request'
  | 'review_quality_check'
  | 'trust_score_calculation'
  | 'quality_score_calculation';

export type ActionTaken =
  | 'preventive-reminder'
  | 'milestone-payment'
  | 'schedule-suggested'
  | 'status-changed'
  | 'bid-accepted'
  | 'dispute-resolved'
  | 'match-boosted'
  | 'generated_recommendation'
  | 'updated_patterns'
  | 'photo_verified'
  | 'photo_failed'
  | 'photo_manual_review'
  | 'approved_auto_release'
  | 'notification_sent_immediately'
  | 'notification_queued'
  | 'notification_batched'
  | 'notification_delayed'
  // Phase 2B actions (planned but not yet implemented)
  | 'review_requested'
  | 'review_flagged'
  | 'trust_score_updated'
  | 'quality_score_updated';

export interface AgentDecision {
  id?: string;
  jobId?: string;
  userId?: string;
  agentName: AgentName;
  decisionType: DecisionType;
  actionTaken?: ActionTaken;
  confidence: number; // 0-100
  reasoning: string;
  metadata?: Record<string, any>;
  userFeedback?: 'accepted' | 'rejected' | 'modified' | null;
  outcomeSuccess?: boolean | null;
  createdAt?: string;
}

export interface RiskPrediction {
  id?: string;
  jobId: string;
  userId?: string;
  riskType: 'no-show' | 'dispute' | 'delay' | 'quality';
  probability: number; // 0-100
  severity: 'low' | 'medium' | 'high' | 'critical';
  preventiveAction?: string;
  applied?: boolean;
  outcomeOccurred?: boolean | null;
  createdAt?: string;
}

export interface AgentContext {
  jobId?: string;
  userId?: string;
  contractorId?: string;
  homeownerId?: string;
  additionalData?: Record<string, any>;
}

export interface AgentResult {
  success: boolean;
  decision?: AgentDecision;
  error?: string;
  message?: string;
  metadata?: Record<string, any>;
}

export interface LearningData {
  userId: string;
  eventType: string;
  context: Record<string, any>;
  outcome?: Record<string, any>;
  timestamp: string;
}

