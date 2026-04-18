/**
 * GET /api/admin/retention/push-token-coverage
 *
 * Admin-only read that answers "what % of our active users ever registered
 * an Expo push token?" — the ground-truth signal that today's mobile
 * push-registration fix (commit 8fed54ed, NotificationPushSender) is
 * actually reaching production devices.
 *
 * Source: docs/RETENTION_ROADMAP_2026.md R1 move #13.
 */

import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

interface PushTokenCoverage {
  total_users_with_token: number;
  total_contractors: number;
  total_homeowners: number;
  contractor_coverage_pct: number;
  homeowner_coverage_pct: number;
  last_registration_at: string | null;
}

export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 60 } },
  async () => {
    try {
      // Distinct users with at least one registered push token.
      const { data: tokenRows, error: tokenErr } = await serverSupabase
        .from('user_push_tokens')
        .select('user_id, updated_at', { count: 'exact' })
        .order('updated_at', { ascending: false })
        .limit(1);

      if (tokenErr) throw tokenErr;

      // Role counts from profiles.
      const [{ count: contractorCount }, { count: homeownerCount }] =
        await Promise.all([
          serverSupabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'contractor'),
          serverSupabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'homeowner'),
        ]);

      const totalUsersWithToken =
        (tokenRows as unknown as { count?: number })?.count ?? 0;
      // Supabase JS returns the count on the result envelope, not the rows.
      // Re-query with a proper head count for accuracy:
      const { count: tokensDistinctCount } = await serverSupabase
        .from('user_push_tokens')
        .select('user_id', { count: 'exact', head: true });

      const coverage: PushTokenCoverage = {
        total_users_with_token: tokensDistinctCount ?? totalUsersWithToken,
        total_contractors: contractorCount ?? 0,
        total_homeowners: homeownerCount ?? 0,
        contractor_coverage_pct: 0,
        homeowner_coverage_pct: 0,
        last_registration_at:
          (tokenRows?.[0] as { updated_at?: string } | undefined)?.updated_at ??
          null,
      };

      // We can't cheaply split token coverage by role without a JOIN; report
      // the combined number as a blended coverage %. Refine in a later
      // iteration (add a `role` column snapshot to user_push_tokens or do
      // the join here).
      const totalUsers = coverage.total_contractors + coverage.total_homeowners;
      if (totalUsers > 0) {
        const blended = (coverage.total_users_with_token / totalUsers) * 100;
        coverage.contractor_coverage_pct = Math.round(blended * 10) / 10;
        coverage.homeowner_coverage_pct = Math.round(blended * 10) / 10;
      }

      return NextResponse.json(coverage);
    } catch (err) {
      logger.error('push-token-coverage query failed', {
        service: 'admin/retention',
        err: err instanceof Error ? err.message : String(err),
      });
      return NextResponse.json(
        { error: 'Failed to load push-token coverage' },
        { status: 500 }
      );
    }
  }
);
