import type { Metadata } from 'next';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ReportingDashboard2025Client } from './components/ReportingDashboard2025Client';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Reporting & Analytics | Mintenance',
  description: 'View your business analytics, revenue trends, job statistics, and performance metrics on Mintenance.',
};


export default async function ContractorReportingPage2025() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  // Fetch contractor analytics data in parallel
  const [jobsResult, bidsResult, paymentsResult, reviewsResult] = await Promise.all([
    serverSupabase
      .from('jobs')
      .select('id, title, category, budget, status, created_at, completed_at, homeowner_id')
      .eq('contractor_id', user.id),
    serverSupabase
      .from('bids')
      .select('id, bid_amount, status, created_at')
      .eq('contractor_id', user.id),
    serverSupabase
      .from('payments')
      .select('id, amount, status, created_at, job_id')
      .eq('contractor_id', user.id)
      .eq('status', 'completed'),
    serverSupabase
      .from('reviews')
      .select('id, rating, comment, created_at')
      .eq('reviewed_id', user.id),
  ]);

  const jobs = jobsResult.data || [];
  const bids = bidsResult.data || [];
  const payments = paymentsResult.data || [];
  const reviews = reviewsResult.data || [];

  // Calculate metrics
  const totalJobs = jobs.length;
  const completedJobs = jobs.filter((j) => j.status === 'completed').length;
  const activeJobs = jobs.filter((j) => j.status === 'in_progress' || j.status === 'assigned').length;
  const pendingJobs = jobs.filter((j) => j.status === 'posted' || j.status === 'pending').length;
  const cancelledJobs = jobs.filter((j) => j.status === 'cancelled').length;
  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const averageJobValue = completedJobs > 0 ? totalRevenue / completedJobs : 0;

  // Calculate customer satisfaction from reviews
  const customerSatisfaction = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
    : 0;

  // Jobs by category
  const categoryMap = new Map<string, { count: number; revenue: number }>();
  jobs.forEach((job) => {
    const category = job.category || 'Other';
    const existing = categoryMap.get(category) || { count: 0, revenue: 0 };
    const jobPayments = payments.filter((p) => p.job_id === job.id);
    const jobRevenue = jobPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    categoryMap.set(category, {
      count: existing.count + 1,
      revenue: existing.revenue + jobRevenue,
    });
  });

  const jobsByCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    count: data.count,
    revenue: data.revenue,
  }));

  // Revenue by month (last 12 months)
  const now = new Date();
  const monthsMap = new Map<string, { revenue: number; jobs: number }>();

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    monthsMap.set(monthKey, { revenue: 0, jobs: 0 });
  }

  payments.forEach((payment) => {
    const date = new Date(payment.created_at);
    const monthKey = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    if (monthsMap.has(monthKey)) {
      const existing = monthsMap.get(monthKey)!;
      monthsMap.set(monthKey, {
        revenue: existing.revenue + (payment.amount || 0),
        jobs: existing.jobs + 1,
      });
    }
  });

  const revenueByMonth = Array.from(monthsMap.entries()).map(([month, data]) => ({
    month,
    revenue: data.revenue,
    jobs: data.jobs,
  }));

  // Get unique client count and top clients
  const clientJobsResult = await serverSupabase
    .from('jobs')
    .select('homeowner_id, budget, status, homeowner:homeowner_id(first_name, last_name)')
    .eq('contractor_id', user.id)
    .eq('status', 'completed');

  const uniqueClients = new Set((clientJobsResult.data || []).map((j) => j.homeowner_id)).size;

  // Calculate top clients by revenue
  const clientRevenueMap = new Map<string, { name: string; revenue: number; jobs: number }>();
  (clientJobsResult.data || []).forEach((job) => {
    const homeowner = Array.isArray(job.homeowner) ? job.homeowner[0] : job.homeowner;
    if (job.homeowner_id && homeowner) {
      const clientName = `${homeowner.first_name || ''} ${homeowner.last_name || ''}`.trim();
      const existing = clientRevenueMap.get(job.homeowner_id) || { name: clientName, revenue: 0, jobs: 0 };
      clientRevenueMap.set(job.homeowner_id, {
        name: clientName,
        revenue: existing.revenue + (job.budget || 0),
        jobs: existing.jobs + 1,
      });
    }
  });

  const topClients = Array.from(clientRevenueMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Calculate daily revenue for last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentPaymentsResult = await serverSupabase
    .from('payments')
    .select('amount, created_at')
    .eq('contractor_id', user.id)
    .eq('status', 'completed')
    .gte('created_at', sevenDaysAgo.toISOString());

  const dailyRevenueMap = new Map<string, { revenue: number; jobs: number }>();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Initialize last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayName = dayNames[date.getDay()];
    dailyRevenueMap.set(dayName, { revenue: 0, jobs: 0 });
  }

  // Aggregate daily revenue
  (recentPaymentsResult.data || []).forEach((payment) => {
    const date = new Date(payment.created_at);
    const dayName = dayNames[date.getDay()];
    const existing = dailyRevenueMap.get(dayName) || { revenue: 0, jobs: 0 };
    dailyRevenueMap.set(dayName, {
      revenue: existing.revenue + (payment.amount || 0),
      jobs: existing.jobs + 1,
    });
  });

  const dailyRevenue = Array.from(dailyRevenueMap.entries()).map(([day, data]) => ({
    date: day,
    revenue: data.revenue,
    jobs: data.jobs,
  }));

  // Calculate percentage changes (compare to previous period)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const currentPeriodPayments = payments.filter(p => new Date(p.created_at) >= thirtyDaysAgo);
  const previousPeriodPayments = payments.filter(p => {
    const date = new Date(p.created_at);
    return date >= sixtyDaysAgo && date < thirtyDaysAgo;
  });

  const currentRevenue = currentPeriodPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const previousRevenue = previousPeriodPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const revenueChange = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

  const currentJobs = jobs.filter(j => new Date(j.created_at) >= thirtyDaysAgo).length;
  const previousJobs = jobs.filter(j => {
    const date = new Date(j.created_at);
    return date >= sixtyDaysAgo && date < thirtyDaysAgo;
  }).length;
  const jobsChange = previousJobs > 0 ? ((currentJobs - previousJobs) / previousJobs) * 100 : 0;

  // Bid statistics
  const totalBids = bids.length;
  const acceptedBids = bids.filter((b) => b.status === 'accepted').length;
  const winRate = totalBids > 0 ? (acceptedBids / totalBids) * 100 : 0;

  return (
    <ReportingDashboard2025Client
      analytics={{
        totalJobs,
        completedJobs,
        activeJobs,
        pendingJobs,
        cancelledJobs,
        totalRevenue,
        totalClients: uniqueClients,
        activeClients: uniqueClients, // Simplified - could be calculated more precisely
        averageJobValue,
        customerSatisfaction,
        jobsByCategory,
        revenueByMonth,
        topClients,
        totalBids,
        acceptedBids,
        winRate,
        dailyRevenue,
        revenueChange,
        jobsChange,
        avgValueChange: previousRevenue > 0 && previousJobs > 0 ? ((averageJobValue - (previousRevenue / previousJobs)) / (previousRevenue / previousJobs)) * 100 : 0,
        satisfactionChange: 0, // Would need historical reviews data
      }}
    />
  );
}
