import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { formatMoney } from '@/lib/utils/currency';

export interface FinancialsPaymentRow {
  id: string;
  amount?: number | string | null;
  status?: string | null;
  created_at?: string | null;
  released_at?: string | null;
  job?:
    | { id: string; title?: string | null }
    | Array<{ id: string; title?: string | null }>
    | null;
}

interface StatusConfig {
  bg: string;
  text: string;
  icon: string;
}

export function getFinancialsStatusColor(status: string): StatusConfig {
  switch (status) {
    case 'completed':
    case 'paid':
    case 'active':
    case 'released':
      return {
        bg: 'bg-emerald-100',
        text: 'text-emerald-800',
        icon: 'checkCircle',
      };
    case 'pending':
    case 'processing':
    case 'sent':
    case 'viewed':
    case 'held':
    case 'release_pending':
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
}

export function RecentPaymentsList({
  payments,
}: {
  payments: FinancialsPaymentRow[];
}) {
  return (
    <div className='bg-white border border-gray-200 rounded-xl p-6 shadow-sm'>
      <h2 className='text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2'>
        Recent Payments{' '}
        <span className='text-gray-400 font-normal text-base'>
          ({payments.length})
        </span>
      </h2>

      {payments.length === 0 ? (
        <Link
          href='/jobs/create'
          className='flex items-center justify-between py-4 px-4 bg-gray-50 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors no-underline'
        >
          <div className='flex items-center gap-3'>
            <Icon name='currencyPound' size={20} className='text-gray-400' />
            <span className='text-sm text-gray-500'>No payments yet</span>
          </div>
          <span className='text-xs text-primary-600 font-medium flex items-center gap-1'>
            Post a job <Icon name='arrowRight' size={12} />
          </span>
        </Link>
      ) : (
        <div className='flex flex-col gap-3'>
          {payments.slice(0, 10).map((payment) => (
            <PaymentRow key={payment.id} payment={payment} />
          ))}
        </div>
      )}
    </div>
  );
}

function PaymentRow({ payment }: { payment: FinancialsPaymentRow }) {
  const statusConfig = getFinancialsStatusColor(payment.status || 'pending');
  const job = Array.isArray(payment.job) ? payment.job[0] : payment.job;
  const dateSource = payment.released_at || payment.created_at;
  const paymentDate = dateSource
    ? new Date(dateSource).toLocaleDateString('en-GB', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'N/A';
  const statusLabel = (payment.status || 'pending').replace(/_/g, ' ');

  return (
    <div className='p-4 rounded-lg border border-gray-200 flex flex-wrap justify-between items-center gap-3 hover:bg-gray-50 transition-colors'>
      <div className='flex-1 min-w-[200px]'>
        <div className='flex items-center gap-2 mb-1'>
          <h3 className='text-base font-semibold text-gray-900'>
            {job?.title || 'Payment'}
          </h3>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 capitalize ${statusConfig.bg} ${statusConfig.text}`}
          >
            <Icon name={statusConfig.icon} size={12} />
            {statusLabel}
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
}
