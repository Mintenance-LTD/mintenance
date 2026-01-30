/**
 * Shared types for UnifiedAIService analyzers.
 */

export type AssessmentDomain = 'building' | 'rail' | 'infrastructure' | 'general';

export interface AnalysisContext {
  type: 'building-damage' | 'general-image' | 'text-analysis' | 'job-analysis';
  jobId?: string;
  userId?: string;
  propertyId?: string;
  propertyType?: string;
  roomType?: string;
  urgency?: 'low' | 'medium' | 'high';
  requiresDecision?: boolean;
  /** Phase 6: domain for damage taxonomy (default building). */
  domain?: AssessmentDomain;
}

export interface AnalysisResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: AIServiceError;
  fallbackUsed: boolean;
  cost?: number;
  service: string;
  model?: string;
  processingTime?: number;
}

export interface AIServiceError {
  code: 'BUDGET_EXCEEDED' | 'RATE_LIMITED' | 'INVALID_INPUT' | 'API_ERROR' | 'EMERGENCY_STOP';
  message: string;
  details?: unknown;
}

export interface GeneralImageAnalysis {
  labels: Array<{ name: string; confidence: number }>;
  objects: Array<{ name: string; confidence: number; boundingBox?: unknown }>;
  text: string[];
  safeSearch: {
    adult: string;
    violence: string;
  };
  dominantColors: Array<{ color: string; percentage: number }>;
  quality: {
    score: number;
    issues: string[];
  };
}

export interface JobAnalysis {
  category: string;
  urgency: 'low' | 'medium' | 'high';
  estimatedDuration: number; // hours
  requiredSkills: string[];
  suggestedPrice: {
    min: number;
    max: number;
    currency: string;
  };
  complexity: 'simple' | 'moderate' | 'complex';
  safetyConsiderations: string[];
  materialsNeeded: string[];
}
