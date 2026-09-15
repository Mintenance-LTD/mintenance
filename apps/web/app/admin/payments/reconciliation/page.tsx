'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { theme } from '@/lib/theme';
import { Card } from '@/components/ui/Card.unified';
import { Button } from '@/components/ui';
import { getCsrfHeaders } from '@/lib/csrf-client';
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
  last_run_status: string | null;
  last_run_checked: number | null;
  records_limited: boolean;
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
  const [error, setError] = useState<string | null>(null);
  const [runNotice, setRunNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unresolved'>('unresolved');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/reconciliation');
      if (!res.ok)
        throw new Error(
          'Reconciliation records could not be loaded. Please retry.'
        );
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
        setStats(data.stats || null);
      }
    } catch {
      setError('Reconciliation records could not be loaded. Please retry.');
      setStats(null);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const runReconciliation = async () => {
    setRunning(true);
    setRunNotice(null);
    try {
      const csrfHeaders = await getCsrfHeaders();
      const response = await fetch('/api/admin/reconciliation', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
      });
      if (!response.ok)
        throw new Error(
          'Reconciliation did not complete successfully. Please retry.'
        );
      const result = await response.json();
      setRunNotice(
        `Batch checked ${result.checked} payments. Scheduled runs continue through the remaining payments.`
      );
      await fetchData();
    } catch {
      setError('Reconciliation did not complete successfully. Please retry.');
    } finally {
      setRunning(false);
    }
  };

  const filteredRecords =
    filter === 'unresolved' ? records.filter((r) => !r.resolved) : records;

  return (
    <div className='min-h-screen bg-[#f7f9fb] px-6 md:px-10 py-8 max-w-[1440px] mx-auto space-y-8'>
      {/* Page Header */}
      <div className='flex justify-between items-end'>
        <div>
          <nav className='flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-[#566166] mb-3'>
            <span>Revenue</span>
            <span className='text-[#a9b4b9]'>/</span>
            <span className='text-[#565e74]'>Payment Reconciliation</span>
          </nav>
          <h2 className='text-[2.75rem] font-extrabold tracking-tight text-[#2a3439] leading-tight'>
            Stripe Reconciliation
          </h2>
          <p className='text-[#566166] max-w-xl mt-2'>
            Compare internal ledger records against Stripe API data to identify
            discrepancies.
          </p>
        </div>
        <Button
          onClick={runReconciliation}
          disabled={running}
          variant='primary'
          className='bg-[#565e74] hover:bg-[#4a5268] text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-[#565e74]/20 transition-all'
        >
          {running ? 'Running...' : 'Run Reconciliation Batch'}
        </Button>
      </div>

      {error && (
        <div role='alert'>
          {error}
          <Button onClick={fetchData} disabled={loading}>
            Retry loading records
          </Button>
        </div>
      )}
      {runNotice && <p role='status'>{runNotice}</p>}
      {stats?.records_limited && (
        <p>Showing the latest 100 flagged records. Older records may exist.</p>
      )}
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
                Flagged Records in View
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
                Unresolved in View
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
                Last Run Started
              </div>
              {stats.last_run ? (
                <div style={{ marginTop: 8 }}>
                  <p>
                    {stats.last_run_status === 'running'
                      ? 'Started; completion not confirmed'
                      : stats.last_run_status === 'failed'
                        ? 'Run needs retry'
                        : 'Batch completed'}{' '}
                    ({stats.last_run_checked ?? 0} checked)
                  </p>
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
                      Run a reconciliation batch to start
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
      {!error && (
        <ReconciliationTable
          records={filteredRecords}
          loading={loading}
          filter={filter}
        />
      )}
    </div>
  );
}
