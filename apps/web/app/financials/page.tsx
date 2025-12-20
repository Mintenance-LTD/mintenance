import { HomeownerLayoutShell } from '../dashboard/components/HomeownerLayoutShell';
import { theme } from '@/lib/theme';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { redirect } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { formatMoney } from '@/lib/utils/currency';
import Link from 'next/link';
import { InvoiceLink } from './components/InvoiceLink';
import { TrendSparkline } from '@/components/ui/TrendSparkline';

export default async function FinancialsPage() {
  const user = await getCurrentUserFromCookies();

  if (!user) {
    redirect('/login?redirect=/financials');
  }

  // Redirect contractors
  if (user.role === 'contractor') {
    redirect('/contractor/finance');
  }

  // Fetch financial data in parallel
  const [
    paymentsResult,
    subscriptionsResult,
    jobsResult,
    invoicesResult
  ] = await Promise.all([
    // Payments made by homeowner
    serverSupabase
      .from('payments')
      .select(`
        id,
        amount,
        status,
        payment_date,
        created_at,
        due_date,
        description,
        job:jobs!payments_job_id_fkey (
          id,
          title
        )
      `)
      .eq('payer_id', user.id)
      .order('created_at', { ascending: false }),
    // Subscriptions
    serverSupabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    // Jobs for calculating totals
    serverSupabase
      .from('jobs')
      .select('id, budget, status')
      .eq('homeowner_id', user.id),
    // Invoices received (from contractors) - linked through jobs
    serverSupabase
      .from('contractor_invoices')
      .select(`
        id,
        invoice_number,
        title,
        total_amount,
        status,
        invoice_date,
        due_date,
        paid_date,
        job_id,
        contractor:users!contractor_invoices_contractor_id_fkey (
          id,
          first_name,
          last_name
        ),
        job:jobs!contractor_invoices_job_id_fkey (
          id,
          homeowner_id
        )
      `)
      .order('created_at', { ascending: false })
  ]);

  interface InvoiceWithJob {
    id: string;
    invoice_number: string;
    title: string;
    total_amount: number;
    status: string;
    invoice_date: string;
    due_date: string;
    paid_date?: string;
    job_id: string;
    contractor?: { id: string; first_name: string; last_name: string } | Array<{ id: string; first_name: string; last_name: string }>;
    job?: { id: string; homeowner_id: string } | Array<{ id: string; homeowner_id: string }>;
  }

  // Extract data and handle errors gracefully
  const paymentsList = paymentsResult.data || [];
  const subscriptionsList = subscriptionsResult.data || [];
  const jobsList = jobsResult.data || [];
  // Filter invoices to only show those for jobs owned by this homeowner
  const invoicesList = ((invoicesResult.data || []) as InvoiceWithJob[]).filter((invoice: InvoiceWithJob) => {
    const job = Array.isArray(invoice.job) ? invoice.job[0] : invoice.job;
    return job?.homeowner_id === user.id;
  });

  // Calculate billing overview stats
  const now = new Date();
  const totalSpent = paymentsList
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const pendingPayments = paymentsList
    .filter(p => ['pending', 'processing'].includes(p.status || ''))
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const overduePayments = paymentsList.filter(p => {
    if (!p.due_date || p.status === 'completed') return false;
    return new Date(p.due_date) < now && p.status !== 'completed';
  }).length;

  const activeSubscriptions = subscriptionsList.filter(s => s.status === 'active').length;
  const overdueSubscriptions = subscriptionsList.filter(s => {
    if (!s.next_billing_date || s.status !== 'active') return false;
    return new Date(s.next_billing_date) < now;
  }).length;

  const totalBudget = jobsList.reduce((sum, job) => sum + (Number(job.budget) || 0), 0);
  const pendingInvoices = invoicesList.filter(i => ['sent', 'viewed'].includes(i.status || '')).length;
  const overdueInvoices = invoicesList.filter(i => {
    if (!i.due_date || i.status === 'paid') return false;
    return new Date(i.due_date) < now && i.status !== 'paid';
  }).length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
      case 'active':
        return { bg: 'bg-emerald-100', text: 'text-emerald-800', icon: 'checkCircle' };
      case 'pending':
      case 'processing':
      case 'sent':
      case 'viewed':
        return { bg: 'bg-amber-100', text: 'text-amber-800', icon: 'clock' };
      case 'overdue':
      case 'failed':
        return { bg: 'bg-red-100', text: 'text-red-800', icon: 'xCircle' };
      case 'cancelled':
      case 'refunded':
        return { bg: 'bg-gray-100', text: 'text-gray-600', icon: 'x' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-600', icon: 'info' };
    }
  };

  return (
    <HomeownerLayoutShell currentPath="/financials">
      <div className="max-w-[1440px] mx-auto p-6 flex flex-col gap-6">
        {/* Header - Navy Blue Command Center Style */}
        <div className="relative overflow-hidden bg-primary-900 p-8 -m-8 rounded-2xl mb-2 shadow-xl border border-primary-800">
          {/* Decorative Elements */}
          <div aria-hidden="true" className="absolute top-0 right-0 w-64 h-64 bg-secondary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div aria-hidden="true" className="absolute bottom-0 left-0 w-64 h-64 bg-accent-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>

          <div className="relative z-10 flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary-800 flex items-center justify-center shadow-inner border border-primary-700">
              <Icon name="currencyDollar" size={28} color="white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
                Financials
              </h1>
              <p className="text-base font-medium text-primary-200 leading-relaxed">
                Manage your subscriptions, invoices, and billing overview
              </p>
            </div>
          </div>
        </div>

        {/* Billing Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          {/* Total Spent - Emerald Accent */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-lg transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-secondary-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3 group-hover:bg-secondary-500/10 transition-colors"></div>
            <div className="text-sm font-medium text-gray-500 mb-2 relative z-10">
              Total Spent
            </div>
            <div className="text-2xl font-bold text-gray-900 relative z-10 mb-3">
              {formatMoney(totalSpent)}
            </div>
            <div className="flex items-center justify-between relative z-10 pt-3 border-t border-gray-100">
              <TrendSparkline direction="up" />
            </div>
          </div>

          {/* Pending Payments - Amber Accent */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-lg transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3 group-hover:bg-accent-500/10 transition-colors"></div>
            <div className="text-sm font-medium text-gray-500 mb-2 relative z-10">
              Pending Payments
            </div>
            <div className="text-2xl font-bold text-accent-600 relative z-10 mb-3">
              {formatMoney(pendingPayments)}
            </div>
            <div className="flex items-center justify-between relative z-10 pt-3 border-t border-gray-100">
              <TrendSparkline direction="up" />
              {overduePayments > 0 && (
                <div className="text-xs text-red-600 font-medium flex items-center gap-1">
                  <Icon name="alertCircle" size={12} />
                  {overduePayments} overdue
                </div>
              )}
            </div>
          </div>

          {/* Active Subscriptions - Navy Accent */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-lg transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3 group-hover:bg-primary-500/10 transition-colors"></div>
            <div className="text-sm font-medium text-gray-500 mb-2 relative z-10">
              Active Subscriptions
            </div>
            <div className="text-2xl font-bold text-gray-900 relative z-10 mb-3">
              {activeSubscriptions}
            </div>
            <div className="flex items-center justify-between relative z-10 pt-3 border-t border-gray-100">
              <TrendSparkline direction="up" />
              {overdueSubscriptions > 0 && (
                <div className="text-xs text-red-600 font-medium flex items-center gap-1">
                  <Icon name="alertCircle" size={12} />
                  {overdueSubscriptions} overdue
                </div>
              )}
            </div>
          </div>

          {/* Total Budget - Gray Accent */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-lg transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gray-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3 group-hover:bg-gray-500/10 transition-colors"></div>
            <div className="text-sm font-medium text-gray-500 mb-2 relative z-10">
              Total Budget
            </div>
            <div className="text-2xl font-bold text-gray-900 relative z-10 mb-3">
              {formatMoney(totalBudget)}
            </div>
            <div className="flex items-center justify-between relative z-10 pt-3 border-t border-gray-100">
              <TrendSparkline direction="up" />
            </div>
          </div>
        </div>

        {/* Subscriptions Section */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            Subscriptions <span className="text-gray-400 font-normal text-base">({subscriptionsList.length})</span>
          </h2>

          {subscriptionsList.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="flex justify-center mb-2">
                <Icon name="calendar" size={48} className="text-gray-300" />
              </div>
              <p className="text-base">No subscriptions yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {subscriptionsList.map((sub) => {
                const statusConfig = getStatusColor(sub.status || 'active');
                const nextBilling = sub.next_billing_date
                  ? new Date(sub.next_billing_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'N/A';
                const isOverdue = sub.next_billing_date && new Date(sub.next_billing_date) < now && sub.status === 'active';

                return (
                  <div
                    key={sub.id}
                    className="p-4 rounded-lg border border-gray-200 flex flex-wrap justify-between items-center gap-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-gray-900">
                          {sub.name || 'Subscription'}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${statusConfig.bg} ${statusConfig.text}`}>
                          <Icon name={statusConfig.icon as any} size={12} />
                          {sub.status || 'active'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        Next billing: {nextBilling}
                        {isOverdue && <span className="text-red-600 ml-1 font-medium">• Overdue</span>}
                      </p>
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {formatMoney(Number(sub.amount || 0))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Invoices Section */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              Invoices <span className="text-gray-400 font-normal text-base">({invoicesList.length})</span>
            </h2>
            {pendingInvoices > 0 && (
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                {pendingInvoices} pending
              </span>
            )}
          </div>

          {invoicesList.length === 0 ? (
            <InvoiceLink href="/payments">
              <div className="flex justify-center mb-2">
                <Icon name="fileText" size={48} className="text-gray-300" />
              </div>
              <p className="text-base m-0">No invoices yet</p>
              <p className="text-sm text-gray-400 mt-2 m-0">Click to view payment page</p>
            </InvoiceLink>
          ) : (
            <div className="flex flex-col gap-3">
              {invoicesList.map((invoice) => {
                const statusConfig = getStatusColor(invoice.status || 'draft');
                const contractor = Array.isArray(invoice.contractor) ? invoice.contractor[0] : invoice.contractor;
                const contractorName = contractor?.first_name && contractor?.last_name
                  ? `${contractor.first_name} ${contractor.last_name}`
                  : 'Unknown Contractor';
                const dueDate = invoice.due_date
                  ? new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'N/A';
                const invoiceDate = invoice.invoice_date
                  ? new Date(invoice.invoice_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'N/A';
                const isOverdue = invoice.due_date && new Date(invoice.due_date) < now && invoice.status !== 'paid';

                return (
                  <InvoiceLink
                    key={invoice.id}
                    href={`/payments${invoice.id ? `?invoice=${invoice.id}` : ''}`}
                    isCard={true}
                  >
                    <div className="flex flex-wrap justify-between items-start gap-3 w-full">
                      <div className="flex-1 min-w-[200px] text-left">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base font-semibold text-gray-900 m-0">
                            {invoice.title || invoice.invoice_number}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${statusConfig.bg} ${statusConfig.text}`}>
                            <Icon name={statusConfig.icon as any} size={12} />
                            {invoice.status || 'draft'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mb-1 m-0">
                          {contractorName}
                        </p>
                        <div className="text-xs text-gray-400">
                          Invoice #{invoice.invoice_number} • {invoiceDate}
                          {invoice.due_date && (
                            <span className="ml-2">
                              Due: {dueDate}
                              {isOverdue && <span className="text-red-600 font-medium"> • Overdue</span>}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-lg font-bold text-gray-900">
                        {formatMoney(Number(invoice.total_amount || 0))}
                      </div>
                    </div>
                  </InvoiceLink>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Payments Section */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            Recent Payments <span className="text-gray-400 font-normal text-base">({paymentsList.length})</span>
          </h2>

          {paymentsList.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="flex justify-center mb-2">
                <Icon name="currencyDollar" size={48} className="text-gray-300" />
              </div>
              <p className="text-base">No payments yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {paymentsList.slice(0, 10).map((payment) => {
                const statusConfig = getStatusColor(payment.status || 'pending');
                const job = Array.isArray(payment.job) ? payment.job[0] : payment.job;
                const paymentDate = payment.payment_date || payment.created_at
                  ? new Date(payment.payment_date || payment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'N/A';

                return (
                  <div
                    key={payment.id}
                    className="p-4 rounded-lg border border-gray-200 flex flex-wrap justify-between items-center gap-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-gray-900">
                          {payment.description || job?.title || 'Payment'}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${statusConfig.bg} ${statusConfig.text}`}>
                          <Icon name={statusConfig.icon as any} size={12} />
                          {payment.status || 'pending'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 flex items-center gap-2">
                        {paymentDate}
                        {job && (
                          <Link href={`/jobs/${job.id}`} className="text-primary-600 hover:text-primary-700 hover:underline flex items-center gap-1">
                            View Job <Icon name="arrowRight" size={12} />
                          </Link>
                        )}
                      </p>
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {formatMoney(Number(payment.amount || 0))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </HomeownerLayoutShell>
  );
}


