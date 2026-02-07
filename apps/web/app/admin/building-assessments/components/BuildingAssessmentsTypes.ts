import type { Phase1BuildingAssessment } from '@/lib/services/building-surveyor/types';

export interface Assessment {
  id: string;
  user_id: string;
  damage_type: string;
  severity: 'early' | 'midway' | 'full';
  confidence: number;
  safety_score: number;
  compliance_score: number;
  insurance_risk_score: number;
  urgency: string;
  assessment_data: Phase1BuildingAssessment;
  validation_status: 'pending' | 'validated' | 'rejected' | 'needs_review';
  validated_by?: string;
  validated_at?: string;
  validation_notes?: string;
  created_at: string;
  user?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
  };
  images?: Array<{
    image_url: string;
    image_index: number;
  }>;
  auto_validated?: boolean;
  auto_validated_at?: string;
  auto_validation_reason?: string;
  auto_validation_confidence?: number | null;
  auto_validation_review_status?: 'not_applicable' | 'pending_review' | 'confirmed' | 'overturned';
}

export interface Statistics {
  total: number;
  pending: number;
  validated: number;
  rejected: number;
  bySeverity: { early: number; midway: number; full: number };
  byDamageType: Record<string, number>;
  autoValidationEnabled?: boolean;
  minValidatedForAutoValidation?: number;
  canAutoValidate?: boolean;
  autoValidation?: {
    total: number;
    pendingReview: number;
    confirmed: number;
    overturned: number;
    precision: number | null;
    recall: number | null;
    coverage: number | null;
    pendingRate?: number | null;
  };
}

export interface CorrectionStats {
  total: number;
  approved: number;
  pending: number;
  needed: number;
}

export interface AutoValidationBadge {
  label: string;
  background: string;
  color: string;
}

export function getAutoValidationBadge(assessment: Assessment): AutoValidationBadge | null {
  if (!assessment.auto_validated) return null;
  const status = assessment.auto_validation_review_status || 'pending_review';
  if (status === 'pending_review') {
    return { label: 'Auto-Validated (Pending Review)', background: '#DBEAFE', color: '#1E3A8A' };
  }
  if (status === 'confirmed') {
    return { label: 'Auto-Validated ✓', background: '#D1FAE5', color: '#065F46' };
  }
  if (status === 'overturned') {
    return { label: 'Auto-Validation Overturned', background: '#FEE2E2', color: '#991B1B' };
  }
  return { label: 'Auto-Validated', background: '#E5E7EB', color: '#374151' };
}

export const formatPercentage = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '\u2014';
  return `${(value * 100).toFixed(1)}%`;
};
