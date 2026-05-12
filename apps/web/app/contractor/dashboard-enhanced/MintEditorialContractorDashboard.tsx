'use client';

/**
 * Mint Editorial port of /contractor/dashboard-enhanced.
 *
 * Mirrors the homeowner editorial dashboard structure (greeting row
 * → 4 KPI tiles → two-column body with primary list + side rail)
 * adapted to the contractor narrative: revenue + active work
 * + opportunities to bid on.
 *
 * The legacy ContractorDashboardProfessional renders a heavy chart-
 * heavy layout — we drop the area charts in favour of the canonical
 * editorial palette: numbers + lists + a single trust nudge. Same
 * dashboard data shape, just a calmer surface.
 */

import React from 'react';
import Link from 'next/link';
import { Plus, ArrowRight, Briefcase, AlertCircle } from 'lucide-react';
import { formatMoney } from '@/lib/utils/currency';
import { MintEditorialContractorDashboardRail } from './MintEditorialContractorDashboardRail';

export interface ContractorDashboardData {
  contractor: {
    id: string;
    name: string;
    company?: string;
    avatar?: string;
    location: string;
    email: string;
  };
  metrics: {
    totalRevenue: number;
    revenueChange: number;
    activeJobs: number;
    completedJobs: number;
    pendingBids: number;
    completionRate: number;
    pendingEscrowAmount: number;
    pendingEscrowCount: number;
  };
  recentJobs: Array<{
    id: string;
    title: string;
    status: string;
    budget: number;
    progress: number;
    category?: string;
    priority?: string;
    homeowner: string;
    dueDate: string;
  }>;
  availableJobs: Array<{
    id: string;
    title: string;
    status: string;
    budget: number;
    category?: string;
    priority?: string;
    homeowner: string;
    dueDate: string;
  }>;
  hasPaymentSetup: boolean;
  subscriptionInfo: {
    tier: 'free';
    bidsUsed: number;
    bidsLimit: number;
  } | null;
}

function statusBadge(status: string) {
  const s = (status || '').toLowerCase();
  if (s === 'in_progress' || s === 'assigned')
    return <span className='badge badge-info'>In progress</span>;
  if (s === 'completed')
    return <span className='badge badge-ok'>Completed</span>;
  if (s === 'posted' || s === 'open')
    return <span className='badge badge-warn'>Available</span>;
  return <span className='badge badge-mute'>{status}</span>;
}

function formatPostedAge(iso: string): string {
  const d = new Date(iso);
  const days = Math.round((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function MintEditorialContractorDashboard({
  data,
}: {
  data: ContractorDashboardData;
}) {
  const { contractor, metrics, recentJobs, availableJobs } = data;
  const firstName = contractor.name?.split(' ')[0] || 'there';
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const deltaDirection =
    metrics.revenueChange > 0
      ? 'up'
      : metrics.revenueChange < 0
        ? 'down'
        : 'flat';
  const deltaPct = Math.abs(metrics.revenueChange).toFixed(0);

  return (
    <>
      {/* Greeting */}
      <div className='between' style={{ marginBottom: 22 }}>
        <div className='col' style={{ gap: 6 }}>
          <div className='t-eyebrow'>{today}</div>
          <h1 className='t-h1'>Good day, {firstName}.</h1>
          <p className='t-body' style={{ maxWidth: 540 }}>
            {metrics.activeJobs === 0 && availableJobs.length === 0
              ? 'Quiet morning. Browse Discover to find new work nearby.'
              : metrics.activeJobs > 0
                ? `${metrics.activeJobs} ${metrics.activeJobs === 1 ? 'job' : 'jobs'} in flight${availableJobs.length > 0 ? ` · ${availableJobs.length} new ${availableJobs.length === 1 ? 'opportunity' : 'opportunities'} nearby` : ''}.`
                : `${availableJobs.length} new ${availableJobs.length === 1 ? 'opportunity' : 'opportunities'} nearby. Get bidding.`}
          </p>
        </div>
        <div className='row' style={{ gap: 8 }}>
          <Link href='/contractor/discover' className='btn btn-primary'>
            <Plus size={14} strokeWidth={2} /> Find work
          </Link>
        </div>
      </div>

      {/* KPI row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 14,
          marginBottom: 22,
        }}
      >
        <div className='kpi'>
          <div className='label'>Total revenue</div>
          <div className='num'>{formatMoney(metrics.totalRevenue)}</div>
          <div className='sub'>
            {deltaDirection === 'up' ? (
              <span className='delta-up'>▲ {deltaPct}%</span>
            ) : deltaDirection === 'down' ? (
              <span className='delta-down'>▼ {deltaPct}%</span>
            ) : (
              <span>—</span>
            )}
            <span style={{ marginLeft: 6 }}>vs last month</span>
          </div>
        </div>
        <div className='kpi'>
          <div className='label'>Active jobs</div>
          <div className='num'>{metrics.activeJobs}</div>
          <div className='sub'>
            <span>
              {metrics.completedJobs}{' '}
              {metrics.completedJobs === 1 ? 'completed' : 'completed'} all-time
            </span>
          </div>
        </div>
        <div className='kpi'>
          <div className='label'>Pending escrow</div>
          <div className='num'>{formatMoney(metrics.pendingEscrowAmount)}</div>
          <div className='sub'>
            <span>
              {metrics.pendingEscrowCount > 0
                ? `across ${metrics.pendingEscrowCount} ${metrics.pendingEscrowCount === 1 ? 'job' : 'jobs'}`
                : 'released on sign-off'}
            </span>
          </div>
        </div>
        <div className='kpi'>
          <div className='label'>Completion rate</div>
          <div className='num'>{Math.round(metrics.completionRate)}%</div>
          <div className='sub'>
            <span>last 50 jobs</span>
          </div>
        </div>
      </div>

      {/* Setup nudge — only shows when Stripe Connect isn't configured.
          Real money issue: until this is set up the homeowner's escrow
          can't actually release to this contractor. Hard fail-loud at
          the top of the dashboard. */}
      {!data.hasPaymentSetup ? (
        <div
          className='card card-pad'
          style={{
            background: 'var(--me-warn-bg)',
            border: '1px solid var(--me-warn-fg)',
            marginBottom: 18,
            display: 'flex',
            gap: 14,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <AlertCircle
            size={20}
            strokeWidth={1.75}
            style={{ color: 'var(--me-warn-fg)', flexShrink: 0 }}
          />
          <div className='col' style={{ gap: 2, flex: 1, minWidth: 220 }}>
            <h3 className='t-h4' style={{ color: 'var(--me-warn-fg)' }}>
              Set up payouts to get paid
            </h3>
            <p
              className='t-body'
              style={{ fontSize: 13, margin: 0, color: 'var(--me-ink-2)' }}
            >
              Until your Stripe Connect account is verified, escrow funds
              can&apos;t release to you when jobs complete.
            </p>
          </div>
          <Link href='/contractor/payouts' className='btn btn-primary btn-sm'>
            Set up payouts →
          </Link>
        </div>
      ) : null}

      {/* Two-column body */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)',
          gap: 18,
        }}
      >
        {/* Active jobs panel */}
        <div className='card'>
          <div
            className='between'
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--me-line-2)',
            }}
          >
            <h2 className='t-h3'>Active work</h2>
            <Link href='/contractor/jobs' className='btn btn-ghost btn-sm'>
              View all <ArrowRight size={12} strokeWidth={1.75} />
            </Link>
          </div>
          {recentJobs.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <Briefcase
                size={28}
                strokeWidth={1.5}
                style={{
                  color: 'var(--me-ink-3)',
                  marginBottom: 10,
                  display: 'inline-block',
                }}
              />
              <p className='t-body' style={{ marginBottom: 12 }}>
                No active jobs. Browse Discover to find work nearby.
              </p>
              <Link
                href='/contractor/discover'
                className='btn btn-primary btn-sm'
              >
                Find work →
              </Link>
            </div>
          ) : (
            recentJobs.map((j, i) => (
              <Link
                key={j.id}
                href={`/contractor/jobs/${j.id}`}
                className='row'
                style={{
                  padding: '14px 20px',
                  borderTop: i ? '1px solid var(--me-line-2)' : 0,
                  gap: 14,
                  alignItems: 'center',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'var(--me-bg-2)',
                    color: 'var(--me-ink-2)',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    flexShrink: 0,
                  }}
                >
                  {(j.category || 'JOB').slice(0, 3).toUpperCase()}
                </div>
                <div className='col' style={{ gap: 2, flex: 1, minWidth: 0 }}>
                  <div className='row' style={{ gap: 8, flexWrap: 'wrap' }}>
                    <h3
                      className='t-h4'
                      style={{ fontSize: 14, fontWeight: 600 }}
                    >
                      {j.title}
                    </h3>
                    {statusBadge(j.status)}
                  </div>
                  <span className='t-meta' style={{ fontSize: 12 }}>
                    {j.homeowner} · Updated {formatPostedAge(j.dueDate)}
                  </span>
                </div>
                <div className='me-list-amount'>
                  {j.budget > 0 ? formatMoney(j.budget) : '—'}
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Right column — extracted into its own component so the
            parent stays under the 500-line pre-commit cap. Contains
            Discover preview · Pending-bids reminder · Mint AI nudge
            · Trust block / All-clear card. */}
        <MintEditorialContractorDashboardRail
          metrics={metrics}
          availableJobs={availableJobs}
        />
      </div>
    </>
  );
}
