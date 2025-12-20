import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { redirect } from 'next/navigation';
import { AnalyticsClient } from './components/AnalyticsClient';
import { ContractorLayoutShell } from '../contractor/components/ContractorLayoutShell';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Business Analytics | Mintenance',
  description: 'View your business analytics and performance metrics with AI-powered insights',
};

export default async function AnalyticsPage() {
  // Get current user from cookies (more reliable)
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  // Fetch contractor stats
  const { data: contractor } = await serverSupabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  // Fetch all jobs for this contractor
  const { data: allJobs } = await serverSupabase
    .from('jobs')
    .select('*')
    .eq('contractor_id', user.id)
    .order('created_at', { ascending: false });

  // Fetch completed jobs with revenue
  const { data: completedJobs } = await serverSupabase
    .from('jobs')
    .select('*, escrow_transactions(*)')
    .eq('contractor_id', user.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false });

  // Fetch active bids
  const { data: bids } = await serverSupabase
    .from('bids')
    .select('*')
    .eq('contractor_id', user.id);

  // Fetch reviews for average rating (specify the foreign key relationship)
  const { data: reviews } = await serverSupabase
    .from('reviews')
    .select('rating')
    .eq('reviewed_id', user.id);

  // Fetch payments for more accurate revenue tracking
  const { data: payments } = await serverSupabase
    .from('payments')
    .select('*')
    .eq('payee_id', user.id)
    .eq('status', 'completed');

  // Fetch quotes
  const { data: quotes } = await serverSupabase
    .from('contractor_quotes')
    .select('*')
    .eq('contractor_id', user.id);

  // Fetch connections
  const { data: connections } = await serverSupabase
    .from('connections')
    .select('*')
    .or(`requester_id.eq.${user.id},target_id.eq.${user.id}`)
    .eq('status', 'accepted');

  // Calculate metrics
  // Use payments table as primary source, fallback to escrow
  const totalRevenue = payments?.reduce((sum, payment) =>
    sum + parseFloat(payment.amount), 0
  ) || completedJobs?.reduce((sum, job) => {
    const escrowAmount = job.escrow_transactions?.reduce((s: number, t: any) =>
      s + (t.status === 'released' ? parseFloat(t.amount) : 0), 0) || 0;
    return sum + escrowAmount;
  }, 0) || 0;

  const pendingRevenue = completedJobs?.reduce((sum, job) => {
    const escrowAmount = job.escrow_transactions?.reduce((s: number, t: any) => 
      s + (t.status === 'held' ? parseFloat(t.amount) : 0), 0) || 0;
    return sum + escrowAmount;
  }, 0) || 0;

  const averageJobValue = completedJobs?.length 
    ? totalRevenue / completedJobs.length 
    : 0;

  const winRate = bids?.length 
    ? ((completedJobs?.length || 0) / bids.length * 100) 
    : 0;

  const avgRating = reviews?.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : contractor?.rating || 0;

  // Group jobs by month for chart
  const jobsByMonth = allJobs?.reduce((acc: any, job) => {
    const month = new Date(job.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {}) || {};

  // Group revenue by month
  const revenueByMonth = completedJobs?.reduce((acc: any, job) => {
    const month = new Date(job.completed_at || job.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    const jobRevenue = job.escrow_transactions?.reduce((s: number, t: any) => 
      s + (t.status === 'released' ? parseFloat(t.amount) : 0), 0) || 0;
    acc[month] = (acc[month] || 0) + jobRevenue;
    return acc;
  }, {}) || {};

  // Fetch contractor profile for layout
  const { data: contractorProfile } = await serverSupabase
    .from('users')
    .select('first_name, last_name, company_name, profile_image_url, city, country')
    .eq('id', user.id)
    .single();

  return (
    <ContractorLayoutShell 
      contractor={contractorProfile} 
      email={user.email} 
      userId={user.id}
      initialPathname="/analytics"
    >
      <AnalyticsClient
        initialData={{
          totalRevenue,
          pendingRevenue,
          averageJobValue,
          winRate,
          quotesSent: quotes?.length || 0,
          quotesAccepted: quotes?.filter(q => q.status === 'accepted').length || 0,
          connections: connections?.length || 0,
          avgRating,
          completionRate: winRate,
          totalJobs: allJobs?.length || 0,
          activeJobs: allJobs?.filter(j => j.status === 'in_progress').length || 0,
          revenueByMonth,
          jobsByMonth,
        }}
        contractorId={user.id}
      />
    </ContractorLayoutShell>
  );
}
