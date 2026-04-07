import type { Metadata } from 'next';
import { HomeownerLayoutShell } from '../dashboard/components/HomeownerLayoutShell';
import { getCurrentUserFromCookies } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Financials | Mintenance',
  description:
    'Manage your payments, subscriptions, invoices, and billing overview for property maintenance.',
};
import { serverSupabase } from '@/lib/api/supabaseServer';
import { redirect } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { formatMoney } from '@/lib/utils/currency';
import Link from 'next/link';
import { InvoiceLink } from './components/InvoiceLink';

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
  const [paymentsResult, subscriptionsResult, jobsResult, invoicesResult] =
    await Promise.all([
      // Payments made by homeowner
      serverSupabase
        .from('payments')
        .select(
          `
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
      `
        )
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
        .select(
          `
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
      `
        )
        .order('created_at', { ascending: false }),
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
    contractor?:
      | { id: string; first_name: string; last_name: string }
      | Array<{ id: string; first_name: string; last_name: string }>;
    job?:
      | { id: string; homeowner_id: string }
      | Array<{ id: string; homeowner_id: string }>;
  }

  // Extract data and handle errors gracefully
  const paymentsList = paymentsResult.data || [];
  const subscriptionsList = subscriptionsResult.data || [];
  const jobsList = jobsResult.data || [];
  // Filter invoices to only show those for jobs owned by this homeowner
  const invoicesList = ((invoicesResult.data || []) as InvoiceWithJob[]).filter(
    (invoice: InvoiceWithJob) => {
      const job = Array.isArray(invoice.job) ? invoice.job[0] : invoice.job;
      return job?.homeowner_id === user.id;
    }
  );

  // Calculate billing overview stats
  const now = new Date();
  const totalSpent = paymentsList
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const pendingPayments = paymentsList
    .filter((p) => ['pending', 'processing'].includes(p.status || ''))
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const overduePayments = paymentsList.filter((p) => {
    if (!p.due_date || p.status === 'completed') return false;
    return new Date(p.due_date) < now && p.status !== 'completed';
  }).length;

  const activeSubscriptions = subscriptionsList.filter(
    (s) => s.status === 'active'
  ).length;
  const overdueSubscriptions = subscriptionsList.filter((s) => {
    if (!s.next_billing_date || s.status !== 'active') return false;
    return new Date(s.next_billing_date) < now;
  }).length;

  const totalBudget = jobsList.reduce(
    (sum, job) => sum + (Number(job.budget) || 0),
    0
  );
  const pendingInvoices = invoicesList.filter((i) =>
    ['sent', 'viewed'].includes(i.status || '')
  ).length;
  const overdueInvoices = invoicesList.filter((i) => {
    if (!i.due_date || i.status === 'paid') return false;
    return new Date(i.due_date) < now && i.status !== 'paid';
  }).length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
      case 'active':
        return {
          bg: 'bg-emerald-100',
          text: 'text-emerald-800',
          icon: 'checkCircle',
        };
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
    <HomeownerLayoutShell currentPath='/financials'>
      <div className='max-w-[1440px] mx-auto p-6 flex flex-col gap-6'>
        {/* Header */}
        <div className='relative overflow-hidden bg-primary-900 p-8 rounded-2xl shadow-xl border border-primary-800'>
          <div
            aria-hidden='true'
            className='absolute top-0 right-0 w-64 h-64 bg-secondary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3'
          />
          <div
            aria-hidden='true'
            className='absolute bottom-0 left-0 w-64 h-64 bg-accent-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3'
          />

          <div className='relative z-10 flex items-start gap-4'>
            <div className='w-14 h-14 rounded-2xl bg-primary-800 flex items-center justify-center shadow-inner border border-primary-700'>
              <Icon name='currencyPound' size={28} color='white' />
            </div>
            <div>
              <h1 className='text-4xl font-bold text-white mb-2 tracking-tight'>
                Financials
              </h1>
              <p className='text-base font-medium text-primary-200 leading-relaxed'>
                Manage your subscriptions, invoices, and billing overview
              </p>
            </div>
          </div>
        </div>

        {/* Billing Overview Cards */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
          {/* Total Spent */}
          <div className='bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-lg transition-shadow relative overflow-hidden group'>
            <div
              aria-hidden='true'
              className='absolute top-0 right-0 w-24 h-24 bg-secondary-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3 group-hover:bg-secondary-500/10 transition-colors'
            />
            <div className='text-sm font-medium text-gray-500 mb-2 relative z-10'>
              Total Spent
            </div>
            <div className='text-2xl font-bold text-gray-900 relative z-10'>
              {formatMoney(totalSpent)}
            </div>
            {totalSpent > 0 && (
              <div className='text-xs text-gray-400 mt-2 relative z-10'>
                From{' '}
                {paymentsList.filter((p) => p.status === 'completed').length}{' '}
                completed payments
              </div>
            )}
          </div>

          {/* Pending Payments */}
          <div className='bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-lg transition-shadow relative overflow-hidden group'>
            <div
              aria-hidden='true'
              className='absolute top-0 right-0 w-24 h-24 bg-accent-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3 group-hover:bg-accent-500/10 transition-colors'
            />
            <div className='text-sm font-medium text-gray-500 mb-2 relative z-10'>
              Pending Payments
            </div>
            <div
              className={`text-2xl font-bold relative z-10 ${pendingPayments > 0 ? 'text-accent-600' : 'text-gray-900'}`}
            >
              {formatMoney(pendingPayments)}
            </div>
            {overduePayments > 0 && (
              <div className='text-xs text-red-600 font-medium flex items-center gap-1 mt-2 relative z-10'>
                <Icon name='alertCircle' size={12} />
                {overduePayments} overdue
              </div>
            )}
          </div>

          {/* Active Subscriptions */}
          <div className='bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-lg transition-shadow relative overflow-hidden group'>
            <div
              aria-hidden='true'
              className='absolute top-0 right-0 w-24 h-24 bg-primary-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3 group-hover:bg-primary-500/10 transition-colors'
            />
            <div className='text-sm font-medium text-gray-500 mb-2 relative z-10'>
              Active Subscriptions
            </div>
            <div className='text-2xl font-bold text-gray-900 relative z-10'>
              {activeSubscriptions}
            </div>
            {overdueSubscriptions > 0 && (
              <div className='text-xs text-red-600 font-medium flex items-center gap-1 mt-2 relative z-10'>
                <Icon name='alertCircle' size={12} />
                {overdueSubscriptions} overdue
              </div>
            )}
          </div>

          {/* Total Budget */}
          <div className='bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-lg transition-shadow relative overflow-hidden group'>
            <div
              aria-hidden='true'
              className='absolute top-0 right-0 w-24 h-24 bg-gray-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3 group-hover:bg-gray-500/10 transition-colors'
            />
            <div className='text-sm font-medium text-gray-500 mb-2 relative z-10'>
              Total Budget
            </div>
            <div className='text-2xl font-bold text-gray-900 relative z-10'>
              {formatMoney(totalBudget)}
            </div>
            {jobsList.length > 0 && (
              <div className='text-xs text-gray-400 mt-2 relative z-10'>
                Across {jobsList.length} jobs
              </div>
            )}
          </div>
        </div>

        {/* Subscriptions Section */}
        <div className='bg-white border border-gray-200 rounded-xl p-6 shadow-sm'>
          <h2 className='text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2'>
            Subscriptions{' '}
            <span className='text-gray-400 font-normal text-base'>
              ({subscriptionsList.length})
            </span>
          </h2>

          {subscriptionsList.length === 0 ? (
            <div className='flex items-center justify-between py-4 px-4 bg-gray-50 rounded-lg text-gray-500'>
              <div className='flex items-center gap-3'>
                <Icon name='calendar' size={20} className='text-gray-400' />
                <span className='text-sm'>No active subscriptions</span>
              </div>
            </div>
          ) : (
            <div className='flex flex-col gap-3'>
              {subscriptionsList.map((sub) => {
                const statusConfig = getStatusColor(sub.status || 'active');
                const nextBilling = sub.next_billing_date
                  ? new Date(sub.next_billing_date).toLocaleDateString(
                      'en-GB',
                      { month: 'short', day: 'numeric', year: 'numeric' }
                    )
                  : 'N/A';
                const isOverdue =
                  sub.next_billing_date &&
                  new Date(sub.next_billing_date) < now &&
                  sub.status === 'active';

                return (
                  <div
                    key={sub.id}
                    className='p-4 rounded-lg border border-gray-200 flex flex-wrap justify-between items-center gap-3 hover:bg-gray-50 transition-colors'
                  >
                    <div className='flex-1 min-w-[200px]'>
                      <div className='flex items-center gap-2 mb-1'>
                        <h3 className='text-base font-semibold text-gray-900'>
                          {sub.name || 'Subscription'}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${statusConfig.bg} ${statusConfig.text}`}
                        >
                          <Icon name={statusConfig.icon} size={12} />
                          {sub.status || 'active'}
                        </span>
                      </div>
                      <p className='text-sm text-gray-500'>
                        Next billing: {nextBilling}
                        {isOverdue && (
                          <span className='text-red-600 ml-1 font-medium'>
                            • Overdue
                          </span>
                        )}
                      </p>
                    </div>
                    <div className='text-lg font-bold text-gray-900'>
                      {formatMoney(Number(sub.amount || 0))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Invoices Section */}
        <div className='bg-white border border-gray-200 rounded-xl p-6 shadow-sm'>
          <div className='flex justify-between items-center mb-4'>
            <h2 className='text-xl font-semibold text-gray-900 flex items-center gap-2'>
              Invoices{' '}
              <span className='text-gray-400 font-normal text-base'>
                ({invoicesList.length})
              </span>
            </h2>
            {pendingInvoices > 0 && (
              <span className='px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold'>
                {pendingInvoices} pending
              </span>
            )}
          </div>

          {invoicesList.length === 0 ? (
            <Link
              href='/payments'
              className='flex items-center justify-between py-4 px-4 bg-gray-50 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors no-underline'
            >
              <div className='flex items-center gap-3'>
                <Icon name='fileText' size={20} className='text-gray-400' />
                <span className='text-sm text-gray-500'>No invoices yet</span>
              </div>
              <span className='text-xs text-primary-600 font-medium flex items-center gap-1'>
                View payments <Icon name='arrowRight' size={12} />
              </span>
            </Link>
          ) : (
            <div className='flex flex-col gap-3'>
              {invoicesList.map((invoice) => {
                const statusConfig = getStatusColor(invoice.status || 'draft');
                const contractor = Array.isArray(invoice.contractor)
                  ? invoice.contractor[0]
                  : invoice.contractor;
                const contractorName =
                  contractor?.first_name && contractor?.last_name
                    ? `${contractor.first_name} ${contractor.last_name}`
                    : 'Unknown Contractor';
                const dueDate = invoice.due_date
                  ? new Date(invoice.due_date).toLocaleDateString('en-GB', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'N/A';
                const invoiceDate = invoice.invoice_date
                  ? new Date(invoice.invoice_date).toLocaleDateString('en-GB', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'N/A';
                const isOverdue =
                  invoice.due_date &&
                  new Date(invoice.due_date) < now &&
                  invoice.status !== 'paid';

                return (
                  <InvoiceLink
                    key={invoice.id}
                    href={`/payments${invoice.id ? `?invoice=${invoice.id}` : ''}`}
                    isCard={true}
                  >
                    <div className='flex flex-wrap justify-between items-start gap-3 w-full'>
                      <div className='flex-1 min-w-[200px] text-left'>
                        <div className='flex items-center gap-2 mb-1'>
                          <h3 className='text-base font-semibold text-gray-900 m-0'>
                            {invoice.title || invoice.invoice_number}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${statusConfig.bg} ${statusConfig.text}`}
                          >
                            <Icon name={statusConfig.icon} size={12} />
                            {invoice.status || 'draft'}
                          </span>
                        </div>
                        <p className='text-sm text-gray-500 mb-1 m-0'>
                          {contractorName}
                        </p>
                        <div className='text-xs text-gray-400'>
                          Invoice #{invoice.invoice_number} • {invoiceDate}
                          {invoice.due_date && (
                            <span className='ml-2'>
                              Due: {dueDate}
                              {isOverdue && (
                                <span className='text-red-600 font-medium'>
                                  {' '}
                                  • Overdue
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className='text-lg font-bold text-gray-900'>
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
        <div className='bg-white border border-gray-200 rounded-xl p-6 shadow-sm'>
          <h2 className='text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2'>
            Recent Payments{' '}
            <span className='text-gray-400 font-normal text-base'>
              ({paymentsList.length})
            </span>
          </h2>

          {paymentsList.length === 0 ? (
            <Link
              href='/jobs/create'
              className='flex items-center justify-between py-4 px-4 bg-gray-50 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors no-underline'
            >
              <div className='flex items-center gap-3'>
                <Icon
                  name='currencyPound'
                  size={20}
                  className='text-gray-400'
                />
                <span className='text-sm text-gray-500'>No payments yet</span>
              </div>
              <span className='text-xs text-primary-600 font-medium flex items-center gap-1'>
                Post a job <Icon name='arrowRight' size={12} />
              </span>
            </Link>
          ) : (
            <div className='flex flex-col gap-3'>
              {paymentsList.slice(0, 10).map((payment) => {
                const statusConfig = getStatusColor(
                  payment.status || 'pending'
                );
                const job = Array.isArray(payment.job)
                  ? payment.job[0]
                  : payment.job;
                const paymentDate =
                  payment.payment_date || payment.created_at
                    ? new Date(
                        payment.payment_date || payment.created_at
                      ).toLocaleDateString('en-GB', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'N/A';

                return (
                  <div
                    key={payment.id}
                    className='p-4 rounded-lg border border-gray-200 flex flex-wrap justify-between items-center gap-3 hover:bg-gray-50 transition-colors'
                  >
                    <div className='flex-1 min-w-[200px]'>
                      <div className='flex items-center gap-2 mb-1'>
                        <h3 className='text-base font-semibold text-gray-900'>
                          {payment.description || job?.title || 'Payment'}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${statusConfig.bg} ${statusConfig.text}`}
                        >
                          <Icon name={statusConfig.icon} size={12} />
                          {payment.status || 'pending'}
                        </span>
                      </div>
                      <p className='text-sm text-gray-500 flex items-center gap-2'>
                        {paymentDate}
                        {job && (
                          <Link
                            href={`/jobs/${job.id}`}
                            className='text-primary-600 hover:text-primary-700 hover:underline flex items-center gap-1'
                          >
                            View Job <Icon name='arrowRight' size={12} />
                          </Link>
                        )}
                      </p>
                    </div>
                    <div className='text-lg font-bold text-gray-900'>
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
