import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';

/**
 * GET /api/admin/dashboard/metrics
 * Admin dashboard metrics with user growth and job charts
 */
export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 10 } },
  async () => {
    const [
      totalUsersResponse,
      totalContractorsResponse,
      totalJobsResponse,
      activeSubscriptionsResponse,
      pendingVerificationsResponse,
    ] = await Promise.all([
      serverSupabase.from('profiles').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      serverSupabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'contractor').is('deleted_at', null),
      serverSupabase.from('jobs').select('id', { count: 'exact', head: true }),
      serverSupabase.from('contractor_subscriptions').select('id', { count: 'exact', head: true }).in('status', ['active', 'trial']),
      serverSupabase.from('profiles').select('id', { count: 'exact', head: true })
        .eq('role', 'contractor').eq('admin_verified', false)
        .not('company_name', 'is', null).not('license_number', 'is', null).is('deleted_at', null),
    ]);

    const totalUsers = totalUsersResponse.count || 0;
    const totalContractors = totalContractorsResponse.count || 0;
    const totalJobs = totalJobsResponse.count || 0;
    const activeSubscriptions = activeSubscriptionsResponse.count || 0;
    const pendingVerifications = pendingVerificationsResponse.count || 0;

    const { data: mrrData } = await serverSupabase.rpc('calculate_mrr');
    const mrr = mrrData && mrrData.length > 0 ? parseFloat(mrrData[0].total_mrr || '0') : 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [{ data: userGrowthData }, { data: jobGrowthData }] = await Promise.all([
      serverSupabase.from('profiles').select('created_at').is('deleted_at', null)
        .gte('created_at', thirtyDaysAgo.toISOString()).order('created_at', { ascending: true }),
      serverSupabase.from('jobs').select('created_at')
        .gte('created_at', thirtyDaysAgo.toISOString()).order('created_at', { ascending: true }),
    ]);

    const userGrowthByDay: Record<string, number> = {};
    const jobGrowthByDay: Record<string, number> = {};

    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      userGrowthByDay[dateKey] = 0;
      jobGrowthByDay[dateKey] = 0;
    }

    userGrowthData?.forEach((u) => {
      const dateKey = new Date(u.created_at).toISOString().split('T')[0];
      if (userGrowthByDay[dateKey] !== undefined) userGrowthByDay[dateKey]++;
    });

    jobGrowthData?.forEach((j) => {
      const dateKey = new Date(j.created_at).toISOString().split('T')[0];
      if (jobGrowthByDay[dateKey] !== undefined) jobGrowthByDay[dateKey]++;
    });

    let cumulativeUsers = 0;
    const userGrowthCumulative = Object.entries(userGrowthByDay).map(([date, count]) => {
      cumulativeUsers += count;
      return { date: new Date(date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }), users: count, cumulative: cumulativeUsers };
    });

    let cumulativeJobs = 0;
    const jobGrowthCumulative = Object.entries(jobGrowthByDay).map(([date, count]) => {
      cumulativeJobs += count;
      return { date: new Date(date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }), jobs: count, cumulative: cumulativeJobs };
    });

    return NextResponse.json({
      totalUsers,
      totalContractors,
      totalJobs,
      activeSubscriptions,
      mrr,
      pendingVerifications,
      lastUpdated: new Date().toISOString(),
      charts: { userGrowth: userGrowthCumulative, jobGrowth: jobGrowthCumulative },
    });
  }
);
