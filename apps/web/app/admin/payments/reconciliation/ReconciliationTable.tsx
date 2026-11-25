'use client';

import React from 'react';
import Link from 'next/link';
import { DISPUTED_PAYMENT_LABEL } from '@/lib/admin/dispute-display';
import { CheckCircle, FileSearch } from 'lucide-react';
import { theme } from '@/lib/admin-theme';
import { Card } from '@/components/ui/Card.unified';

export interface ReconciliationRecord {
  id: string;
  payment_intent_id: string;
  job_id: string | null;
  job_title: string | null;
  has_case: boolean;
  last_checked_at: string | null;
  amount: number;
  local_status: string;
  stripe_status: string | null;
  mismatch_type: 'status' | 'amount' | 'missing';
  flagged_at: string;
  resolved: boolean;
}

interface ReconciliationTableProps {
  records: ReconciliationRecord[];
  loading: boolean;
  filter: 'all' | 'unresolved';
  searching?: boolean;
}

function getMismatchBadge(type: string) {
  const colors = {
    status: { bg: '#fef3c7', text: '#92400e', label: 'Status Mismatch' },
    amount: { bg: '#fee2e2', text: '#991b1b', label: 'Amount Mismatch' },
    missing: { bg: '#fce7f3', text: '#9d174d', label: 'Missing in Stripe' },
  };
  const c = colors[type as keyof typeof colors] || colors.status;
  return (
    <span
      style={{
        padding: '2px 8px',
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 600,
        backgroundColor: c.bg,
        color: c.text,
      }}
    >
      {c.label}
    </span>
  );
}

export function ReconciliationTable({
  records,
  loading,
  filter,
  searching,
}: ReconciliationTableProps) {
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

  if (records.length === 0) {
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
          {searching ? (
            <p role='status'>No reconciliation records match this job search.</p>
          ) : filter === 'unresolved' ? (
            <>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  backgroundColor: '#f0fdf4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <CheckCircle className='w-8 h-8' style={{ color: '#22c55e' }} />
              </div>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: theme.colors.text,
                  marginBottom: 4,
                }}
              >
                No unresolved discrepancies
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: theme.colors.textSecondary,
                  maxWidth: 384,
                }}
              >
                There are no open discrepancies in the reconciliation results.
              </p>
            </>
          ) : (
            <>
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
                <FileSearch className='w-8 h-8' style={{ color: '#94a3b8' }} />
              </div>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: theme.colors.text,
                  marginBottom: 4,
                }}
              >
                No Records Found
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: theme.colors.textSecondary,
                  maxWidth: 384,
                }}
              >
                Run a reconciliation check to compare local payment records
                against Stripe.
              </p>
            </>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr
              style={{
                borderBottom: `2px solid ${theme.colors.border}`,
              }}
            >
              {[
                'Job and payment',
                'Amount',
                'Local Status',
                'Stripe Status',
                'Mismatch',
                'Last checked',
                'Status',
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 600,
                    color: theme.colors.textSecondary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr
                key={record.id}
                style={{
                  borderBottom: `1px solid ${theme.colors.border}`,
                }}
              >
                <td
                  style={{
                    padding: '12px 16px',
                    fontSize: 13,
                    fontFamily: 'monospace',
                  }}
                >
                  {record.job_id && (
                    <Link className='block font-sans font-semibold underline' href={'/admin/jobs/' + record.job_id}>
                      {record.job_title ?? 'View job'}
                    </Link>
                  )}
                  {record.job_id && <code className='block select-all text-xs'>{record.job_id}</code>}
                  <code className='block select-all text-xs'>{record.payment_intent_id}</code>
                </td>
                <td
                  style={{
                    padding: '12px 16px',
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  &pound;{record.amount.toFixed(2)}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13 }}>
                  {record.local_status === 'disputed' ? DISPUTED_PAYMENT_LABEL : record.local_status}
                  {record.has_case && (
                    <Link className='block underline' href={'/admin/disputes/' + record.id}>View dispute</Link>
                  )}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13 }}>
                  {record.stripe_status || 'N/A'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {getMismatchBadge(record.mismatch_type)}
                </td>
                <td
                  style={{
                    padding: '12px 16px',
                    fontSize: 12,
                    color: theme.colors.textSecondary,
                  }}
                >
                  {record.last_checked_at ? new Date(record.last_checked_at).toLocaleString('en-GB', { timeZone: 'Europe/London' }) : 'Not recorded'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 9999,
                      fontSize: 11,
                      fontWeight: 600,
                      backgroundColor: record.resolved
                        ? '#dcfce7'
                        : theme.colors.status.warning.bg,
                      color: record.resolved
                        ? '#166534'
                        : theme.colors.status.warning.text,
                    }}
                  >
                    {record.resolved ? 'Resolved' : 'Unresolved'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
