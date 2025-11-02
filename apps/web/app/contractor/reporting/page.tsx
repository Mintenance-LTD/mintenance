import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ReportingDashboard } from './components/ReportingDashboard';
import { serverSupabase } from '@/lib/api/supabaseServer';

export default async function ReportingPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  // Fetch jobs data
  const { data: jobs } = await serverSupabase
    .from('jobs')
    .select('*, homeowner:homeowner_id(*)')
    .eq('contractor_id', user.id)
    .order('created_at', { ascending: false });

  // Fetch payments data
  const { data: payments } = await serverSupabase
    .from('payments')
    .select('*')
    .eq('payee_id', user.id)
    .order('created_at', { ascending: false });

  // Calculate analytics
  const totalJobs = jobs?.length || 0;
  const completedJobs = jobs?.filter(j => j.status === 'completed').length || 0;
  const activeJobs = jobs?.filter(j => j.status === 'in_progress' || j.status === 'pending').length || 0;
  
  const totalRevenue = payments?.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0) || 0;
  const averageJobValue = completedJobs > 0 ? totalRevenue / completedJobs : 0;

  // Get unique clients
  const clientsMap = new Map();
  jobs?.forEach(job => {
    const homeowner = Array.isArray(job.homeowner) ? job.homeowner[0] : job.homeowner;
    if (homeowner?.id) {
      if (!clientsMap.has(homeowner.id)) {
        clientsMap.set(homeowner.id, {
          id: homeowner.id,
          name: `${homeowner.first_name || ''} ${homeowner.last_name || ''}`.trim(),
          totalSpent: 0,
          jobsCount: 0,
          isActive: false,
        });
      }
      const client = clientsMap.get(homeowner.id);
      client.jobsCount += 1;
      client.totalSpent += job.price || 0;
      if (job.status === 'in_progress' || job.status === 'pending') {
        client.isActive = true;
      }
    }
  });

  const clients = Array.from(clientsMap.values());
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.isActive).length;

  // Jobs by category
  const categoriesMap = new Map<string, { count: number; revenue: number }>();
  jobs?.forEach(job => {
    const category = job.category || 'Uncategorized';
    if (!categoriesMap.has(category)) {
      categoriesMap.set(category, { count: 0, revenue: 0 });
    }
    const cat = categoriesMap.get(category)!;
    cat.count += 1;
    cat.revenue += job.price || 0;
  });

  const jobsByCategory = Array.from(categoriesMap.entries()).map(([category, data]) => ({
    category,
    count: data.count,
    revenue: data.revenue,
  })).sort((a, b) => b.count - a.count).slice(0, 5);

  // Revenue by month (last 6 months)
  const monthsMap = new Map<string, { revenue: number; jobs: number }>();
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = date.toLocaleDateString('en-GB', { month: 'short' });
    monthsMap.set(monthKey, { revenue: 0, jobs: 0 });
  }

  jobs?.forEach(job => {
    if (job.status === 'completed' && job.completed_at) {
      const jobDate = new Date(job.completed_at);
      const monthKey = jobDate.toLocaleDateString('en-GB', { month: 'short' });
      if (monthsMap.has(monthKey)) {
        const month = monthsMap.get(monthKey)!;
        month.revenue += job.price || 0;
        month.jobs += 1;
      }
    }
  });

  const revenueByMonth = Array.from(monthsMap.entries()).map(([month, data]) => ({
    month,
    revenue: data.revenue,
    jobs: data.jobs,
  }));

  // Top clients by revenue
  const topClients = clients
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5)
    .map(c => ({
      name: c.name || 'Unknown',
      totalSpent: c.totalSpent,
      jobsCount: c.jobsCount,
    }));

  // Customer satisfaction (mock for now - would need to calculate from reviews/ratings)
  const customerSatisfaction = 4.5;

  const analytics = {
    totalJobs,
    completedJobs,
    activeJobs,
    totalRevenue,
    totalClients,
    activeClients,
    averageJobValue,
    customerSatisfaction,
    jobsByCategory,
    revenueByMonth,
    topClients,
  };

  return <ReportingDashboard analytics={analytics} />;
}

