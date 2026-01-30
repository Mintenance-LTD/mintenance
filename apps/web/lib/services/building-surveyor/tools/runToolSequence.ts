/**
 * Runs the fixed tool sequence (detect, segment, vision_labels, retrieve_memory)
 * and writes each result to assessment_evidence. Used by the agent runner in Phase 3.
 */

import { writeEvidence, summaryToOutput } from './EvidenceWriter';
import { runDetectTool } from './DetectTool';
import { runSegmentTool } from './SegmentTool';
import { runVisionLabelsTool } from './VisionLabelsTool';
import { runRetrieveMemoryTool } from './RetrieveMemoryTool';
import type { DetectToolResult, SegmentToolResult, VisionLabelsToolResult, RetrieveMemoryToolResult } from './types';

export interface ToolSequenceInput {
  assessmentId: string;
  imageUrls: string[];
  jobId?: string;
  propertyId?: string;
  damageTypesForSegment?: string[];
  featureVector?: number[];
}

export interface ToolSequenceOutput {
  detect: DetectToolResult;
  segment: SegmentToolResult;
  visionLabels: VisionLabelsToolResult;
  retrieveMemory: RetrieveMemoryToolResult;
}

/**
 * Run tools in order, write evidence for each, return collected results.
 */
export async function runToolSequenceAndWriteEvidence(
  input: ToolSequenceInput
): Promise<ToolSequenceOutput> {
  const { assessmentId, imageUrls, jobId, damageTypesForSegment = [], featureVector } = input;
  const firstImage = imageUrls[0] ?? '';

  const detectRun = await runDetectTool({ imageUrls });
  const { output_summary: detSummary, confidence_aggregate: detConf } = summaryToOutput(detectRun.summary);
  await writeEvidence({
    assessment_id: assessmentId,
    tool_name: 'detect',
    step_index: 0,
    input_refs: { imageCount: imageUrls.length },
    output_summary: { ...detSummary, detectionCount: detectRun.result.detectionCount, damageTypesDetected: detectRun.result.damageTypesDetected },
    confidence_aggregate: detConf,
  });

  const segmentRun = await runSegmentTool({
    imageUrl: firstImage,
    damageTypes: damageTypesForSegment.length > 0 ? damageTypesForSegment : detectRun.result.damageTypesDetected,
  });
  const { output_summary: segSummary, confidence_aggregate: segConf } = summaryToOutput(segmentRun.summary);
  await writeEvidence({
    assessment_id: assessmentId,
    tool_name: 'segment',
    step_index: 1,
    input_refs: { imageUrl: firstImage, damageTypes: segmentRun.params.damageTypes },
    output_summary: segSummary,
    confidence_aggregate: segConf,
  });

  const visionRun = await runVisionLabelsTool({ imageUrls });
  const { output_summary: visSummary, confidence_aggregate: visConf } = summaryToOutput(visionRun.summary);
  await writeEvidence({
    assessment_id: assessmentId,
    tool_name: 'vision_labels',
    step_index: 2,
    input_refs: { imageCount: imageUrls.length },
    output_summary: visSummary,
    confidence_aggregate: visConf,
  });

  const memoryRun = await runRetrieveMemoryTool({
    jobId,
    propertyId: input.propertyId,
    featureVector,
  });
  const { output_summary: memSummary } = summaryToOutput(memoryRun.summary);
  await writeEvidence({
    assessment_id: assessmentId,
    tool_name: 'retrieve_memory',
    step_index: 3,
    input_refs: {
      jobId: jobId ?? null,
      propertyId: input.propertyId ?? null,
      hasFeatureVector: Boolean(featureVector?.length),
    },
    output_summary: memSummary,
    confidence_aggregate: null,
  });

  return {
    detect: detectRun.result,
    segment: segmentRun.result,
    visionLabels: visionRun.result,
    retrieveMemory: memoryRun.result,
  };
}
