/**
 * Mint AI Agent Runner: plan -> execute tools -> scene graph -> generator.
 * Runs tool sequence (detect, segment, vision_labels, retrieve_memory), writes evidence,
 * then delegates to BuildingSurveyorService with pre-run evidence.
 */

import { logger } from '@mintenance/shared';
import { validateURLs } from '@/lib/security/url-validation';
import { BuildingSurveyorService } from '../BuildingSurveyorService';
import {
  runToolSequenceAndWriteEvidence,
  runRetrieveMemoryTool,
  writeEvidence,
  summaryToOutput,
  getDamageTypesForDomain,
} from '../tools';
import { buildEvidenceSummary } from '../evidence-processor';
import { verifyAlignment } from './AssessmentVerifier';
import type { AssessmentContext } from '../types';
import type { RoboflowDetection, VisionAnalysisSummary } from '../types';
import type { DamageTypeSegmentation } from '../SAM3Service';
import type { Phase1BuildingAssessment } from '../types';

/** Domain for damage taxonomy (Phase 6: rail, steel, etc.). */
export type AssessmentDomain = 'building' | 'rail' | 'infrastructure' | 'general';

export interface AgentRunnerInput {
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
async function planToolCalls(
  input: AgentRunnerInput
): Promise<Array<{ tool: string; params?: Record<string, unknown> }>> {
  const domain = input.domain ?? 'building';
  const damageTypes = await getDamageTypesForDomain(domain);
  return [
    { tool: 'detect' },
    { tool: 'segment', params: { damage_types: damageTypes } },
    { tool: 'vision_labels' },
    {
      tool: 'retrieve_memory',
      params: { jobId: input.jobId ?? null, propertyId: input.propertyId ?? null },
    },
  ];
}

/**
 * Convert DetectToolResult to RoboflowDetection[] (add id and imageUrl).
 */
function toolDetectToRoboflow(
  detectResult: { detections: Array<{ className: string; confidence: number; boundingBox: { x: number; y: number; width: number; height: number } }> },
  firstImageUrl: string
): RoboflowDetection[] {
  return detectResult.detections.map((d, i) => ({
    id: `det-${i}-${Date.now()}`,
    className: d.className,
    confidence: d.confidence * 100,
    boundingBox: d.boundingBox,
    imageUrl: firstImageUrl,
  }));
}

/**
 * Convert VisionLabelsToolResult to VisionAnalysisSummary.
 */
function toolVisionToSummary(
  visionResult: { labels: Array<{ description: string; score: number }>; detectedFeatures: string[]; confidence: number }
): VisionAnalysisSummary {
  return {
    provider: 'google-vision',
    confidence: visionResult.confidence,
    labels: visionResult.labels.map((l) => ({ description: l.description, score: l.score })),
    objects: [],
    detectedFeatures: visionResult.detectedFeatures,
    suggestedCategories: [],
  };
}

/**
 * Convert SegmentToolResult to minimal DamageTypeSegmentation for scene graph.
 */
function toolSegmentToSam3(
  segmentResult: { damageTypes: Record<string, { numInstances: number; confidence: number }> }
): DamageTypeSegmentation {
  const damage_types: DamageTypeSegmentation['damage_types'] = {};
  for (const [type, data] of Object.entries(segmentResult.damageTypes)) {
    damage_types[type] = {
      masks: [],
      boxes: [],
      scores: Array(data.numInstances).fill(data.confidence),
      num_instances: data.numInstances,
    };
  }
  return { success: Object.keys(damage_types).length > 0, damage_types };
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
    throw new Error(`Invalid image URLs: ${validated.invalid.map((i) => i.error).join(', ')}`);
  }
  const validatedImageUrls = validated.valid;
  const firstImageUrl = validatedImageUrls[0] ?? '';

  const plan = await planToolCalls(input);
  const segmentParams = plan.find((s) => s.tool === 'segment')?.params as
    | { damage_types?: string[] }
    | undefined;
  const damageTypesForSegment = segmentParams?.damage_types ?? [];

  // Run detect, segment, vision_labels (steps 0–2) and write evidence
  const toolOutput = await runToolSequenceAndWriteEvidence({
    assessmentId,
    imageUrls: validatedImageUrls,
    jobId,
    propertyId: input.propertyId,
    damageTypesForSegment,
  });

  // Build pre-run evidence for BuildingSurveyorService
  const roboflowDetections = toolDetectToRoboflow(toolOutput.detect, firstImageUrl);
  const visionAnalysis = toolVisionToSummary(toolOutput.visionLabels);
  const sam3Segmentation = toolSegmentToSam3(toolOutput.segment);

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
    step_index: 3,
    input_refs: {
      jobId: jobId ?? null,
      propertyId: input.propertyId ?? null,
      hasFeatureVector: false,
    },
    output_summary: memSummary,
    confidence_aggregate: null,
  });

  // Call BuildingSurveyorService with pre-run evidence and taxonomy-driven prompt (Phase 6)
  const assessment = await BuildingSurveyorService.assessDamage(validatedImageUrls, context, {
    preRunEvidence: {
      roboflowDetections,
      visionAnalysis,
      sam3Segmentation: Object.keys(toolOutput.segment.damageTypes).length > 0 ? sam3Segmentation : undefined,
    },
    damageTypesForPrompt: damageTypesForSegment.length > 0 ? damageTypesForSegment : undefined,
  });

  // Phase 7: verifier + observability - set needs_review when narrative and evidence misalign
  const { aligned, needsReview } = verifyAlignment(assessment, {
    detectDamageTypes: toolOutput.detect.damageTypesDetected,
    segmentDamageTypes: Object.keys(toolOutput.segment.damageTypes),
  });
  logger.info('Verifier result', {
    service: 'AgentRunner',
    assessmentId,
    aligned,
    needsReview: needsReview || false,
  });

  return { assessment, needsReview: needsReview || undefined };
}
