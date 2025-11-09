import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { DashboardClient } from './components/DashboardClient';

export const metadata = {
  title: 'Admin Dashboard | Mintenance',
  description: 'Administrative dashboard',
};

export default async function AdminDashboardPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'admin') {
    redirect('/login');
  }

  // Fetch admin metrics
  const [
    totalUsersResponse,
    totalContractorsResponse,
    totalJobsResponse,
    activeSubscriptionsResponse,
    pendingVerificationsResponse,
  ] = await Promise.all([
    serverSupabase.from('users').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    serverSupabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'contractor').is('deleted_at', null),
    serverSupabase.from('jobs').select('id', { count: 'exact', head: true }),
    serverSupabase.from('contractor_subscriptions')
      .select('id', { count: 'exact', head: true })
      .in('status', ['active', 'trial']),
    // Pending verifications = contractors with verification data but not verified
    serverSupabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'contractor')
      .eq('admin_verified', false)
      .not('company_name', 'is', null)
      .not('license_number', 'is', null)
      .is('deleted_at', null),
  ]);

  const totalUsers = totalUsersResponse.count || 0;
  const totalContractors = totalContractorsResponse.count || 0;
  const totalJobs = totalJobsResponse.count || 0;
  const activeSubscriptions = activeSubscriptionsResponse.count || 0;
  const pendingVerifications = pendingVerificationsResponse.count || 0;

  // Calculate MRR using database function
  const { data: mrrData } = await serverSupabase.rpc('calculate_mrr');
  const mrr = mrrData && mrrData.length > 0 ? parseFloat(mrrData[0].total_mrr || '0') : 0;

  const metrics = {
    totalUsers,
    totalContractors,
    totalJobs,
    activeSubscriptions,
    mrr,
    pendingVerifications,
  };

  return <DashboardClient initialMetrics={metrics} />;
}

