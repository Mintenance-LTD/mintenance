import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { AgencyActivityLogger } from '@/lib/services/agency/AgencyActivityLogger';
import { hasFeatureAccess } from '@/lib/feature-access-config';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ForbiddenError } from '@/lib/errors/api-error';

/**
 * GET /api/agency/activity-log
 * Fetch agency activity audit log (agency-tier homeowners only)
 */
export const GET = withApiHandler(
  { roles: ['homeowner'], csrf: false },
  async (request, { user }) => {
    // Check agency tier
    const { data: subscription } = await serverSupabase
      .from('homeowner_subscriptions')
      .select('plan_type')
      .eq('homeowner_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    const tier = subscription?.plan_type || 'free';
    if (!hasFeatureAccess('HOMEOWNER_ACTIVITY_AUDIT_LOG', 'homeowner', tier)) {
      throw new ForbiddenError('Activity audit log requires an Agency subscription');
    }

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const actionType = url.searchParams.get('actionType') || undefined;
    const dateFrom = url.searchParams.get('dateFrom') || undefined;
    const dateTo = url.searchParams.get('dateTo') || undefined;

    const result = await AgencyActivityLogger.getActivityLogs(user.id, {
      limit,
      offset,
      actionType,
      dateFrom,
      dateTo,
    });

    return NextResponse.json(result);
  },
);
