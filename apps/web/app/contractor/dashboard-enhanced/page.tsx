import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { CircularProgress } from '@/components/ui/CircularProgress';
import { ProjectTable } from '@/components/ui/ProjectTable';
import { TodayTasks, Task } from '@/components/ui/TodayTasks';
import { Card, MetricCard } from '@/components/ui/Card.unified';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';
import { formatMoney } from '@/lib/utils/currency';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ResponsiveGrid } from './components/ResponsiveGrid';
import { ActionCard } from './components/ActionCard';
import { DashboardContentWrapper } from './components/DashboardContentWrapper';
import { TrialService } from '@/lib/services/subscription/TrialService';
import { TrialStatusBanner } from '@/app/contractor/subscription/components/TrialStatusBanner';
import { OnboardingService } from '@/lib/services/OnboardingService';
import { OnboardingWrapper } from '@/components/onboarding/OnboardingWrapper';

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
  ] = await Promise.all([
    serverSupabase
      .from('users')
      .select('first_name, last_name, company_name, profile_image_url, city, country, email')
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
  ]);

  const contractor = contractorProfileResponse.data;
  const jobs = jobsResponse.data || [];
  const bids = bidsResponse.data || [];
  const quotes = quotesResponse.data || [];
  const payments = paymentsResponse.data || [];

  // Calculate metrics
  const totalRevenue = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const completedJobs = jobs.filter((j) => j.status === 'completed');
  const activeJobs = jobs.filter((j) => j.status === 'in_progress' || j.status === 'assigned');
  const pendingBids = bids.filter((b) => b.status === 'pending');

  // Calculate month-over-month revenue change
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

  return (
    <OnboardingWrapper
      userRole="contractor"
      onboardingCompleted={onboardingStatus.completed}
    >
      <DashboardContentWrapper>
      {/* Page Content */}
      <div style={{ 
        flexGrow: 1, 
        flexShrink: 1, 
        flexBasis: '0%',
        paddingTop: '32px',
        paddingRight: '24px',
        paddingBottom: '40px',
        paddingLeft: '0px',
        width: '100%', 
        overflowX: 'visible', 
        position: 'relative', 
        zIndex: 100 
      }}>
        <div className="dashboard-inner-content">
        
        {/* Trial/Subscription Status Banner */}
        {trialStatus && trialStatus.daysRemaining !== null && (
          <TrialStatusBanner
            daysRemaining={trialStatus.daysRemaining}
            trialEndsAt={trialStatus.trialEndsAt}
          />
        )}

        {/* Overview Metrics */}
        <ResponsiveGrid className="metrics-grid">
          <MetricCard
            label="Total Revenue"
            value={formatMoney(totalRevenue)}
            subtitle={`${payments.filter((p) => p.status === 'completed').length} payments`}
            icon="currencyPound"
            trend={{
              direction: revenueChange >= 0 ? 'up' : 'down',
              value: `${Math.abs(revenueChange).toFixed(1)}%`,
              label: 'from last month',
            }}
            color={theme.colors.success}
          />

          <MetricCard
            label="Projects"
            value={totalProjects.toString()}
            subtitle={`${completedJobs.length} completed`}
            icon="briefcase"
            trend={{
              direction: completedJobs.length > 0 ? 'up' : 'neutral',
              value: `${completedJobs.length}`,
              label: 'finished this month',
            }}
            color={theme.colors.primary}
          />

          <MetricCard
            label="Active Jobs"
            value={activeJobs.length.toString()}
            subtitle="Currently in progress"
            icon="clock"
            trend={{
              direction: activeJobs.length > 3 ? 'up' : 'neutral',
              value: `${activeJobs.length}`,
              label: 'need attention',
            }}
            color="#F59E0B"
          />

          <MetricCard
            label="Pending Bids"
            value={pendingBids.length.toString()}
            subtitle="Awaiting response"
            icon="fileText"
            trend={{
              direction: 'neutral',
              value: `${bids.length}`,
              label: 'total bids',
            }}
            color={theme.colors.info}
          />
        </ResponsiveGrid>

        {/* Project Summary & Progress */}
        <ResponsiveGrid className="project-grid" style={{ gap: theme.spacing[3], marginTop: theme.spacing[4] }}>
          {/* Overall Progress */}
          <div
            style={{
              backgroundColor: theme.colors.surface,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: '20px',
              padding: theme.spacing[8],
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
              minHeight: '420px',
            }}
          >
            <h2
              style={{
                margin: 0,
                marginBottom: theme.spacing[6],
                fontSize: theme.typography.fontSize['2xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
                alignSelf: 'flex-start',
              }}
            >
              Overall Progress
            </h2>

            <CircularProgress
              value={Math.round(completionRate)}
              size={200}
              strokeWidth={14}
              label="Completed"
            />

            {/* Stats Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: theme.spacing[4],
                width: '100%',
                marginTop: theme.spacing[6],
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: theme.typography.fontSize['2xl'],
                    fontWeight: theme.typography.fontWeight.bold,
                    color: theme.colors.textPrimary,
                  }}
                >
                  {overallStats.total}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.textSecondary,
                  }}
                >
                  Total projects
                </p>
              </div>

              <div style={{ textAlign: 'center' }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: theme.typography.fontSize['2xl'],
                    fontWeight: theme.typography.fontWeight.bold,
                    color: theme.colors.success,
                  }}
                >
                  {overallStats.completed}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.textSecondary,
                  }}
                >
                  Completed
                </p>
              </div>

              <div style={{ textAlign: 'center' }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: theme.typography.fontSize['2xl'],
                    fontWeight: theme.typography.fontWeight.bold,
                    color: '#F59E0B',
                  }}
                >
                  {overallStats.delayed}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.textSecondary,
                  }}
                >
                  Delayed
                </p>
              </div>

              <div style={{ textAlign: 'center' }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: theme.typography.fontSize['2xl'],
                    fontWeight: theme.typography.fontWeight.bold,
                    color: theme.colors.info,
                  }}
                >
                  {overallStats.ongoing}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.textSecondary,
                  }}
                >
                  On going
                </p>
              </div>
            </div>
          </div>

          {/* Project Table */}
          <div style={{ width: '100%', maxWidth: '100%', minWidth: 0, overflowX: 'auto' }}>
            <ProjectTableDynamic 
              projects={projectTableData} 
              jobUrlPattern="/contractor/jobs/{id}"
            />
          </div>
        </ResponsiveGrid>

        {/* Today Tasks & Quick Actions Grid */}
        <ResponsiveGrid className="tasks-actions-grid" style={{ gap: theme.spacing[5], marginTop: theme.spacing[2] }}>
          {/* Today Tasks */}
          <div style={{ minHeight: '420px', width: '100%', maxWidth: '100%', minWidth: 0 }}>
            <TodayTasksDynamic 
              tasks={todayTasks} 
              taskUrlPattern="/contractor/jobs/{id}"
            />
          </div>

          {/* Quick Actions */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing[5],
              minHeight: '420px',
              backgroundColor: theme.colors.surface,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: '20px',
              padding: theme.spacing[8],
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
              }}
            >
              Quick Actions
            </h2>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: theme.spacing[3],
              }}
            >
              <ActionCard label="View All Jobs" href="/contractor/bid" icon="clipboard" />
              <ActionCard label="Manage Quotes" href="/contractor/quotes" icon="fileText" />
              <ActionCard label="Finance Dashboard" href="/contractor/finance" icon="currencyDollar" />
              <ActionCard label="View Analytics" href="/contractor/reporting" icon="chart" />
            </div>
          </div>
        </ResponsiveGrid>
        </div>
      </div>
    </DashboardContentWrapper>
    </OnboardingWrapper>
  );
}
