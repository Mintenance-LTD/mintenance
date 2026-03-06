import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { AgencyActivityLogger } from '@/lib/services/agency/AgencyActivityLogger';
import { hasFeatureAccess } from '@/lib/feature-access-config';
import { getEffectiveHomeownerTier } from '@/lib/subscription/early-access';
import { ForbiddenError } from '@/lib/errors/api-error';

/**
 * GET /api/agency/activity-log
 * Fetch agency activity audit log (agency-tier homeowners only)
 */
export const GET = withApiHandler(
  { roles: ['homeowner'], csrf: false },
  async (request, { user }) => {
    // Check agency tier (early access included)
    const tier = await getEffectiveHomeownerTier(user.id);
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
