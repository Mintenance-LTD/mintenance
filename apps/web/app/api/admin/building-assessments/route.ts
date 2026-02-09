import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { DataCollectionService } from '@/lib/services/building-surveyor/DataCollectionService';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { handleAPIError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

/**
 * GET /api/admin/building-assessments
 * Get assessments with optional status filter
 */
export async function GET(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 10
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(10),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

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
          user:profiles!building_assessments_user_id_fkey(id, first_name, last_name, email),
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
    return handleAPIError(error);
  }
}

