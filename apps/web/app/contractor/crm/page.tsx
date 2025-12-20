import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CRMDashboardEnhanced } from './components/CRMDashboardEnhanced';
import { serverSupabase } from '@/lib/api/supabaseServer';

export default async function CRMDashboardPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  

  // Get all jobs assigned to this contractor
  const { data: assignedJobs } = await serverSupabase
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

  // Get jobs where contractor has accepted bids
  const { data: acceptedBids } = await serverSupabase
    .from('bids')
    .select(`
      id,
      status,
      amount,
      created_at,
      job:job_id (
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
      )
    `)
    .eq('contractor_id', user.id)
    .eq('status', 'accepted');

  // Get clients from accepted quotes
  const { data: acceptedQuotes } = await serverSupabase
    .from('contractor_quotes')
    .select(`
      id,
      status,
      total_amount,
      created_at,
      client_name,
      client_email
    `)
    .eq('contractor_id', user.id)
    .eq('status', 'accepted');

  // Get payments for financial data
  const { data: payments } = await serverSupabase
    .from('payments')
    .select('payer_id, amount, status, created_at')
    .eq('payee_id', user.id);

  // Aggregate client data from multiple sources
  const clientsMap = new Map();

  // Process assigned jobs
  assignedJobs?.forEach(job => {
    const homeowner = Array.isArray(job.homeowner) ? job.homeowner[0] : job.homeowner;
    if (!homeowner?.id) return;

    if (!clientsMap.has(homeowner.id)) {
      clientsMap.set(homeowner.id, {
        id: homeowner.id,
        name: `${homeowner.first_name || ''} ${homeowner.last_name || ''}`.trim() || homeowner.email,
        email: homeowner.email,
        phone: homeowner.phone || 'N/A',
        total_jobs: 0,
        active_jobs: 0,
        completed_jobs: 0,
        total_spent: 0,
        last_contact: job.created_at,
        first_job_date: job.created_at,
        status: 'inactive' as 'active' | 'inactive',
      });
    }

    const client = clientsMap.get(homeowner.id);
    client.total_jobs += 1;

    if (job.status === 'in_progress' || job.status === 'assigned' || job.status === 'pending') {
      client.active_jobs += 1;
      client.status = 'active';
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

  // Process accepted bids (jobs that contractor won but might not be assigned yet)
  acceptedBids?.forEach(bid => {
    const job = Array.isArray(bid.job) ? bid.job[0] : bid.job;
    if (!job) return;
    
    const homeowner = Array.isArray(job.homeowner) ? job.homeowner[0] : job.homeowner;
    if (!homeowner?.id) return;

    if (!clientsMap.has(homeowner.id)) {
      clientsMap.set(homeowner.id, {
        id: homeowner.id,
        name: `${homeowner.first_name || ''} ${homeowner.last_name || ''}`.trim() || homeowner.email,
        email: homeowner.email,
        phone: homeowner.phone || 'N/A',
        total_jobs: 0,
        active_jobs: 0,
        completed_jobs: 0,
        total_spent: 0,
        last_contact: job.created_at,
        first_job_date: job.created_at,
        status: 'active' as 'active' | 'inactive',
      });
    }

    const client = clientsMap.get(homeowner.id);
    client.total_jobs += 1;
    client.active_jobs += 1;
    client.status = 'active';

    // Update first job date
    if (new Date(job.created_at) < new Date(client.first_job_date)) {
      client.first_job_date = job.created_at;
    }

    // Update last contact
    if (new Date(job.created_at) > new Date(client.last_contact)) {
      client.last_contact = job.created_at;
    }
  });

  // Process accepted quotes (clients from quotes)
  acceptedQuotes?.forEach(quote => {
    // Use client_email as the key for quote-based clients
    const clientKey = quote.client_email || `quote-${quote.id}`;
    
    if (!clientsMap.has(clientKey)) {
      clientsMap.set(clientKey, {
        id: clientKey,
        name: quote.client_name || quote.client_email || 'Unknown Client',
        email: quote.client_email || '',
        phone: 'N/A',
        total_jobs: 0,
        active_jobs: 0,
        completed_jobs: 0,
        total_spent: parseFloat(quote.total_amount || '0'),
        last_contact: quote.created_at,
        first_job_date: quote.created_at,
        status: 'active' as 'active' | 'inactive',
      });
    } else {
      // Update existing client from quote
      const client = clientsMap.get(clientKey);
      client.total_spent += parseFloat(quote.total_amount || '0');
      client.status = 'active';
      
      if (new Date(quote.created_at) > new Date(client.last_contact)) {
        client.last_contact = quote.created_at;
      }
    }
  });

  // Add payment totals to clients
  payments?.forEach(payment => {
    if (payment.status === 'completed') {
      // Try to find client by payer_id (homeowner ID)
      const matchingClient = Array.from(clientsMap.values()).find(
        client => client.id === payment.payer_id || client.email === payment.payer_id
      );
      
      if (matchingClient) {
        matchingClient.total_spent += parseFloat(payment.amount || '0');
      } else {
        // If payment doesn't match existing client, create a new entry
        clientsMap.set(payment.payer_id, {
          id: payment.payer_id,
          name: 'Payment Client',
          email: '',
          phone: 'N/A',
          total_jobs: 0,
          active_jobs: 0,
          completed_jobs: 0,
          total_spent: parseFloat(payment.amount || '0'),
          last_contact: payment.created_at,
          first_job_date: payment.created_at,
          status: 'inactive' as 'active' | 'inactive',
        });
      }
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

  // Calculate last month for comparison
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  lastMonth.setDate(1);
  lastMonth.setHours(0, 0, 0, 0);
  
  const newClientsLastMonth = clients.filter(client => {
    const firstJobDate = new Date(client.first_job_date);
    return firstJobDate >= lastMonth && firstJobDate < currentMonth;
  }).length;

  // Calculate percentage change
  const monthOverMonthChange = newClientsLastMonth > 0
    ? Math.round(((newClientsThisMonth - newClientsLastMonth) / newClientsLastMonth) * 100)
    : newClientsThisMonth > 0 ? 100 : 0;

  const repeatClients = clients.filter(client => client.total_jobs > 1).length;

  const totalRevenue = clients.reduce((sum, client) => sum + (client.total_spent || 0), 0);
  const clientLifetimeValue = clients.length > 0
    ? totalRevenue / clients.length
    : 0;

  const analytics = {
    total_clients: clients.length,
    new_clients_this_month: newClientsThisMonth,
    month_over_month_change: monthOverMonthChange,
    repeat_clients: repeatClients,
    client_lifetime_value: Math.round(clientLifetimeValue * 100) / 100,
  };

  return <CRMDashboardEnhanced clients={clients} analytics={analytics} />;
}
