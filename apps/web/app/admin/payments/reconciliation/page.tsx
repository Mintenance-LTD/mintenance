'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { theme } from '@/lib/theme';
import { Card } from '@/components/ui/Card.unified';
import { Button } from '@/components/ui';
import { ReconciliationTable } from './ReconciliationTable';

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

  const filteredRecords =
    filter === 'unresolved' ? records.filter((r) => !r.resolved) : records;

  return (
    <div
      style={{ maxWidth: 1440, margin: '0 auto', padding: theme.spacing[6] }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing[6],
        }}
      >
        <div>
          <h1
            style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: 700,
              color: theme.colors.text,
            }}
          >
            Payment Reconciliation
          </h1>
          <p
            style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              marginTop: 4,
            }}
          >
            Compare local payment records against Stripe to detect
            discrepancies.
          </p>
        </div>
        <Button
          onClick={runReconciliation}
          disabled={running}
          variant='primary'
        >
          {running ? 'Running...' : 'Run Reconciliation'}
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: theme.spacing[4],
            marginBottom: theme.spacing[6],
          }}
        >
          <Card>
            <div style={{ padding: theme.spacing[4] }}>
              <div
                style={{
                  fontSize: 12,
                  color: theme.colors.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Total Transactions
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: theme.colors.text,
                  marginTop: 4,
                }}
              >
                {stats.total_transactions}
              </div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: theme.spacing[4] }}>
              <div
                style={{
                  fontSize: 12,
                  color: theme.colors.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Mismatches Found
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color:
                    stats.mismatches_found > 0 ? '#dc2626' : theme.colors.text,
                  marginTop: 4,
                }}
              >
                {stats.mismatches_found}
              </div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: theme.spacing[4] }}>
              <div
                style={{
                  fontSize: 12,
                  color: theme.colors.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Unresolved
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: stats.unresolved_count > 0 ? '#ca8a04' : '#16a34a',
                  marginTop: 4,
                }}
              >
                {stats.unresolved_count}
              </div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: theme.spacing[4] }}>
              <div
                style={{
                  fontSize: 12,
                  color: theme.colors.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Last Run
              </div>
              {stats.last_run ? (
                <div style={{ marginTop: 8 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: theme.colors.text,
                    }}
                  >
                    {new Date(stats.last_run).toLocaleString()}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: theme.colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    {formatDistanceToNow(new Date(stats.last_run), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    marginTop: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Clock className='w-4 h-4' style={{ color: '#d97706' }} />
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: '#d97706',
                      }}
                    >
                      Not yet run
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: theme.colors.textSecondary,
                        marginTop: 2,
                      }}
                    >
                      Click &apos;Run Reconciliation&apos; to start
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: theme.spacing[2],
          marginBottom: theme.spacing[4],
        }}
      >
        {(['unresolved', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-label={`Filter ${f === 'unresolved' ? 'unresolved records' : 'all records'}`}
            aria-pressed={filter === f}
            style={{
              padding: '6px 16px',
              borderRadius: 8,
              border: '1px solid',
              borderColor:
                filter === f ? theme.colors.primary : theme.colors.border,
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
      <ReconciliationTable
        records={filteredRecords}
        loading={loading}
        filter={filter}
      />
    </div>
  );
}
