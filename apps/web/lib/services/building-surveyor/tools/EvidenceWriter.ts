/**
 * Writes assessment_evidence rows for Mint AI agent tool runs.
 * Uses server Supabase client for server-side only.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import type { ToolRunSummary } from './types';

export interface EvidenceRow {
  assessment_id: string;
  tool_name: string;
  step_index: number;
  input_refs: Record<string, unknown>;
  output_summary: Record<string, unknown>;
  output_raw_ref?: string | null;
  confidence_aggregate?: number | null;
}

/**
 * Insert one evidence row after a tool run.
 */
export async function writeEvidence(row: EvidenceRow): Promise<void> {
  try {
    const { error } = await serverSupabase.from('assessment_evidence').insert({
      assessment_id: row.assessment_id,
      tool_name: row.tool_name,
      step_index: row.step_index,
      input_refs: row.input_refs,
      output_summary: row.output_summary,
      output_raw_ref: row.output_raw_ref ?? null,
      confidence_aggregate: row.confidence_aggregate ?? null,
    });

    if (error) {
      logger.error('EvidenceWriter: failed to insert assessment_evidence', {
        service: 'EvidenceWriter',
        assessment_id: row.assessment_id,
        tool_name: row.tool_name,
        step_index: row.step_index,
        error: error.message,
      });
      throw error;
    }
  } catch (err) {
    logger.error('EvidenceWriter: writeEvidence failed', { service: 'EvidenceWriter', err });
    throw err;
  }
}

/**
 * Build output_summary and confidence from a ToolRunSummary.
 */
export function summaryToOutput(summary: ToolRunSummary): {
  output_summary: Record<string, unknown>;
  confidence_aggregate: number | null;
} {
  const output_summary: Record<string, unknown> = {
    success: summary.success,
    ...(summary.message !== undefined && { message: summary.message }),
    ...(summary.count !== undefined && { count: summary.count }),
    ...Object.fromEntries(
      Object.entries(summary).filter(
        ([k]) => !['success', 'confidence', 'message', 'count'].includes(k)
      )
    ),
  };
  return {
    output_summary,
    confidence_aggregate: summary.confidence ?? null,
  };
}
