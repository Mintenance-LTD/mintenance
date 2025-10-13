import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CRMDashboardClient } from './components/CRMDashboardClient';
import { createServerSupabaseClient } from '@/lib/api/supabaseServer';

export default async function CRMDashboardPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  const serverSupabase = createServerSupabaseClient();

  // Get all jobs with homeowner information
  const { data: jobs } = await serverSupabase
    .from('jobs')
    .select(`
      id,
      title,
      status,
      budget,
      created_at,
      homeowner:homeowner_id (
        id,
        email,
        first_name,
        last_name,
        phone
      )
    `)
    .eq('contractor_id', user.id)
    .order('created_at', { ascending: false });

  // Get payments for financial data
  const { data: payments } = await serverSupabase
    .from('payments')
    .select('payer_id, amount, status, created_at')
    .eq('payee_id', user.id);

  // Aggregate client data from jobs
  const clientsMap = new Map();

  jobs?.forEach(job => {
    const homeowner = job.homeowner;
    if (!homeowner?.id) return;

    if (!clientsMap.has(homeowner.id)) {
      clientsMap.set(homeowner.id, {
        id: homeowner.id,
        name: `${homeowner.first_name || ''} ${homeowner.last_name || ''}`.trim(),
        email: homeowner.email,
        phone: homeowner.phone || 'N/A',
        total_jobs: 0,
        active_jobs: 0,
        completed_jobs: 0,
        total_spent: 0,
        last_contact: job.created_at,
        first_job_date: job.created_at,
      });
    }

    const client = clientsMap.get(homeowner.id);
    client.total_jobs += 1;

    if (job.status === 'in_progress' || job.status === 'pending') {
      client.active_jobs += 1;
    }
    if (job.status === 'completed') {
      client.completed_jobs += 1;
    }

    // Update first job date
    if (new Date(job.created_at) < new Date(client.first_job_date)) {
      client.first_job_date = job.created_at;
    }

    // Update last contact
    if (new Date(job.created_at) > new Date(client.last_contact)) {
      client.last_contact = job.created_at;
    }
  });

  // Add payment totals to clients
  payments?.forEach(payment => {
    if (payment.status === 'completed' && clientsMap.has(payment.payer_id)) {
      const client = clientsMap.get(payment.payer_id);
      client.total_spent += parseFloat(payment.amount);
    }
  });

  const clients = Array.from(clientsMap.values());

  // Calculate analytics
  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);

  const newClientsThisMonth = clients.filter(client =>
    new Date(client.first_job_date) >= currentMonth
  ).length;

  const repeatClients = clients.filter(client => client.total_jobs > 1).length;

  const totalRevenue = clients.reduce((sum, client) => sum + client.total_spent, 0);
  const clientLifetimeValue = clients.length > 0
    ? totalRevenue / clients.length
    : 0;

  const analytics = {
    total_clients: clients.length,
    new_clients_this_month: newClientsThisMonth,
    repeat_clients: repeatClients,
    client_lifetime_value: Math.round(clientLifetimeValue * 100) / 100,
  };

  return <CRMDashboardClient clients={clients} analytics={analytics} />;
}
