'use client';

/**
 * Row + stat tile components for the /documents legacy chrome.
 * Extracted from `page.tsx` to keep that file under the 500-line MDC
 * cap after the Mint Editorial theme branch was added. Pure
 * presentational components, no data fetching.
 */

import React from 'react';
import Link from 'next/link';
import {
  FileText,
  Gavel,
  CreditCard,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  PoundSterling,
  Building2,
  User,
  CalendarDays,
} from 'lucide-react';

export interface DocumentItem {
  id: string;
  type: 'contract' | 'bid' | 'payment';
  name: string;
  status: string;
  amount: number | null;
  job_id: string;
  job_title?: string;
  contractor_name?: string;
  contractor_signed?: boolean;
  homeowner_signed?: boolean;
  message?: string | null;
  created_at: string;
  updated_at: string;
  href: string;
}

function getStatusConfig(type: string, status: string) {
  if (type === 'contract') {
    const map: Record<
      string,
      { label: string; color: string; bg: string; icon: typeof CheckCircle2 }
    > = {
      accepted: {
        label: 'Fully Signed',
        color: 'text-emerald-700',
        bg: 'bg-emerald-50 border-emerald-200',
        icon: CheckCircle2,
      },
      pending_contractor: {
        label: 'Awaiting Contractor',
        color: 'text-amber-700',
        bg: 'bg-amber-50 border-amber-200',
        icon: Clock,
      },
      pending_homeowner: {
        label: 'Awaiting Your Signature',
        color: 'text-blue-700',
        bg: 'bg-blue-50 border-blue-200',
        icon: AlertCircle,
      },
      sent: {
        label: 'Sent',
        color: 'text-blue-700',
        bg: 'bg-blue-50 border-blue-200',
        icon: Clock,
      },
      rejected: {
        label: 'Rejected',
        color: 'text-red-700',
        bg: 'bg-red-50 border-red-200',
        icon: XCircle,
      },
    };
    return (
      map[status] || {
        label: status,
        color: 'text-gray-700',
        bg: 'bg-gray-50 border-gray-200',
        icon: Clock,
      }
    );
  }
  if (type === 'bid') {
    const map: Record<
      string,
      { label: string; color: string; bg: string; icon: typeof CheckCircle2 }
    > = {
      accepted: {
        label: 'Accepted',
        color: 'text-emerald-700',
        bg: 'bg-emerald-50 border-emerald-200',
        icon: CheckCircle2,
      },
      pending: {
        label: 'Pending Review',
        color: 'text-amber-700',
        bg: 'bg-amber-50 border-amber-200',
        icon: Clock,
      },
      rejected: {
        label: 'Declined',
        color: 'text-red-700',
        bg: 'bg-red-50 border-red-200',
        icon: XCircle,
      },
    };
    return (
      map[status] || {
        label: status,
        color: 'text-gray-700',
        bg: 'bg-gray-50 border-gray-200',
        icon: Clock,
      }
    );
  }
  // payment
  const map: Record<
    string,
    { label: string; color: string; bg: string; icon: typeof CheckCircle2 }
  > = {
    held: {
      label: 'In Escrow',
      color: 'text-blue-700',
      bg: 'bg-blue-50 border-blue-200',
      icon: CreditCard,
    },
    released: {
      label: 'Released',
      color: 'text-emerald-700',
      bg: 'bg-emerald-50 border-emerald-200',
      icon: CheckCircle2,
    },
    release_pending: {
      label: 'Release Pending',
      color: 'text-amber-700',
      bg: 'bg-amber-50 border-amber-200',
      icon: Clock,
    },
    pending: {
      label: 'Processing',
      color: 'text-amber-700',
      bg: 'bg-amber-50 border-amber-200',
      icon: Loader2,
    },
    refunded: {
      label: 'Refunded',
      color: 'text-gray-700',
      bg: 'bg-gray-50 border-gray-200',
      icon: XCircle,
    },
  };
  return (
    map[status] || {
      label: status,
      color: 'text-gray-700',
      bg: 'bg-gray-50 border-gray-200',
      icon: Clock,
    }
  );
}

function getTypeConfig(type: string) {
  const map: Record<
    string,
    { label: string; icon: typeof FileText; color: string; bgColor: string }
  > = {
    contract: {
      label: 'Contract',
      icon: FileText,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    bid: {
      label: 'Bid',
      icon: Gavel,
      color: 'text-violet-600',
      bgColor: 'bg-violet-50',
    },
    payment: {
      label: 'Payment',
      icon: CreditCard,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
    },
  };
  return (
    map[type] || {
      label: type,
      icon: FileText,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    }
  );
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatRelative(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return formatDate(dateString);
}

export function SignaturePill({
  label,
  signed,
}: {
  label: string;
  signed: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
        signed
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-gray-100 text-gray-500 border border-gray-200'
      }`}
    >
      {signed ? (
        <CheckCircle2 className='h-2.5 w-2.5' />
      ) : (
        <Clock className='h-2.5 w-2.5' />
      )}
      {label}: {signed ? 'Signed' : 'Pending'}
    </span>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  color,
  highlight,
}: {
  label: string;
  value: number;
  icon: typeof FileText;
  color: string;
  highlight?: boolean;
}) {
  const colorMap: Record<string, { bg: string; text: string; accent: string }> =
    {
      indigo: {
        bg: 'bg-indigo-50',
        text: 'text-indigo-700',
        accent: 'border-indigo-200',
      },
      blue: {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        accent: 'border-blue-200',
      },
      violet: {
        bg: 'bg-violet-50',
        text: 'text-violet-700',
        accent: 'border-violet-200',
      },
      teal: {
        bg: 'bg-teal-50',
        text: 'text-teal-700',
        accent: 'border-teal-200',
      },
      amber: {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        accent: 'border-amber-200',
      },
    };
  const c = colorMap[color] || colorMap.indigo;

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${highlight ? `${c.bg} ${c.accent} ring-1 ring-amber-200` : `bg-white border-gray-200`}`}
    >
      <div className='flex items-center justify-between mb-3'>
        <div
          className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center`}
        >
          <Icon className={`h-4.5 w-4.5 ${c.text}`} />
        </div>
        {highlight && (
          <span className='px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-800'>
            Action needed
          </span>
        )}
      </div>
      <div className='text-2xl font-bold text-gray-900'>{value}</div>
      <div className='text-xs font-medium text-gray-500 mt-0.5'>{label}</div>
    </div>
  );
}

export function DocumentRow({ doc }: { doc: DocumentItem }) {
  const typeConfig = getTypeConfig(doc.type);
  const statusConfig = getStatusConfig(doc.type, doc.status);
  const StatusIcon = statusConfig.icon;
  const TypeIcon = typeConfig.icon;

  return (
    <Link href={doc.href} className='group'>
      <div className='flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors'>
        <div
          className={`w-10 h-10 rounded-xl ${typeConfig.bgColor} flex items-center justify-center flex-shrink-0`}
        >
          <TypeIcon className={`h-5 w-5 ${typeConfig.color}`} />
        </div>

        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 mb-0.5'>
            <h3 className='text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors'>
              {doc.name}
            </h3>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${statusConfig.bg} ${statusConfig.color}`}
            >
              <StatusIcon className='h-3 w-3' />
              {statusConfig.label}
            </span>
          </div>

          <div className='flex items-center gap-3 text-xs text-gray-500'>
            {doc.contractor_name && (
              <span className='flex items-center gap-1'>
                <User className='h-3 w-3' />
                {doc.contractor_name}
              </span>
            )}
            {doc.job_title && (
              <span className='flex items-center gap-1'>
                <Building2 className='h-3 w-3' />
                {doc.job_title}
              </span>
            )}
            <span className='flex items-center gap-1'>
              <CalendarDays className='h-3 w-3' />
              {formatRelative(doc.created_at)}
            </span>
          </div>

          {doc.type === 'bid' && doc.message && (
            <p className='text-xs text-gray-400 mt-1 line-clamp-1 italic'>
              &ldquo;{doc.message}&rdquo;
            </p>
          )}

          {doc.type === 'contract' &&
            doc.status !== 'accepted' &&
            doc.status !== 'rejected' && (
              <div className='flex items-center gap-3 mt-1.5'>
                <SignaturePill label='You' signed={!!doc.homeowner_signed} />
                <SignaturePill
                  label='Contractor'
                  signed={!!doc.contractor_signed}
                />
              </div>
            )}
        </div>

        <div className='flex items-center gap-3 flex-shrink-0'>
          {doc.amount != null && doc.amount > 0 && (
            <div className='text-right'>
              <div className='flex items-center gap-1 text-base font-bold text-gray-900'>
                <PoundSterling className='h-3.5 w-3.5 text-gray-400' />
                {doc.amount.toLocaleString('en-GB', {
                  minimumFractionDigits: 2,
                })}
              </div>
              <div className='text-[10px] text-gray-400 uppercase tracking-wider font-medium'>
                {doc.type === 'payment' ? 'Paid' : 'Amount'}
              </div>
            </div>
          )}
          <ChevronRight className='h-4 w-4 text-gray-300 group-hover:text-indigo-500 transition-colors' />
        </div>
      </div>
    </Link>
  );
}
