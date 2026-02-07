/**
 * Shared types and constants for job creation step components.
 */

import type { JobFormData } from '../utils/validation';

export type { JobFormData };

export interface Property {
  id: string;
  property_name: string | null;
  address: string | null;
  property_type?: string;
  photos?: string[];
}

export interface ImagePreviewItem {
  file: File;
  preview: string;
}

export interface DamageAssessment {
  damageType: string;
  severity: string;
  confidence: number;
  description: string;
}

export interface SafetyHazards {
  hasSafetyHazards: boolean;
  overallSafetyScore: number;
  criticalFlags: string[];
}

export interface BuildingAssessmentData {
  damageAssessment: DamageAssessment;
  safetyHazards: SafetyHazards;
  urgency: {
    urgency: string;
    reasoning: string;
  };
  estimatedCost?: {
    min: number;
    max: number;
    confidence: number;
  };
  compliance?: {
    complianceScore: number;
    flags: string[];
  };
  decisionResult?: {
    decision: 'automate' | 'escalate';
    reason: string;
    safetyUcb?: number;
    rewardUcb?: number;
  };
}

export const SERVICE_CATEGORIES = [
  { label: 'Plumbing', value: 'plumbing', icon: '🚰' },
  { label: 'Electrical', value: 'electrical', icon: '⚡' },
  { label: 'Heating & Gas', value: 'heating', icon: '🔥' },
  { label: 'Carpentry', value: 'carpentry', icon: '🔨' },
  { label: 'Painting', value: 'painting', icon: '🎨' },
  { label: 'Roofing', value: 'roofing', icon: '🏠' },
  { label: 'Flooring', value: 'flooring', icon: '📐' },
  { label: 'Gardening', value: 'gardening', icon: '🌱' },
  { label: 'Cleaning', value: 'cleaning', icon: '🧹' },
  { label: 'Handyman', value: 'handyman', icon: '🔧' },
  { label: 'HVAC', value: 'hvac', icon: '❄️' },
  { label: 'Other', value: 'other', icon: '⚙️' },
] as const;

export const URGENCY_OPTIONS = [
  { value: 'low', label: 'Flexible', description: 'Within 2-4 weeks', color: 'blue' },
  { value: 'medium', label: 'Soon', description: 'Within 1-2 weeks', color: 'amber' },
  { value: 'high', label: 'Urgent', description: 'Within 3-5 days', color: 'orange' },
  { value: 'emergency', label: 'Emergency', description: 'Within 24 hours', color: 'rose' },
] as const;

export const STEPS = [
  { id: 1, label: 'Details', shortLabel: 'Details' },
  { id: 2, label: 'Photos', shortLabel: 'Photos' },
  { id: 3, label: 'Budget', shortLabel: 'Budget' },
  { id: 4, label: 'Review', shortLabel: 'Review' },
] as const;
