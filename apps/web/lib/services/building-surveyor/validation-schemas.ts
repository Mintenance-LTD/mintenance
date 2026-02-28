/**
 * Validation Schemas for Building Surveyor Service
 * Zod schemas for validating AI assessment responses
 */

import { z } from 'zod';

/**
 * Optional number preprocessor that handles null, undefined, empty strings, and invalid numbers
 */
export const optionalNumber = () =>
  z
    .preprocess((value) => {
      if (value === null || value === undefined || value === '') {
        return undefined;
      }
      if (typeof value === 'number') {
        return Number.isFinite(value) ? value : undefined;
      }
      if (typeof value === 'string') {
        const parsed = Number(value.trim());
        return Number.isFinite(parsed) ? parsed : undefined;
      }
      return value;
    }, z.number())
    .optional();

// P1: Severity and urgency enums for structured validation
const hazardSeverityEnum = z.enum(['low', 'medium', 'high', 'critical']).optional();
// Normalise GPT-4o's generic severity labels ('low'/'medium'/'high'/'critical') into
// our canonical three-value enum so validation never rejects a valid response.
const complianceSeverityEnum = z.preprocess(
  (val) => {
    if (val === 'low') return 'minor';
    if (val === 'medium') return 'moderate';
    if (val === 'high' || val === 'critical') return 'major';
    return val;
  },
  z.enum(['minor', 'moderate', 'major']).optional(),
);
const riskSeverityEnum = z.enum(['low', 'medium', 'high']).optional();
const urgencyEnum = z.enum(['immediate', 'urgent', 'soon', 'planned', 'monitor']).optional();
const damageSeverityEnum = z.enum(['early', 'midway', 'full']).optional();
const complexityEnum = z.enum(['low', 'medium', 'high']).optional();

export const hazardSchema = z.object({
  type: z.string().optional(),
  severity: hazardSeverityEnum,
  location: z.string().optional(),
  description: z.string().optional(),
  immediateAction: z.string().optional(),
  urgency: urgencyEnum,
});

export const complianceIssueSchema = z.object({
  issue: z.string().optional(),
  regulation: z.string().optional(),
  severity: complianceSeverityEnum,
  description: z.string().optional(),
  recommendation: z.string().optional(),
});

export const riskFactorSchema = z.object({
  factor: z.string().optional(),
  severity: riskSeverityEnum,
  impact: z.string().optional(),
});

export const materialSchema = z.object({
  name: z.string().optional(),
  quantity: z.string().optional(),
  estimatedCost: optionalNumber(),
});

export const homeownerExplanationSchema = z.object({
  whatIsIt: z.string().optional(),
  whyItHappened: z.string().optional(),
  whatToDo: z.string().optional(),
});

export const contractorAdviceSchema = z.object({
  repairNeeded: z.array(z.string()).optional().default([]),
  materials: z.array(materialSchema).optional().default([]),
  tools: z.array(z.string()).optional().default([]),
  estimatedTime: z.string().optional(),
  estimatedCost: z
    .object({
      min: optionalNumber(),
      max: optionalNumber(),
      recommended: optionalNumber(),
    })
    .optional(),
  complexity: complexityEnum,
});

export const AI_ASSESSMENT_SCHEMA = z.object({
  damageType: z.string().optional(),
  severity: damageSeverityEnum,
  confidence: optionalNumber().pipe(z.number().min(0).max(100).optional()),
  location: z.string().optional(),
  description: z.string().optional(),
  detectedItems: z.array(z.string()).max(50).optional().default([]),
  safetyHazards: z.array(hazardSchema).max(20).optional().default([]),
  complianceIssues: z.array(complianceIssueSchema).max(20).optional().default([]),
  riskFactors: z.array(riskFactorSchema).max(20).optional().default([]),
  riskScore: optionalNumber().pipe(z.number().min(0).max(100).optional()),
  premiumImpact: z.enum(['none', 'low', 'medium', 'high']).optional(),
  mitigationSuggestions: z.array(z.string()).max(20).optional().default([]),
  urgency: urgencyEnum,
  recommendedActionTimeline: z.string().optional(),
  estimatedTimeToWorsen: z.string().optional(),
  urgencyReasoning: z.string().optional(),
  homeownerExplanation: homeownerExplanationSchema.optional(),
  contractorAdvice: contractorAdviceSchema.optional(),
});

export type AiAssessmentPayload = z.infer<typeof AI_ASSESSMENT_SCHEMA>;

