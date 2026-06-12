/**
 * Validation Schemas for Building Surveyor Service
 * Zod schemas for validating AI assessment responses
 */

import { z } from 'zod';
import { isTaxonomyV3ClassId } from './taxonomy/taxonomy-v3';

/**
 * Optional number preprocessor that handles null, undefined, empty strings, and invalid numbers
 */
const optionalNumber = () =>
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
const hazardSeverityEnum = z
  .enum(['low', 'medium', 'high', 'critical'])
  .optional();
// Normalise GPT-4o's generic severity labels ('low'/'medium'/'high'/'critical') into
// our canonical three-value enum so validation never rejects a valid response.
const complianceSeverityEnum = z.preprocess(
  (val) => {
    if (val === 'low') return 'minor';
    if (val === 'medium') return 'moderate';
    if (val === 'high' || val === 'critical') return 'major';
    return val;
  },
  z.enum(['minor', 'moderate', 'major']).optional()
);
const riskSeverityEnum = z.enum(['low', 'medium', 'high']).optional();
const urgencyEnum = z
  .enum(['immediate', 'urgent', 'soon', 'planned', 'monitor'])
  .optional();
// 4-tier severity: GPT may still return old labels — preprocess to canonical
const damageSeverityEnum = z.preprocess(
  (val) => {
    if (val === 'midway') return 'developing';
    if (val === 'full') return 'dangerous';
    // Map common GPT-4o free-text labels
    if (typeof val === 'string') {
      const s = val.toLowerCase();
      if (s === 'minor' || s === 'initial') return 'early';
      if (s === 'moderate' || s === 'progressing') return 'developing';
      if (s === 'serious' || s === 'advanced') return 'significant';
      if (s === 'severe' || s === 'critical' || s === 'structural')
        return 'dangerous';
    }
    return val;
  },
  z.enum(['early', 'developing', 'significant', 'dangerous']).optional()
);

const CANONICAL_DAMAGE_TYPES = [
  'pipe_leak',
  'water_damage',
  'wall_crack',
  'roof_damage',
  'electrical_fault',
  'mold_damp',
  'fire_damage',
  'window_broken',
  'door_damaged',
  'floor_damage',
  'ceiling_damage',
  'foundation_crack',
  'hvac_issue',
  'gutter_blocked',
  'general_damage',
  'none',
] as const;

const CONTRACTOR_TRADES = [
  'plumber',
  'electrician',
  'roofer',
  'structural_engineer',
  'plasterer',
  'general_builder',
  'damp_specialist',
  'gas_engineer',
  'drainage',
  'locksmith',
  'glazier',
  'pest_control',
] as const;
const complexityEnum = z.enum(['low', 'medium', 'high']).optional();

const hazardSchema = z.object({
  type: z.string().optional(),
  severity: hazardSeverityEnum,
  location: z.string().optional(),
  description: z.string().optional(),
  immediateAction: z.string().optional(),
  urgency: urgencyEnum,
});

const complianceIssueSchema = z.object({
  issue: z.string().optional(),
  regulation: z.string().optional(),
  severity: complianceSeverityEnum,
  description: z.string().optional(),
  recommendation: z.string().optional(),
});

const riskFactorSchema = z.object({
  factor: z.string().optional(),
  severity: riskSeverityEnum,
  impact: z.string().optional(),
});

const materialSchema = z.object({
  name: z.string().optional(),
  quantity: z.string().optional(),
  estimatedCost: optionalNumber(),
});

const homeownerExplanationSchema = z.object({
  whatIsIt: z.string().optional(),
  whyItHappened: z.string().optional(),
  whatToDo: z.string().optional(),
});

const contractorAdviceSchema = z.object({
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
  recommendedTrades: z
    .array(z.enum(CONTRACTOR_TRADES))
    .max(5)
    .optional()
    .default([]),
});

const specialistReferralSchema = z.object({
  specialistType: z.string(),
  reason: z.string(),
  urgency: z
    .enum(['routine', 'soon', 'urgent', 'immediate'])
    .optional()
    .default('routine'),
});

export const AI_ASSESSMENT_SCHEMA = z.object({
  damageType: z.string().optional(),
  // v3 surveyor taxonomy class — tolerant: anything outside the canonical id
  // set (including null, the prompt's "no match" value) degrades to undefined
  // rather than rejecting the whole assessment.
  taxonomyClassId: z.preprocess(
    (val) => (isTaxonomyV3ClassId(val) ? val : undefined),
    z.string().optional()
  ),
  probableCause: z.string().max(1000).optional(),
  needsOnsiteInspection: z.preprocess(
    (val) => (typeof val === 'boolean' ? val : undefined),
    z.boolean().optional()
  ),
  onsiteInspectionReason: z.string().max(1000).optional(),
  severity: damageSeverityEnum,
  confidence: optionalNumber().pipe(z.number().min(0).max(100).optional()),
  location: z.string().optional(),
  description: z.string().optional(),
  detectedItems: z.array(z.string()).max(50).optional().default([]),
  safetyHazards: z.array(hazardSchema).max(20).optional().default([]),
  complianceIssues: z
    .array(complianceIssueSchema)
    .max(20)
    .optional()
    .default([]),
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
  ricsConditionRating: z.preprocess(
    (val) => (val === 1 || val === 2 || val === 3 ? val : undefined),
    z.union([z.literal(1), z.literal(2), z.literal(3)]).optional()
  ),
  specialistReferrals: z
    .array(specialistReferralSchema)
    .max(5)
    .optional()
    .default([]),
});

export type AiAssessmentPayload = z.infer<typeof AI_ASSESSMENT_SCHEMA>;
