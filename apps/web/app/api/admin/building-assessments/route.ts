import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { DataCollectionService } from '@/lib/services/building-surveyor/DataCollectionService';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/**
 * GET /api/admin/building-assessments
 * Get assessments with optional status filter
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'pending' | 'validated' | 'rejected' | null;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let assessments;
    if (status === 'validated') {
      assessments = await DataCollectionService.getValidatedAssessments(limit, offset);
    } else if (status === 'pending' || !status) {
      assessments = await DataCollectionService.getPendingAssessments(limit, offset);
    } else {
      // For rejected or other statuses, query directly
      const { data, error } = await serverSupabase
        .from('building_assessments')
        .select(
          `
          *,
          user:users!building_assessments_user_id_fkey(id, first_name, last_name, email),
          images:assessment_images(image_url, image_index)
        `
        )
        .eq('validation_status', status)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      assessments = data || [];
    }

    const statistics = await DataCollectionService.getStatistics();

    return NextResponse.json({
      assessments,
      statistics,
    });
  } catch (error: unknown) {
    logger.error('Error fetching assessments', error, {
      service: 'admin_building_assessments',
    });
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch assessments';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

