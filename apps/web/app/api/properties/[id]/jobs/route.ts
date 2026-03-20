import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { NotFoundError } from '@/lib/errors/api-error';

/**
 * GET /api/properties/[id]/jobs
 * List all jobs associated with a property.
 */
export const GET = withApiHandler(
  { csrf: false, rateLimit: { maxRequests: 30 } },
  async (_request, { user, params }) => {
    const propertyId = params.id as string;

    // Verify property exists and belongs to user
    const { data: property, error: propError } = await serverSupabase
      .from('properties')
      .select('id, owner_id')
      .eq('id', propertyId)
      .single();

    if (propError || !property) {
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
