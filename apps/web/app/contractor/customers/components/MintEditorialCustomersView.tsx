'use client';

/**
 * Mint Editorial port of /contractor/customers.
 *
 * Replaces the basic Name/Status/Date table with a polished editorial
 * layout: serif italic header, 4 KPI tiles (New leads, Quotes out,
 * Active jobs, Pipeline value), stage filter chips, and a richer
 * customer table (Customer / Property / Last job / LTV / Stage / Star).
 *
 * Real data only — every value comes from the aggregated customers
 * prop. Missing fields show "—" rather than fabricated placeholders
 * (e.g. star rating is "—" when the homeowner has not reviewed this
 * contractor). The 4 KPIs are computed server-side from the same
 * data set.
 */

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Star, Users, FileText, Briefcase, PoundSterling } from 'lucide-react';

export type CustomerStage = 'lead' | 'quoting' | 'active' | 'done';

export interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  /** Last completed/active job, if any */
  lastJobTitle: string | null;
  lastJobDate: string | null;
  /** Postcode of latest job, used as "Property" cell */
  property: string | null;
  /** Lifetime value — sum of completed-job budgets for this contractor↔homeowner pair */
  ltv: number;
  /** Current relationship stage with this contractor */
  stage: CustomerStage;
  /** Average star rating left by this homeowner on this contractor (null if none) */
  starAverage: number | null;
}

export interface CustomersKpis {
  newLeads: number;
  quotesOut: number;
  activeJobs: number;
  /** Sum of active-job budgets + pending-quote totals */
  pipelineValue: number;
}

interface MintEditorialCustomersViewProps {
  customers: CustomerRecord[];
  kpis: CustomersKpis;
  totalCount: number;
  /** Whether the contractor has any leads waiting on them (i.e. unreplied bids/messages) */
  leadsWaiting: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatRelative = (iso: string | null): string => {
  if (!iso) return '—';
  const date = new Date(iso);
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 1) return 'today';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

const stageMeta: Record<CustomerStage, { label: string; bg: string; fg: string }> = {
  lead: { label: 'Lead', bg: 'var(--me-warn-bg)', fg: 'var(--me-warn-fg)' },
  quoting: { label: 'Quoting', bg: 'var(--me-info-bg)', fg: 'var(--me-info-fg)' },
  active: { label: 'Active', bg: 'var(--me-ok-bg)', fg: 'var(--me-ok-fg)' },
  done: { label: 'Done', bg: 'var(--me-bg-2)', fg: 'var(--me-ink-2)' },
};

function StageChip({ stage }: { stage: CustomerStage }) {
  const meta = stageMeta[stage];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: 'var(--me-radius-pill)',
        background: meta.bg,
        color: meta.fg,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.2,
      }}
    >
      {meta.label}
    </span>
  );
}

function StarRow({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span style={{ color: 'var(--me-ink-4)', fontSize: 13 }}>—</span>
    );
  }
  const filled = Math.round(value);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={12}
          strokeWidth={1.5}
          fill={i <= filled ? 'var(--me-warm)' : 'transparent'}
          color={i <= filled ? 'var(--me-warm)' : 'var(--me-ink-4)'}
        />
      ))}
    </span>
  );
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: 'var(--me-brand-soft)',
        color: 'var(--me-brand-2)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {initials.toUpperCase() || '?'}
    </div>
  );
}

interface KpiTileProps {
  label: string;
  value: string;
  sub?: string;
}

function KpiTile({ label, value, sub }: KpiTileProps) {
  return (
    <div className='card' style={{ padding: 18 }}>
      <p
        className='t-eyebrow'
        style={{
          margin: 0,
          marginBottom: 6,
          color: 'var(--me-ink-3)',
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--me-font-display)',
          fontSize: 30,
          color: 'var(--me-ink)',
          letterSpacing: 'var(--me-display-tracking)',
          lineHeight: 1.1,
        }}
      >
        {value}
      </p>
      {sub ? (
        <p
          style={{
            margin: '6px 0 0',
            color: 'var(--me-ink-3)',
            fontSize: 12,
          }}
        >
          {sub}
        </p>
      ) : null}
    </div>
  );
}

type StageFilter = CustomerStage | 'all';

export function MintEditorialCustomersView({
  customers,
  kpis,
  totalCount,
  leadsWaiting,
}: MintEditorialCustomersViewProps) {
  const [filter, setFilter] = useState<StageFilter>('all');

  const counts = useMemo(() => {
    const out: Record<StageFilter, number> = {
      all: customers.length,
      lead: 0,
      quoting: 0,
      active: 0,
      done: 0,
    };
    for (const c of customers) out[c.stage]++;
    return out;
  }, [customers]);

  const filtered = useMemo(
    () => (filter === 'all' ? customers : customers.filter((c) => c.stage === filter)),
    [customers, filter]
  );

  const chips: { value: StageFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'lead', label: 'Leads' },
    { value: 'quoting', label: 'Quoting' },
    { value: 'active', label: 'Active' },
    { value: 'done', label: 'Done' },
  ];

  return (
    <div
      className='col'
      style={{ gap: 24, maxWidth: 1200, margin: '0 auto', width: '100%' }}
    >
      {/* Header */}
      <div className='col' style={{ gap: 6 }}>
        <h1 className='t-h1' style={{ margin: 0 }}>
          Customer{' '}
          <em style={{ color: 'var(--me-brand)', fontStyle: 'italic' }}>
            relationships
          </em>
        </h1>
        <p className='t-body' style={{ margin: 0 }}>
          {totalCount === 0
            ? 'Homeowners you’ve worked with or messaged will appear here.'
            : `${totalCount} ${totalCount === 1 ? 'customer' : 'customers'}${
                leadsWaiting > 0
                  ? ` · ${leadsWaiting} ${
                      leadsWaiting === 1 ? 'lead' : 'leads'
                    } waiting on you`
                  : ''
              }.`}
        </p>
      </div>

      {/* KPI row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 16,
        }}
        className='customers-kpi-row'
      >
        <KpiTile
          label='New leads'
          value={kpis.newLeads.toString()}
          sub={kpis.newLeads === 0 ? undefined : 'pending first reply'}
        />
        <KpiTile label='Quotes out' value={kpis.quotesOut.toString()} />
        <KpiTile label='Active jobs' value={kpis.activeJobs.toString()} />
        <KpiTile
          label='Pipeline value'
          value={formatCurrency(kpis.pipelineValue)}
        />
      </div>

      {/* Stage chips */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        {chips.map((chip) => {
          const isActive = filter === chip.value;
          return (
            <button
              key={chip.value}
              type='button'
              onClick={() => setFilter(chip.value)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--me-radius-pill)',
                border: `1px solid ${
                  isActive ? 'transparent' : 'var(--me-line)'
                }`,
                background: isActive ? 'var(--me-brand)' : 'var(--me-surface)',
                color: isActive ? 'var(--me-on-brand)' : 'var(--me-ink-2)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {chip.label} · {counts[chip.value]}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className='card' style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Users
              size={28}
              strokeWidth={1.5}
              color='var(--me-ink-4)'
              style={{ marginBottom: 8 }}
            />
            <p
              style={{
                margin: 0,
                fontSize: 14,
                color: 'var(--me-ink-3)',
              }}
            >
              {filter === 'all'
                ? 'No customers yet.'
                : `No customers in the ${stageMeta[filter as CustomerStage]?.label.toLowerCase() ?? filter} stage.`}
            </p>
          </div>
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 14,
            }}
          >
            <thead>
              <tr style={{ background: 'var(--me-bg)' }}>
                <th
                  style={{
                    padding: '12px 20px',
                    textAlign: 'left',
                    fontWeight: 600,
                    fontSize: 11,
                    color: 'var(--me-ink-3)',
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                  }}
                >
                  Customer
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: 600,
                    fontSize: 11,
                    color: 'var(--me-ink-3)',
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                  }}
                >
                  Property
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: 600,
                    fontSize: 11,
                    color: 'var(--me-ink-3)',
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                  }}
                >
                  Last job
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'right',
                    fontWeight: 600,
                    fontSize: 11,
                    color: 'var(--me-ink-3)',
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    width: 90,
                  }}
                >
                  LTV
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: 600,
                    fontSize: 11,
                    color: 'var(--me-ink-3)',
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    width: 90,
                  }}
                >
                  Stage
                </th>
                <th
                  style={{
                    padding: '12px 20px',
                    textAlign: 'left',
                    fontWeight: 600,
                    fontSize: 11,
                    color: 'var(--me-ink-3)',
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    width: 100,
                  }}
                >
                  Star
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  style={{
                    borderTop: '1px solid var(--me-line-2)',
                  }}
                >
                  <td style={{ padding: '14px 20px' }}>
                    <Link
                      href={`/contractor/customers/${c.id}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 10,
                        textDecoration: 'none',
                        color: 'var(--me-ink)',
                      }}
                    >
                      <Initials name={c.name} />
                      <span style={{ fontWeight: 600 }}>{c.name}</span>
                    </Link>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--me-ink-2)' }}>
                    {c.property ?? <span style={{ color: 'var(--me-ink-4)' }}>—</span>}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--me-ink-2)' }}>
                    {c.lastJobTitle ? (
                      <span>
                        {c.lastJobTitle}
                        {c.lastJobDate ? (
                          <span style={{ color: 'var(--me-ink-3)', marginLeft: 6 }}>
                            · {formatRelative(c.lastJobDate)}
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--me-ink-4)' }}>—</span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: '14px 16px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: c.ltv > 0 ? 'var(--me-ink)' : 'var(--me-ink-4)',
                    }}
                  >
                    {c.ltv > 0 ? formatCurrency(c.ltv) : '—'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <StageChip stage={c.stage} />
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <StarRow value={c.starAverage} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style jsx global>{`
        @media (max-width: 900px) {
          .customers-kpi-row {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
      `}</style>
    </div>
  );
}
