import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * GET /api/admin/pricing-metrics
 *
 * 2026-05-22 Sprint 5.2: Post-rollout observability dashboard for the
 * tiered pricing model (feat/tiered-pricing). Surfaces the indicators
 * we need to watch in the 2-4 weeks after merge:
 *
 * 1. Tier distribution — are contractors actually subscribing to Pro/
 *    Business now that fees differ?
 * 2. Fee revenue mix — does aggregate platform fee revenue shift
 *    upward with the new 12/8/5% rates?
 * 3. Active-jobs cap pressure — how many Free/Basic contractors are
 *    at the 3-job ceiling (the upgrade-pressure point)?
 * 4. Support SLA performance — are tickets responded to within their
 *    tier-promised hours?
 * 5. Subscription movement — new subs vs cancellations this window.
 *
 * All queries scoped to the requested window (default = last 30 days).
 * Admin-only. No new logging required — uses existing tables.
 */

interface TierCount {
  tier: string;
  count: number;
}

interface FeeRevenueBucket {
  tier: string;
  totalFee: number;
  jobCount: number;
}

interface SubMovement {
  created: number;
  canceled: number;
  netChange: number;
}

interface SlaPerformance {
  tier: string;
  open: number;
  breaching: number; // open tickets past their SLA
}

export interface PricingMetricsResponse {
  windowDays: number;
  asOf: string;
  contractorTierDistribution: TierCount[];
  feeRevenueByTier: FeeRevenueBucket[];
  activeJobsAtCap: {
    /** Contractors with status=active/trial AND >=3 assigned+in_progress jobs */
    freeBasicAtCap: number;
    freeBasicTotal: number;
  };
  homeownerTierDistribution: TierCount[];
  subscriptionMovement: {
    contractor: SubMovement;
    homeowner: SubMovement;
  };
  supportSla: SlaPerformance[];
  earlyAccessGrants: {
    contractor: number;
    homeowner: number;
    cohortLimit: number;
  };
}

export const GET = withApiHandler(
  { roles: ['admin'], csrf: false, rateLimit: { maxRequests: 30 } },
  async (request) => {
    const url = new URL(request.url);
    const windowDays = Math.min(
      Math.max(parseInt(url.searchParams.get('windowDays') || '30', 10), 1),
      365
    );
    const windowStart = new Date(
      Date.now() - windowDays * 24 * 60 * 60 * 1000
    ).toISOString();
    const asOf = new Date().toISOString();

    // 1. Contractor tier distribution (active subscriptions)
    const { data: contractorSubs } = await serverSupabase
      .from('contractor_subscriptions')
      .select('plan_type, status')
      .in('status', ['active', 'trial']);
    const contractorTierMap = new Map<string, number>();
    for (const s of contractorSubs ?? []) {
      contractorTierMap.set(
        s.plan_type,
        (contractorTierMap.get(s.plan_type) ?? 0) + 1
      );
    }
    const contractorTierDistribution: TierCount[] = Array.from(
      contractorTierMap,
      ([tier, count]) => ({ tier, count })
    ).sort((a, b) => b.count - a.count);

    // 2. Homeowner tier distribution
    const { data: homeownerSubs } = await serverSupabase
      .from('homeowner_subscriptions')
      .select('plan_type, status')
      .in('status', ['active', 'trial']);
    const homeownerTierMap = new Map<string, number>();
    for (const s of homeownerSubs ?? []) {
      homeownerTierMap.set(
        s.plan_type,
        (homeownerTierMap.get(s.plan_type) ?? 0) + 1
      );
    }
    const homeownerTierDistribution: TierCount[] = Array.from(
      homeownerTierMap,
      ([tier, count]) => ({ tier, count })
    ).sort((a, b) => b.count - a.count);

    // 3. Fee revenue by tier (escrow completions in window).
    // Join via contractor_id -> plan_type. Falls back to 'basic' if no
    // sub row (matches the runtime fee fallback in FeeCalculationService).
    const { data: feeRows } = await serverSupabase
      .from('escrow_transactions')
      .select('platform_fee, payee_id, jobs!inner(contractor_id)')
      .in('status', ['completed', 'released'])
      .gte('updated_at', windowStart)
      .not('platform_fee', 'is', null);

    const contractorTierLookup = new Map<string, string>();
    for (const s of contractorSubs ?? []) {
      // plan_type is the canonical tier identifier
    }
    // Build contractor_id -> tier lookup table
    const { data: allActiveSubs } = await serverSupabase
      .from('contractor_subscriptions')
      .select('contractor_id, plan_type')
      .in('status', ['active', 'trial']);
    for (const sub of allActiveSubs ?? []) {
      contractorTierLookup.set(sub.contractor_id, sub.plan_type);
    }

    const feeBucket = new Map<string, { totalFee: number; jobCount: number }>();
    for (const row of feeRows ?? []) {
      const job = row.jobs as unknown as { contractor_id: string };
      const tier = contractorTierLookup.get(job.contractor_id) ?? 'basic';
      const fee =
        typeof row.platform_fee === 'number'
          ? row.platform_fee
          : Number(row.platform_fee || 0);
      const bucket = feeBucket.get(tier) ?? { totalFee: 0, jobCount: 0 };
      bucket.totalFee += fee;
      bucket.jobCount += 1;
      feeBucket.set(tier, bucket);
    }
    const feeRevenueByTier: FeeRevenueBucket[] = Array.from(
      feeBucket,
      ([tier, b]) => ({
        tier,
        totalFee: Math.round(b.totalFee * 100) / 100,
        jobCount: b.jobCount,
      })
    ).sort((a, b) => b.totalFee - a.totalFee);

    // 4. Active-jobs cap pressure: count Free/Basic contractors at 3
    // concurrent assigned+in_progress jobs.
    const { data: contractorActiveJobs } = await serverSupabase
      .from('jobs')
      .select('contractor_id')
      .in('status', ['assigned', 'in_progress'])
      .not('contractor_id', 'is', null);

    const jobCountPerContractor = new Map<string, number>();
    for (const j of contractorActiveJobs ?? []) {
      if (!j.contractor_id) continue;
      jobCountPerContractor.set(
        j.contractor_id,
        (jobCountPerContractor.get(j.contractor_id) ?? 0) + 1
      );
    }
    let freeBasicAtCap = 0;
    let freeBasicTotal = 0;
    for (const sub of allActiveSubs ?? []) {
      if (sub.plan_type === 'free' || sub.plan_type === 'basic') {
        freeBasicTotal++;
        if ((jobCountPerContractor.get(sub.contractor_id) ?? 0) >= 3) {
          freeBasicAtCap++;
        }
      }
    }

    // 5. Subscription movement in window
    const [
      contractorCreated,
      contractorCanceled,
      homeownerCreated,
      homeownerCanceled,
    ] = await Promise.all([
      serverSupabase
        .from('contractor_subscriptions')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', windowStart)
        .not('plan_type', 'eq', 'free'),
      serverSupabase
        .from('contractor_subscriptions')
        .select('id', { count: 'exact', head: true })
        .gte('canceled_at', windowStart),
      serverSupabase
        .from('homeowner_subscriptions')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', windowStart),
      serverSupabase
        .from('homeowner_subscriptions')
        .select('id', { count: 'exact', head: true })
        .gte('canceled_at', windowStart),
    ]);

    const contractorMovement: SubMovement = {
      created: contractorCreated.count ?? 0,
      canceled: contractorCanceled.count ?? 0,
      netChange:
        (contractorCreated.count ?? 0) - (contractorCanceled.count ?? 0),
    };
    const homeownerMovement: SubMovement = {
      created: homeownerCreated.count ?? 0,
      canceled: homeownerCanceled.count ?? 0,
      netChange: (homeownerCreated.count ?? 0) - (homeownerCanceled.count ?? 0),
    };

    // 6. Support SLA performance — tickets open past their sla_hours.
    const { data: openTickets } = await serverSupabase
      .from('support_tickets')
      .select('sla_tier, sla_hours, created_at')
      .eq('status', 'open');

    const slaMap = new Map<string, { open: number; breaching: number }>();
    const now = Date.now();
    for (const t of openTickets ?? []) {
      const tier = t.sla_tier || 'basic';
      const slaHours = t.sla_hours ?? 48;
      const ageHours =
        (now - new Date(t.created_at).getTime()) / (60 * 60 * 1000);
      const bucket = slaMap.get(tier) ?? { open: 0, breaching: 0 };
      bucket.open++;
      if (ageHours > slaHours) bucket.breaching++;
      slaMap.set(tier, bucket);
    }
    const supportSla: SlaPerformance[] = Array.from(slaMap, ([tier, b]) => ({
      tier,
      ...b,
    })).sort((a, b) => b.breaching - a.breaching);

    // 7. Early-access grants used
    const [contractorGrants, homeownerGrants] = await Promise.all([
      serverSupabase
        .from('early_access_grants')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'contractor')
        .eq('grant_type', 'max_subscription_features'),
      serverSupabase
        .from('early_access_grants')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'homeowner')
        .eq('grant_type', 'max_subscription_features'),
    ]);

    const response: PricingMetricsResponse = {
      windowDays,
      asOf,
      contractorTierDistribution,
      feeRevenueByTier,
      activeJobsAtCap: { freeBasicAtCap, freeBasicTotal },
      homeownerTierDistribution,
      subscriptionMovement: {
        contractor: contractorMovement,
        homeowner: homeownerMovement,
      },
      supportSla,
      earlyAccessGrants: {
        contractor: contractorGrants.count ?? 0,
        homeowner: homeownerGrants.count ?? 0,
        cohortLimit: 100,
      },
    };

    return NextResponse.json(response);
  }
);
