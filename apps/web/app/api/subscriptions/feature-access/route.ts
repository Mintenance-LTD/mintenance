/**
 * GET /api/subscriptions/feature-access
 *
 * Sprint 7 (3.2): server-side resolution of (subscription tier, usage counters)
 * so the `useFeatureAccess` client hook no longer queries
 * homeowner_subscriptions / contractor_subscriptions / feature_usage via the
 * default Supabase client. That direct-client pattern meant a single RLS
 * misconfiguration would leak another user's subscription or usage data to
 * the browser; this endpoint runs under withApiHandler (authenticated) and
 * uses the service-role client with an explicit user-id filter, so the
 * response is always scoped to the current user by construction.
 */

import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getEarlyAccessEntitlement } from '@/lib/subscription/early-access';
import { logger } from '@mintenance/shared';

type SubscriptionTier =
  | 'free'
  | 'pro'
  | 'business'
  | 'enterprise'
  | 'landlord'
  | 'agency';
type SubscriptionStatus =
  | 'free'
  | 'active'
  | 'trial'
  | 'past_due'
  | 'canceled'
  | 'expired';

interface FeatureUsageRow {
  feature_id: string;
  used_count: number;
  limit_count: number | null;
  reset_date: string;
}

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 60 } },
  async (_request, { user }) => {
    // Early access bypass — highest tier for either role.
    const earlyAccess = await getEarlyAccessEntitlement(user.id);
    if (earlyAccess.eligible) {
      const maxTier: SubscriptionTier =
        earlyAccess.role === 'homeowner' ? 'agency' : 'enterprise';
      return NextResponse.json({
        role: user.role,
        tier: maxTier,
        status: 'active' satisfies SubscriptionStatus,
        currentPeriodEnd: null,
        earlyAccess: true,
        usage: [],
      });
    }

    // Resolve subscription tier from the right table for the role.
    let tier: SubscriptionTier = 'free';
    let status: SubscriptionStatus = 'free';
    let currentPeriodEnd: string | null = null;

    if (user.role === 'homeowner') {
      const { data, error } = await serverSupabase
        .from('homeowner_subscriptions')
        .select('plan_type, status, current_period_end')
        .eq('homeowner_id', user.id)
        .in('status', ['active', 'trial', 'past_due'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        logger.error(
          'feature-access: failed to load homeowner subscription',
          error,
          {
            service: 'subscriptions',
            userId: user.id,
          }
        );
      } else if (data) {
        tier = (data.plan_type as SubscriptionTier) ?? 'free';
        status = (data.status as SubscriptionStatus) ?? 'free';
        currentPeriodEnd = data.current_period_end ?? null;
      }
    } else if (user.role === 'contractor') {
      const { data, error } = await serverSupabase
        .from('contractor_subscriptions')
        .select('plan_type, status, current_period_end')
        .eq('contractor_id', user.id)
        .in('status', ['free', 'active', 'past_due'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        logger.error(
          'feature-access: failed to load contractor subscription',
          error,
          {
            service: 'subscriptions',
            userId: user.id,
          }
        );
      } else if (data) {
        tier = (data.plan_type as SubscriptionTier) ?? 'free';
        status = (data.status as SubscriptionStatus) ?? 'free';
        currentPeriodEnd = data.current_period_end ?? null;
      }
    } else {
      // Admins get unlimited — the client hook handles this separately.
      return NextResponse.json({
        role: user.role,
        tier: 'enterprise' satisfies SubscriptionTier,
        status: 'active' satisfies SubscriptionStatus,
        currentPeriodEnd: null,
        earlyAccess: false,
        usage: [],
      });
    }

    // Usage counters — always filter by current user id.
    const { data: usageRows, error: usageError } = await serverSupabase
      .from('feature_usage')
      .select('feature_id, used_count, limit_count, reset_date')
      .eq('user_id', user.id)
      .gte('reset_date', new Date().toISOString());

    if (usageError) {
      logger.error('feature-access: failed to load feature_usage', usageError, {
        service: 'subscriptions',
        userId: user.id,
      });
    }

    const usage = (usageRows ?? []).map((r: FeatureUsageRow) => ({
      featureId: r.feature_id,
      used: r.used_count ?? 0,
      limit: r.limit_count ?? 0,
      resetDate: r.reset_date,
    }));

    return NextResponse.json({
      role: user.role,
      tier,
      status,
      currentPeriodEnd,
      earlyAccess: false,
      usage,
    });
  }
);
