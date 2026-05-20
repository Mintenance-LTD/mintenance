'use client';

/**
 * Mint Editorial transaction list — canonical `.card` + `.row` row
 * pattern from homeowner-screens.jsx Payments section. Display-serif
 * amounts (`me-list-amount`), `.badge-ok/warn/mute` status pills,
 * uppercase ink-3 column header, btn-ghost "Receipt" inline action.
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import { formatMoney } from '@/lib/utils/currency';
import { MintEditorialEmptyState } from '@/components/mint-editorial/MintEditorialEmptyState';
import { MintEditorialListSkeleton } from '@/components/mint-editorial/MintEditorialSkeleton';
import { FileText, ShieldCheck } from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  status:
    | 'pending'
    | 'held'
    | 'release_pending'
    | 'released'
    | 'refunded'
    | 'completed';
  type: 'payment' | 'refund' | 'escrow';
  created_at: string;
  updated_at: string;
  job_title?: string;
  job_id?: string;
  contractor_name?: string;
  contractor_id?: string;
  release_reason?: string;
  refund_reason?: string;
  platformFee?: number;
  processingFee?: number;
  subtotal?: number;
}

interface Props {
  transactions: Transaction[];
  loading: boolean;
  filter: string;
  userRole?: string;
  onReleasePayment: (transactionId: string) => void;
  onRequestRefund: (transaction: Transaction) => void;
  onViewReceipt: (transaction: Transaction) => void;
}

function statusBadge(status: string) {
  switch (status) {
    case 'completed':
    case 'released':
      return { label: 'Released', className: 'badge badge-ok' };
    case 'release_pending':
      return { label: 'Releasing', className: 'badge badge-warn' };
    case 'pending':
      return { label: 'Pending', className: 'badge badge-warn' };
    case 'held':
      return { label: 'Held in escrow', className: 'badge badge-info' };
    case 'refunded':
      return { label: 'Refunded', className: 'badge badge-mute' };
    default:
      return { label: status || 'unknown', className: 'badge badge-mute' };
  }
}

export function MintEditorialTransactionList({
  transactions,
  loading,
  filter,
  userRole,
  onReleasePayment,
  onRequestRefund,
  onViewReceipt,
}: Props) {
  const router = useRouter();

  if (loading) {
    return <MintEditorialListSkeleton rowCount={5} />;
  }

  if (transactions.length === 0) {
    return (
      <div className='card'>
        <MintEditorialEmptyState
          icon={FileText}
          title='No transactions yet'
          body={
            filter === 'all'
              ? 'Your payment history will appear here once you accept a bid and fund escrow.'
              : `No ${filter} transactions in the current view.`
          }
        />
      </div>
    );
  }

  return (
    <div className='card'>
      {/* Column header */}
      <div
        className='row'
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--me-line-2)',
          color: 'var(--me-ink-3)',
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        <div style={{ flex: 1 }}>Description</div>
        <div style={{ width: 120 }}>Date</div>
        <div style={{ width: 110, textAlign: 'right' }}>Amount</div>
        <div style={{ width: 140, textAlign: 'right' }}>Status</div>
        <div style={{ width: 140, textAlign: 'right' }}>Actions</div>
      </div>

      {transactions.map((tx, i) => {
        const badge = statusBadge(tx.status);
        const isLast = i === transactions.length - 1;
        return (
          <div
            key={tx.id}
            role='button'
            tabIndex={0}
            onClick={() => router.push(`/payments/${tx.id}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') router.push(`/payments/${tx.id}`);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 20px',
              borderBottom: isLast ? 'none' : '1px solid var(--me-line-2)',
              cursor: 'pointer',
            }}
          >
            {/* Description */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                minWidth: 0,
              }}
            >
              <span
                className='avatar avatar-md'
                style={{
                  background: 'var(--me-brand-soft)',
                  color: 'var(--me-brand)',
                }}
              >
                <ShieldCheck size={16} strokeWidth={1.75} />
              </span>
              <div className='col' style={{ gap: 2, minWidth: 0 }}>
                <h3 className='t-h4'>{tx.job_title || 'Payment'}</h3>
                {tx.contractor_name ? (
                  <div className='t-meta'>{tx.contractor_name}</div>
                ) : null}
              </div>
            </div>

            {/* Date */}
            <div className='t-meta' style={{ width: 120 }}>
              {new Date(tx.created_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </div>

            {/* Amount */}
            <div
              className='me-list-amount'
              style={{ width: 110, textAlign: 'right', fontSize: 18 }}
            >
              {formatMoney(tx.amount, 'GBP')}
              {tx.platformFee && tx.platformFee > 0 ? (
                <div className='t-meta' style={{ fontWeight: 400 }}>
                  {formatMoney(tx.platformFee, 'GBP')} fee
                </div>
              ) : null}
            </div>

            {/* Status */}
            <div style={{ width: 140, textAlign: 'right' }}>
              <span className={badge.className}>{badge.label}</span>
            </div>

            {/* Actions */}
            <div
              className='row'
              style={{ width: 140, gap: 6, justifyContent: 'flex-end' }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              role='presentation'
            >
              {tx.status === 'held' && userRole === 'homeowner' ? (
                <>
                  <button
                    type='button'
                    className='btn btn-primary btn-sm'
                    onClick={(e) => {
                      e.stopPropagation();
                      onReleasePayment(tx.id);
                    }}
                  >
                    Release
                  </button>
                  <button
                    type='button'
                    className='btn btn-secondary btn-sm'
                    onClick={(e) => {
                      e.stopPropagation();
                      onRequestRefund(tx);
                    }}
                  >
                    Refund
                  </button>
                </>
              ) : (
                <button
                  type='button'
                  className='btn btn-ghost btn-sm'
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewReceipt(tx);
                  }}
                >
                  Receipt
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
