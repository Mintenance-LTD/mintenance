import { getCurrentUserFromCookies } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { FinanceDashboardClient } from './components/FinanceDashboardClient';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function FinanceDashboardPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('contractor_id', user.id)
    .order('created_at', { ascending: false });

  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('contractor_id', user.id)
    .eq('status', 'completed');

  const financialData = {
    totalRevenue: payments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0,
    pendingPayments:
      payments?.filter((p) => p.status === 'pending').reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0,
    completedJobs: jobs?.length || 0,
    payments: payments || [],
    jobs: jobs || [],
  };

  return <FinanceDashboardClient financialData={financialData} />;
}
