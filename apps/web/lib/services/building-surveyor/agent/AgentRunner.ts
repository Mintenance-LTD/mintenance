/**
 * Mint AI assessment runner: validate -> memory -> vision-language generator.
 * Runs memory retrieval, then delegates visual assessment to the configured
 * vision-language generator. Legacy YOLO/SAM tooling is deliberately excluded
 * from the production evidence path until it has a validated model and eval set.
 */

import { logger } from '@mintenance/shared';
import { validateURLs } from '@/lib/security/url-validation';
import { BuildingSurveyorService } from '../BuildingSurveyorService';
import {
  runRetrieveMemoryTool,
  writeEvidence,
  summaryToOutput,
  getDamageTypesForDomain,
} from '../tools';
import type { AssessmentContext } from '../types';
import type { Phase1BuildingAssessment } from '../types';

/** Domain for damage taxonomy (Phase 6: rail, steel, etc.). */
type AssessmentDomain = 'building' | 'rail' | 'infrastructure' | 'general';

interface AgentRunnerInput {
  assessmentId: string;
  imageUrls: string[];
  userId: string;
  context?: AssessmentContext;
  jobId?: string;
  propertyId?: string;
  /** Phase 6: domain for taxonomy and segment (default building). */
  domain?: AssessmentDomain;
}

/**
 * Rule-based planner: returns fixed tool sequence; damage types from damage_taxonomy(domain).
 * Phase 6: domain-aware (building, rail, infrastructure, general).
 */
async function getPromptTaxonomy(input: AgentRunnerInput): Promise<string[]> {
  const domain = input.domain ?? 'building';
  return getDamageTypesForDomain(domain);
}

/**
 * Run agent: tools -> evidence -> pre-run evidence -> BuildingSurveyorService -> assessment.
 * Phase 7: optional verifier sets needsReview when narrative and evidence misalign.
 */
export async function runAgent(input: AgentRunnerInput): Promise<{
  assessment: Phase1BuildingAssessment;
  needsReview?: boolean;
}> {
  const { assessmentId, imageUrls, context, jobId } = input;

  const validated = await validateURLs(imageUrls, true);
  if (validated.invalid.length > 0) {
    throw new Error(
      `Invalid image URLs: ${validated.invalid.map((i) => i.error).join(', ')}`
    );
  }
  const validatedImageUrls = validated.valid;
  const damageTypesForPrompt = await getPromptTaxonomy(input);

  // Build feature vector from scene graph would require running scene graph here;
  // for retrieve_memory we run it after BuildingSurveyorService has built features.
  // Instead we run retrieve_memory with no feature vector here (past assessments only).
  // Memory adjustments are applied inside BuildingSurveyorService when it runs.
  const memoryRun = await runRetrieveMemoryTool({
    jobId,
    propertyId: input.propertyId,
  });
  const { output_summary: memSummary } = summaryToOutput(memoryRun.summary);
  await writeEvidence({
    assessment_id: assessmentId,
    tool_name: 'retrieve_memory',
    step_index: 0,
    input_refs: {
      jobId: jobId ?? null,
      propertyId: input.propertyId ?? null,
      hasFeatureVector: false,
    },
    output_summary: memSummary,
    confidence_aggregate: null,
  });

  // Call BuildingSurveyorService with pre-run evidence and taxonomy-driven prompt (Phase 6)
  const assessment = await BuildingSurveyorService.assessDamage(
    validatedImageUrls,
    context,
    {
      preRunEvidence: {
        roboflowDetections: [],
        visionAnalysis: null,
      },
      damageTypesForPrompt:
        damageTypesForPrompt.length > 0 ? damageTypesForPrompt : undefined,
    }
  );

  logger.info(
    'Vision-language assessment completed without detector evidence',
    {
      service: 'AgentRunner',
      assessmentId,
    }
  );

  return { assessment };
}
