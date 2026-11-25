'use client';

import Link from 'next/link';
import {
  disputeReviewStatus,
  DISPUTED_PAYMENT_LABEL,
} from '@/lib/admin/dispute-display';

export interface Dispute {
  resolution?: {
    id: string;
    decision: Resolution;
    reason: string;
    state: 'processing' | 'completed';
    refund_minor: number;
    release_minor: number;
  } | null;
  id: string;
  jobId: string;
  jobTitle: string;
  jobStatus: string;
  jobCategory: string | null;
  homeownerId: string;
  homeownerName: string;
  homeownerEmail: string;
  contractorId: string;
  contractorName: string;
  contractorEmail: string;
  amount: number;
  escrowStatus: string;
  adminHoldStatus: string;
  holdReason: string | null;
  assignedAdmin?: string | null;
  slaDeadline?: string | null;
  caseStatus?: string | null;
  homeownerApproval: boolean;
  photoVerificationStatus: string | null;
  coolingOffEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Stats {
  open: number;
  reviewing: number;
  resolved: number;
  totalAmountAtRisk: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type StatusFilter =
  | 'all'
  | 'active'
  | 'overdue'
  | 'open'
  | 'reviewing'
  | 'resolved';
export type Resolution = 'refund_homeowner' | 'pay_contractor' | 'split_50_50';

// ── Helpers ─────────────────────────────────────────────────────────

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(
    amount
  );

const day = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeZone: 'Europe/London',
});
const cell = 'px-4 py-3 text-left align-middle';

export function DisputesTable({ disputes }: { disputes: Dispute[] }) {
  return (
    <div
      className='overflow-x-auto'
      tabIndex={0}
      role='region'
      aria-label='Dispute queue'
    >
      <table
        className='w-full min-w-[44rem] text-sm'
        aria-label='Disputes table'
      >
        <thead className='bg-slate-50 text-slate-700'>
          <tr>
            {[
              'Case',
              'Review status',
              'Decision due',
              'Payment',
              'Next action owner',
              'Action',
            ].map((heading) => (
              <th key={heading} scope='col' className={cell}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {disputes.map((dispute) => {
            const review = disputeReviewStatus(
              dispute.caseStatus === 'closed'
                ? 'closed'
                : dispute.adminHoldStatus,
              dispute.caseStatus === 'closed' ? null : dispute.slaDeadline
            );
            return (
              <tr
                key={dispute.id}
                className='border-t border-slate-200 hover:bg-slate-50'
              >
                <th scope='row' className={cell + ' w-[29%] font-semibold'}>
                  {dispute.jobTitle}
                  {dispute.jobId && (
                    <span className='mt-1 block text-xs font-normal text-slate-600'>
                      Job {dispute.jobId.slice(0, 8)}
                    </span>
                  )}
                </th>
                <td className={cell}>
                  <span
                    className={
                      review.overdue ? 'font-semibold text-red-800' : ''
                    }
                  >
                    {review.label}
                  </span>
                </td>
                <td className={cell + ' whitespace-nowrap'}>
                  {review.active && dispute.slaDeadline ? (
                    <time dateTime={dispute.slaDeadline}>
                      {day.format(new Date(dispute.slaDeadline))}
                    </time>
                  ) : (
                    'No target'
                  )}
                </td>
                <td className={cell}>
                  <span className='block whitespace-nowrap font-semibold'>
                    {formatCurrency(dispute.amount)}
                  </span>
                  <span className='text-xs text-slate-600'>
                    {dispute.escrowStatus === 'disputed'
                      ? DISPUTED_PAYMENT_LABEL
                      : dispute.escrowStatus.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className={cell}>
                  {dispute.assignedAdmin ??
                    (review.active ? 'Admin team · unassigned' : '—')}
                </td>
                <td className={cell + ' whitespace-nowrap'}>
                  <Link
                    className='font-semibold underline'
                    href={`/admin/disputes/${dispute.id}`}
                    aria-label={`Open case for ${dispute.jobTitle}`}
                  >
                    Open case
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
