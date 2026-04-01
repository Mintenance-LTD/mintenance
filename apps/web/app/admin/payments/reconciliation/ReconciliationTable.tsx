'use client';

import React from 'react';
import { CheckCircle, FileSearch } from 'lucide-react';
import { theme } from '@/lib/theme';
import { Card } from '@/components/ui/Card.unified';

interface ReconciliationRecord {
  id: string;
  payment_intent_id: string;
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
          {filter === 'unresolved' ? (
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
                All Payments Reconciled
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: theme.colors.textSecondary,
                  maxWidth: 384,
                }}
              >
                No discrepancies found between local records and Stripe.
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
                'Payment Intent',
                'Amount',
                'Local Status',
                'Stripe Status',
                'Mismatch',
                'Flagged',
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
                  {record.payment_intent_id.slice(0, 20)}...
                </td>
                <td
                  style={{
                    padding: '12px 16px',
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  &pound;{(record.amount / 100).toFixed(2)}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13 }}>
                  {record.local_status}
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
                  {new Date(record.flagged_at).toLocaleDateString()}
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
                    {record.resolved ? 'Resolved' : 'Pending'}
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
