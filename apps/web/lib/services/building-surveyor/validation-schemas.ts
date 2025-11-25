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

export const hazardSchema = z.object({
  type: z.string().optional(),
  severity: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  immediateAction: z.string().optional(),
  urgency: z.string().optional(),
});

export const complianceIssueSchema = z.object({
  issue: z.string().optional(),
  regulation: z.string().optional(),
  severity: z.string().optional(),
  description: z.string().optional(),
  recommendation: z.string().optional(),
});

export const riskFactorSchema = z.object({
  factor: z.string().optional(),
  severity: z.string().optional(),
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
  complexity: z.string().optional(),
});

export const AI_ASSESSMENT_SCHEMA = z.object({
  damageType: z.string().optional(),
  severity: z.string().optional(),
  confidence: optionalNumber(),
  location: z.string().optional(),
  description: z.string().optional(),
  detectedItems: z.array(z.string()).optional().default([]),
  safetyHazards: z.array(hazardSchema).optional().default([]),
  complianceIssues: z.array(complianceIssueSchema).optional().default([]),
  riskFactors: z.array(riskFactorSchema).optional().default([]),
  riskScore: optionalNumber(),
  premiumImpact: z.string().optional(),
  mitigationSuggestions: z.array(z.string()).optional().default([]),
  urgency: z.string().optional(),
  recommendedActionTimeline: z.string().optional(),
  estimatedTimeToWorsen: z.string().optional(),
  urgencyReasoning: z.string().optional(),
  homeownerExplanation: homeownerExplanationSchema.optional(),
  contractorAdvice: contractorAdviceSchema.optional(),
});

export type AiAssessmentPayload = z.infer<typeof AI_ASSESSMENT_SCHEMA>;

