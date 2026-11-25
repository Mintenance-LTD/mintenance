import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { readAdminAttentionCounts } from '@/lib/admin/attention-counts';
import { DashboardClient } from './components/DashboardClient';

export const metadata = {
  title: 'Admin Dashboard | Mintenance',
  description: 'Administrative dashboard',
};

export default async function AdminDashboardPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'admin') {
    redirect('/admin/login');
  }

  // Fetch admin metrics
  const [
    totalUsersResponse,
    totalContractorsResponse,
    totalJobsResponse,
    activeSubscriptionsResponse,
    attention,
  ] = await Promise.all([
    serverSupabase.from('profiles').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    serverSupabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'contractor').is('deleted_at', null),
    serverSupabase.from('jobs').select('id', { count: 'exact', head: true }),
    serverSupabase.from('contractor_subscriptions')
      .select('id', { count: 'exact', head: true })
      .in('status', ['active', 'trial']),
    readAdminAttentionCounts(),
  ]);

  const totalUsers = totalUsersResponse.count || 0;
  const totalContractors = totalContractorsResponse.count || 0;
  const totalJobs = totalJobsResponse.count || 0;
  const activeSubscriptions = activeSubscriptionsResponse.count || 0;

  // Calculate MRR using database function
  const { data: mrrData } = await serverSupabase.rpc('calculate_mrr');
  const mrr = mrrData && mrrData.length > 0 ? parseFloat(mrrData[0].total_mrr || '0') : 0;

  const metrics = {
    totalUsers,
    totalContractors,
    totalJobs,
    activeSubscriptions,
    mrr,
    attention,
  };

  return <DashboardClient initialMetrics={metrics} />;
}

