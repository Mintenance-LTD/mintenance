import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { getEffectiveHomeownerTier } from '@/lib/subscription/early-access';
import { hasFeatureAccess } from '@/lib/feature-access-config';
import { z } from 'zod';

/**
 * 2026-05-22 Sprint 5: Year-over-year portfolio analytics for Agency tier.
 *
 * Aggregates spend, job counts, category mix, and compliance activity
 * across two calendar years for properties owned by the requesting
 * user. Agency-only (HOMEOWNER_YOY_COMPARISON feature gate) — Landlord
 * gets per-property analytics but not the YoY comparison view.
 *
 * "Spend" = sum of escrow_transactions.amount where status ∈
 * ('completed', 'released') and the underlying job's property is owned
 * by the user. This is the authoritative "money actually paid"
 * figure — jobs.budget is the homeowner's intent, not the outcome.
 */

const querySchema = z.object({
  year: z.coerce
    .number()
    .int()
    .min(2020)
    .max(new Date().getFullYear() + 1)
    .default(new Date().getFullYear()),
  compareYear: z.coerce.number().int().min(2020).optional(),
});

interface YearMetrics {
  year: number;
  spend: number;
  jobsTotal: number;
  jobsCompleted: number;
  propertiesActive: number;
  avgJobValue: number;
  topCategory: { name: string; spend: number } | null;
  complianceCertsCreated: number;
  recurringSchedulesActive: number;
}

interface YoyResponse {
  current: YearMetrics;
  previous: YearMetrics;
  deltas: {
    spendPct: number | null;
    jobsCompletedPct: number | null;
    avgJobValuePct: number | null;
  };
}

function yearBounds(year: number) {
  return {
    start: `${year}-01-01T00:00:00Z`,
    end: `${year + 1}-01-01T00:00:00Z`,
  };
}

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null; // n/a when no baseline
  return ((current - previous) / previous) * 100;
}

/**
 * Build the metric set for a single year. Scoped to properties owned
 * by `userId`. Six independent queries fired in parallel — keeps the
 * route well under any rate-limit pressure even if a user has hundreds
 * of properties.
 */
async function buildYearMetrics(
  userId: string,
  year: number
): Promise<YearMetrics> {
  const { start, end } = yearBounds(year);

  // 1. Properties the user owns. All other queries scope to this set.
  const { data: propertyRows } = await serverSupabase
    .from('properties')
    .select('id, created_at')
    .eq('owner_id', userId);

  const propertyIds = (propertyRows ?? []).map((p) => p.id);
  const propertiesActive = (propertyRows ?? []).filter(
    (p) => new Date(p.created_at) < new Date(end)
  ).length;

  if (propertyIds.length === 0) {
    return {
      year,
      spend: 0,
      jobsTotal: 0,
      jobsCompleted: 0,
      propertiesActive: 0,
      avgJobValue: 0,
      topCategory: null,
      complianceCertsCreated: 0,
      recurringSchedulesActive: 0,
    };
  }

  // 2-6 run in parallel.
  const [jobsRes, escrowRes, certsRes, schedulesRes] = await Promise.all([
    // 2. Jobs created in the year for these properties.
    serverSupabase
      .from('jobs')
      .select('id, status, category, property_id')
      .in('property_id', propertyIds)
      .gte('created_at', start)
      .lt('created_at', end),

    // 3. Escrow spend joined via the job's property.
    serverSupabase
      .from('escrow_transactions')
      .select('amount, status, jobs!inner(category, property_id)')
      .in('jobs.property_id', propertyIds)
      .in('status', ['completed', 'released'])
      .gte('created_at', start)
      .lt('created_at', end),

    // 4. Compliance certs created in the year.
    serverSupabase
      .from('compliance_certificates')
      .select('id', { count: 'exact', head: true })
      .in('property_id', propertyIds)
      .gte('created_at', start)
      .lt('created_at', end),

    // 5. Recurring schedules active at end of year.
    serverSupabase
      .from('recurring_maintenance_schedules')
      .select('id', { count: 'exact', head: true })
      .in('property_id', propertyIds)
      .eq('is_active', true)
      .lt('created_at', end),
  ]);

  const jobs = jobsRes.data ?? [];
  const jobsTotal = jobs.length;
  const jobsCompleted = jobs.filter((j) => j.status === 'completed').length;

  const escrows = escrowRes.data ?? [];
  const spend = escrows.reduce(
    (sum, e) =>
      sum + (typeof e.amount === 'number' ? e.amount : Number(e.amount || 0)),
    0
  );

  // Top category by escrow spend.
  const categorySpend = new Map<string, number>();
  for (const e of escrows) {
    const job = (e.jobs as unknown as { category: string | null }) || null;
    const cat = job?.category || 'uncategorised';
    const amt = typeof e.amount === 'number' ? e.amount : Number(e.amount || 0);
    categorySpend.set(cat, (categorySpend.get(cat) ?? 0) + amt);
  }
  let topCategory: { name: string; spend: number } | null = null;
  for (const [name, spend] of categorySpend) {
    if (!topCategory || spend > topCategory.spend) {
      topCategory = { name, spend };
    }
  }

  const avgJobValue = jobsCompleted > 0 ? spend / jobsCompleted : 0;

  return {
    year,
    spend: Math.round(spend * 100) / 100,
    jobsTotal,
    jobsCompleted,
    propertiesActive,
    avgJobValue: Math.round(avgJobValue * 100) / 100,
    topCategory: topCategory
      ? {
          name: topCategory.name,
          spend: Math.round(topCategory.spend * 100) / 100,
        }
      : null,
    complianceCertsCreated: certsRes.count ?? 0,
    recurringSchedulesActive: schedulesRes.count ?? 0,
  };
}

export const GET = withApiHandler(
  { roles: ['homeowner', 'admin'], csrf: false },
  async (req, { user }) => {
    // Agency-only feature gate. Admins bypass for support. Early-access
    // founding members resolve to 'agency' automatically.
    if (user.role !== 'admin') {
      const tier = await getEffectiveHomeownerTier(user.id);
      if (!hasFeatureAccess('HOMEOWNER_YOY_COMPARISON', 'homeowner', tier)) {
        return NextResponse.json(
          {
            error: 'Subscription required',
            message:
              'Year-over-year comparison requires an Agency subscription.',
            requiresSubscription: true,
            feature: 'HOMEOWNER_YOY_COMPARISON',
          },
          { status: 402 }
        );
      }
    }

    const url = new URL(req.url);
    const parsed = querySchema.safeParse({
      year: url.searchParams.get('year'),
      compareYear: url.searchParams.get('compareYear'),
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid query' },
        { status: 400 }
      );
    }

    const year = parsed.data.year;
    const compareYear = parsed.data.compareYear ?? year - 1;

    if (compareYear === year) {
      return NextResponse.json(
        { error: 'compareYear must differ from year' },
        { status: 400 }
      );
    }

    const [current, previous] = await Promise.all([
      buildYearMetrics(user.id, year),
      buildYearMetrics(user.id, compareYear),
    ]);

    const response: YoyResponse = {
      current,
      previous,
      deltas: {
        spendPct: pctDelta(current.spend, previous.spend),
        jobsCompletedPct: pctDelta(
          current.jobsCompleted,
          previous.jobsCompleted
        ),
        avgJobValuePct: pctDelta(current.avgJobValue, previous.avgJobValue),
      },
    };

    return NextResponse.json(response);
  }
);
