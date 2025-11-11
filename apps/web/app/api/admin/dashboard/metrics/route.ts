import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - admin access required' }, { status: 401 });
    }

    // Fetch admin metrics
    const [
      totalUsersResponse,
      totalContractorsResponse,
      totalJobsResponse,
      activeSubscriptionsResponse,
      pendingVerificationsResponse,
    ] = await Promise.all([
      serverSupabase.from('users').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      serverSupabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'contractor').is('deleted_at', null),
      serverSupabase.from('jobs').select('id', { count: 'exact', head: true }),
      serverSupabase.from('contractor_subscriptions')
        .select('id', { count: 'exact', head: true })
        .in('status', ['active', 'trial']),
      serverSupabase
        .from('users')
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
      .from('users')
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
    console.error('Error fetching dashboard metrics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

