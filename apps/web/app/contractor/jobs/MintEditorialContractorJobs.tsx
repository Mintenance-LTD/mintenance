'use client';

/* eslint-disable @next/next/no-img-element */

/**
 * Mint Editorial port of /contractor/jobs (the contractor's job
 * pipeline). Same state + fetch wiring as the legacy view; only
 * presentation changes:
 *   - Header → .t-h1 + .t-body
 *   - Stats → 4 .kpi tiles (Active / Pending / Completed / Total value)
 *   - Filter row → .chip / .chip.on for filter + category
 *   - Empty state → <MintEditorialEmptyState> with CTA to Discover
 *   - Job cards → .card grid with photo thumbnail, status badge,
 *     homeowner + budget meta, primary action button
 *
 * Same JOB_CATEGORIES + filter logic the legacy view uses — this
 * component only receives the resolved list + handlers.
 */

import React from 'react';
import Link from 'next/link';
import { Briefcase, MapPin, Search } from 'lucide-react';
import { formatMoney } from '@/lib/utils/currency';
import { MintEditorialEmptyState } from '@/components/mint-editorial/MintEditorialEmptyState';
import type { Job, JobsFilter, JobStats } from './types';

interface Props {
  filter: JobsFilter;
  setFilter: (f: JobsFilter) => void;
  categoryFilter: string;
  setCategoryFilter: (c: string) => void;
  stats: JobStats;
  loadingStats: boolean;
  jobs: Job[];
  loadingJobs: boolean;
}

const FILTERS: { key: JobsFilter; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'bid', label: 'My bids' },
  { key: 'viewed', label: 'Viewed' },
  { key: 'saved', label: 'Saved' },
  { key: 'completed', label: 'Completed' },
];

const CATEGORIES = [
  { value: 'all', label: 'All trades' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'heating', label: 'Heating' },
  { value: 'carpentry', label: 'Carpentry' },
  { value: 'painting', label: 'Painting' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'gardening', label: 'Gardening' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'handyman', label: 'Handyman' },
] as const;

function statusBadge(status: string) {
  const s = (status || '').toLowerCase();
  if (s === 'in_progress' || s === 'assigned')
    return <span className='badge badge-info'>In progress</span>;
  if (s === 'completed')
    return <span className='badge badge-ok'>Completed</span>;
  if (s === 'posted' || s === 'open')
    return <span className='badge badge-warn'>Available</span>;
  if (s === 'cancelled' || s === 'disputed')
    return <span className='badge badge-err'>{status}</span>;
  return <span className='badge badge-mute'>{status}</span>;
}

function priorityChip(priority: string) {
  const p = (priority || '').toLowerCase();
  if (p === 'emergency' || p === 'urgent')
    return <span className='badge badge-err'>Urgent</span>;
  if (p === 'high') return <span className='badge badge-warn'>High</span>;
  return null;
}

function JobCard({ job }: { job: Job }) {
  const isAssigned = ['assigned', 'in_progress', 'completed'].includes(
    job.status
  );
  const hasPhoto = job.photos && job.photos.length > 0;

  return (
    <article
      className='card'
      style={{
        overflow: 'hidden',
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Photo or category placeholder */}
      <div
        style={{
          position: 'relative',
          height: 180,
          background: 'var(--me-bg-2)',
        }}
      >
        {hasPhoto ? (
          <img
            src={job.photos[0]}
            alt={job.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--me-ink-3)',
            }}
          >
            <Briefcase size={42} strokeWidth={1.5} />
          </div>
        )}
        {hasPhoto && job.photos.length > 1 ? (
          <span
            style={{
              position: 'absolute',
              bottom: 10,
              right: 10,
              padding: '4px 8px',
              borderRadius: 8,
              background: 'rgba(15, 30, 28, 0.62)',
              color: 'var(--me-on-brand)',
              fontSize: 11,
              fontWeight: 600,
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          >
            +{job.photos.length - 1}{' '}
            {job.photos.length - 1 === 1 ? 'photo' : 'photos'}
          </span>
        ) : null}
      </div>

      <div
        className='card-pad'
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        <div className='row' style={{ gap: 6, flexWrap: 'wrap' }}>
          {statusBadge(job.status)}
          {priorityChip(job.priority)}
          {job.category ? (
            <span className='badge badge-mute'>{job.category}</span>
          ) : null}
        </div>
        <h3
          className='t-h4'
          style={{
            fontSize: 15,
            fontWeight: 600,
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            minHeight: 40,
          }}
        >
          {job.title}
        </h3>
        {job.location ? (
          <div
            className='row'
            style={{ gap: 4, color: 'var(--me-ink-3)', fontSize: 12 }}
          >
            <MapPin size={12} strokeWidth={1.75} />
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {job.location}
            </span>
          </div>
        ) : null}
        <div
          className='between'
          style={{ marginTop: 'auto', paddingTop: 4, gap: 8 }}
        >
          <div className='col' style={{ gap: 0 }}>
            <span className='t-meta' style={{ fontSize: 11 }}>
              {isAssigned ? 'Job value' : 'Budget'}
            </span>
            <span className='me-list-amount' style={{ fontSize: 20 }}>
              {job.budget > 0 ? formatMoney(job.budget) : '—'}
            </span>
          </div>
          {isAssigned ? (
            <Link
              href={`/contractor/jobs/${job.id}`}
              className='btn btn-primary btn-sm'
            >
              Manage →
            </Link>
          ) : (
            <Link
              href={`/contractor/bid/${job.id}`}
              className='btn btn-primary btn-sm'
            >
              View & bid →
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export function MintEditorialContractorJobs({
  filter,
  setFilter,
  categoryFilter,
  setCategoryFilter,
  stats,
  loadingStats,
  jobs,
  loadingJobs,
}: Props) {
  return (
    <>
      <div className='col' style={{ gap: 4, marginBottom: 22 }}>
        <h1 className='t-h1'>Your jobs</h1>
        <p className='t-body'>
          Every job you&apos;ve bid on, won, or finished — filtered however you
          need it.
        </p>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 14,
          marginBottom: 22,
        }}
      >
        <div className='kpi'>
          <div className='label'>Active</div>
          <div className='num'>{loadingStats ? '—' : stats.active}</div>
          <div className='sub'>
            <span>currently in flight</span>
          </div>
        </div>
        <div className='kpi'>
          <div className='label'>Pending</div>
          <div className='num'>{loadingStats ? '—' : stats.pending}</div>
          <div className='sub'>
            <span>awaiting homeowner</span>
          </div>
        </div>
        <div className='kpi'>
          <div className='label'>Completed</div>
          <div className='num'>{loadingStats ? '—' : stats.completed}</div>
          <div className='sub'>
            <span>all-time</span>
          </div>
        </div>
        <div className='kpi'>
          <div className='label'>Total value</div>
          <div className='num'>
            {loadingStats ? '—' : formatMoney(stats.totalValue)}
          </div>
          <div className='sub'>
            <span>booked + completed</span>
          </div>
        </div>
      </div>

      {/* Filter row */}
      <div className='col' style={{ gap: 10, marginBottom: 18 }}>
        <div className='row' style={{ gap: 6, flexWrap: 'wrap' }}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type='button'
              className={'chip ' + (filter === f.key ? 'on' : '')}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className='row' style={{ gap: 6, flexWrap: 'wrap' }}>
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type='button'
              className={'chip ' + (categoryFilter === c.value ? 'on' : '')}
              onClick={() => setCategoryFilter(c.value)}
              style={{ fontSize: 12 }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loadingJobs ? (
        <div
          className='card card-pad'
          style={{ textAlign: 'center', padding: '40px 20px' }}
        >
          <p className='t-body'>Loading jobs…</p>
        </div>
      ) : jobs.length === 0 ? (
        <MintEditorialEmptyState
          icon={Search}
          title={
            filter === 'active'
              ? 'No active jobs'
              : filter === 'bid'
                ? 'No bids submitted yet'
                : filter === 'completed'
                  ? 'Nothing completed yet'
                  : `No ${filter} jobs`
          }
          body={
            filter === 'active'
              ? 'Browse Discover to find new work nearby. Mint matches you to jobs in your trades and service area.'
              : filter === 'bid'
                ? 'Submit a bid from Discover to start the pipeline.'
                : 'Check back here once homeowners accept your work and sign off.'
          }
          cta={{
            label: 'Find work to bid on',
            href: '/contractor/discover',
          }}
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}
        >
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </>
  );
}
