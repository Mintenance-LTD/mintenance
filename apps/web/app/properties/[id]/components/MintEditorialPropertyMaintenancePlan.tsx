'use client';

/**
 * "Maintenance plan" tab for /properties/[id].
 *
 * Canonical mock (property-management.html ~lines 333-460): 12-month
 * strip showing recurring tasks per month + "This quarter" detail
 * list on the left + Auto-rebook AI card on the right.
 *
 * Real data: per-property rows from `recurring_schedules` (table +
 * RLS shipped in 20260214200000). For properties that haven't
 * configured any schedules we render an empty-state CTA to
 * /landlord/recurring rather than fabricating example rows — same
 * honesty rule that's been guiding every other surface in this
 * branch.
 *
 * Status colour rules: overdue (red/err) · due-soon ≤30d (amber/warn)
 * · on-track (mint/ok). Same `daysUntil()` calc the Recurring Tasks
 * page uses so the visual story matches across surfaces.
 */

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { MintEditorialEmptyState } from '@/components/mint-editorial/MintEditorialEmptyState';

export interface PropertySchedule {
  id: string;
  task_type: string;
  title: string;
  description: string | null;
  category: string;
  frequency: string;
  next_due_date: string;
  last_completed_date: string | null;
  auto_create_job: boolean;
  is_active: boolean;
}

const FREQUENCY_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  biannual: 'Every 6 months',
  annual: 'Annually',
};

// Category → swatch palette. Same family as the rest of the Mint
// Editorial trade-category tokens so the per-month chips line up
// visually with the job thumbnails elsewhere in the app.
const CATEGORY_SWATCH: Record<string, { bg: string; fg: string }> = {
  plumbing: {
    bg: 'var(--me-cat-plumbing-bg)',
    fg: 'var(--me-cat-plumbing-fg)',
  },
  electrical: {
    bg: 'var(--me-cat-electrical-bg)',
    fg: 'var(--me-cat-electrical-fg)',
  },
  heating: {
    bg: 'var(--me-cat-electrical-bg)',
    fg: 'var(--me-cat-electrical-fg)',
  },
  landscape: {
    bg: 'var(--me-cat-landscape-bg)',
    fg: 'var(--me-cat-landscape-fg)',
  },
  paint: { bg: 'var(--me-cat-painting-bg)', fg: 'var(--me-cat-painting-fg)' },
  default: { bg: 'var(--me-bg-2)', fg: 'var(--me-ink-2)' },
};

function swatchFor(category: string) {
  const k = (category || '').toLowerCase();
  if (k.includes('plumb') || k.includes('boiler') || k.includes('gas')) {
    return CATEGORY_SWATCH.plumbing;
  }
  if (k.includes('electr') || k.includes('eicr') || k.includes('alarm')) {
    return CATEGORY_SWATCH.electrical;
  }
  if (k.includes('heat')) return CATEGORY_SWATCH.heating;
  if (k.includes('garden') || k.includes('pest')) {
    return CATEGORY_SWATCH.landscape;
  }
  if (k.includes('paint') || k.includes('chimney'))
    return CATEGORY_SWATCH.paint;
  return CATEGORY_SWATCH.default;
}

function daysUntil(dateStr: string): number {
  return Math.ceil(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

function statusTone(days: number) {
  if (days < 0)
    return {
      Icon: AlertTriangle,
      bg: 'var(--me-err-bg)',
      fg: 'var(--me-err-fg)',
      label: `${Math.abs(days)}d overdue`,
    };
  if (days <= 30)
    return {
      Icon: Clock,
      bg: 'var(--me-warn-bg)',
      fg: 'var(--me-warn-fg)',
      label: days === 0 ? 'Due today' : `In ${days}d`,
    };
  return {
    Icon: CheckCircle2,
    bg: 'var(--me-ok-bg)',
    fg: 'var(--me-ok-fg)',
    label: `In ${days}d`,
  };
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

interface Props {
  /** Reserved — passed in for future per-property links to
   *  /landlord/recurring (e.g. pre-filtering the form by property).
   *  Underscore-prefixed to satisfy the unused-vars lint rule until
   *  that wiring lands. */
  _propertyId?: string;
  schedules: PropertySchedule[];
}

export function MintEditorialPropertyMaintenancePlan({ schedules }: Props) {
  const activeSchedules = useMemo(
    () => schedules.filter((s) => s.is_active),
    [schedules]
  );

  // Group schedules into the 12-month strip by the month of next_due_date.
  // We only show the current year's plan; tasks due more than a year
  // out are excluded from the strip but still show in "This quarter"
  // / "Upcoming" if applicable.
  const year = new Date().getFullYear();
  const monthBuckets = useMemo(() => {
    const buckets: PropertySchedule[][] = Array.from({ length: 12 }, () => []);
    activeSchedules.forEach((s) => {
      const d = new Date(s.next_due_date);
      if (d.getFullYear() === year) {
        buckets[d.getMonth()].push(s);
      }
    });
    return buckets;
  }, [activeSchedules, year]);

  const upcomingThree = useMemo(
    () => activeSchedules.slice(0, 5),
    [activeSchedules]
  );

  if (activeSchedules.length === 0) {
    return (
      <MintEditorialEmptyState
        icon={RefreshCw}
        title='No maintenance plan for this property yet'
        body='Schedule the recurring jobs that come back every year — gas safety, EICRs, boiler services, gutter cleaning. Mint will surface them here as the dates approach.'
        cta={{
          label: 'Set up recurring tasks',
          href: '/landlord/recurring',
        }}
      />
    );
  }

  return (
    <div className='col' style={{ gap: 22 }}>
      <div className='between' style={{ alignItems: 'flex-end', gap: 16 }}>
        <div className='col' style={{ gap: 4 }}>
          <h2 className='t-h2' style={{ fontSize: 28 }}>
            Maintenance <em>plan</em>
          </h2>
          <p className='t-body'>
            {activeSchedules.length}{' '}
            {activeSchedules.length === 1 ? 'task' : 'tasks'} on the cycle for
            this property in {year}.
          </p>
        </div>
        <Link href='/landlord/recurring' className='btn btn-secondary btn-sm'>
          Manage all tasks
        </Link>
      </div>

      {/* Year strip — 12 columns, one per month. Empty months keep
          their slot so the visual rhythm doesn't collapse. On a phone
          12 columns won't fit, so the inner grid keeps a min-width and
          the card scrolls horizontally (me-mplan-strip). */}
      <div className='card me-mplan-strip' style={{ overflow: 'hidden' }}>
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)' }}
        >
          {monthBuckets.map((bucket, mi) => (
            <div
              key={mi}
              style={{
                borderLeft: mi ? '1px solid var(--me-line-2)' : 'none',
                padding: '14px 10px',
                minHeight: 150,
              }}
            >
              <div className='t-meta' style={{ marginBottom: 10 }}>
                {MONTHS[mi]}
              </div>
              <div className='col' style={{ gap: 6 }}>
                {bucket.map((s) => {
                  const d = new Date(s.next_due_date);
                  const days = daysUntil(s.next_due_date);
                  const overdue = days < 0;
                  const swatch = overdue
                    ? {
                        bg: 'var(--me-err-bg)',
                        fg: 'var(--me-err-fg)',
                      }
                    : swatchFor(s.task_type || s.category);
                  return (
                    <div
                      key={s.id}
                      style={{
                        background: swatch.bg,
                        color: swatch.fg,
                        padding: '6px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 500,
                        lineHeight: 1.3,
                        border: overdue ? '1px solid var(--me-err-fg)' : '0',
                      }}
                      title={`${s.title} — ${d.toLocaleDateString('en-GB')}`}
                    >
                      <div
                        style={{ fontSize: 10, opacity: 0.7, marginBottom: 1 }}
                      >
                        {d.getDate()}
                      </div>
                      {s.title}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* This quarter list + Mint AI auto-rebook card */}
      <div
        className='me-mplan-grid'
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.55fr) minmax(0, 1fr)',
          gap: 22,
          alignItems: 'flex-start',
        }}
      >
        <div>
          <h3 className='t-h3' style={{ marginBottom: 12 }}>
            What&apos;s next
          </h3>
          <div className='card'>
            {upcomingThree.map((s, i) => {
              const days = daysUntil(s.next_due_date);
              const status = statusTone(days);
              return (
                <div
                  key={s.id}
                  className='row'
                  style={{
                    padding: '14px 18px',
                    borderTop: i ? '1px solid var(--me-line-2)' : 0,
                    gap: 14,
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: status.bg,
                      color: status.fg,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <status.Icon size={16} strokeWidth={1.75} />
                  </span>
                  <div className='col' style={{ gap: 2, flex: 1, minWidth: 0 }}>
                    <div className='row' style={{ gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>
                        {s.title}
                      </span>
                      {s.auto_create_job ? (
                        <span className='badge badge-info'>Auto-job</span>
                      ) : null}
                    </div>
                    <span className='t-meta' style={{ fontSize: 12 }}>
                      {FREQUENCY_LABELS[s.frequency] ?? s.frequency}
                      {s.last_completed_date
                        ? ` · Last done ${new Date(s.last_completed_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`
                        : ''}
                    </span>
                  </div>
                  <div
                    className='col'
                    style={{
                      alignItems: 'flex-end',
                      gap: 0,
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: status.fg,
                      }}
                    >
                      {status.label}
                    </span>
                    <span className='t-meta' style={{ fontSize: 11 }}>
                      {new Date(s.next_due_date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className='col' style={{ gap: 14 }}>
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
              <h4 className='t-h4'>Auto-rebook</h4>
            </div>
            <p
              className='t-body'
              style={{ fontSize: 13, lineHeight: 1.55, marginBottom: 12 }}
            >
              When auto-job is on, Mint sends each recurring task out to the
              same pro 2 weeks before it&apos;s due — only if you tap approve.
              You&apos;re never charged automatically.
            </p>
            <Link href='/landlord/recurring' className='btn btn-primary btn-sm'>
              Configure auto-job
            </Link>
          </div>
          <div className='card card-pad'>
            <div className='t-eyebrow' style={{ marginBottom: 10 }}>
              How this works
            </div>
            <p
              className='t-body'
              style={{ fontSize: 12, lineHeight: 1.55, margin: 0 }}
            >
              Tasks come from your recurring-tasks list. Edit frequency, skip a
              year, or pause from the main{' '}
              <Link
                href='/landlord/recurring'
                style={{ color: 'var(--me-brand)', fontWeight: 600 }}
              >
                Recurring Tasks
              </Link>{' '}
              page.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
