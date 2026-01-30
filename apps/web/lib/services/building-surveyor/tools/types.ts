/**
 * Mint AI Agent Tool Contract
 * Single interface: tool name, params, result, summary for evidence recording.
 */

export const TOOL_NAMES = ['detect', 'segment', 'vision_labels', 'retrieve_memory'] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

export interface ToolCall {
  tool: ToolName;
  params?: Record<string, unknown>;
}

export interface ToolRun<TResult = unknown> {
  toolName: ToolName;
  params: Record<string, unknown>;
  result: TResult;
  summary: ToolRunSummary;
}

export interface ToolRunSummary {
  success: boolean;
  confidence?: number;
  count?: number;
  message?: string;
  [key: string]: unknown;
}

export interface DetectToolResult {
  detections: Array<{
    className: string;
    damageType?: string;
    confidence: number;
    boundingBox: { x: number; y: number; width: number; height: number };
  }>;
  detectionCount: number;
  damageTypesDetected: string[];
}

export interface SegmentToolResult {
  damageTypes: Record<string, { numInstances: number; confidence: number }>;
  segmentCount: number;
}

export interface VisionLabelsToolResult {
  labels: Array<{ description: string; score: number }>;
  detectedFeatures: string[];
  confidence: number;
}

export interface RetrieveMemoryToolResult {
  continuumSummary: string;
  pastAssessmentsSummary?: string;
  combined: string;
}
