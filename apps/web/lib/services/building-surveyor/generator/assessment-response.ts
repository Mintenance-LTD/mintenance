import { z } from 'zod';
import {
  AI_ASSESSMENT_SCHEMA,
  type AiAssessmentPayload,
} from '../validation-schemas';

/** Normalize student responses for serving without database material enrichment. */
export async function parseStructuredAssessmentResponse(
  content: string,
  finishReason?: string | null
) {
  const payload = parseAssessmentResponse(content, finishReason);
  const { structureAssessment } = await import('../assessment-structurer');
  return structureAssessment(payload, undefined, { enrichMaterials: false });
}

export class AssessmentResponseError extends Error {
  constructor(
    public readonly code:
      | 'truncated'
      | 'filtered'
      | 'empty'
      | 'invalid_json'
      | 'invalid_schema'
  ) {
    super(`Assessment response: ${code}`);
    this.name = 'AssessmentResponseError';
  }
}

const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/** Accept the flat generator schema and the nested schema in older training targets. */
export function parseAssessmentResponse(
  content: string,
  finishReason?: string | null
): AiAssessmentPayload {
  if (finishReason === 'length') throw new AssessmentResponseError('truncated');
  if (finishReason === 'content_filter')
    throw new AssessmentResponseError('filtered');
  if (!content?.trim()) throw new AssessmentResponseError('empty');
  // Older exports wrapped the JSON in a thinking block. Accept only a complete
  // leading wrapper; never extract a plausible fragment from truncated output.
  let text = content.trim().replace(/^<thinking>[\s\S]*?<\/thinking>\s*/, '');
  if (/^```(?:json)?\s*\n[\s\S]*\n```$/i.test(text)) {
    text = text.replace(/^```(?:json)?\s*\n/i, '').replace(/\n```$/, '');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AssessmentResponseError('invalid_json');
  }
  const raw = object(parsed);
  const damage = object(raw.damageAssessment);
  const safety = object(raw.safetyHazards);
  const compliance = object(raw.compliance);
  const risk = object(raw.insuranceRisk);
  const urgency = object(raw.urgency);
  const flat = raw.damageAssessment
    ? {
        ...raw,
        ...damage,
        safetyHazards: safety.hazards,
        complianceIssues: compliance.complianceIssues,
        riskFactors: risk.riskFactors,
        riskScore: risk.riskScore,
        premiumImpact: risk.premiumImpact,
        mitigationSuggestions: risk.mitigationSuggestions,
        urgency: urgency.urgency,
        recommendedActionTimeline: urgency.recommendedActionTimeline,
        estimatedTimeToWorsen: urgency.estimatedTimeToWorsen,
        urgencyReasoning: urgency.reasoning,
      }
    : raw;
  // The compatibility schema supplies optional defaults. Require the evidence
  // fields first so {} never becomes an apparently healthy, low-urgency survey.
  const core = z
    .object({
      damageType: z.string().trim().min(1),
      severity: z.string().min(1),
      confidence: z.number().finite().min(0).max(100),
      safetyHazards: z.array(
        z.object({ type: z.string().trim().min(1) }).passthrough()
      ),
      urgency: z.string().min(1),
    })
    .passthrough()
    .safeParse(flat);
  if (!core.success) throw new AssessmentResponseError('invalid_schema');
  const result = AI_ASSESSMENT_SCHEMA.safeParse(core.data);
  if (!result.success) throw new AssessmentResponseError('invalid_schema');
  return result.data;
}
