import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';

/**
 * GET /api/admin/assessment-evidence
 * View what the AI stored for an assessment (Roboflow detect, SAM3 segment, etc.)
 * Query: ?assessmentId=<uuid> (required)
 */
export const GET = withApiHandler(
  { roles: ['admin'] },
  async (request) => {
    const assessmentId = request.nextUrl.searchParams.get('assessmentId');

    if (!assessmentId) {
      return NextResponse.json(
        { error: 'assessmentId is required. Example: ?assessmentId=<uuid>' },
        { status: 400 }
      );
    }

    const { data: evidence, error } = await serverSupabase
      .from('assessment_evidence')
      .select('id, tool_name, step_index, input_refs, output_summary, confidence_aggregate, created_at')
      .eq('assessment_id', assessmentId)
      .order('step_index', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch evidence: ${error.message}`);
    }

    return NextResponse.json({
      assessmentId,
      evidence: evidence ?? [],
      categories: evidence?.find((e) => e.tool_name === 'detect')?.output_summary as
        | { damageTypesDetected?: string[] }
        | undefined,
    });
  }
);
