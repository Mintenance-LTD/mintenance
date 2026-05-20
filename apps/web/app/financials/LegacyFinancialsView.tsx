/**
 * Legacy /financials view, extracted from page.tsx so the parent
 * page stays under the 500-line MDC cap. Pure presentation — the
 * page owns all data fetching + aggregation and passes the computed
 * stats + lists down here.
 */

import { Icon } from '@/components/ui/Icon';
import Link from 'next/link';
import { formatMoney } from '@/lib/utils/currency';
import { HomeownerLayoutShell } from '../dashboard/components/HomeownerLayoutShell';
import { InvoiceLink } from './components/InvoiceLink';
import {
  RecentPaymentsList,
  getFinancialsStatusColor,
} from './components/RecentPaymentsList';
import type {
  FinancialsInvoiceRow,
  FinancialsPaymentRow,
  FinancialsStats,
  FinancialsSubscriptionRow,
} from './MintEditorialFinancials';

interface Props {
  stats: FinancialsStats;
  subscriptions: FinancialsSubscriptionRow[];
  invoices: FinancialsInvoiceRow[];
  payments: FinancialsPaymentRow[];
}

export function LegacyFinancialsView({
  stats,
  subscriptions,
  invoices,
  payments,
}: Props) {
  const now = new Date();
  const getStatusColor = getFinancialsStatusColor;

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
              {formatMoney(stats.totalSpent)}
            </div>
            {stats.totalSpent > 0 && (
              <div className='text-xs text-gray-400 mt-2 relative z-10'>
                From {stats.spentCount} payments
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
              className={`text-2xl font-bold relative z-10 ${stats.pendingPayments > 0 ? 'text-accent-600' : 'text-gray-900'}`}
            >
              {formatMoney(stats.pendingPayments)}
            </div>
            {stats.overduePayments > 0 && (
              <div className='text-xs text-red-600 font-medium flex items-center gap-1 mt-2 relative z-10'>
                <Icon name='alertCircle' size={12} />
                {stats.overduePayments} overdue
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
              {stats.activeSubscriptions}
            </div>
            {stats.overdueSubscriptions > 0 && (
              <div className='text-xs text-red-600 font-medium flex items-center gap-1 mt-2 relative z-10'>
                <Icon name='alertCircle' size={12} />
                {stats.overdueSubscriptions} overdue
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
              {formatMoney(stats.totalBudget)}
            </div>
            {stats.jobCount > 0 && (
              <div className='text-xs text-gray-400 mt-2 relative z-10'>
                Across {stats.jobCount} jobs
              </div>
            )}
          </div>
        </div>

        {/* Subscriptions Section */}
        <div className='bg-white border border-gray-200 rounded-xl p-6 shadow-sm'>
          <h2 className='text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2'>
            Subscriptions{' '}
            <span className='text-gray-400 font-normal text-base'>
              ({subscriptions.length})
            </span>
          </h2>

          {subscriptions.length === 0 ? (
            <div className='flex items-center justify-between py-4 px-4 bg-gray-50 rounded-lg text-gray-500'>
              <div className='flex items-center gap-3'>
                <Icon name='calendar' size={20} className='text-gray-400' />
                <span className='text-sm'>No active subscriptions</span>
              </div>
            </div>
          ) : (
            <div className='flex flex-col gap-3'>
              {subscriptions.map((sub) => {
                const statusConfig = getStatusColor(sub.status || 'active');
                const nextBilling = sub.next_billing_date
                  ? new Date(sub.next_billing_date).toLocaleDateString(
                      'en-GB',
                      { month: 'short', day: 'numeric', year: 'numeric' }
                    )
                  : 'N/A';
                const isOverdue =
                  !!sub.next_billing_date &&
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
                ({invoices.length})
              </span>
            </h2>
            {stats.pendingInvoices > 0 && (
              <span className='px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold'>
                {stats.pendingInvoices} pending
              </span>
            )}
          </div>

          {invoices.length === 0 ? (
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
              {invoices.map((invoice) => {
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
                const issuedRaw = invoice.issue_date || invoice.invoice_date;
                const invoiceDate = issuedRaw
                  ? new Date(issuedRaw).toLocaleDateString('en-GB', {
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
        <RecentPaymentsList payments={payments} />
      </div>
    </HomeownerLayoutShell>
  );
}
