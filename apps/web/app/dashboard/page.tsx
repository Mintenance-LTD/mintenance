import { headers } from 'next/headers';
import Link from 'next/link';
import { getCurrentUserFromHeaders, getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import UnauthenticatedCard from '@/components/UnauthenticatedCard';
import { Badge as StatusBadge } from '@/components/ui/Badge.unified';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
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
import { BentoGrid, BentoItem } from './components/BentoGrid';
import { LargeChart } from './components/LargeChart';
import { BarChartsSection } from './components/BarChartsSection';
import './components/bento-grid.css';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatMoney } from '@/lib/utils/currency';
import { RecommendationsService } from '@/lib/services/RecommendationsService';
import { OnboardingService } from '@/lib/services/OnboardingService';
import { OnboardingWrapper } from '@/components/onboarding/OnboardingWrapper';
import type { Metadata } from 'next';
import { DashboardMetric } from './components/dashboard-metrics.types';

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

  const allMetrics: DashboardMetric[] = [
    {
      key: 'average-job-size',
      label: 'Average Job Size',
      value: formatMoney(kpiData.jobsData.averageSize, 'GBP'),
      icon: 'briefcase',
      iconColor: theme.colors.primary,
      trend: { direction: 'up', value: '+10%', label: 'from last month' },
      gradientVariant: 'primary',
      gradient: true,
    },
    {
      key: 'total-revenue',
      label: 'Total Revenue',
      value: formatMoney(kpiData.jobsData.totalRevenue, 'GBP'),
      subtitle: `${kpiData.jobsData.completedJobs} completed jobs`,
      icon: 'currencyPound',
      iconColor: theme.colors.success,
      trend: { direction: 'up', value: '+54%', label: 'from last month' },
      gradientVariant: 'success',
      gradient: true,
    },
    {
      key: 'completed-jobs',
      label: 'Completed Jobs',
      value: kpiData.jobsData.completedJobs,
      icon: 'checkCircle',
      iconColor: theme.colors.success,
      trend: { direction: 'up', value: '+39%', label: 'from last month' },
      gradientVariant: 'success',
      gradient: true,
    },
    {
      key: 'scheduled-jobs',
      label: 'Scheduled Jobs',
      value: kpiData.jobsData.scheduledJobs,
      icon: 'calendar',
      iconColor: theme.colors.warning,
      trend: { direction: 'up', value: '+5%', label: 'from last month' },
      gradientVariant: 'warning',
      gradient: true,
    },
    {
      key: 'active-bids',
      label: 'Active Bids',
      value: kpiData.bidsData.activeBids,
      icon: 'fileText',
      iconColor: theme.colors.info,
      trend: { direction: 'up', value: '+15%', label: 'from last month' },
      gradientVariant: 'primary',
      gradient: true,
    },
    {
      key: 'pending-review',
      label: 'Pending Review',
      value: kpiData.bidsData.pendingReview,
      icon: 'clock',
      iconColor: theme.colors.warning,
      trend: { direction: 'up', value: '+25%', label: 'from last month' },
      gradientVariant: 'warning',
      gradient: true,
    },
    {
      key: 'accepted-bids',
      label: 'Accepted Bids',
      value: kpiData.bidsData.acceptedBids,
      icon: 'checkCircle',
      iconColor: theme.colors.success,
      trend: { direction: 'up', value: '+54%', label: 'from last month' },
      gradientVariant: 'success',
      gradient: true,
    },
    {
      key: 'average-bid',
      label: 'Average Bid',
      value: formatMoney(kpiData.bidsData.averageBid, 'GBP'),
      icon: 'currencyPound',
      iconColor: theme.colors.primary,
      trend: { direction: 'up', value: '+5%', label: 'from last month' },
      gradientVariant: 'primary',
      gradient: true,
    },
    {
      key: 'active-properties',
      label: 'Active Properties',
      value: kpiData.propertiesData.activeProperties,
      icon: 'home',
      iconColor: theme.colors.primary,
      trend: { direction: 'up', value: '+6%', label: 'from last month' },
      gradientVariant: 'primary',
      gradient: true,
    },
    {
      key: 'pending-properties',
      label: 'Pending Properties',
      value: kpiData.propertiesData.pendingProperties,
      icon: 'clock',
      iconColor: theme.colors.warning,
      trend: { direction: 'down', value: '-5%', label: 'from last month' },
      gradientVariant: 'warning',
      gradient: true,
    },
    {
      key: 'active-subscriptions',
      label: 'Active Subscriptions',
      value: kpiData.propertiesData.activeSubscriptions,
      icon: 'repeat',
      iconColor: theme.colors.info,
      trend: { direction: 'down', value: '-8%', label: 'from last month' },
      gradientVariant: 'primary',
      gradient: true,
    },
    {
      key: 'overdue-subscriptions',
      label: 'Overdue Subscriptions',
      value: kpiData.propertiesData.overdueSubscriptions,
      icon: 'alertCircle',
      iconColor: theme.colors.error,
      trend: { direction: 'up', value: '+5%', label: 'from last month' },
      gradientVariant: 'error',
      gradient: true,
    },
  ];

  const overflowMetricKeys = new Set([
    'scheduled-jobs',
    'pending-review',
    'pending-properties',
    'active-bids',
    'average-bid',
    'active-properties',
    'overdue-subscriptions',
    'active-subscriptions',
  ]);

  const primaryMetrics = allMetrics.filter((metric) => !overflowMetricKeys.has(metric.key));
  const secondaryMetrics = allMetrics.filter((metric) => overflowMetricKeys.has(metric.key));

  // Prepare upcoming jobs with real scheduled dates
  const upcomingJobs = scheduledJobs
    .filter(job => job.scheduled_date) // Only include jobs with scheduled dates
    .sort((a, b) => {
      const dateA = new Date(a.scheduled_date || 0).getTime();
      const dateB = new Date(b.scheduled_date || 0).getTime();
      return dateA - dateB; // Sort by earliest first
    })
    .slice(0, 2)
    .map(job => {
      const scheduledDate = job.scheduled_date ? new Date(job.scheduled_date) : null;
      let scheduledTime = 'Not scheduled';
      
      if (scheduledDate) {
        const timeStr = scheduledDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        scheduledTime = `Scheduled: ${timeStr}`;
      }
      
      return {
        id: job.id,
        title: job.title || 'Seasonal Maintenance',
        location: job.location || '1234 Elmwood Drive, Springfield, IL 62704',
        scheduledTime,
        avatar: undefined,
      };
    });
  
  // Calculate the date header from the earliest scheduled job
  const upcomingJobsDate = upcomingJobs.length > 0 && scheduledJobs.length > 0
    ? (() => {
        const jobsWithDates = scheduledJobs
          .filter(job => job.scheduled_date)
          .map(job => new Date(job.scheduled_date!))
          .sort((a, b) => a.getTime() - b.getTime());
        
        if (jobsWithDates.length > 0) {
          return jobsWithDates[0].toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
        }
        return null;
      })()
    : null;

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
  
  // Calculate the date header from the most recent bid
  const upcomingEstimatesDate = upcomingEstimates.length > 0
    ? (() => {
        const mostRecentBid = allBids
          .map(bid => new Date(bid.created_at || bid.updated_at || Date.now()))
          .sort((a, b) => b.getTime() - a.getTime())[0];
        
        return mostRecentBid.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      })()
    : null;

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
        <DashboardHeader userName={userDisplayName} userId={user.id} secondaryMetrics={secondaryMetrics} />

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
            <div className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 rounded-2xl p-8 mb-6 border border-primary-700/50 shadow-xl">
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-secondary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>

              <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
                <div>
                  <h1 className="text-heading-md font-[640] text-white mb-3 tracking-tighter">
                    Hi, {homeownerProfile?.first_name || 'Alex'}
                  </h1>
                  <p className="text-base font-[460] text-gray-300 leading-[1.5]">
                    Here's what's happening with your properties today
                  </p>
                </div>
                <Link
                  href="/jobs/create"
                  className="block"
                >
                  <Button variant="primary" leftIcon={<Plus className="h-[18px] w-[18px]" />}>
                    Post New Job
                  </Button>
                </Link>
              </div>
            </div>

            {/* Modern Grid Layout - Inspired by Aura.build */}
            <div className="space-y-6">
              {/* Top Row: KPI Cards - Modern Grid */}
              <div className="grid grid-cols-12 gap-6">
                {primaryMetrics.slice(0, 4).map((metric) => (
                    <div key={metric.key} className="col-span-12 sm:col-span-6 xl:col-span-3">
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 h-full group relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
                      <div className="flex flex-col justify-between h-full">
                        <div>
                          <div className="text-xs font-[560] text-gray-600 mb-2 uppercase tracking-wider">
                            {metric.label}
                          </div>
                          <div className="text-3xl font-[640] text-gray-900 mb-1 tracking-tight">
                            {metric.value}
                          </div>
                          {metric.subtitle && (
                            <div className="text-xs font-[460] text-gray-500 mt-1">
                              {metric.subtitle}
                            </div>
                          )}
                        </div>
                        {metric.trend && (
                          <div className={`inline-flex items-center gap-1.5 mt-4 px-2.5 py-1 rounded-lg text-xs font-[560] w-fit ${
                            metric.trend.direction === 'up' 
                              ? 'bg-green-50 text-green-700' 
                              : 'bg-red-50 text-red-700'
                          }`}>
                            <span>{metric.trend.direction === 'up' ? '↑' : '↓'}</span>
                            {metric.trend.value}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Second Row: Large Chart & Additional KPIs */}
              <div className="grid grid-cols-12 gap-6">
                {/* Large Chart - Takes 8 columns */}
                <div className="col-span-12 xl:col-span-8">
                  <LargeChart 
                    title="Revenue Overview"
                    subtitle="Last 6 months"
                    data={[
                      { label: 'Jan', value: totalRevenue * 0.7 },
                      { label: 'Feb', value: totalRevenue * 0.8 },
                      { label: 'Mar', value: totalRevenue * 0.75 },
                      { label: 'Apr', value: totalRevenue * 0.9 },
                      { label: 'May', value: totalRevenue * 0.85 },
                      { label: 'Jun', value: totalRevenue },
                    ]}
                  />
                </div>

                {/* Additional KPI Cards - Takes 4 columns */}
                <div className="col-span-12 xl:col-span-4 space-y-6">
                  {primaryMetrics.slice(4, 6).map((metric) => (
                    <div key={metric.key} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
                      <div className="flex flex-col justify-between h-full">
                        <div>
                          <div className="text-xs font-[560] text-gray-600 mb-2 uppercase tracking-wider">
                            {metric.label}
                          </div>
                          <div className="text-3xl font-[640] text-gray-900 mb-1 tracking-tight">
                            {metric.value}
                          </div>
                          {metric.subtitle && (
                            <div className="text-xs font-[460] text-gray-500 mt-1">
                              {metric.subtitle}
                            </div>
                          )}
                        </div>
                        {metric.trend && (
                          <div className={`inline-flex items-center gap-1.5 mt-4 px-2.5 py-1 rounded-lg text-xs font-[560] w-fit ${
                            metric.trend.direction === 'up' 
                              ? 'bg-green-50 text-green-700' 
                              : 'bg-red-50 text-red-700'
                          }`}>
                            <span>{metric.trend.direction === 'up' ? '↑' : '↓'}</span>
                            {metric.trend.value}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Third Row: Bar Charts & Activity Feed */}
              <div className="grid grid-cols-12 gap-6">
                {/* Bar Charts - Takes 6 columns */}
                <div className="col-span-12 xl:col-span-6">
                  <BarChartsSection
                    jobsData={[
                      { label: 'Mon', value: activeJobs.length + 2, color: theme.colors.primary },
                      { label: 'Tue', value: activeJobs.length + 5, color: theme.colors.primary },
                      { label: 'Wed', value: activeJobs.length + 3, color: theme.colors.primary },
                      { label: 'Thu', value: activeJobs.length + 7, color: theme.colors.primary },
                      { label: 'Fri', value: activeJobs.length + 4, color: theme.colors.primary },
                      { label: 'Sat', value: activeJobs.length + 1, color: theme.colors.primary },
                      { label: 'Sun', value: activeJobs.length, color: theme.colors.primary },
                    ]}
                    revenueData={[
                      { label: 'Week 1', value: totalRevenue * 0.2, color: theme.colors.success },
                      { label: 'Week 2', value: totalRevenue * 0.25, color: theme.colors.success },
                      { label: 'Week 3', value: totalRevenue * 0.22, color: theme.colors.success },
                      { label: 'Week 4', value: totalRevenue * 0.3, color: theme.colors.success },
                    ]}
                  />
                </div>

                {/* Activity Feed - Takes 6 columns */}
                <div className="col-span-12 xl:col-span-6">
                  <ActivityFeed activities={recentActivities} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </OnboardingWrapper>
  );
}
