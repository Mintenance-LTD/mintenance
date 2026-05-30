import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { NotFoundError } from '@/lib/errors/api-error';
import { PropertyTeamService } from '@/lib/services/property-team/PropertyTeamService';

/**
 * GET /api/properties/[id]/jobs
 * List all jobs associated with a property.
 *
 * 2026-05-26 audit-57 P1: previously this route gated on
 * `property.owner_id === user.id` (+ platform admin). The sibling
 * /api/properties/[id] route already honours PropertyTeamService.authorize
 * — managers/viewers who can see the property got `[]` back from this
 * route, so PropertyHealthScore / SpendingAnalytics / Job History on
 * shared properties looked silently empty even when jobs existed. Mirror
 * the authorize('view') gate the detail route uses so the two surfaces
 * agree on visibility.
 */
export const GET = withApiHandler(
  { csrf: false, rateLimit: { maxRequests: 30 } },
  async (_request, { user, params }) => {
    const propertyId = params.id as string;

    const { authorized } = await PropertyTeamService.authorize(
      user.id,
      propertyId,
      'view'
    );

    if (!authorized && user.role !== 'admin') {
      throw new NotFoundError('Property not found');
    }

    // Fetch jobs for this property
    const { data: jobs, error: jobsError } = await serverSupabase
      .from('jobs')
      .select('id, title, status, budget, category, created_at, completed_at')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    if (jobsError) {
      throw jobsError;
    }

    return NextResponse.json(jobs || []);
  }
);
