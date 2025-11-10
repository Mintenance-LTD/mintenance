/**
 * Dashboard Data Processing
 * Business logic for processing and calculating dashboard metrics
 */

import { formatMoney } from '@/lib/utils/currency';
import { theme } from '@/lib/theme';
import { DashboardMetric } from '../components/dashboard-metrics.types';
import type { 
  BidWithRelations, 
  QuoteWithRelations, 
  JobWithContractor, 
  MessageWithContent,
  DashboardActivity,
  UpcomingItem,
  KpiData
} from './types';

export interface ProcessedDashboardData {
  allBids: Array<{
    id: string;
    job?: unknown;
    contractor?: unknown;
    amount: number;
    total_amount: number;
    status: string;
    created_at: string;
    updated_at?: string;
  }>;
  activeJobs: unknown[];
  completedJobs: unknown[];
  postedJobs: unknown[];
  awaitingBids: unknown[];
  scheduledJobs: unknown[];
  kpiData: KpiData;
  allMetrics: DashboardMetric[];
  primaryMetrics: DashboardMetric[];
  secondaryMetrics: DashboardMetric[];
  upcomingJobs: UpcomingItem[];
  upcomingJobsDate: string | null;
  upcomingEstimates: UpcomingItem[];
  upcomingEstimatesDate: string | null;
  recentActivities: DashboardActivity[];
}

/**
 * Combine bids and quotes for display
 */
export function combineBidsAndQuotes(
  bids: BidWithRelations[],
  quotes: QuoteWithRelations[]
): Array<{
  id: string;
  job?: unknown;
  contractor?: unknown;
  amount: number;
  total_amount: number;
  status: string;
  created_at: string;
  updated_at?: string;
}> {
  return [
    ...bids.map((bid) => ({
      ...bid,
      job: Array.isArray(bid.jobs) ? bid.jobs[0] : bid.jobs,
      contractor: bid.contractor,
      amount: bid.amount,
      total_amount: bid.amount,
    })),
    ...quotes.map((quote) => ({
      ...quote,
      job: Array.isArray(quote.job) ? quote.job[0] : quote.job,
      contractor: Array.isArray(quote.contractor) ? quote.contractor[0] : quote.contractor,
      amount: quote.total_amount,
    })),
  ];
}

/**
 * Filter jobs by status
 */
export function filterJobsByStatus(jobs: unknown[]) {
  const activeJobs = jobs.filter((j: { status?: string }) => ['posted', 'assigned', 'in_progress'].includes(j.status || ''));
  const completedJobs = jobs.filter((j: { status?: string }) => j.status === 'completed');
  const postedJobs = jobs.filter((j: { status?: string }) => j.status === 'posted');
  const awaitingBids = jobs.filter((j: JobWithContractor) => j.status === 'posted' && !j.contractor_id);
  const scheduledJobs = jobs.filter((j: { status?: string }) => j.status === 'assigned' || j.status === 'in_progress');

  return {
    activeJobs,
    completedJobs,
    postedJobs,
    awaitingBids,
    scheduledJobs,
  };
}

/**
 * Calculate KPI data
 */
export function calculateKpiData(
  jobs: unknown[],
  allBids: Array<{ status: string; amount?: number; total_amount?: number }>,
  properties: unknown[],
  subscriptions: Array<{ status: string; next_billing_date?: string }>,
  payments: Array<{ status: string; due_date?: string }>,
  completedJobs: unknown[],
  scheduledJobs: unknown[]
): KpiData {
  const totalRevenue = jobs.reduce((sum: number, job: { budget?: number }) => sum + (Number(job.budget) || 0), 0);
  const averageJobSize = jobs.length > 0 ? totalRevenue / jobs.length : 0;

  const activeProperties = properties.filter((p: { is_primary?: boolean }) => p.is_primary === true).length;
  const pendingProperties = properties.length - activeProperties;

  const activeSubscriptions = subscriptions.filter((s) => s.status === 'active').length;
  const now = new Date();
  const overdueSubscriptions = subscriptions.filter((s) => {
    if (!s.next_billing_date) return false;
    const billingDate = new Date(s.next_billing_date);
    return billingDate < now && s.status === 'active';
  }).length;

  const pastDueInvoices = payments.filter((p) => {
    if (!p.due_date) return false;
    const dueDate = new Date(p.due_date);
    return dueDate < now && p.status !== 'completed';
  }).length;

  const dueInvoices = payments.filter((p) => p.status === 'pending' || p.status === 'sent').length;
  const unsentInvoices = payments.filter((p) => p.status === 'draft').length;

  return {
    jobsData: {
      averageSize: averageJobSize,
      totalRevenue,
      completedJobs: completedJobs.length,
      scheduledJobs: scheduledJobs.length,
    },
    bidsData: {
      activeBids: allBids.filter((b) => b.status === 'pending').length,
      pendingReview: allBids.filter((b) => b.status === 'pending').length,
      acceptedBids: allBids.filter((b) => b.status === 'accepted').length,
      averageBid: allBids.length > 0 
        ? allBids.reduce((sum, b) => sum + (Number(b.amount || b.total_amount) || 0), 0) / allBids.length 
        : 0,
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
}

/**
 * Generate dashboard metrics from KPI data
 */
export function generateMetrics(kpiData: KpiData): {
  allMetrics: DashboardMetric[];
  primaryMetrics: DashboardMetric[];
  secondaryMetrics: DashboardMetric[];
} {
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

  return {
    allMetrics,
    primaryMetrics,
    secondaryMetrics,
  };
}

/**
 * Prepare upcoming jobs
 */
export function prepareUpcomingJobs(scheduledJobs: unknown[]): {
  upcomingJobs: UpcomingItem[];
  upcomingJobsDate: string | null;
} {
  const upcomingJobs = scheduledJobs
    .filter((job: { scheduled_start_date?: string }) => job.scheduled_start_date)
    .sort((a: { scheduled_start_date?: string }, b: { scheduled_start_date?: string }) => {
      const dateA = new Date(a.scheduled_start_date || 0).getTime();
      const dateB = new Date(b.scheduled_start_date || 0).getTime();
      return dateA - dateB;
    })
    .slice(0, 2)
    .map((job: { id: string; scheduled_start_date?: string; title?: string; location?: string }) => {
      const scheduledDate = job.scheduled_start_date ? new Date(job.scheduled_start_date) : null;
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

  const upcomingJobsDate = upcomingJobs.length > 0 && scheduledJobs.length > 0
    ? (() => {
        const jobsWithDates = scheduledJobs
          .filter((job: { scheduled_start_date?: string }) => job.scheduled_start_date)
          .map((job: { scheduled_start_date: string }) => new Date(job.scheduled_start_date))
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

  return {
    upcomingJobs,
    upcomingJobsDate,
  };
}

/**
 * Prepare upcoming estimates
 */
export function prepareUpcomingEstimates(
  allBids: Array<{ id: string; created_at?: string; updated_at?: string; job?: { title?: string; location?: string; id?: string }; contractor?: { profile_image_url?: string } }>
): {
  upcomingEstimates: UpcomingItem[];
  upcomingEstimatesDate: string | null;
} {
  const upcomingEstimates = allBids
    .sort((a, b) => {
      const dateA = new Date(a.created_at || a.updated_at || 0).getTime();
      const dateB = new Date(b.created_at || b.updated_at || 0).getTime();
      return dateB - dateA;
    })
    .slice(0, 2)
    .map((bid) => {
      const job = bid.job;
      const contractor = bid.contractor;
      const bidDate = new Date(bid.created_at || bid.updated_at || Date.now());
      return {
        id: bid.id,
        title: (job && typeof job === 'object' && 'title' in job ? job.title : undefined) || 'New Bid Received',
        location: (job && typeof job === 'object' && 'location' in job ? job.location : undefined) || 'Location not specified',
        scheduledTime: `Received: ${bidDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        avatar: (contractor && typeof contractor === 'object' && 'profile_image_url' in contractor ? contractor.profile_image_url : undefined),
      };
    });

  const upcomingEstimatesDate = upcomingEstimates.length > 0
    ? (() => {
        const mostRecentBid = allBids
          .map((bid) => new Date(bid.created_at || bid.updated_at || Date.now()))
          .sort((a, b) => b.getTime() - a.getTime())[0];
        
        return mostRecentBid.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      })()
    : null;

  return {
    upcomingEstimates,
    upcomingEstimatesDate,
  };
}

/**
 * Prepare recent activities
 */
export function prepareRecentActivities(
  jobs: unknown[],
  allBids: Array<{ id: string; created_at?: string; updated_at?: string; job?: { title?: string; id?: string }; contractor?: { first_name?: string; last_name?: string }; amount?: number; total_amount?: number }>,
  recentActivity: MessageWithContent[],
  payments: Array<{ id: string; status: string; amount: number; created_at: string; due_date?: string }>,
  subscriptions: Array<{ id: string; status: string; next_billing_date?: string; created_at: string }>
): DashboardActivity[] {
  const activities: DashboardActivity[] = [];

  // Add job activities
  const recentJobs = jobs
    .sort((a: { created_at: string }, b: { created_at: string }) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 5);

  recentJobs.forEach((job: { id: string; created_at: string; scheduled_start_date?: string; status: string; title?: string }) => {
    const createdDate = new Date(job.created_at);
    const scheduledDate = job.scheduled_start_date ? new Date(job.scheduled_start_date) : null;
    
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
      description,
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
  allBids.slice(0, 3).forEach((bid) => {
    const job = bid.job;
    const contractor = bid.contractor;
    const contractorName = contractor && typeof contractor === 'object' && 'first_name' in contractor
      ? `${contractor.first_name || ''} ${contractor.last_name || ''}`.trim() || 'A contractor'
      : 'A contractor';
    const createdDate = new Date(bid.created_at || bid.updated_at || Date.now());
    
    activities.push({
      id: `bid-${bid.id}`,
      type: 'estimate',
      title: `${contractorName} submitted an estimate for ${(job && typeof job === 'object' && 'title' in job ? job.title : undefined) || 'your job'}.`,
      description: `Amount: £${Number(bid.amount || bid.total_amount || 0).toLocaleString()}`,
      timestamp: createdDate.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
      }),
      timestampDate: createdDate,
      linkText: 'View Estimate',
      linkHref: (job && typeof job === 'object' && 'id' in job ? job.id : undefined) ? `/jobs/${job.id}` : '/jobs',
    });
  });

  // Add message activities
  if (recentActivity && recentActivity.length > 0) {
    recentActivity.slice(0, 3).forEach((message) => {
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
  payments.slice(0, 3).forEach((payment) => {
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

  // Add subscription activities
  subscriptions
    .filter((sub) => sub.status === 'active' && sub.next_billing_date)
    .slice(0, 2)
    .forEach((sub) => {
      const nextDate = new Date(sub.next_billing_date!);
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

  return activities.slice(0, 4).map(({ timestampDate, ...rest }) => rest);
}

