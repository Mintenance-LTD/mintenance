import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { DataCollectionService } from '@/lib/services/building-surveyor/DataCollectionService';
import { serverSupabase } from '@/lib/api/supabaseServer';

/**
 * GET /api/admin/building-assessments
 * Get assessments with optional status filter
 */
export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 10 } },
  async (request) => {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as 'pending' | 'validated' | 'rejected' | null;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let assessments;
    if (status === 'validated') {
      assessments = await DataCollectionService.getValidatedAssessments(limit, offset);
    } else if (status === 'pending' || !status) {
      assessments = await DataCollectionService.getPendingAssessments(limit, offset);
    } else {
      const { data, error } = await serverSupabase
        .from('building_assessments')
        .select(`
          *,
          user:profiles!building_assessments_user_id_fkey(id, first_name, last_name, email),
          images:assessment_images(image_url, image_index)
        `)
        .eq('validation_status', status)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      assessments = data || [];
    }

    const statistics = await DataCollectionService.getStatistics();

    return NextResponse.json({ assessments, statistics });
  }
);
