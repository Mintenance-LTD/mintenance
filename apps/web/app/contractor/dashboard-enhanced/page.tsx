import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ContractorLayoutShell } from '../components/ContractorLayoutShell';
import { CircularProgress } from '@/components/ui/CircularProgress';
import { ProjectTable } from '@/components/ui/ProjectTable';
import { TodayTasks, Task } from '@/components/ui/TodayTasks';
import { MetricCard } from '@/components/ui/MetricCard';
import { theme } from '@/lib/theme';
import Link from 'next/link';

export const metadata = {
  title: 'Enhanced Dashboard | Mintenance',
  description: 'Your comprehensive project management dashboard',
};

export default async function EnhancedDashboardPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  

  // Fetch all necessary data in parallel
  const [
    contractorProfileResponse,
    jobsResponse,
    bidsResponse,
    quotesResponse,
    paymentsResponse,
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
      progress:
        job.status === 'completed'
          ? 100
          : job.status === 'in_progress'
            ? 60
            : job.status === 'assigned'
              ? 30
              : 0,
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

  return (
    <ContractorLayoutShell contractor={contractor} email={user.email}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[6],
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: theme.typography.fontSize['3xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
                marginBottom: theme.spacing[1],
              }}
            >
              Dashboard
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textSecondary,
              }}
            >
              Welcome back,{' '}
              {contractor?.first_name || contractor?.company_name || user.email}
            </p>
          </div>

          <Link
            href="/contractor/quotes"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: theme.spacing[2],
              padding: `${theme.spacing[3]} ${theme.spacing[5]}`,
              backgroundColor: theme.colors.primary,
              color: theme.colors.white,
              borderRadius: '12px',
              textDecoration: 'none',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold,
              transition: 'all 0.2s',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '20px' }}>+</span>
            Create New Quote
          </Link>
        </div>

        {/* Overview Metrics */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: theme.spacing[4],
          }}
        >
          <MetricCard
            label="Total Revenue"
            value={`£${totalRevenue.toLocaleString()}`}
            subtitle={`${payments.filter((p) => p.status === 'completed').length} payments`}
            icon="currencyDollar"
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
        </section>

        {/* Project Summary & Progress */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 400px',
            gap: theme.spacing[6],
          }}
        >
          {/* Project Table */}
          <ProjectTable projects={projectTableData} />

          {/* Overall Progress */}
          <div
            style={{
              backgroundColor: theme.colors.surface,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: '20px',
              padding: theme.spacing[6],
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
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
        </div>

        {/* Today Tasks */}
        <TodayTasks tasks={todayTasks} />

        {/* Quick Actions */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: theme.spacing[4],
          }}
        >
          {[
            { label: 'View All Jobs', href: '/contractor/bid', icon: '📋' },
            { label: 'Manage Quotes', href: '/contractor/quotes', icon: '📝' },
            { label: 'Finance Dashboard', href: '/contractor/finance', icon: '💰' },
            { label: 'View Analytics', href: '/analytics', icon: '📊' },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[3],
                padding: theme.spacing[4],
                backgroundColor: theme.colors.surface,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '16px',
                textDecoration: 'none',
                color: theme.colors.textPrimary,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 4px 12px ${theme.colors.border}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span style={{ fontSize: '24px' }}>{action.icon}</span>
              <span
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                }}
              >
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </ContractorLayoutShell>
  );
}
