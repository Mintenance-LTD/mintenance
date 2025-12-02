import { getCurrentUserFromCookies } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { ReportingDashboard2025Client } from './components/ReportingDashboard2025Client';
import { redirect } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function ContractorReportingPage2025() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  // Fetch contractor analytics data in parallel
  const [jobsResult, bidsResult, paymentsResult] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, title, category, budget, status, created_at, completed_at')
      .eq('contractor_id', user.id),
    supabase
      .from('bids')
      .select('id, bid_amount, status, created_at')
      .eq('contractor_id', user.id),
    supabase
      .from('payments')
      .select('id, amount, status, created_at, job_id')
      .eq('contractor_id', user.id)
      .eq('status', 'completed'),
  ]);

  const jobs = jobsResult.data || [];
  const bids = bidsResult.data || [];
  const payments = paymentsResult.data || [];

  // Calculate metrics
  const totalJobs = jobs.length;
  const completedJobs = jobs.filter((j) => j.status === 'completed').length;
  const activeJobs = jobs.filter((j) => j.status === 'in_progress' || j.status === 'assigned').length;
  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const averageJobValue = completedJobs > 0 ? totalRevenue / completedJobs : 0;

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
    const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    monthsMap.set(monthKey, { revenue: 0, jobs: 0 });
  }

  payments.forEach((payment) => {
    const date = new Date(payment.created_at);
    const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
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

  // Get unique client count (assuming jobs have homeowner_id)
  const clientJobsResult = await supabase
    .from('jobs')
    .select('homeowner_id')
    .eq('contractor_id', user.id);

  const uniqueClients = new Set((clientJobsResult.data || []).map((j) => j.homeowner_id)).size;

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
        totalRevenue,
        totalClients: uniqueClients,
        activeClients: uniqueClients, // Simplified - could be calculated more precisely
        averageJobValue,
        customerSatisfaction: 4.5, // Mock - would come from reviews
        jobsByCategory,
        revenueByMonth,
        topClients: [], // Would require additional queries
        totalBids,
        acceptedBids,
        winRate,
      }}
    />
  );
}
