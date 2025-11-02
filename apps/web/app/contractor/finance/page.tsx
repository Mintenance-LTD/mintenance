import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { redirect } from 'next/navigation';
import { FinanceDashboardEnhanced } from './components/FinanceDashboardEnhanced';

export default async function FinanceDashboardPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  // Fetch all payments (completed and pending)
  const { data: payments } = await serverSupabase
    .from('payments')
    .select('*')
    .eq('payee_id', user.id)
    .order('created_at', { ascending: false });

  // Fetch completed jobs with budget information
  const { data: completedJobs } = await serverSupabase
    .from('jobs')
    .select('id, title, status, budget, created_at, completed_at, contractor_id')
    .eq('contractor_id', user.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false });

  // Fetch accepted quotes (these represent potential/invoiced revenue)
  const { data: acceptedQuotes } = await serverSupabase
    .from('contractor_quotes')
    .select('id, total_amount, status, created_at, client_name, client_email')
    .eq('contractor_id', user.id)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false });

  // Fetch all quotes for invoice tracking
  const { data: allQuotes } = await serverSupabase
    .from('contractor_quotes')
    .select('id, quote_number, total_amount, status, created_at, client_name, client_email')
    .eq('contractor_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Calculate total revenue from completed payments
  const totalRevenue = payments
    ?.filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0) || 0;

  // Calculate pending payments
  const pendingPayments = payments
    ?.filter(p => p.status === 'pending' || p.status === 'processing')
    .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0) || 0;

  // Calculate average job value (from completed jobs with budgets)
  const completedJobsWithBudget = completedJobs?.filter(j => j.budget && parseFloat(j.budget) > 0) || [];
  const avgJobValue = completedJobsWithBudget.length > 0
    ? completedJobsWithBudget.reduce((sum, j) => sum + parseFloat(j.budget || '0'), 0) / completedJobsWithBudget.length
    : 0;

  // Calculate last 6 months data for chart
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const monthlyData: Record<string, { revenue: number; expenses: number }> = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Initialize last 6 months
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    date.setDate(1);
    const monthKey = monthNames[date.getMonth()];
    monthlyData[monthKey] = { revenue: 0, expenses: 0 };
  }

  // Calculate revenue by month from completed payments
  payments?.forEach(payment => {
    if (payment.status === 'completed' && payment.created_at) {
      const paymentDate = new Date(payment.created_at);
      if (paymentDate >= sixMonthsAgo) {
        const monthKey = monthNames[paymentDate.getMonth()];
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].revenue += parseFloat(payment.amount || '0');
        }
      }
    }
  });

  // Calculate expenses (for now, use a simplified calculation - you may have an expenses table)
  // If you have an expenses table, fetch it here. For now, we'll estimate at 30% of revenue
  Object.keys(monthlyData).forEach(month => {
    monthlyData[month].expenses = monthlyData[month].revenue * 0.3; // 30% estimate
  });

  // Calculate profit margin from last 6 months
  const totalRevenue6Months = Object.values(monthlyData).reduce((sum, m) => sum + m.revenue, 0);
  const totalExpenses6Months = Object.values(monthlyData).reduce((sum, m) => sum + m.expenses, 0);
  const profitMargin = totalRevenue6Months > 0
    ? ((totalRevenue6Months - totalExpenses6Months) / totalRevenue6Months) * 100
    : 0;

  // Calculate average job value change (compare last 3 months vs previous 3 months)
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  threeMonthsAgo.setDate(1);
  threeMonthsAgo.setHours(0, 0, 0, 0);

  const recentJobs = completedJobsWithBudget.filter(j => {
    const completedDate = j.completed_at ? new Date(j.completed_at) : new Date(j.created_at);
    return completedDate >= threeMonthsAgo;
  });

  const olderJobs = completedJobsWithBudget.filter(j => {
    const completedDate = j.completed_at ? new Date(j.completed_at) : new Date(j.created_at);
    return completedDate < threeMonthsAgo && completedDate >= sixMonthsAgo;
  });

  const recentAvgJobValue = recentJobs.length > 0
    ? recentJobs.reduce((sum, j) => sum + parseFloat(j.budget || '0'), 0) / recentJobs.length
    : 0;

  const olderAvgJobValue = olderJobs.length > 0
    ? olderJobs.reduce((sum, j) => sum + parseFloat(j.budget || '0'), 0) / olderJobs.length
    : 0;

  const avgJobValueChange = olderAvgJobValue > 0
    ? ((recentAvgJobValue - olderAvgJobValue) / olderAvgJobValue) * 100
    : recentAvgJobValue > 0 ? 100 : 0;

  // Prepare chart data (last 6 months)
  const chartData = Object.keys(monthlyData)
    .slice(-6)
    .map(month => ({
      month,
      revenue: monthlyData[month].revenue,
      expenses: monthlyData[month].expenses,
    }));

  // Prepare invoices from quotes
  const invoices = allQuotes?.map(quote => ({
    id: quote.id,
    invoiceNumber: quote.quote_number || `INV-${quote.id.slice(0, 8).toUpperCase()}`,
    client: quote.client_name || quote.client_email || 'Unknown Client',
    amount: parseFloat(quote.total_amount || '0'),
    dueDate: quote.created_at,
    status: quote.status === 'accepted' ? 'paid' as const : quote.status === 'sent' ? 'pending' as const : 'draft' as const,
  })) || [];

  // Prepare recent transactions from payments
  const recentTransactions = payments?.slice(0, 10).map(payment => ({
    id: payment.id,
    description: `Payment from ${payment.payer_id?.slice(0, 8) || 'Client'}`,
    amount: parseFloat(payment.amount || '0'),
    date: payment.created_at,
    status: payment.status === 'completed' ? 'completed' as const : payment.status === 'pending' ? 'pending' as const : 'failed' as const,
  })) || [];

  const financialData = {
    totalRevenue,
    pendingPayments,
    completedJobs: completedJobs?.length || 0,
    avgJobValue,
    avgJobValueChange,
    profitMargin,
    profitMarginChange: 0, // Can be calculated if you track historical profit margins
    payments: payments || [],
    jobs: completedJobs || [],
    chartData,
    invoices,
    transactions: recentTransactions,
  };

  return <FinanceDashboardEnhanced financialData={financialData} />;
}
