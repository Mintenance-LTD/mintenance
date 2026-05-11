/**
 * Mint Editorial /financials surface.
 *
 * Pure presentational layer: page.tsx owns every fetch + every
 * aggregation, and passes the computed stats + lists to this
 * component. Numbers shown here come straight from
 * escrow_transactions / subscriptions / invoices / jobs rows —
 * no proxies, no fake totals. Same source of truth that the
 * legacy view uses; the data layer in page.tsx is shared.
 */
import Link from 'next/link';
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

const formatDateShort = (raw?: string | null): string => {
  if (!raw) return 'N/A';
  return new Date(raw).toLocaleDateString('en-GB', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatRel = (raw?: string | null): string => {
  if (!raw) return '';
  const d = new Date(raw);
  const days = Math.round((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return formatDateShort(raw);
};

function paymentStatusBadge(status: string | null | undefined) {
  const s = (status || '').toLowerCase();
  if (s === 'pending') return <span className='badge badge-warn'>Pending</span>;
  if (s === 'held' || s === 'release_pending')
    return <span className='badge badge-info'>Held in escrow</span>;
  if (s === 'released' || s === 'completed')
    return <span className='badge badge-ok'>Released</span>;
  if (s === 'refunded')
    return <span className='badge badge-mute'>Refunded</span>;
  return <span className='badge badge-mute'>{s || 'unknown'}</span>;
}

function invoiceStatusBadge(status: string) {
  const s = (status || '').toLowerCase();
  if (s === 'paid') return <span className='badge badge-ok'>Paid</span>;
  if (s === 'overdue') return <span className='badge badge-err'>Overdue</span>;
  if (s === 'sent' || s === 'viewed')
    return <span className='badge badge-warn'>Pending</span>;
  return <span className='badge badge-mute'>{s || 'draft'}</span>;
}

function KpiTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className='kpi'>
      <div className='label'>{label}</div>
      <div className='num'>{value}</div>
      {sub ? (
        <div className='sub'>
          <span>{sub}</span>
        </div>
      ) : null}
    </div>
  );
}

function SubscriptionsCard({
  subscriptions,
}: {
  subscriptions: FinancialsSubscriptionRow[];
}) {
  return (
    <div className='card'>
      <div
        className='between'
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--me-line-2)',
        }}
      >
        <h2 className='t-h3'>Subscriptions · {subscriptions.length}</h2>
      </div>
      {subscriptions.length === 0 ? (
        <div style={{ padding: '32px 20px', textAlign: 'center' }}>
          <p className='t-body'>No active subscriptions.</p>
        </div>
      ) : (
        subscriptions.map((s) => {
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
                borderBottom: '1px solid var(--me-line-2)',
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
                  Next billing · {formatDateShort(s.next_billing_date)}
                </div>
              </div>
              <div className='me-list-amount' style={{ fontSize: 18 }}>
                {formatMoney(Number(s.amount || 0))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function InvoicesCard({
  invoices,
  pendingCount,
}: {
  invoices: FinancialsInvoiceRow[];
  pendingCount: number;
}) {
  return (
    <div className='card'>
      <div
        className='between'
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--me-line-2)',
        }}
      >
        <h2 className='t-h3'>Invoices · {invoices.length}</h2>
        {pendingCount > 0 ? (
          <span className='badge badge-warn'>{pendingCount} pending</span>
        ) : null}
      </div>
      {invoices.length === 0 ? (
        <div style={{ padding: '32px 20px', textAlign: 'center' }}>
          <p className='t-body' style={{ marginBottom: 8 }}>
            No invoices yet.
          </p>
          <Link href='/payments' className='btn btn-secondary btn-sm'>
            View payments
          </Link>
        </div>
      ) : (
        invoices.map((inv) => {
          const contractor = Array.isArray(inv.contractor)
            ? inv.contractor[0]
            : inv.contractor;
          const contractorName =
            contractor?.first_name && contractor?.last_name
              ? `${contractor.first_name} ${contractor.last_name}`
              : 'Unknown contractor';
          const issuedRaw = inv.issue_date || inv.invoice_date;
          return (
            <Link
              key={inv.id}
              href={`/payments?invoice=${inv.id}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 16,
                padding: '14px 20px',
                borderBottom: '1px solid var(--me-line-2)',
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
                  {invoiceStatusBadge(inv.status)}
                </div>
                <div className='t-meta'>
                  {contractorName} · #{inv.invoice_number} ·{' '}
                  {formatDateShort(issuedRaw)}
                </div>
              </div>
              <div className='me-list-amount' style={{ fontSize: 18 }}>
                {formatMoney(Number(inv.total_amount || 0))}
              </div>
            </Link>
          );
        })
      )}
    </div>
  );
}

function RecentPaymentsCard({
  payments,
}: {
  payments: FinancialsPaymentRow[];
}) {
  const recent = payments.slice(0, 8);
  return (
    <div className='card'>
      <div
        className='between'
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--me-line-2)',
        }}
      >
        <h2 className='t-h3'>Recent payments · {payments.length}</h2>
        <Link href='/payments' className='btn btn-ghost btn-sm'>
          View all →
        </Link>
      </div>
      {recent.length === 0 ? (
        <div style={{ padding: '32px 20px', textAlign: 'center' }}>
          <p className='t-body'>No payments yet.</p>
        </div>
      ) : (
        recent.map((p) => {
          const job = Array.isArray(p.job) ? p.job[0] : p.job;
          return (
            <div
              key={p.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 16,
                padding: '14px 20px',
                borderBottom: '1px solid var(--me-line-2)',
                alignItems: 'center',
              }}
            >
              <div className='col' style={{ gap: 4, minWidth: 0 }}>
                <div className='row' style={{ gap: 8, flexWrap: 'wrap' }}>
                  <h3 className='t-h4'>{job?.title || 'Payment'}</h3>
                  {paymentStatusBadge(p.status)}
                </div>
                <div className='t-meta'>{formatRel(p.created_at)}</div>
              </div>
              <div className='me-list-amount' style={{ fontSize: 18 }}>
                {formatMoney(Number(p.amount || 0))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export function MintEditorialFinancials({
  stats,
  subscriptions,
  invoices,
  payments,
}: Props) {
  return (
    <HomeownerPageWrapper>
      <div className='col' style={{ gap: 4, marginBottom: 18 }}>
        <h1 className='t-h1'>Financials</h1>
        <p className='t-body'>
          Subscriptions, invoices, and a single roll-up of every payment held in
          escrow.
        </p>
      </div>

      {/* KPI row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 14,
          marginBottom: 18,
        }}
      >
        <KpiTile
          label='Total spent'
          value={formatMoney(stats.totalSpent)}
          sub={
            stats.spentCount > 0
              ? `From ${stats.spentCount} ${stats.spentCount === 1 ? 'payment' : 'payments'}`
              : 'No payments yet'
          }
        />
        <KpiTile
          label='Pending payments'
          value={formatMoney(stats.pendingPayments)}
          sub={
            stats.overduePayments > 0
              ? `${stats.overduePayments} overdue`
              : undefined
          }
        />
        <KpiTile
          label='Active subscriptions'
          value={String(stats.activeSubscriptions)}
          sub={
            stats.overdueSubscriptions > 0
              ? `${stats.overdueSubscriptions} overdue`
              : undefined
          }
        />
        <KpiTile
          label='Total budget'
          value={formatMoney(stats.totalBudget)}
          sub={stats.jobCount > 0 ? `Across ${stats.jobCount} jobs` : undefined}
        />
      </div>

      {/* Sections */}
      <div className='col' style={{ gap: 18 }}>
        <SubscriptionsCard subscriptions={subscriptions} />
        <InvoicesCard
          invoices={invoices}
          pendingCount={stats.pendingInvoices}
        />
        <RecentPaymentsCard payments={payments} />
      </div>
    </HomeownerPageWrapper>
  );
}
