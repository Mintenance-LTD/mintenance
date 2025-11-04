import { headers } from 'next/headers';
import Link from 'next/link';
import { getCurrentUserFromHeaders, getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import UnauthenticatedCard from '@/components/UnauthenticatedCard';
import { Icon } from '@/components/ui/Icon';
import { Badge as StatusBadge } from '@/components/ui/Badge.unified';
import { theme } from '@/lib/theme';
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { DashboardHeader } from './components/DashboardHeader';
import { SpendingSummary } from './components/SpendingSummary';
import { RecentActivity } from './components/RecentActivity';
import { KpiCards } from './components/KpiCards';
import { UpcomingList } from './components/UpcomingList';
import { InvoicesChart } from './components/InvoicesChart';
import { ActivityFeed } from './components/ActivityFeed';
import { PredictiveRecommendations } from './components/PredictiveRecommendations';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatMoney } from '@/lib/utils/currency';
import { RecommendationsService } from '@/lib/services/RecommendationsService';
import { OnboardingService } from '@/lib/services/OnboardingService';
import { OnboardingWrapper } from '@/components/onboarding/OnboardingWrapper';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | Mintenance',
  description: 'Manage your Mintenance account and projects',
};

export default async function DashboardPage() {
  const headersList = await headers();

  let user = getCurrentUserFromHeaders(headersList as unknown as Headers);
  if (!user) {
    user = await getCurrentUserFromCookies();
  }

  if (!user) {
    return <UnauthenticatedCard />;
  }

  // Redirect contractors to their enhanced dashboard
  if (user.role === 'contractor') {
    const { redirect } = await import('next/navigation');
    redirect('/contractor/dashboard-enhanced');
  }

  // Homeowner dashboard (contractors are redirected above)
  // Fetch homeowner-specific data
  const { data: homeownerProfile } = await serverSupabase
    .from('users')
    .select('first_name, last_name, email, profile_image_url')
    .eq('id', user.id)
    .single();

  // Fetch jobs first (needed for bids query)
  const { data: homeownerJobs } = await serverSupabase
    .from('jobs')
    .select('*')
    .eq('homeowner_id', user.id)
    .order('created_at', { ascending: false });

  const jobs = homeownerJobs || [];
  const jobIds = jobs.map(j => j.id);

  // Fetch recommendations
  const recommendations = await RecommendationsService.getRecommendations(user.id);

  // Fetch onboarding status
  const onboardingStatus = await OnboardingService.checkOnboardingStatus(user.id);

  // Fetch remaining data in parallel (now that we have job IDs)
  const [
    { data: bidsData },
    { data: quotesData },
    { data: recentActivity },
    { data: propertiesData },
    { data: subscriptionsData },
    { data: paymentsData }
  ] = await Promise.all([
    // Bids - use job IDs we already fetched
    jobIds.length > 0
      ? serverSupabase
          .from('bids')
          .select(`
            id,
            job_id,
            contractor_id,
            amount,
            status,
            created_at,
            updated_at,
            jobs (
              id,
              title,
              category,
              location
            ),
            contractor:users!bids_contractor_id_fkey (
              id,
              first_name,
              last_name,
              profile_image_url
            )
          `)
          .in('job_id', jobIds)
          .order('created_at', { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),
    // Contractor Quotes (legacy)
    jobIds.length > 0
      ? serverSupabase
          .from('contractor_quotes')
          .select(`
            id,
            job_id,
            contractor_id,
            total_amount,
            status,
            created_at,
            job:jobs!contractor_quotes_job_id_fkey (
              id,
              title,
              category
            ),
            contractor:users!contractor_quotes_contractor_id_fkey (
              id,
              first_name,
              last_name,
              profile_image_url
            )
          `)
          .in('job_id', jobIds)
          .order('created_at', { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),
    // Recent Activity
    serverSupabase
      .from('messages')
      .select('id, content, sender_id, created_at')
      .or(`recipient_id.eq.${user.id},sender_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(10),
    // Properties
    serverSupabase
      .from('properties')
      .select('id, status, created_at')
      .eq('owner_id', user.id),
    // Subscriptions
    serverSupabase
      .from('subscriptions')
      .select('id, status, next_billing_date, amount, created_at')
      .eq('user_id', user.id),
    // Payments/Invoices
    serverSupabase
      .from('payments')
      .select('id, amount, status, created_at, due_date')
      .eq('payer_id', user.id)
      .order('created_at', { ascending: false })
  ]);

  const bids = bidsData || [];
  const quotes = quotesData || [];
  const properties = propertiesData || [];
  const subscriptions = subscriptionsData || [];
  const payments = paymentsData || [];
  
  // Combine bids and quotes for display
  const allBids = [
    ...bids.map((bid: any) => ({
      ...bid,
      job: Array.isArray(bid.jobs) ? bid.jobs[0] : bid.jobs,
      contractor: bid.contractor,
      amount: bid.amount,
      total_amount: bid.amount,
    })),
    ...quotes.map((quote: any) => ({
      ...quote,
      job: Array.isArray(quote.job) ? quote.job[0] : quote.job,
      contractor: Array.isArray(quote.contractor) ? quote.contractor[0] : quote.contractor,
      amount: quote.total_amount,
    })),
  ];

  const activeJobs = jobs.filter(j => ['posted', 'assigned', 'in_progress'].includes(j.status || ''));
  const completedJobs = jobs.filter(j => j.status === 'completed');
  const postedJobs = jobs.filter(j => j.status === 'posted');
  const awaitingBids = jobs.filter(j => j.status === 'posted' && !j.contractor_id);
  const scheduledJobs = jobs.filter(j => j.status === 'assigned' || j.status === 'in_progress');

  const userDisplayName = homeownerProfile 
    ? `${homeownerProfile.first_name} ${homeownerProfile.last_name}`.trim() || user.email
    : user.email;

  // Calculate KPI data with real data
  const totalRevenue = jobs.reduce((sum, job) => sum + (Number(job.budget) || 0), 0);
  const averageJobSize = jobs.length > 0 ? totalRevenue / jobs.length : 0;

  // Calculate property stats
  const activeProperties = properties.filter(p => p.status === 'active').length;
  const pendingProperties = properties.filter(p => p.status === 'pending').length;

  // Calculate subscription stats
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;
  const now = new Date();
  const overdueSubscriptions = subscriptions.filter(s => {
    if (!s.next_billing_date) return false;
    const billingDate = new Date(s.next_billing_date);
    return billingDate < now && s.status === 'active';
  }).length;

  // Calculate invoice stats
  const pastDueInvoices = payments.filter(p => {
    if (!p.due_date) return false;
    const dueDate = new Date(p.due_date);
    return dueDate < now && p.status !== 'completed';
  }).length;

  const dueInvoices = payments.filter(p => p.status === 'pending' || p.status === 'sent').length;
  const unsentInvoices = payments.filter(p => p.status === 'draft').length;

  const kpiData = {
    jobsData: {
      averageSize: averageJobSize,
      totalRevenue,
      completedJobs: completedJobs.length,
      scheduledJobs: scheduledJobs.length,
    },
    bidsData: {
      activeBids: allBids.filter(b => b.status === 'pending').length,
      pendingReview: allBids.filter(b => b.status === 'pending').length,
      acceptedBids: allBids.filter(b => b.status === 'accepted').length,
      averageBid: allBids.length > 0 ? allBids.reduce((sum, b) => sum + (Number(b.amount || b.total_amount) || 0), 0) / allBids.length : 0,
    },
    propertiesData: {
      activeProperties,
      pendingProperties,
      activeSubscriptions,
      overdueSubscriptions,
    },
    invoicesData: {
      pastDue: pastDueInvoices,
      due: dueInvoices,
      unsent: unsentInvoices,
      open: dueInvoices,
    },
  };

  // Prepare upcoming jobs
  const upcomingJobs = scheduledJobs.slice(0, 2).map(job => ({
    id: job.id,
    title: job.title || 'Seasonal Maintenance',
    location: job.location || '1234 Elmwood Drive, Springfield, IL 62704',
    scheduledTime: 'Scheduled: 12:00 pm',
    avatar: undefined,
  }));

  // Prepare upcoming estimates - show most recent bids
  const upcomingEstimates = allBids
    .sort((a, b) => new Date(b.created_at || b.updated_at || 0).getTime() - new Date(a.created_at || a.updated_at || 0).getTime())
    .slice(0, 2)
    .map(bid => {
      const job = bid.job;
      const contractor = bid.contractor;
      const bidDate = new Date(bid.created_at || bid.updated_at || Date.now());
      return {
        id: bid.id,
        title: job?.title || 'New Bid Received',
        location: job?.location || 'Location not specified',
        scheduledTime: `Received: ${bidDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        avatar: contractor?.profile_image_url,
      };
    });

  // Prepare recent activities from real data
  const activities: Array<{
    id: string;
    type: 'job' | 'payment' | 'message' | 'estimate' | 'subscription';
    title: string;
    description: string;
    timestamp: string;
    timestampDate: Date; // For sorting
    linkText?: string;
    linkHref?: string;
  }> = [];

  // Add job activities (all recent jobs - posted, scheduled, in progress)
  // Get all recent jobs sorted by creation date
  const recentJobs = jobs
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  recentJobs.forEach(job => {
    const createdDate = new Date(job.created_at);
    const scheduledDate = job.scheduled_date ? new Date(job.scheduled_date) : null;
    
    let title = '';
    let description = '';
    
    if (job.status === 'posted') {
      title = `Job posted: ${job.title || 'Untitled Job'}`;
      description = 'Waiting for contractor bids';
    } else if (job.status === 'assigned' || job.status === 'in_progress') {
      if (scheduledDate) {
        const formattedDate = scheduledDate.toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric',
          year: 'numeric'
        });
        const formattedTime = scheduledDate.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
        title = `${job.title || 'Job'} scheduled for ${formattedDate} at ${formattedTime}.`;
        description = job.status === 'assigned' ? 'Contractor assigned' : 'Work in progress';
      } else {
        title = `${job.title || 'Job'} ${job.status === 'assigned' ? 'assigned to contractor' : 'is in progress'}`;
        description = job.status === 'assigned' ? 'Contractor assigned' : 'Work in progress';
      }
    } else if (job.status === 'completed') {
      title = `Job completed: ${job.title || 'Untitled Job'}`;
      description = 'Work finished';
    } else {
      title = `Job ${job.status}: ${job.title || 'Untitled Job'}`;
      description = job.status === 'cancelled' ? 'Job cancelled' : 'Status updated';
    }
    
    activities.push({
      id: `job-${job.id}`,
      type: 'job',
      title,
      description: description,
      timestamp: createdDate.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
      }),
      timestampDate: createdDate,
      linkText: 'View Job',
      linkHref: `/jobs/${job.id}`,
    });
  });

  // Add bid/estimate activities
  allBids.slice(0, 3).forEach(bid => {
    const job = bid.job;
    const contractor = bid.contractor;
    const contractorName = contractor 
      ? `${contractor.first_name || ''} ${contractor.last_name || ''}`.trim() || 'A contractor'
      : 'A contractor';
    const createdDate = new Date(bid.created_at || bid.updated_at || Date.now());
    
    activities.push({
      id: `bid-${bid.id}`,
      type: 'estimate',
      title: `${contractorName} submitted an estimate for ${job?.title || 'your job'}.`,
      description: `Amount: £${Number(bid.amount || bid.total_amount || 0).toLocaleString()}`,
      timestamp: createdDate.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
      }),
      timestampDate: createdDate,
      linkText: 'View Estimate',
      linkHref: job?.id ? `/jobs/${job.id}` : '/jobs',
    });
  });

  // Add message activities
  if (recentActivity && recentActivity.length > 0) {
    recentActivity.slice(0, 3).forEach((message: any) => {
      const createdDate = new Date(message.created_at);
      activities.push({
        id: `message-${message.id}`,
        type: 'message',
        title: 'New message received',
        description: message.content ? (message.content.length > 100 ? message.content.substring(0, 100) + '...' : message.content) : 'No content',
        timestamp: createdDate.toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric',
          year: 'numeric'
        }),
        timestampDate: createdDate,
        linkText: 'View Messages',
        linkHref: '/messages',
      });
    });
  }

  // Add payment activities
  payments.slice(0, 3).forEach(payment => {
    const statusText = payment.status === 'completed' ? 'completed' : payment.status === 'pending' ? 'pending' : 'received';
    const createdDate = new Date(payment.created_at);
    activities.push({
      id: `payment-${payment.id}`,
      type: 'payment',
      title: `Payment ${statusText}: £${Number(payment.amount || 0).toLocaleString()}`,
      description: payment.due_date 
        ? `Due: ${new Date(payment.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
        : 'No due date',
      timestamp: createdDate.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
      }),
      timestampDate: createdDate,
      linkText: 'View Payment',
      linkHref: '/financials',
    });
  });

  // Add subscription activities (upcoming maintenance)
  subscriptions
    .filter(sub => sub.status === 'active' && sub.next_billing_date)
    .slice(0, 2)
    .forEach(sub => {
      const nextDate = new Date(sub.next_billing_date);
      const now = new Date();
      const daysUntil = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const createdDate = new Date(sub.created_at);
      
      activities.push({
        id: `subscription-${sub.id}`,
        type: 'subscription',
        title: `Maintenance service is ${daysUntil <= 0 ? 'due' : `due in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}`}.`,
        description: `Next billing: ${nextDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
        timestamp: createdDate.toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric',
          year: 'numeric'
        }),
        timestampDate: createdDate,
        linkText: 'View Subscription',
        linkHref: '/financials',
      });
    });

  // Sort activities by timestamp (most recent first) and limit to 4
  activities.sort((a, b) => b.timestampDate.getTime() - a.timestampDate.getTime());

  const recentActivities = activities.slice(0, 4).map(({ timestampDate, ...rest }) => rest);

  return (
    <OnboardingWrapper
      userRole="homeowner"
      onboardingCompleted={onboardingStatus.completed}
    >
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.colors.backgroundSecondary }}>
      {/* Unified Sidebar */}
      <UnifiedSidebar 
        userRole="homeowner"
        userInfo={{
          name: homeownerProfile ? `${homeownerProfile.first_name} ${homeownerProfile.last_name}`.trim() : undefined,
          email: homeownerProfile?.email || user.email,
          avatar: homeownerProfile?.profile_image_url,
        }}
      />

      {/* Main Content */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        flex: 1,
        width: 'calc(100% - 280px)',
        marginLeft: '280px',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {/* Header */}
        <DashboardHeader userName={userDisplayName} userId={user.id} />

        {/* Page Content */}
        <div style={{ 
          maxWidth: '1440px', 
          margin: 0, 
          padding: theme.spacing[6], 
          width: '100%',
          boxSizing: 'border-box',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
            {/* Header */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing[4] }}>
              <div>
                <h1 style={{
                  fontSize: theme.typography.fontSize['3xl'],
                  fontWeight: theme.typography.fontWeight.bold,
                  color: theme.colors.textPrimary,
                  margin: 0,
                  marginBottom: theme.spacing[1],
                }}>
                  Hi, {homeownerProfile?.first_name || 'Alex'}
                </h1>
                <p style={{
                  margin: 0,
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                }}>
                  Short Description
                </p>
              </div>
            </div>

            {/* KPI Cards */}
            <KpiCards
              jobsData={kpiData.jobsData}
              bidsData={kpiData.bidsData}
              propertiesData={kpiData.propertiesData}
            />

            {/* Predictive Recommendations */}
            <PredictiveRecommendations recommendations={recommendations} />

            {/* Upcoming Lists and Invoices */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: theme.spacing[6],
            }}>
              <UpcomingList
                title="Upcoming Jobs"
                items={upcomingJobs}
                date="Fri Apr 26, 2024"
                actionHref="/jobs"
              />
              <UpcomingList
                title="Upcoming Estimates"
                items={upcomingEstimates}
                date="Fri Apr 27, 2024"
                actionHref="/financials"
              />
            </div>

            {/* Bottom Row: Invoices and Activity */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: theme.spacing[6],
            }}>
              <InvoicesChart
                pastDue={kpiData.invoicesData.pastDue}
                due={kpiData.invoicesData.due}
                unsent={kpiData.invoicesData.unsent}
                openCount={kpiData.invoicesData.open}
              />
              <ActivityFeed activities={recentActivities} />
            </div>
          </div>
        </div>
      </div>
      </div>
    </OnboardingWrapper>
  );
}
