import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { handleAPIError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 10
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(10),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

    // Fetch admin metrics
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
      serverSupabase.from('contractor_subscriptions')
        .select('id', { count: 'exact', head: true })
        .in('status', ['active', 'trial']),
      serverSupabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'contractor')
        .eq('admin_verified', false)
        .not('company_name', 'is', null)
        .not('license_number', 'is', null)
        .is('deleted_at', null),
    ]);

    const totalUsers = totalUsersResponse.count || 0;
    const totalContractors = totalContractorsResponse.count || 0;
    const totalJobs = totalJobsResponse.count || 0;
    const activeSubscriptions = activeSubscriptionsResponse.count || 0;
    const pendingVerifications = pendingVerificationsResponse.count || 0;

    // Calculate MRR using database function
    const { data: mrrData } = await serverSupabase.rpc('calculate_mrr');
    const mrr = mrrData && mrrData.length > 0 ? parseFloat(mrrData[0].total_mrr || '0') : 0;

    // Fetch chart data - user growth over last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: userGrowthData } = await serverSupabase
      .from('profiles')
      .select('created_at')
      .is('deleted_at', null)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    // Fetch job creation data
    const { data: jobGrowthData } = await serverSupabase
      .from('jobs')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    // Process data for charts - group by day
    const userGrowthByDay: Record<string, number> = {};
    const jobGrowthByDay: Record<string, number> = {};
    
    // Initialize all days with 0
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      userGrowthByDay[dateKey] = 0;
      jobGrowthByDay[dateKey] = 0;
    }

    // Count users per day
    userGrowthData?.forEach((user) => {
      const dateKey = new Date(user.created_at).toISOString().split('T')[0];
      if (userGrowthByDay[dateKey] !== undefined) {
        userGrowthByDay[dateKey]++;
      }
    });

    // Count jobs per day
    jobGrowthData?.forEach((job) => {
      const dateKey = new Date(job.created_at).toISOString().split('T')[0];
      if (jobGrowthByDay[dateKey] !== undefined) {
        jobGrowthByDay[dateKey]++;
      }
    });

    // Convert to array format for charts
    const userGrowthChart = Object.entries(userGrowthByDay).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
      users: count,
    }));

    const jobGrowthChart = Object.entries(jobGrowthByDay).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
      jobs: count,
    }));

    // Calculate cumulative totals for line chart
    let cumulativeUsers = 0;
    const userGrowthCumulative = userGrowthChart.map((item) => {
      cumulativeUsers += item.users;
      return { ...item, cumulative: cumulativeUsers };
    });

    let cumulativeJobs = 0;
    const jobGrowthCumulative = jobGrowthChart.map((item) => {
      cumulativeJobs += item.jobs;
      return { ...item, cumulative: cumulativeJobs };
    });

    return NextResponse.json({
      totalUsers,
      totalContractors,
      totalJobs,
      activeSubscriptions,
      mrr,
      pendingVerifications,
      lastUpdated: new Date().toISOString(),
      charts: {
        userGrowth: userGrowthCumulative,
        jobGrowth: jobGrowthCumulative,
      },
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

