/**
 * Mint Editorial "Payments & escrow" surface — canonical from
 * design-system/project/redesign-v2/homeowner-screens.jsx lines 492-554.
 *
 * Single page with one combined escrow ledger table. The 3-section
 * stacked card layout the audit flagged is gone — Subscriptions and
 * Invoices stay accessible as smaller secondary cards below the main
 * ledger so the homeowner's recurring billing context isn't lost,
 * but the page's primary focus is now the escrow ledger as in the
 * canonical mock.
 *
 * Data comes from `page.tsx` (server-fetched and aggregated). Same
 * source of truth as the legacy view; only presentation differs.
 */
import Link from 'next/link';
import { FileText, Shield, Check } from 'lucide-react';
import { formatMoney } from '@/lib/utils/currency';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import type { FinancialsPaymentRow } from './components/RecentPaymentsList';

export type { FinancialsPaymentRow };

export interface FinancialsSubscriptionRow {
  id: string;
  name?: string | null;
  status?: string | null;
  amount?: number | null;
  next_billing_date?: string | null;
}

export interface FinancialsInvoiceRow {
  id: string;
  invoice_number: string;
  title?: string;
  total_amount: number;
  status: string;
  invoice_date?: string | null;
  issue_date?: string | null;
  due_date: string;
  contractor?:
    | { first_name?: string; last_name?: string }
    | Array<{ first_name?: string; last_name?: string }>;
}

export interface FinancialsStats {
  totalSpent: number;
  spentCount: number;
  pendingPayments: number;
  overduePayments: number;
  activeSubscriptions: number;
  overdueSubscriptions: number;
  totalBudget: number;
  jobCount: number;
  pendingInvoices: number;
  overdueInvoices: number;
}

interface Props {
  stats: FinancialsStats;
  subscriptions: FinancialsSubscriptionRow[];
  invoices: FinancialsInvoiceRow[];
  payments: FinancialsPaymentRow[];
}

const fmtDate = (raw?: string | null): string => {
  if (!raw) return 'N/A';
  return new Date(raw).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const HELD_STATUSES = new Set(['held', 'release_pending']);
const RELEASED_STATUSES = new Set(['released', 'completed']);

function statusBadge(status: string | null | undefined) {
  const s = (status || '').toLowerCase();
  if (HELD_STATUSES.has(s)) {
    return (
      <span className='badge badge-warn'>
        <Shield size={11} strokeWidth={1.75} /> Held
      </span>
    );
  }
  if (RELEASED_STATUSES.has(s)) {
    return (
      <span className='badge badge-ok'>
        <Check size={11} strokeWidth={1.75} /> Released
      </span>
    );
  }
  if (s === 'pending')
    return <span className='badge badge-mute'>Processing</span>;
  if (s === 'refunded')
    return <span className='badge badge-mute'>Refunded</span>;
  return <span className='badge badge-mute'>{s || 'unknown'}</span>;
}

function deriveCounts(payments: FinancialsPaymentRow[]) {
  let heldTotal = 0;
  let heldCount = 0;
  let releasedThisYear = 0;
  let releasedCount = 0;
  let lifetimeSpentTotal = 0;
  let lifetimeSpentCount = 0;
  const currentYear = new Date().getFullYear();
  for (const p of payments) {
    const status = (p.status || '').toLowerCase();
    const amount = Number(p.amount || 0);
    if (!amount) continue;
    if (HELD_STATUSES.has(status)) {
      heldTotal += amount;
      heldCount += 1;
    }
    if (RELEASED_STATUSES.has(status)) {
      lifetimeSpentTotal += amount;
      lifetimeSpentCount += 1;
      if (p.created_at) {
        const year = new Date(p.created_at).getFullYear();
        if (year === currentYear) {
          releasedThisYear += amount;
          releasedCount += 1;
        }
      }
    }
  }
  // "Avg. job cost" — average of released amounts (only counted-once
  // contractor pay-outs feel like a real job-cost). Falls back to 0
  // when there are no released jobs yet.
  const avgJobCost = lifetimeSpentCount
    ? Math.round(lifetimeSpentTotal / lifetimeSpentCount)
    : 0;
  return {
    heldTotal,
    heldCount,
    releasedThisYear,
    releasedCount,
    lifetimeSpentTotal,
    lifetimeSpentCount,
    avgJobCost,
  };
}

export function MintEditorialFinancials({
  stats,
  subscriptions,
  invoices,
  payments,
}: Props) {
  const derived = deriveCounts(payments);

  // Sort newest first for the ledger.
  const ledger = [...payments].sort((a, b) => {
    const aDate = new Date(a.created_at || 0).getTime();
    const bDate = new Date(b.created_at || 0).getTime();
    return bDate - aDate;
  });

  return (
    <HomeownerPageWrapper>
      <div
        className='between'
        style={{ marginBottom: 22, alignItems: 'flex-start' }}
      >
        <div className='col' style={{ gap: 4 }}>
          <h1 className='t-h1'>Payments & escrow</h1>
          <p className='t-body'>
            Funds you've held for active jobs and what's been released.
          </p>
        </div>
        <Link href='/payments' className='btn btn-secondary btn-sm'>
          <FileText size={13} strokeWidth={1.75} /> Export CSV
        </Link>
      </div>

      {/* KPI row — canonical 4 tiles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 14,
          marginBottom: 22,
        }}
      >
        <div className='kpi'>
          <div className='label'>Held in escrow</div>
          <div className='num'>{formatMoney(derived.heldTotal)}</div>
          <div className='sub'>
            <span>
              {derived.heldCount > 0
                ? `${derived.heldCount} active ${derived.heldCount === 1 ? 'job' : 'jobs'}`
                : 'no active escrow'}
            </span>
          </div>
        </div>
        <div className='kpi'>
          <div className='label'>Released this year</div>
          <div className='num'>{formatMoney(derived.releasedThisYear)}</div>
          <div className='sub'>
            <span>
              {derived.releasedCount > 0
                ? `${derived.releasedCount} ${derived.releasedCount === 1 ? 'job' : 'jobs'} signed off`
                : 'no releases yet'}
            </span>
          </div>
        </div>
        <div className='kpi'>
          <div className='label'>Avg. job cost</div>
          <div className='num'>
            {derived.avgJobCost > 0 ? formatMoney(derived.avgJobCost) : '—'}
          </div>
          <div className='sub'>
            <span>
              {derived.lifetimeSpentCount > 0
                ? `across ${derived.lifetimeSpentCount} ${derived.lifetimeSpentCount === 1 ? 'job' : 'jobs'}`
                : 'awaiting first sign-off'}
            </span>
          </div>
        </div>
        <div className='kpi'>
          <div className='label'>Pending invoices</div>
          <div className='num'>{stats.pendingInvoices}</div>
          <div className='sub'>
            <span>
              {stats.overdueInvoices > 0
                ? `${stats.overdueInvoices} overdue`
                : invoices.length > 0
                  ? `${invoices.length} on file`
                  : 'no invoices yet'}
            </span>
          </div>
        </div>
      </div>

      {/* Ledger — single combined escrow_transactions table */}
      <div className='card' style={{ overflow: 'hidden', marginBottom: 22 }}>
        <div
          className='row me-fin-thead'
          style={{
            padding: '12px 20px',
            background: 'var(--me-bg-2)',
            fontSize: 11,
            color: 'var(--me-ink-3)',
            textTransform: 'uppercase',
            letterSpacing: '.08em',
            fontWeight: 600,
          }}
        >
          <div style={{ flex: 1.6 }}>Job</div>
          <div style={{ flex: 1 }}>Tradesperson</div>
          <div style={{ flex: 1 }}>Date</div>
          <div style={{ flex: 1 }}>Amount</div>
          <div style={{ flex: 1 }}>Status</div>
          <div style={{ width: 80 }} />
        </div>
        {ledger.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center' }}>
            <p className='t-body'>
              No payments yet. When you fund escrow on a job it'll show up here.
            </p>
          </div>
        ) : (
          ledger.map((row, i) => {
            const job = Array.isArray(row.job) ? row.job[0] : row.job;
            return (
              <div
                key={row.id || i}
                className='row me-fin-trow'
                style={{
                  padding: '14px 20px',
                  borderTop: '1px solid var(--me-line-2)',
                  fontSize: 13,
                }}
              >
                <div
                  style={{
                    flex: 1.6,
                    fontWeight: 500,
                    color: 'var(--me-ink)',
                    minWidth: 0,
                  }}
                >
                  {job?.title || 'Payment'}
                </div>
                <div style={{ flex: 1, color: 'var(--me-ink-2)', minWidth: 0 }}>
                  {/* The escrow row doesn't carry the contractor name in
                      the existing shape — the page-level query joins
                      only `job` + `id/title`. Show a — placeholder until
                      the join is extended. */}
                  —
                </div>
                <div style={{ flex: 1, color: 'var(--me-ink-3)' }}>
                  {fmtDate(row.created_at)}
                </div>
                <div
                  style={{
                    flex: 1,
                    fontFamily: 'var(--me-font-display)',
                    fontWeight: 'var(--me-display-weight)' as unknown as number,
                    color: 'var(--me-ink)',
                  }}
                >
                  {formatMoney(Number(row.amount || 0))}
                </div>
                <div style={{ flex: 1 }}>{statusBadge(row.status)}</div>
                <div style={{ width: 80, textAlign: 'right' }}>
                  <Link
                    href={`/payments/${row.id}`}
                    className='btn btn-ghost btn-sm'
                  >
                    Receipt
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Secondary cards — subscriptions + invoices kept accessible
          but visually subordinated to the main escrow ledger.
          Canonical doesn't show these on the page (they're a separate
          surface), but the homeowner data model bundles them with
          financials so we surface them inline rather than redirect. */}
      {subscriptions.length > 0 ? (
        <div className='card' style={{ marginBottom: 18 }}>
          <div
            className='between'
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--me-line-2)',
            }}
          >
            <h2 className='t-h3'>Subscriptions · {subscriptions.length}</h2>
          </div>
          {subscriptions.map((s) => {
            const overdue =
              !!s.next_billing_date &&
              new Date(s.next_billing_date) < new Date() &&
              s.status === 'active';
            return (
              <div
                key={s.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 16,
                  padding: '14px 20px',
                  borderTop: '1px solid var(--me-line-2)',
                  alignItems: 'center',
                }}
              >
                <div className='col' style={{ gap: 4, minWidth: 0 }}>
                  <div className='row' style={{ gap: 8 }}>
                    <h3 className='t-h4'>{s.name || 'Subscription'}</h3>
                    {overdue ? (
                      <span className='badge badge-err'>Overdue</span>
                    ) : s.status === 'active' ? (
                      <span className='badge badge-ok'>Active</span>
                    ) : (
                      <span className='badge badge-mute'>{s.status}</span>
                    )}
                  </div>
                  <div className='t-meta'>
                    Next billing · {fmtDate(s.next_billing_date)}
                  </div>
                </div>
                <div className='me-list-amount' style={{ fontSize: 18 }}>
                  {formatMoney(Number(s.amount || 0))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {invoices.length > 0 ? (
        <div className='card'>
          <div
            className='between'
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--me-line-2)',
            }}
          >
            <h2 className='t-h3'>Invoices · {invoices.length}</h2>
            {stats.pendingInvoices > 0 ? (
              <span className='badge badge-warn'>
                {stats.pendingInvoices} pending
              </span>
            ) : null}
          </div>
          {invoices.map((inv) => {
            const contractor = Array.isArray(inv.contractor)
              ? inv.contractor[0]
              : inv.contractor;
            const name =
              contractor?.first_name && contractor?.last_name
                ? `${contractor.first_name} ${contractor.last_name}`
                : 'Unknown contractor';
            const issued = inv.issue_date || inv.invoice_date;
            return (
              <Link
                key={inv.id}
                href={`/payments?invoice=${inv.id}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 16,
                  padding: '14px 20px',
                  borderTop: '1px solid var(--me-line-2)',
                  alignItems: 'center',
                  color: 'inherit',
                  textDecoration: 'none',
                }}
              >
                <div className='col' style={{ gap: 4, minWidth: 0 }}>
                  <div className='row' style={{ gap: 8, flexWrap: 'wrap' }}>
                    <h3 className='t-h4'>
                      {inv.title || `Invoice ${inv.invoice_number}`}
                    </h3>
                    {inv.status === 'paid' ? (
                      <span className='badge badge-ok'>Paid</span>
                    ) : inv.status === 'overdue' ? (
                      <span className='badge badge-err'>Overdue</span>
                    ) : (
                      <span className='badge badge-warn'>{inv.status}</span>
                    )}
                  </div>
                  <div className='t-meta'>
                    {name} · #{inv.invoice_number} · {fmtDate(issued)}
                  </div>
                </div>
                <div className='me-list-amount' style={{ fontSize: 18 }}>
                  {formatMoney(Number(inv.total_amount || 0))}
                </div>
              </Link>
            );
          })}
        </div>
      ) : null}
    </HomeownerPageWrapper>
  );
}
