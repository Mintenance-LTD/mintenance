'use client';

/**
 * Right rail of the contractor dashboard — Discover preview +
 * Pending bids reminder + Mint AI nudge + Trust block. Extracted
 * from MintEditorialContractorDashboard so the parent stays under
 * the 500-line pre-commit cap.
 */

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { formatMoney } from '@/lib/utils/currency';

interface AvailableJob {
  id: string;
  title: string;
  budget: number;
  category?: string;
  dueDate: string;
}

interface Metrics {
  totalRevenue: number;
  pendingBids: number;
  completedJobs: number;
  completionRate: number;
  pendingEscrowAmount: number;
  pendingEscrowCount: number;
}

interface Props {
  metrics: Metrics;
  availableJobs: AvailableJob[];
}

function formatPostedAge(iso: string): string {
  const d = new Date(iso);
  const days = Math.round((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function MintEditorialContractorDashboardRail({
  metrics,
  availableJobs,
}: Props) {
  // Pick exactly one Mint AI copy variant based on the strongest
  // signal in the contractor's current state. Deterministic — no
  // randomisation, so the same conditions always surface the same
  // tip on every render.
  const aiTip =
    metrics.completionRate >= 90 && metrics.completedJobs >= 3
      ? `Your completion rate is ${Math.round(metrics.completionRate)}% — top 20% of contractors. Homeowners notice.`
      : metrics.pendingEscrowAmount > 0
        ? `${formatMoney(metrics.pendingEscrowAmount)} ready to release once you confirm completion on ${metrics.pendingEscrowCount} ${metrics.pendingEscrowCount === 1 ? 'job' : 'jobs'}.`
        : 'Keep your response time under an hour during business hours — homeowners who get a fast reply book 3× more often.';

  return (
    <div className='col' style={{ gap: 18 }}>
      {/* Discover preview */}
      <div className='card'>
        <div
          className='between'
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--me-line-2)',
          }}
        >
          <h2 className='t-h4'>New nearby</h2>
          <Link href='/contractor/discover' className='btn btn-ghost btn-sm'>
            Discover <ArrowRight size={12} strokeWidth={1.75} />
          </Link>
        </div>
        {availableJobs.length === 0 ? (
          <div style={{ padding: '24px 20px', textAlign: 'center' }}>
            <p className='t-meta' style={{ marginBottom: 0, fontSize: 13 }}>
              No new work in your area right now. Check back later.
            </p>
          </div>
        ) : (
          availableJobs.slice(0, 4).map((j, i) => (
            <Link
              key={j.id}
              href={`/contractor/bid/${j.id}`}
              className='row'
              style={{
                padding: '12px 18px',
                borderTop: i ? '1px solid var(--me-line-2)' : 0,
                gap: 12,
                alignItems: 'center',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div className='col' style={{ gap: 2, flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: 13,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {j.title}
                </span>
                <span className='t-meta' style={{ fontSize: 11 }}>
                  {j.category || 'General'} · {formatPostedAge(j.dueDate)}
                </span>
              </div>
              <span
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  color: 'var(--me-brand)',
                  flexShrink: 0,
                }}
              >
                {j.budget > 0 ? formatMoney(j.budget) : 'Open'}
              </span>
            </Link>
          ))
        )}
      </div>

      {/* Pending bids reminder */}
      {metrics.pendingBids > 0 ? (
        <div className='card card-pad'>
          <div className='row' style={{ gap: 10, marginBottom: 8 }}>
            <Clock
              size={16}
              strokeWidth={1.75}
              style={{ color: 'var(--me-brand)' }}
            />
            <h3 className='t-h4'>
              {metrics.pendingBids} pending{' '}
              {metrics.pendingBids === 1 ? 'bid' : 'bids'}
            </h3>
          </div>
          <p className='t-body' style={{ fontSize: 13, marginBottom: 10 }}>
            Homeowners are still reviewing your quotes. Following up via
            Messages often unblocks the decision.
          </p>
          <Link href='/contractor/jobs' className='btn btn-ghost btn-sm'>
            Review bids →
          </Link>
        </div>
      ) : null}

      {/* Mint AI nudge */}
      <div
        className='card card-pad'
        style={{
          background:
            'linear-gradient(180deg, var(--me-brand-soft) 0%, var(--me-surface) 60%)',
          border: '1px solid var(--me-brand-soft)',
        }}
      >
        <div className='row' style={{ gap: 10, marginBottom: 8 }}>
          <Sparkles
            size={16}
            strokeWidth={1.75}
            style={{ color: 'var(--me-brand)' }}
          />
          <h3 className='t-h4'>Mint says</h3>
        </div>
        <p
          className='t-body'
          style={{ fontSize: 13, lineHeight: 1.55, margin: 0 }}
        >
          {aiTip}
        </p>
      </div>

      {/* Trust block */}
      {metrics.pendingEscrowAmount > 0 ? (
        <div
          className='card card-pad'
          style={{
            background: 'var(--me-brand-soft)',
            border: '1px solid var(--me-brand-soft)',
          }}
        >
          <div className='row' style={{ gap: 10, marginBottom: 8 }}>
            <ShieldCheck
              size={18}
              strokeWidth={1.75}
              style={{ color: 'var(--me-brand)' }}
            />
            <h3 className='t-h4' style={{ color: 'var(--me-brand)' }}>
              Payment protected
            </h3>
          </div>
          <p
            className='t-body'
            style={{ fontSize: 13, color: 'var(--me-ink-2)', margin: 0 }}
          >
            {formatMoney(metrics.pendingEscrowAmount)} is held in escrow across{' '}
            {metrics.pendingEscrowCount} active{' '}
            {metrics.pendingEscrowCount === 1 ? 'job' : 'jobs'}. Funds release
            within 24h after the homeowner signs off.
          </p>
        </div>
      ) : (
        <div className='card card-pad'>
          <div className='row' style={{ gap: 10, marginBottom: 8 }}>
            <CheckCircle2
              size={18}
              strokeWidth={1.75}
              style={{ color: 'var(--me-brand)' }}
            />
            <h3 className='t-h4'>All clear</h3>
          </div>
          <p className='t-body' style={{ fontSize: 13, margin: 0 }}>
            No escrow holds pending. Start a new bid to keep the pipeline
            moving.
          </p>
        </div>
      )}
    </div>
  );
}
