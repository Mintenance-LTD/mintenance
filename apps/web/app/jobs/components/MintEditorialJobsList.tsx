'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import styles from './jobs-list.module.css';
import {
  isCancelledJob,
  type JobWorkspaceStatus,
} from '@/lib/jobs/workspace-status';
import {
  matchesWorkspaceSearch,
  workspaceLocation,
  type WorkspaceLocation,
} from '@/lib/jobs/workspace-location';
import {
  workspaceHref,
  workspaceJobHref,
  type WorkspaceFilters,
  type WorkspaceScope,
  type WorkspaceView,
} from '@/lib/jobs/workspace-navigation';
import {
  Plus,
  ArrowRight,
  Check,
  Droplet,
  Zap,
  Trees,
  Brush,
  Briefcase,
  Search,
} from 'lucide-react';

interface JobListItem extends WorkspaceLocation {
  id: string;
  title: string;
  status: string;
  budget: number;
  category?: string;
  created_at: string;
  contractor_id?: string;
  workspaceStatus?: JobWorkspaceStatus;
}

interface Props {
  jobs: JobListItem[];
  initialCategory?: string;
  scoped?: boolean;
  scope?: WorkspaceScope;
  filters?: WorkspaceFilters;
  onFiltersChange?: (filters: WorkspaceFilters) => void;
}

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
  if (s === 'assigned')
    return (
      <span className='badge badge-info'>Assigned — work not started</span>
    );
  if (s === 'in_progress') {
    return <span className='badge badge-info'>In progress</span>;
  }
  if (s === 'completed') {
    return (
      <span className='badge badge-ok'>
        <Check size={11} strokeWidth={2.5} /> Completed
      </span>
    );
  }
  if (s === 'cancelled' || s === 'canceled' || s === 'disputed') {
    return (
      <span className='badge badge-err'>
        {s === 'disputed' ? 'Disputed' : 'Cancelled'}
      </span>
    );
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
  const where = workspaceLocation(job) || 'Location not set';
  return `${where} · ${when}`;
}

function JobRow({ job, listHref }: { job: JobListItem; listHref: string }) {
  return (
    <Link
      href={workspaceJobHref(job.id, listHref)}
      className={styles.jobRow}
      data-testid='job-card'
    >
      <CategoryThumb category={job.category} />
      <div className={styles.details}>
        <div className={styles.heading}>
          <h3 className='t-h4'>{job.title}</h3>
          {statusBadge(job.workspaceStatus?.disputed ? 'disputed' : job.status)}
        </div>
        <p className={styles.meta}>{metaLine(job)}</p>
        {job.workspaceStatus && (
          <p
            className={
              job.workspaceStatus.needsAttention
                ? styles.attention
                : styles.meta
            }
          >
            {job.workspaceStatus.label}
          </p>
        )}
      </div>
      <ArrowRight className={styles.arrow} size={18} aria-hidden='true' />
    </Link>
  );
}

const TABS: {
  id: WorkspaceView;
  label: string;
  match: (job: JobListItem) => boolean;
}[] = [
  { id: 'all', label: 'All', match: () => true },
  {
    id: 'attention',
    label: 'Needs attention',
    match: (job) => job.workspaceStatus?.needsAttention === true,
  },
  {
    id: 'awaiting',
    label: 'Awaiting bids',
    match: ({ status }) => status === 'posted' || status === 'pending',
  },
  {
    id: 'active',
    label: 'Assigned / in progress',
    match: ({ status }) => status === 'in_progress' || status === 'assigned',
  },
  { id: 'done', label: 'Done', match: ({ status }) => status === 'completed' },
  {
    id: 'cancelled',
    label: 'Cancelled',
    match: ({ status }) => isCancelledJob(status),
  },
];

export function MintEditorialJobsList({
  jobs,
  initialCategory = 'all',
  scoped = false,
  scope,
  filters,
  onFiltersChange,
}: Props) {
  const [internalFilters, setInternalFilters] = useState<WorkspaceFilters>({
    view: 'all',
    category: initialCategory,
    query: '',
  });
  const currentFilters = filters ?? internalFilters;
  const { view, category, query } = currentFilters;
  const activeTab = TABS.find((tab) => tab.id === view) ?? TABS[0];
  const updateFilters = onFiltersChange ?? setInternalFilters;
  const listHref = workspaceHref(currentFilters, scope);
  const categories = useMemo(
    () =>
      [
        ...new Set(
          [
            ...jobs.map((job) => job.category),
            initialCategory !== 'all' ? initialCategory : undefined,
          ].filter((value): value is string => !!value)
        ),
      ].sort(),
    [jobs, initialCategory]
  );

  const counts = useMemo(
    () =>
      Object.fromEntries(
        TABS.map((t) => [t.id, jobs.filter(t.match).length])
      ) as Record<WorkspaceView, number>,
    [jobs]
  );

  const visible = useMemo(() => {
    return jobs.filter(
      (j) =>
        activeTab.match(j) &&
        (category === 'all' || j.category === category) &&
        matchesWorkspaceSearch(j, query)
    );
  }, [jobs, activeTab, category, query]);

  // Split visible jobs into "active-ish" (everything except completed) and
  // "recently completed" — matches the design's two grouped sections.
  const isCompleted = (s: string) => s.toLowerCase() === 'completed';
  const activeGroup = visible.filter(
    (j) => !isCompleted(j.status) && !isCancelledJob(j.status)
  );
  const closedGroup = visible.filter((j) => isCancelledJob(j.status));
  const doneGroup = visible.filter((j) => isCompleted(j.status));
  const noJobs =
    jobs.length === 0 &&
    !scoped &&
    activeTab.id === 'all' &&
    category === 'all' &&
    !query;

  return (
    <>
      {/* Page header */}
      <div className={`between ${styles.header}`} style={{ marginBottom: 18 }}>
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
              className={'chip ' + (activeTab.id === t.id ? 'on' : '')}
              aria-pressed={activeTab.id === t.id}
              onClick={() => updateFilters({ ...currentFilters, view: t.id })}
            >
              {t.label} · {counts[t.id]}
            </button>
          ))}
        </div>
      </div>

      {/* Top actions row */}
      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Search size={16} aria-hidden='true' />
          <input
            aria-label='Search jobs by title or property'
            type='search'
            placeholder='Search title or property'
            maxLength={120}
            value={query}
            onChange={(event) =>
              updateFilters({ ...currentFilters, query: event.target.value })
            }
          />
        </label>
        <label className='row' style={{ gap: 8 }}>
          Category
          <select
            aria-label='Filter jobs by category'
            className='btn btn-secondary btn-sm'
            value={category}
            onChange={(event) =>
              updateFilters({ ...currentFilters, category: event.target.value })
            }
          >
            <option value='all'>All categories</option>
            {categories.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
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
            {noJobs
              ? 'No jobs yet. Post your first one and local tradespeople will respond.'
              : 'No jobs match this filter.'}
          </p>
          {noJobs ? (
            <Link href='/jobs/create' className='btn btn-primary'>
              <Plus size={14} strokeWidth={2} /> Post your first job
            </Link>
          ) : scoped ? (
            <Link href='/jobs' className='btn btn-secondary'>
              See all jobs
            </Link>
          ) : (
            <button
              type='button'
              className='btn btn-secondary'
              onClick={() =>
                updateFilters({ view: 'all', category: 'all', query: '' })
              }
            >
              See all jobs
            </button>
          )}
        </div>
      ) : (
        <div className='card'>
          {[
            { label: 'Active', jobs: activeGroup },
            { label: 'Cancelled', jobs: closedGroup },
            { label: 'Recently completed', jobs: doneGroup },
          ]
            .filter((group) => group.jobs.length > 0)
            .map((group) => (
              <section key={group.label} aria-label={`${group.label} jobs`}>
                <div className={`me-list-section ${styles.sectionHeading}`}>
                  <span>{group.label}</span>
                  <span>{group.jobs.length}</span>
                </div>
                {group.jobs.map((job) => (
                  <JobRow key={job.id} job={job} listHref={listHref} />
                ))}
              </section>
            ))}
        </div>
      )}
    </>
  );
}
