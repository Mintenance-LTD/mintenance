'use client';

import React from 'react';
import Link from 'next/link';
import { theme } from '@/lib/theme';
import { Card } from '@/components/ui/Card.unified';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import type { EscrowRecord } from './RefundManagementClient';

interface EscrowTableProps {
  escrows: EscrowRecord[];
  loading: boolean;
  onRelease: (escrow: EscrowRecord) => void;
  onRefund: (escrow: EscrowRecord) => void;
  onHold: (escrow: EscrowRecord) => void;
}

const STATUS_COLORS: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  held: { bg: '#fef3c7', text: '#92400e', label: 'Held' },
  release_pending: { bg: '#dbeafe', text: '#1e40af', label: 'Pending Release' },
  released: { bg: '#dcfce7', text: '#166534', label: 'Released' },
  completed: { bg: '#dcfce7', text: '#166534', label: 'Completed' },
  refunded: { bg: '#ede9fe', text: '#5b21b6', label: 'Refunded' },
  failed: { bg: '#fee2e2', text: '#991b1b', label: 'Failed' },
  pending: { bg: '#f3f4f6', text: '#374151', label: 'Pending' },
  pending_review: { bg: '#fef3c7', text: '#92400e', label: 'Under Review' },
  awaiting_homeowner_approval: {
    bg: '#fef3c7',
    text: '#92400e',
    label: 'Awaiting Approval',
  },
  cancelled: { bg: '#f3f4f6', text: '#6b7280', label: 'Cancelled' },
};

const COLUMN_HEADERS = [
  'Job Title',
  'Homeowner',
  'Contractor',
  'Amount',
  'Status',
  'Created',
  'Actions',
];

const TH_STYLE: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const TD_STYLE: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: 13,
};

function formatName(
  profile: { first_name: string; last_name: string } | null
): string {
  if (!profile) return 'N/A';
  return `${profile.first_name} ${profile.last_name}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

/** Returns true if the escrow can be released by admin */
function canRelease(status: string): boolean {
  return ['held', 'pending_review', 'awaiting_homeowner_approval'].includes(
    status
  );
}

/** Returns true if the escrow can be refunded by admin */
function canRefund(status: string): boolean {
  return ['held', 'pending_review', 'awaiting_homeowner_approval'].includes(
    status
  );
}

/** Returns true if the escrow can be placed on hold by admin */
function canHold(status: string): boolean {
  return ['held', 'release_pending', 'awaiting_homeowner_approval'].includes(
    status
  );
}

export function EscrowTable({
  escrows,
  loading,
  onRelease,
  onRefund,
  onHold,
}: EscrowTableProps) {
  if (loading) {
    return (
      <Card>
        <div
          style={{
            padding: theme.spacing[8],
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              border: '4px solid #d1d5db',
              borderTopColor: '#4b5563',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      </Card>
    );
  }

  if (escrows.length === 0) {
    return (
      <Card>
        <div
          style={{
            padding: '64px 16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <Icon name='checkCircle' size={32} color='#94a3b8' />
          </div>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: theme.colors.text,
              marginBottom: 4,
            }}
          >
            No Escrow Transactions
          </h3>
          <p
            style={{
              fontSize: 14,
              color: theme.colors.textSecondary,
              maxWidth: 384,
            }}
          >
            No escrow transactions match the current filters.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${theme.colors.border}` }}>
              {COLUMN_HEADERS.map((h) => (
                <th
                  key={h}
                  style={{ ...TH_STYLE, color: theme.colors.textSecondary }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {escrows.map((escrow) => {
              const statusInfo =
                STATUS_COLORS[escrow.status] || STATUS_COLORS.pending;
              return (
                <tr
                  key={escrow.id}
                  style={{
                    borderBottom: `1px solid ${theme.colors.border}`,
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      theme.colors.backgroundSecondary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <td style={TD_STYLE}>
                    <Link
                      href={`/jobs/${escrow.jobs.id}`}
                      style={{
                        color: theme.colors.primary,
                        textDecoration: 'none',
                        fontWeight: 500,
                      }}
                    >
                      {escrow.jobs.title}
                    </Link>
                  </td>
                  <td style={TD_STYLE}>{formatName(escrow.jobs.homeowner)}</td>
                  <td style={TD_STYLE}>{formatName(escrow.jobs.contractor)}</td>
                  <td style={{ ...TD_STYLE, fontWeight: 600 }}>
                    {formatCurrency(escrow.amount)}
                  </td>
                  <td style={TD_STYLE}>
                    <span
                      style={{
                        padding: '2px 10px',
                        borderRadius: 9999,
                        fontSize: 11,
                        fontWeight: 600,
                        backgroundColor: statusInfo.bg,
                        color: statusInfo.text,
                      }}
                    >
                      {statusInfo.label}
                    </span>
                  </td>
                  <td
                    style={{
                      ...TD_STYLE,
                      color: theme.colors.textSecondary,
                      fontSize: 12,
                    }}
                  >
                    {formatDate(escrow.created_at)}
                  </td>
                  <td style={TD_STYLE}>
                    <div
                      style={{
                        display: 'flex',
                        gap: theme.spacing[2],
                        flexWrap: 'wrap',
                      }}
                    >
                      {canRelease(escrow.status) && (
                        <Button
                          size='sm'
                          variant='primary'
                          onClick={() => onRelease(escrow)}
                          aria-label={`Release payment for ${escrow.jobs.title}`}
                          style={{ fontSize: 12 }}
                        >
                          <Icon name='unlock' size={14} /> Release
                        </Button>
                      )}
                      {canRefund(escrow.status) && (
                        <Button
                          size='sm'
                          variant='secondary'
                          onClick={() => onRefund(escrow)}
                          aria-label={`Refund payment for ${escrow.jobs.title}`}
                          style={{ fontSize: 12 }}
                        >
                          <Icon name='undo' size={14} /> Refund
                        </Button>
                      )}
                      {canHold(escrow.status) && (
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => onHold(escrow)}
                          aria-label={`Place hold on payment for ${escrow.jobs.title}`}
                          style={{ fontSize: 12 }}
                        >
                          <Icon name='pause' size={14} /> Hold
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
