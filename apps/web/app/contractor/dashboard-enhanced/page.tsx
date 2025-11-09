import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { CircularProgress } from '@/components/ui/CircularProgress';
import { ProjectTable } from '@/components/ui/ProjectTable';
import { TodayTasks, Task } from '@/components/ui/TodayTasks';
import { Card } from '@/components/ui/Card.unified';
import { MetricCard } from '@/components/ui/figma';
import { theme } from '@/lib/theme';
import { formatMoney } from '@/lib/utils/currency';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ResponsiveGrid } from './components/ResponsiveGrid';
import { DashboardContentWrapper } from './components/DashboardContentWrapper';
import { TrialService } from '@/lib/services/subscription/TrialService';
import { TrialStatusBanner } from '@/app/contractor/subscription/components/TrialStatusBanner';
import { SubscriptionExpiredReminder } from '@/app/contractor/subscription/components/SubscriptionExpiredReminder';
import { OnboardingService } from '@/lib/services/OnboardingService';
import { OnboardingWrapper } from '@/components/onboarding/OnboardingWrapper';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { getGradientCardStyle } from '@/lib/theme-enhancements';
import { PaymentSetupBanner } from './components/PaymentSetupBanner';
import { WelcomeHeader } from './components/WelcomeHeader';
import { ProgressTrendChart } from './components/ProgressTrendChart';

// Dynamic imports for code splitting
const ProjectTableDynamic = dynamic(() => import('@/components/ui/ProjectTable').then(mod => ({ default: mod.ProjectTable })), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />
});

const TodayTasksDynamic = dynamic(() => import('@/components/ui/TodayTasks').then(mod => ({ default: mod.TodayTasks })), {
  loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded-lg" />
});

export const metadata = {
  title: 'Enhanced Dashboard | Mintenance',
  description: 'Your comprehensive project management dashboard',
};

export default async function EnhancedDashboardPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  

  // Fetch onboarding status
  const onboardingStatus = await OnboardingService.checkOnboardingStatus(user.id);

  // Fetch all necessary data in parallel
  const [
    contractorProfileResponse,
    jobsResponse,
    bidsResponse,
    quotesResponse,
    paymentsResponse,
    trialStatus,
    escrowsResponse,
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
      .select('id, status, bid_amount, created_at')
      .eq('contractor_id', user.id),
    serverSupabase
      .from('contractor_quotes')
      .select('id, status, total_amount, created_at, updated_at')
      .eq('contractor_id', user.id),
    serverSupabase
      .from('payments')
      .select('amount, status, created_at')
      .eq('payee_id', user.id),
    TrialService.getTrialStatus(user.id),
    serverSupabase
      .from('escrow_transactions')
      .select('id, amount, status')
      .eq('payee_id', user.id)
      .in('status', ['held', 'awaiting_homeowner_approval', 'pending_review', 'pending']),
  ]);

  const contractor = contractorProfileResponse.data;
  const jobs = jobsResponse.data || [];
  const bids = bidsResponse.data || [];
  const quotes = quotesResponse.data || [];
  const payments = paymentsResponse.data || [];
  const escrows = escrowsResponse.data || [];

  // Calculate pending escrow amount
  const pendingEscrowAmount = escrows.reduce((sum, e) => sum + (e.amount || 0), 0);
  const pendingEscrowCount = escrows.length;
  const hasPaymentSetup = !!contractor?.stripe_connect_account_id;

  // Calculate metrics
  const totalRevenue = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const completedJobs = jobs.filter((j) => j.status === 'completed');
  const activeJobs = jobs.filter((j) => j.status === 'in_progress' || j.status === 'assigned');
  const pendingBids = bids.filter((b) => b.status === 'pending');

  // Calculate month-over-month revenue change
  const now = new Date();
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const lastMonth = new Date(thisMonth);
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  const thisMonthRevenue = payments
    .filter((p) => p.status === 'completed' && new Date(p.created_at) >= thisMonth)
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const lastMonthRevenue = payments
    .filter(
      (p) =>
        p.status === 'completed' &&
        new Date(p.created_at) >= lastMonth &&
        new Date(p.created_at) < thisMonth
    )
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const revenueChange =
    lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

  // Calculate job completion rate
  const totalProjects = jobs.length;
  const completionRate = totalProjects > 0 ? (completedJobs.length / totalProjects) * 100 : 0;

  // Prepare progress trend data (last 6 months)
  const progressTrendData = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    
    // Get jobs created in this month
    const monthJobs = jobs.filter(
      (j) => new Date(j.created_at) >= monthDate && new Date(j.created_at) <= monthEnd
    );
    
    // Get completed jobs from this month's jobs
    const monthCompleted = monthJobs.filter((j) => j.status === 'completed').length;
    
    // Calculate completion rate for this month
    const monthCompletionRate = monthJobs.length > 0 
      ? (monthCompleted / monthJobs.length) * 100 
      : 0;
    
    progressTrendData.push({
      month: monthDate.toLocaleDateString('en-US', { month: 'short' }),
      completionRate: monthCompletionRate,
    });
  }

  // Prepare project table data
  const projectTableData = jobs.slice(0, 5).map((job) => {
    const homeowner = Array.isArray(job.homeowner) ? job.homeowner[0] : job.homeowner;
    // Get real progress from job_progress table, or fallback to status-based estimation
    const jobProgress = Array.isArray(job.job_progress) 
      ? job.job_progress[0] 
      : job.job_progress;
    const realProgress = jobProgress?.progress_percentage 
      ? parseFloat(jobProgress.progress_percentage.toString())
      : null;
    
    // Use real progress if available, otherwise estimate based on status
    let progress: number;
    if (realProgress !== null && !isNaN(realProgress)) {
      progress = Math.round(realProgress);
    } else {
      // Fallback to status-based estimation
      progress =
        job.status === 'completed'
          ? 100
          : job.status === 'in_progress'
            ? 60
            : job.status === 'assigned'
              ? 30
              : 0;
    }
    
    return {
      id: job.id,
      name: job.title || 'Untitled Project',
      manager:
        homeowner && (homeowner.first_name || homeowner.last_name)
          ? `${homeowner.first_name || ''} ${homeowner.last_name || ''}`.trim()
          : homeowner?.email || 'N/A',
      dueDate: job.scheduled_date || job.created_at,
      status:
        job.status === 'completed'
          ? ('completed' as const)
          : job.status === 'in_progress'
            ? ('on_going' as const)
            : job.status === 'posted'
              ? ('posted' as const)
              : ('pending' as const),
      progress,
    };
  });

  // Prepare today's tasks (derived from active jobs and pending quotes)
  const todayTasks: Task[] = [
    ...activeJobs.slice(0, 3).map((job) => ({
      id: job.id,
      title: `Continue work on: ${job.title || 'Untitled job'}`,
      status: 'on_going' as const,
      completed: false,
    })),
    ...quotes
      .filter((q) => q.status === 'draft')
      .slice(0, 2)
      .map((quote) => ({
        id: quote.id,
        title: `Complete and send quote #${quote.id.slice(0, 8)}`,
        status: 'pending' as const,
        completed: false,
      })),
    ...pendingBids.slice(0, 2).map((bid) => ({
      id: bid.id,
      title: `Follow up on bid #${bid.id.slice(0, 8)}`,
      status: 'in_review' as const,
      completed: false,
    })),
  ];

  // Overall progress stats
  const overallStats = {
    total: totalProjects,
    completed: completedJobs.length,
    delayed: jobs.filter((j) => j.status === 'delayed').length,
    ongoing: activeJobs.length,
  };

  const contractorFullName =
    contractor?.first_name || contractor?.last_name
      ? `${contractor?.first_name ?? ''} ${contractor?.last_name ?? ''}`.trim()
      : contractor?.company_name ?? 'Mintenance Contractor';

  // Prepare activity data for ActivityFeed
  const activities: Array<{
    id: string;
    type: 'job' | 'payment' | 'message' | 'bid' | 'quote';
    title: string;
    description: string;
    timestamp: string;
    linkText?: string;
    linkHref?: string;
  }> = [];

  // Add job activities
  activeJobs.slice(0, 2).forEach((job) => {
    const createdDate = new Date(job.created_at);
    activities.push({
      id: `job-${job.id}`,
      type: 'job',
      title: `Job in progress: ${job.title || 'Untitled Job'}`,
      description: `Status: ${job.status === 'in_progress' ? 'In Progress' : 'Assigned'}`,
      timestamp: createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      linkText: 'View Job',
      linkHref: `/contractor/jobs/${job.id}`,
    });
  });

  // Add bid activities
  pendingBids.slice(0, 2).forEach((bid) => {
    const createdDate = new Date(bid.created_at);
    activities.push({
      id: `bid-${bid.id}`,
      type: 'bid',
      title: `Pending bid: £${formatMoney(parseFloat(bid.bid_amount || '0'), 'GBP')}`,
      description: 'Awaiting homeowner response',
      timestamp: createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      linkText: 'View Bid',
      linkHref: '/contractor/bid',
    });
  });

  // Add payment activities
  payments
    .filter((p) => p.status === 'completed')
    .slice(0, 2)
    .forEach((payment, index) => {
      const createdDate = new Date(payment.created_at);
      activities.push({
        id: `payment-${index}-${createdDate.getTime()}`,
        type: 'payment',
        title: `Payment received: £${formatMoney(parseFloat(payment.amount || '0'), 'GBP')}`,
        description: 'Payment completed',
        timestamp: createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        linkText: 'View Payment',
        linkHref: '/contractor/finance',
      });
    });

  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const recentActivities = activities.slice(0, 4);

  // Prepare revenue chart data (last 6 months)
  const revenueChartData = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const monthRevenue = payments
      .filter(
        (p) =>
          p.status === 'completed' &&
          new Date(p.created_at) >= monthDate &&
          new Date(p.created_at) <= monthEnd
      )
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);
    
    // Use actual revenue or fallback to estimated based on month index
    const estimatedValue = totalRevenue > 0 
      ? totalRevenue * (0.6 + (5 - i) * 0.1) // Gradual increase over months
      : (5 - i) * 1000; // Fallback for zero revenue
    
    revenueChartData.push({
      label: monthDate.toLocaleDateString('en-US', { month: 'short' }),
      value: monthRevenue || estimatedValue,
    });
  }

  // Prepare weekly jobs data
  const weeklyJobsData = [];
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  for (let i = 6; i >= 0; i--) {
    const dayDate = new Date(now);
    dayDate.setDate(dayDate.getDate() - i);
    const dayStart = new Date(dayDate.setHours(0, 0, 0, 0));
    const dayEnd = new Date(dayDate.setHours(23, 59, 59, 999));
    
    const dayJobs = jobs.filter(
      (j) =>
        new Date(j.created_at) >= dayStart &&
        new Date(j.created_at) <= dayEnd
    ).length;
    
    weeklyJobsData.push({
      label: daysOfWeek[dayDate.getDay() === 0 ? 6 : dayDate.getDay() - 1],
      value: dayJobs || Math.floor((6 - i) * 0.5), // Fallback: gradual decrease
      color: theme.colors.primary,
    });
  }

  // Prepare weekly revenue data
  const weeklyRevenueData = [];
  for (let week = 3; week >= 0; week--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (week * 7 + 6));
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    const weekRevenue = payments
      .filter(
        (p) =>
          p.status === 'completed' &&
          new Date(p.created_at) >= weekStart &&
          new Date(p.created_at) <= weekEnd
      )
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);
    
    // Use actual revenue or fallback to estimated based on week index
    const estimatedWeekRevenue = totalRevenue > 0
      ? totalRevenue * (0.2 + (3 - week) * 0.05) // Gradual increase over weeks
      : (3 - week + 1) * 500; // Fallback for zero revenue
    
    weeklyRevenueData.push({
      label: `Week ${4 - week}`,
      value: weekRevenue || estimatedWeekRevenue,
      color: theme.colors.success,
    });
  }

  return (
    <OnboardingWrapper
      userRole="contractor"
      onboardingCompleted={onboardingStatus.completed}
    >
      <DashboardContentWrapper>
      {/* Page Content */}
      <div suppressHydrationWarning style={{ 
        flex: '1 1 0%',
        width: '100%', 
        overflowX: 'visible', 
        position: 'relative', 
        zIndex: 100 
      }}>
        <div suppressHydrationWarning style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
          width: '100%',
          maxWidth: '100%',
        }}>
        
        {/* Trial/Subscription Status Banner - Only show if trial is active but expiring soon */}
        {trialStatus && trialStatus.daysRemaining !== null && trialStatus.daysRemaining > 0 && (
          <TrialStatusBanner
            daysRemaining={trialStatus.daysRemaining}
            trialEndsAt={trialStatus.trialEndsAt}
          />
        )}

        {/* Floating Reminder - Only shows when expired and user tries to do something */}
        {trialStatus && trialStatus.daysRemaining !== null && trialStatus.daysRemaining <= 0 && (
          <SubscriptionExpiredReminder
            daysRemaining={trialStatus.daysRemaining}
            trialEndsAt={trialStatus.trialEndsAt}
          />
        )}

        {/* Payment Setup Banner - Show if contractor hasn't set up payments */}
        {!hasPaymentSetup && (
          <PaymentSetupBanner
            contractorId={user.id}
            pendingAmount={pendingEscrowAmount}
            pendingEscrows={pendingEscrowCount}
          />
        )}

        {/* Welcome Header */}
        <WelcomeHeader
          contractorFullName={contractorFullName}
          activeJobsCount={activeJobs.length}
          pendingBidsCount={pendingBids.length}
          thisMonthRevenue={thisMonthRevenue}
        />

        {/* Modern Grid Layout - Inspired by Aura.build */}
        <div className="space-y-6">
          {/* Top Row: Project Summary & Today Tasks - Modern Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Project Table - Takes 6 columns (left) */}
            <div className="col-span-1">
              <ProjectTableDynamic 
                projects={projectTableData} 
                jobUrlPattern="/contractor/jobs/{id}"
              />
            </div>

            {/* Today Tasks - Takes 6 columns (right) */}
            <div className="col-span-1">
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 h-full group relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity duration-200 z-10" data-gradient-bar="true"></div>
                <TodayTasksDynamic
                  tasks={todayTasks}
                  taskUrlPattern="/contractor/jobs/{id}"
                />
              </div>
            </div>
          </div>

          {/* Second Row: Overall Progress - Full Width */}
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12">
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10" data-gradient-bar="true"></div>
                
                <h2 className="text-subheading-md font-[560] text-gray-900 mb-8 tracking-normal">
                  Overall Progress
                </h2>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                  {/* Left Section: Circular Progress & Stats - Takes 5 columns */}
                  <div className="xl:col-span-5 flex flex-col gap-6">
                    {/* Circular Progress */}
                    <div className="flex justify-center xl:justify-start xl:ml-[140px]">
                      <CircularProgress
                        value={Math.round(completionRate)}
                        size={200}
                        strokeWidth={14}
                        label="Completed"
                      />
                    </div>

                    {/* Stats Grid - 2x2 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-6 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all duration-200 border border-gray-100">
                        <p className="text-4xl font-[640] text-gray-900 mb-2">
                          {overallStats.total}
                        </p>
                        <p className="text-xs font-[560] text-gray-600 uppercase tracking-wider">
                          Total projects
                        </p>
                      </div>

                      <div className="text-center p-6 rounded-xl bg-green-50 hover:bg-green-100 transition-all duration-200 border border-green-100">
                        <p className="text-4xl font-[640] text-green-600 mb-2">
                          {overallStats.completed}
                        </p>
                        <p className="text-xs font-[560] text-gray-600 uppercase tracking-wider">
                          Completed
                        </p>
                      </div>

                      <div className="text-center p-6 rounded-xl bg-orange-50 hover:bg-orange-100 transition-all duration-200 border border-orange-100">
                        <p className="text-4xl font-[640] text-orange-600 mb-2">
                          {overallStats.delayed}
                        </p>
                        <p className="text-xs font-[560] text-gray-600 uppercase tracking-wider">
                          Delayed
                        </p>
                      </div>

                      <div className="text-center p-6 rounded-xl bg-blue-50 hover:bg-blue-100 transition-all duration-200 border border-blue-100">
                        <p className="text-4xl font-[640] text-blue-600 mb-2">
                          {overallStats.ongoing}
                        </p>
                        <p className="text-xs font-[560] text-gray-600 uppercase tracking-wider">
                          On going
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Section: Progress Trend Chart - Takes 7 columns */}
                  <div className="xl:col-span-7 flex flex-col">
                    <div className="mb-4">
                      <h3 className="text-lg font-[560] text-gray-900 mb-1">Progress Trend</h3>
                      <p className="text-sm text-gray-600">Completion rate over the last 6 months</p>
                    </div>
                    <div className="flex-1 min-h-[250px]">
                      <ProgressTrendChart data={progressTrendData} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </DashboardContentWrapper>
    </OnboardingWrapper>
  );
}
