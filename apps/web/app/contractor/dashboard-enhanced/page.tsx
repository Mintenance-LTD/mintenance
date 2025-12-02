import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { formatMoney } from '@/lib/utils/currency';
import { TrialService } from '@/lib/services/subscription/TrialService';
import { OnboardingService } from '@/lib/services/OnboardingService';
import { ContractorDashboard2025Client } from './components/ContractorDashboard2025Client';

export const metadata = {
  title: 'Dashboard | Mintenance',
  description: 'Your comprehensive contractor dashboard',
};

export default async function ContractorDashboard2025() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  const onboardingStatus = await OnboardingService.checkOnboardingStatus(user.id);

  // Fetch all data in parallel
  const [
    contractorProfileResponse,
    jobsResponse,
    bidsResponse,
    quotesResponse,
    paymentsResponse,
    trialStatus,
    escrowsResponse,
    notificationsResponse,
  ] = await Promise.all([
    serverSupabase
      .from('users')
      .select('first_name, last_name, company_name, profile_image_url, city, country, email, stripe_connect_account_id')
      .eq('id', user.id)
      .single(),
    serverSupabase
      .from('jobs')
      .select(`
        id,
        title,
        status,
        budget,
        scheduled_date,
        created_at,
        updated_at,
        category,
        priority,
        homeowner:homeowner_id (
          first_name,
          last_name,
          email
        ),
        job_progress (
          progress_percentage
        )
      `)
      .eq('contractor_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(20),
    serverSupabase
      .from('bids')
      .select('id, status, bid_amount, created_at, job_id')
      .eq('contractor_id', user.id)
      .limit(50),
    serverSupabase
      .from('contractor_quotes')
      .select('id, status, total_amount, created_at, updated_at')
      .eq('contractor_id', user.id)
      .limit(50),
    serverSupabase
      .from('payments')
      .select('amount, status, created_at')
      .eq('payee_id', user.id)
      .limit(100),
    TrialService.getTrialStatus(user.id),
    serverSupabase
      .from('escrow_transactions')
      .select('id, amount, status')
      .eq('payee_id', user.id)
      .in('status', ['held', 'awaiting_homeowner_approval', 'pending_review', 'pending'])
      .limit(20),
    serverSupabase
      .from('notifications')
      .select('id, type, message, created_at, is_read')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const contractor = contractorProfileResponse.data;
  const jobs = jobsResponse.data || [];
  const bids = bidsResponse.data || [];
  const quotes = quotesResponse.data || [];
  const payments = paymentsResponse.data || [];
  const escrows = escrowsResponse.data || [];
  const notifications = notificationsResponse.data || [];

  const completedJobs = jobs.filter((j) => j.status === 'completed');
  const activeJobs = jobs.filter((j) => j.status === 'in_progress' || j.status === 'assigned');
  const pendingBids = bids.filter((b) => b.status === 'pending');

  // ✅ FIXED: Use real monthly revenue aggregation instead of manual calculations
  const { getMonthlyRevenue, getRevenueStats } = await import('@/app/dashboard/lib/revenue-queries');
  const monthlyRevenue = await getMonthlyRevenue(user.id, 6, 'earnings');
  const revenueStats = await getRevenueStats(user.id, 'earnings');
  const totalRevenue = revenueStats.total;

  // Calculate month-over-month revenue change
  const revenueChange = revenueStats.growthPercentage;

  // Calculate completion rate
  const totalProjects = jobs.length;
  const completionRate = totalProjects > 0 ? (completedJobs.length / totalProjects) * 100 : 0;

  // Pending escrow
  const pendingEscrowAmount = escrows.reduce((sum, e) => sum + (e.amount || 0), 0);
  const pendingEscrowCount = escrows.length;
  const hasPaymentSetup = !!contractor?.stripe_connect_account_id;

  // ✅ FIXED: Progress trend data from real monthly aggregations
  const now = new Date();
  const progressTrendData = monthlyRevenue.map((monthData, index) => {
    // Count jobs created in this month
    const monthStart = new Date(monthData.year, parseInt(monthData.monthKey.split('-')[1]) - 1, 1);
    const monthEnd = new Date(monthData.year, parseInt(monthData.monthKey.split('-')[1]), 0);
    
    const monthJobs = jobs.filter(
      (j) => {
        const jobDate = new Date(j.created_at);
        return jobDate >= monthStart && jobDate <= monthEnd;
      }
    );

    const monthCompleted = monthJobs.filter((j) => j.status === 'completed').length;

    return {
      month: monthData.month,
      jobs: monthJobs.length,
      completed: monthCompleted,
      revenue: monthData.total,
    };
  });

  // Recent jobs data
  const recentJobs = jobs.slice(0, 5).map((job) => {
    const homeowner = Array.isArray(job.homeowner) ? job.homeowner[0] : job.homeowner;
    const jobProgress = Array.isArray(job.job_progress)
      ? job.job_progress[0]
      : job.job_progress;
    const realProgress = jobProgress?.progress_percentage
      ? parseFloat(jobProgress.progress_percentage.toString())
      : null;

    let progress: number;
    if (realProgress !== null) {
      progress = realProgress;
    } else {
      switch (job.status) {
        case 'completed': progress = 100; break;
        case 'in_progress': progress = 50; break;
        case 'assigned': progress = 25; break;
        default: progress = 0;
      }
    }

    return {
      id: job.id,
      title: job.title,
      status: job.status,
      budget: job.budget,
      progress,
      category: job.category,
      priority: job.priority,
      homeowner: homeowner
        ? `${homeowner.first_name || ''} ${homeowner.last_name || ''}`.trim() || homeowner.email
        : 'Unknown',
      dueDate: job.scheduled_date,
    };
  });

  // Prepare data for client component
  const dashboardData = {
    contractor: {
      id: user.id,
      name: (contractor
        ? `${contractor.first_name || ''} ${contractor.last_name || ''}`.trim() || contractor.email || user.email || 'Unknown'
        : user.email || 'Unknown') as string,
      company: contractor?.company_name as string | undefined,
      avatar: contractor?.profile_image_url as string | undefined,
      location: (contractor ? `${contractor.city || ''}, ${contractor.country || ''}`.trim() : '') as string,
      email: (contractor?.email || user.email || '') as string,
    },
    metrics: {
      totalRevenue,
      revenueChange,
      activeJobs: activeJobs.length,
      completedJobs: completedJobs.length,
      pendingBids: pendingBids.length,
      completionRate,
      pendingEscrowAmount,
      pendingEscrowCount,
    },
    progressTrendData,
    recentJobs,
    notifications: notifications.map(n => ({
      id: n.id,
      type: n.type,
      message: n.message,
      timestamp: n.created_at,
      isRead: n.is_read,
    })),
    trialStatus: trialStatus ? {
      isTrialing: trialStatus.isTrialActive,
      trialEndsAt: trialStatus.trialEndsAt?.toISOString(),
      daysRemaining: trialStatus.daysRemaining,
    } : null,
    hasPaymentSetup,
    onboardingStatus: onboardingStatus as { stepsCompleted?: number; totalSteps?: number; isComplete?: boolean } | null,
  };

  return <ContractorDashboard2025Client data={dashboardData} />;
}
