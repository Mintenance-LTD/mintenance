'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Filter,
  ArrowRight,
  Check,
  Droplet,
  Zap,
  Trees,
  Brush,
  Briefcase,
} from 'lucide-react';

interface JobListItem {
  id: string;
  title: string;
  status: string;
  budget: number;
  category?: string;
  location?: string;
  created_at: string;
  contractor_id?: string;
}

interface Props {
  jobs: JobListItem[];
}

const formatGBP = (n: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(n);

function CategoryThumb({ category }: { category?: string }) {
  const map: Record<string, { Icon: typeof Droplet; key: string }> = {
    plumbing: { Icon: Droplet, key: 'plumbing' },
    electrical: { Icon: Zap, key: 'electrical' },
    landscaping: { Icon: Trees, key: 'landscape' },
    gardening: { Icon: Trees, key: 'landscape' },
    painting: { Icon: Brush, key: 'painting' },
  };
  const m = map[(category || '').toLowerCase()] || {
    Icon: Briefcase,
    key: 'default',
  };
  const Icon = m.Icon;
  return (
    <div
      className='job-thumb'
      style={{
        background: `var(--me-cat-${m.key}-bg)`,
        color: `var(--me-cat-${m.key}-fg)`,
      }}
    >
      <Icon size={22} strokeWidth={1.75} />
    </div>
  );
}

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === 'posted' || s === 'pending') {
    return <span className='badge badge-warn'>Awaiting bids</span>;
  }
  if (s === 'in_progress' || s === 'assigned') {
    return <span className='badge badge-info'>In progress</span>;
  }
  if (s === 'completed') {
    return (
      <span className='badge badge-ok'>
        <Check size={11} strokeWidth={2.5} /> Approved
      </span>
    );
  }
  if (s === 'cancelled' || s === 'disputed') {
    return <span className='badge badge-err'>{status}</span>;
  }
  return <span className='badge badge-mute'>{status}</span>;
}

function metaLine(job: JobListItem): string {
  const ts = new Date(job.created_at);
  const diffDays = Math.round(
    (Date.now() - ts.getTime()) / (1000 * 60 * 60 * 24)
  );
  const when =
    diffDays <= 0
      ? 'Posted today'
      : diffDays === 1
        ? 'Posted yesterday'
        : `Posted ${diffDays} days ago`;
  const where = job.location || 'Location not set';
  return `${where} · ${when}`;
}

type Tab = 'all' | 'awaiting' | 'active' | 'done';

const TABS: { id: Tab; label: string; match: (s: string) => boolean }[] = [
  { id: 'all', label: 'All', match: () => true },
  {
    id: 'awaiting',
    label: 'Awaiting bids',
    match: (s) => s === 'posted' || s === 'pending',
  },
  {
    id: 'active',
    label: 'In progress',
    match: (s) => s === 'in_progress' || s === 'assigned',
  },
  { id: 'done', label: 'Done', match: (s) => s === 'completed' },
];

export function MintEditorialJobsList({ jobs }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('all');

  const counts = useMemo(
    () =>
      Object.fromEntries(
        TABS.map((t) => [t.id, jobs.filter((j) => t.match(j.status)).length])
      ) as Record<Tab, number>,
    [jobs]
  );

  const visible = useMemo(() => {
    const matcher = TABS.find((t) => t.id === activeTab)!.match;
    return jobs.filter((j) => matcher(j.status));
  }, [jobs, activeTab]);

  // Split visible jobs into "active-ish" (everything except completed) and
  // "recently completed" — matches the design's two grouped sections.
  const isCompleted = (s: string) => s.toLowerCase() === 'completed';
  const activeGroup = visible.filter((j) => !isCompleted(j.status));
  const doneGroup = visible.filter((j) => isCompleted(j.status));

  return (
    <>
      {/* Page header */}
      <div className='between' style={{ marginBottom: 18 }}>
        <div className='col' style={{ gap: 4 }}>
          <h1 className='t-h1'>Your jobs</h1>
          <p className='t-body'>
            All jobs across your properties — active, scheduled, and complete.
          </p>
        </div>
        <div className='row' style={{ gap: 6, flexWrap: 'wrap' }}>
          {TABS.map((t) => (
            <button
              type='button'
              key={t.id}
              className={'chip ' + (activeTab === t.id ? 'on' : '')}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label} · {counts[t.id]}
            </button>
          ))}
        </div>
      </div>

      {/* Top actions row */}
      <div
        className='row'
        style={{ gap: 8, marginBottom: 14, justifyContent: 'flex-end' }}
      >
        <button type='button' className='btn btn-secondary btn-sm' disabled>
          <Filter size={13} strokeWidth={1.75} /> Filter
        </button>
        <Link href='/jobs/create' className='btn btn-primary btn-sm'>
          <Plus size={13} strokeWidth={2} /> Post a job
        </Link>
      </div>

      {/* Grouped card */}
      {visible.length === 0 ? (
        <div
          className='card'
          style={{ padding: '56px 24px', textAlign: 'center' }}
        >
          <p className='t-body' style={{ marginBottom: 12 }}>
            {activeTab === 'all'
              ? 'No jobs yet. Post your first one and local tradespeople will respond.'
              : 'No jobs match this filter.'}
          </p>
          {activeTab === 'all' ? (
            <Link href='/jobs/create' className='btn btn-primary'>
              <Plus size={14} strokeWidth={2} /> Post your first job
            </Link>
          ) : (
            <button
              type='button'
              className='btn btn-secondary'
              onClick={() => setActiveTab('all')}
            >
              See all jobs
            </button>
          )}
        </div>
      ) : (
        <div className='card'>
          {activeGroup.length > 0 && (
            <>
              <div className='me-list-section'>Active</div>
              {activeGroup.map((j) => (
                <Link
                  key={j.id}
                  href={`/jobs/${j.id}`}
                  className='job-row'
                  style={{
                    cursor: 'pointer',
                    color: 'inherit',
                    textDecoration: 'none',
                  }}
                >
                  <CategoryThumb category={j.category} />
                  <div className='col' style={{ gap: 4, minWidth: 0 }}>
                    <div className='row' style={{ gap: 8 }}>
                      <h3 className='t-h4'>{j.title}</h3>
                      {statusBadge(j.status)}
                    </div>
                    <div className='t-meta'>{metaLine(j)}</div>
                  </div>
                  <div
                    className='col'
                    style={{ alignItems: 'flex-end', gap: 2 }}
                  >
                    <div className='me-list-amount'>
                      {j.budget > 0 ? formatGBP(j.budget) : '—'}
                    </div>
                    <ArrowRight
                      size={14}
                      strokeWidth={1.75}
                      style={{ color: 'var(--me-ink-3)' }}
                    />
                  </div>
                </Link>
              ))}
            </>
          )}
          {doneGroup.length > 0 && (
            <>
              <div className='me-list-section me-list-section-divider'>
                Recently completed
              </div>
              {doneGroup.map((j) => (
                <Link
                  key={j.id}
                  href={`/jobs/${j.id}`}
                  className='job-row'
                  style={{
                    cursor: 'pointer',
                    color: 'inherit',
                    textDecoration: 'none',
                  }}
                >
                  <CategoryThumb category={j.category} />
                  <div className='col' style={{ gap: 4, minWidth: 0 }}>
                    <div className='row' style={{ gap: 8 }}>
                      <h3 className='t-h4'>{j.title}</h3>
                      {statusBadge(j.status)}
                    </div>
                    <div className='t-meta'>{metaLine(j)}</div>
                  </div>
                  <div
                    className='col'
                    style={{ alignItems: 'flex-end', gap: 2 }}
                  >
                    <div className='me-list-amount'>
                      {j.budget > 0 ? formatGBP(j.budget) : '—'}
                    </div>
                    <ArrowRight
                      size={14}
                      strokeWidth={1.75}
                      style={{ color: 'var(--me-ink-3)' }}
                    />
                  </div>
                </Link>
              ))}
            </>
          )}
        </div>
      )}
    </>
  );
}
