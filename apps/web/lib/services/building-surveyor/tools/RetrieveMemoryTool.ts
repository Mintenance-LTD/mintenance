/**
 * Retrieve memory tool: continuum memory query + optional past assessments by job_id.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { queryMemoryAdjustments } from '../memory-query-handler';
import type { RetrieveMemoryToolResult, ToolRun, ToolRunSummary } from './types';

const PAST_ASSESSMENTS_LIMIT = 5;

export interface RetrieveMemoryToolParams {
  featureVector?: number[];
  jobId?: string;
  propertyId?: string;
}

/**
 * Run retrieve_memory tool: continuum adjustments + optional past assessments for job.
 */
export async function runRetrieveMemoryTool(params: RetrieveMemoryToolParams): Promise<
  ToolRun<RetrieveMemoryToolResult>
> {
  let continuumSummary = 'No continuum feature vector provided.';
  let pastAssessmentsSummary: string | undefined;

  if (params.featureVector && params.featureVector.length >= 40) {
    try {
      const useTitans = process.env.USE_TITANS === 'true';
      const adjustments = await queryMemoryAdjustments(params.featureVector, useTitans);
      continuumSummary = `Continuum adjustments (5 dims): [${adjustments.map((v) => v.toFixed(4)).join(', ')}].`;
    } catch (err) {
      continuumSummary = 'Continuum query failed or memory system not initialized.';
    }
  }

  const pastParts: string[] = [];

  if (params.propertyId) {
    try {
      const { data: rows } = await serverSupabase
        .from('building_assessments')
        .select('id, damage_type, severity, urgency, created_at')
        .eq('property_id', params.propertyId)
        .order('created_at', { ascending: false })
        .limit(PAST_ASSESSMENTS_LIMIT);

      if (rows && rows.length > 0) {
        pastParts.push(
          `Previous assessments for this property: ${rows
            .map(
              (r: { damage_type?: string; severity?: string; urgency?: string }) =>
                `${r.damage_type ?? 'unknown'} (${r.severity ?? '-'}, ${r.urgency ?? '-'})`
            )
            .join('; ')}.`
        );
      } else {
        pastParts.push('No previous assessments for this property.');
      }
    } catch {
      pastParts.push('Could not fetch past assessments by property.');
    }
  }

  if (params.jobId) {
    try {
      const { data: rows } = await serverSupabase
        .from('building_assessments')
        .select('id, damage_type, severity, urgency, created_at')
        .eq('job_id', params.jobId)
        .order('created_at', { ascending: false })
        .limit(PAST_ASSESSMENTS_LIMIT);

      if (rows && rows.length > 0) {
        pastParts.push(
          `Previous assessments for this job: ${rows
            .map(
              (r: { damage_type?: string; severity?: string; urgency?: string }) =>
                `${r.damage_type ?? 'unknown'} (${r.severity ?? '-'}, ${r.urgency ?? '-'})`
            )
            .join('; ')}.`
        );
      } else {
        pastParts.push('No previous assessments for this job.');
      }
    } catch {
      pastParts.push('Could not fetch past assessments (e.g. job_id column missing).');
    }
  }

  if (pastParts.length > 0) {
    pastAssessmentsSummary = pastParts.join(' ');
  }

  const combined = [continuumSummary, pastAssessmentsSummary].filter(Boolean).join(' ');

  const result: RetrieveMemoryToolResult = {
    continuumSummary,
    pastAssessmentsSummary,
    combined,
  };

  const summary: ToolRunSummary = {
    success: true,
    message: combined.slice(0, 200),
  };

  return {
    toolName: 'retrieve_memory',
    params: {
      jobId: params.jobId,
      propertyId: params.propertyId,
      hasFeatureVector: Boolean(params.featureVector?.length),
    },
    result,
    summary,
  };
}
