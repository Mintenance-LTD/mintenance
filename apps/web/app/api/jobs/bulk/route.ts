import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { JobCreationService } from '@/lib/services/job-creation-service';
import { hasFeatureAccess } from '@/lib/feature-access-config';
import { BadRequestError, ForbiddenError } from '@/lib/errors/api-error';
import { z } from 'zod';

const bulkJobSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  category: z.string().max(128).optional(),
  propertyIds: z.array(z.string().uuid()).min(1).max(50),
});

/**
 * POST /api/jobs/bulk
 * Create the same job across multiple properties (agency-tier only)
 */
export const POST = withApiHandler(
  { roles: ['homeowner'] },
  async (req, { user }) => {
    // Check agency tier
    const { data: subscription } = await serverSupabase
      .from('homeowner_subscriptions')
      .select('plan_type')
      .eq('homeowner_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    const tier = subscription?.plan_type || 'free';
    if (!hasFeatureAccess('HOMEOWNER_BULK_OPERATIONS', 'homeowner', tier)) {
      throw new ForbiddenError('Bulk job posting requires an Agency subscription');
    }

    const body = await req.json();
    const parsed = bulkJobSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid input');
    }

    const { title, description, category, propertyIds } = parsed.data;

    // Verify all properties belong to user
    const { data: ownedProperties } = await serverSupabase
      .from('properties')
      .select('id')
      .eq('owner_id', user.id)
      .in('id', propertyIds);

    const ownedIds = new Set((ownedProperties || []).map(p => p.id));
    const unauthorizedIds = propertyIds.filter(id => !ownedIds.has(id));
    if (unauthorizedIds.length > 0) {
      throw new ForbiddenError(`You do not own ${unauthorizedIds.length} of the selected properties`);
    }

    const results: { propertyId: string; jobId?: string; error?: string }[] = [];

    for (const propertyId of propertyIds) {
      try {
        const job = await JobCreationService.getInstance().createJob(
          { id: user.id, role: 'homeowner' },
          { title, description, category: category || undefined, property_id: propertyId },
        );
        results.push({ propertyId, jobId: job.id });
      } catch (err) {
        results.push({
          propertyId,
          error: err instanceof Error ? err.message : 'Failed to create job',
        });
      }
    }

    const created = results.filter(r => r.jobId).length;
    const failed = results.filter(r => r.error);

    return NextResponse.json({
      created,
      failed: failed.length,
      results,
    }, { status: 201 });
  },
);
