'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { theme } from '@/lib/theme';
import { Card } from '@/components/ui/Card.unified';
import { Button } from '@/components/ui';

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

interface ReconciliationStats {
  total_transactions: number;
  mismatches_found: number;
  unresolved_count: number;
  last_run: string | null;
}

/**
 * Admin Reconciliation Dashboard (Issue 61)
 * Shows payment reconciliation status and flagged discrepancies.
 */
export default function ReconciliationDashboard() {
  const [records, setRecords] = useState<ReconciliationRecord[]>([]);
  const [stats, setStats] = useState<ReconciliationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unresolved'>('unresolved');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/reconciliation');
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
        setStats(data.stats || null);
      }
    } catch {
      // Silently fail — will show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const runReconciliation = async () => {
    setRunning(true);
    try {
      await fetch('/api/cron/payment-reconciliation', {
        headers: { 'x-cron-secret': 'manual-trigger' },
      });
      await fetchData();
    } finally {
      setRunning(false);
    }
  };

  const filteredRecords = filter === 'unresolved'
    ? records.filter(r => !r.resolved)
    : records;

  const getMismatchBadge = (type: string) => {
    const colors = {
      status: { bg: '#fef3c7', text: '#92400e', label: 'Status Mismatch' },
      amount: { bg: '#fee2e2', text: '#991b1b', label: 'Amount Mismatch' },
      missing: { bg: '#fce7f3', text: '#9d174d', label: 'Missing in Stripe' },
    };
    const c = colors[type as keyof typeof colors] || colors.status;
    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 600,
        backgroundColor: c.bg,
        color: c.text,
      }}>
        {c.label}
      </span>
    );
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: theme.spacing[6] }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[6] }}>
        <div>
          <h1 style={{ fontSize: theme.typography.fontSize['2xl'], fontWeight: 700, color: theme.colors.text }}>
            Payment Reconciliation
          </h1>
          <p style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary, marginTop: 4 }}>
            Compare local payment records against Stripe to detect discrepancies.
          </p>
        </div>
        <Button
          onClick={runReconciliation}
          disabled={running}
          variant="primary"
        >
          {running ? 'Running...' : 'Run Reconciliation'}
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: theme.spacing[4], marginBottom: theme.spacing[6] }}>
          <Card>
            <div style={{ padding: theme.spacing[4] }}>
              <div style={{ fontSize: 12, color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Transactions
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: theme.colors.text, marginTop: 4 }}>
                {stats.total_transactions}
              </div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: theme.spacing[4] }}>
              <div style={{ fontSize: 12, color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Mismatches Found
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: stats.mismatches_found > 0 ? '#dc2626' : theme.colors.text, marginTop: 4 }}>
                {stats.mismatches_found}
              </div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: theme.spacing[4] }}>
              <div style={{ fontSize: 12, color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Unresolved
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: stats.unresolved_count > 0 ? '#ca8a04' : '#16a34a', marginTop: 4 }}>
                {stats.unresolved_count}
              </div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: theme.spacing[4] }}>
              <div style={{ fontSize: 12, color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Last Run
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: theme.colors.text, marginTop: 8 }}>
                {stats.last_run ? new Date(stats.last_run).toLocaleString() : 'Never'}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: theme.spacing[2], marginBottom: theme.spacing[4] }}>
        {(['unresolved', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 16px',
              borderRadius: 8,
              border: '1px solid',
              borderColor: filter === f ? theme.colors.primary : theme.colors.border,
              backgroundColor: filter === f ? theme.colors.primary : 'white',
              color: filter === f ? 'white' : theme.colors.text,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {f === 'unresolved' ? 'Unresolved' : 'All Records'}
          </button>
        ))}
      </div>

      {/* Records Table */}
      <Card>
        {loading ? (
          <div style={{ padding: theme.spacing[8], display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 32, height: 32, border: '4px solid #d1d5db', borderTopColor: '#4b5563', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div style={{ padding: theme.spacing[8], textAlign: 'center', color: theme.colors.textSecondary }}>
            {filter === 'unresolved'
              ? 'No unresolved discrepancies. All payments are reconciled.'
              : 'No reconciliation records found. Run a reconciliation check.'
            }
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${theme.colors.border}` }}>
                  {['Payment Intent', 'Amount', 'Local Status', 'Stripe Status', 'Mismatch', 'Flagged', 'Status'].map(h => (
                    <th key={h} style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: 11,
                      fontWeight: 600,
                      color: theme.colors.textSecondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: 'monospace' }}>
                      {record.payment_intent_id.slice(0, 20)}...
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500 }}>
                      &pound;{(record.amount / 100).toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>{record.local_status}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>{record.stripe_status || 'N/A'}</td>
                    <td style={{ padding: '12px 16px' }}>{getMismatchBadge(record.mismatch_type)}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: theme.colors.textSecondary }}>
                      {new Date(record.flagged_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 9999,
                        fontSize: 11,
                        fontWeight: 600,
                        backgroundColor: record.resolved ? '#dcfce7' : '#fef9c3',
                        color: record.resolved ? '#166534' : '#854d0e',
                      }}>
                        {record.resolved ? 'Resolved' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
