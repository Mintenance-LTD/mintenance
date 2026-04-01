'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

// ── Types ───────────────────────────────────────────────────────────

export interface Dispute {
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

export type StatusFilter = 'all' | 'open' | 'reviewing' | 'resolved';
export type Resolution = 'refund_homeowner' | 'pay_contractor' | 'split_50_50';

// ── Helpers ─────────────────────────────────────────────────────────

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(
    amount
  );

export const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

export function getStatusBadge(status: string): {
  label: string;
  bg: string;
  text: string;
} {
  switch (status) {
    case 'pending_review':
      return { label: 'Open', bg: '#FEF3C7', text: '#92400E' };
    case 'admin_hold':
      return { label: 'In Review', bg: '#DBEAFE', text: '#1E40AF' };
    case 'released':
      return { label: 'Resolved', bg: '#D1FAE5', text: '#065F46' };
    default:
      return {
        label: status.replace(/_/g, ' '),
        bg: '#F1F5F9',
        text: '#475569',
      };
  }
}

// ── Table Styles ────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: `${theme.spacing[4]} ${theme.spacing[4]}`,
  textAlign: 'left',
  fontSize: '11px',
  fontWeight: 600,
  color: '#64748B',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '2px solid #E2E8F0',
  backgroundColor: '#F8FAFC',
};

const tdStyle: React.CSSProperties = {
  padding: `0 ${theme.spacing[4]}`,
  verticalAlign: 'middle',
};

// ── Component ───────────────────────────────────────────────────────

interface DisputesTableProps {
  disputes: Dispute[];
  actionLoading: boolean;
  onHoldForReview: (dispute: Dispute) => void;
  onResolve: (dispute: Dispute) => void;
}

export function DisputesTable({
  disputes,
  actionLoading,
  onHoldForReview,
  onResolve,
}: DisputesTableProps) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}
        aria-label='Disputes table'
      >
        <caption className='sr-only'>
          Escrow disputes requiring admin review and resolution
        </caption>
        <thead>
          <tr>
            <th scope='col' style={thStyle}>
              Job
            </th>
            <th scope='col' style={thStyle}>
              Homeowner
            </th>
            <th scope='col' style={thStyle}>
              Contractor
            </th>
            <th scope='col' style={thStyle}>
              Amount
            </th>
            <th scope='col' style={thStyle}>
              Status
            </th>
            <th scope='col' style={thStyle}>
              Reason
            </th>
            <th scope='col' style={thStyle}>
              Date
            </th>
            <th scope='col' style={{ ...thStyle, textAlign: 'right' }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {disputes.map((dispute, index) => {
            const badge = getStatusBadge(dispute.adminHoldStatus);
            const isEvenRow = index % 2 === 0;

            return (
              <tr
                key={dispute.id}
                style={{
                  height: '72px',
                  transition: 'all 0.2s ease',
                  backgroundColor: isEvenRow ? '#FFFFFF' : '#F8FAFC',
                  borderBottom:
                    index < disputes.length - 1 ? '1px solid #E2E8F0' : 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F1F5F9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isEvenRow
                    ? '#FFFFFF'
                    : '#F8FAFC';
                }}
              >
                <td style={tdStyle}>
                  <div>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#0F172A',
                        marginBottom: 2,
                      }}
                    >
                      {dispute.jobTitle}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                      ID: {dispute.jobId?.substring(0, 8)}...
                    </div>
                  </div>
                </td>
                <td style={tdStyle}>
                  <div style={{ fontSize: '14px', color: '#0F172A' }}>
                    {dispute.homeownerName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>
                    {dispute.homeownerEmail}
                  </div>
                </td>
                <td style={tdStyle}>
                  <div style={{ fontSize: '14px', color: '#0F172A' }}>
                    {dispute.contractorName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>
                    {dispute.contractorEmail}
                  </div>
                </td>
                <td style={tdStyle}>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#0F172A',
                    }}
                  >
                    {formatCurrency(dispute.amount)}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: badge.bg,
                      color: badge.text,
                    }}
                  >
                    {badge.label}
                  </span>
                </td>
                <td style={tdStyle}>
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#475569',
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={dispute.holdReason ?? ''}
                  >
                    {dispute.holdReason || 'No reason provided'}
                  </div>
                </td>
                <td style={tdStyle}>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>
                    {formatDate(dispute.updatedAt || dispute.createdAt)}
                  </span>
                </td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  <div
                    style={{
                      display: 'flex',
                      gap: theme.spacing[1],
                      justifyContent: 'flex-end',
                    }}
                  >
                    {dispute.adminHoldStatus === 'pending_review' && (
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => onHoldForReview(dispute)}
                        disabled={actionLoading}
                        style={{ fontSize: '13px' }}
                        aria-label={`Hold dispute for ${dispute.jobTitle} for review`}
                      >
                        <Icon name='search' size={14} /> Review
                      </Button>
                    )}
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => onResolve(dispute)}
                      disabled={actionLoading}
                      style={{ fontSize: '13px' }}
                      aria-label={`Resolve dispute for ${dispute.jobTitle}`}
                    >
                      <Icon name='checkCircle' size={14} /> Resolve
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
