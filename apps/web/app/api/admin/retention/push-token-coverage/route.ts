/**
 * GET /api/admin/retention/push-token-coverage
 *
 * Admin-only read that answers "what % of our active users ever registered
 * an Expo push token?" — the ground-truth signal that today's mobile
 * push-registration fix (commit 8fed54ed, NotificationPushSender) is
 * actually reaching production devices.
 *
 * 2026-04-30 audit P1: previously counted ROWS in `user_push_tokens`.
 * One user with three devices counted as three users, inflating the
 * coverage %. Now counts DISTINCT `user_id`s and splits the coverage
 * by role (contractor vs homeowner) using a `profiles` join in JS.
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
  contractors_with_token: number;
  homeowners_with_token: number;
  contractor_coverage_pct: number;
  homeowner_coverage_pct: number;
  blended_coverage_pct: number;
  last_registration_at: string | null;
}

export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 60 } },
  async () => {
    try {
      // Pull every (user_id, updated_at, is_active) — small table, but
      // also sets up the distinct-user dedupe and the role split below.
      const { data: tokenRows, error: tokenErr } = await serverSupabase
        .from('user_push_tokens')
        .select('user_id, updated_at, is_active')
        .order('updated_at', { ascending: false });

      if (tokenErr) throw tokenErr;

      const rows = (tokenRows ?? []) as Array<{
        user_id: string;
        updated_at: string | null;
        is_active: boolean | null;
      }>;

      // 2026-04-30 audit P1 fix: count DISTINCT users, not rows. A
      // contractor with phone + tablet + iPad shouldn't show up three
      // times in retention dashboards.
      const distinctUserIds = new Set<string>();
      let lastRegistrationAt: string | null = null;
      for (const row of rows) {
        if (!row.user_id) continue;
        // Exclude rows the mobile cleanup loop has explicitly marked
        // inactive — those tokens won't actually deliver pushes.
        if (row.is_active === false) continue;
        distinctUserIds.add(row.user_id);
        if (
          row.updated_at &&
          (!lastRegistrationAt || row.updated_at > lastRegistrationAt)
        ) {
          lastRegistrationAt = row.updated_at;
        }
      }

      // Role counts from profiles.
      const [{ count: contractorCount }, { count: homeownerCount }, rolesRes] =
        await Promise.all([
          serverSupabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'contractor'),
          serverSupabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'homeowner'),
          distinctUserIds.size > 0
            ? serverSupabase
                .from('profiles')
                .select('id, role')
                .in('id', Array.from(distinctUserIds))
            : Promise.resolve({
                data: [] as Array<{ id: string; role: string }>,
              }),
        ]);

      const roleRows = (rolesRes?.data ?? []) as Array<{
        id: string;
        role: string | null;
      }>;
      let contractorsWithToken = 0;
      let homeownersWithToken = 0;
      for (const r of roleRows) {
        if (r.role === 'contractor') contractorsWithToken++;
        else if (r.role === 'homeowner') homeownersWithToken++;
      }

      const totalContractors = contractorCount ?? 0;
      const totalHomeowners = homeownerCount ?? 0;
      const totalUsers = totalContractors + totalHomeowners;

      const pct = (numerator: number, denominator: number) =>
        denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : 0;

      const coverage: PushTokenCoverage = {
        total_users_with_token: distinctUserIds.size,
        total_contractors: totalContractors,
        total_homeowners: totalHomeowners,
        contractors_with_token: contractorsWithToken,
        homeowners_with_token: homeownersWithToken,
        contractor_coverage_pct: pct(contractorsWithToken, totalContractors),
        homeowner_coverage_pct: pct(homeownersWithToken, totalHomeowners),
        blended_coverage_pct: pct(distinctUserIds.size, totalUsers),
        last_registration_at: lastRegistrationAt,
      };

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
