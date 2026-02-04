/**
 * GET /api/admin/assessment-evidence
 * View what the AI stored for an assessment (Roboflow detect, SAM3 segment, vision_labels, retrieve_memory).
 * Query: ?assessmentId=<uuid> (required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { handleAPIError } from '@/lib/errors/api-error';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;

    const { searchParams } = new URL(request.url);
    const assessmentId = searchParams.get('assessmentId');

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
      // SECURITY: Use centralized error handler (sanitizes database errors)
      return handleAPIError(new Error(`Failed to fetch evidence: ${error.message}`));
    }

    return NextResponse.json({
      assessmentId,
      evidence: evidence ?? [],
      categories: evidence?.find((e) => e.tool_name === 'detect')?.output_summary as
        | { damageTypesDetected?: string[] }
        | undefined,
    });
  } catch (err) {
    return handleAPIError(err);
  }
}
