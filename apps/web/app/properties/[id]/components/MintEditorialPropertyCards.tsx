'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Edit3,
  MapPin,
  Plus,
  PoundSterling,
  ShieldAlert,
  Sparkles,
  Star,
} from 'lucide-react';
import { calculatePropertyHealthScore } from '@/lib/utils/property-health-score';

export interface PropertyShape {
  id: string;
  name: string;
  address: string;
  city?: string;
  postcode?: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  yearBuilt: number;
  images: string[];
}

export interface JobItem {
  id: string;
  title: string;
  status: string;
  contractor: string | null;
  amount: number;
  date: string;
  category: string;
}

export interface Stats {
  completedJobs: number;
  activeJobs: number;
  totalSpent: number;
}

export const formatGBP = (n: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(n);

export function fullAddress(p: PropertyShape): string {
  return [p.address, p.city, p.postcode].filter(Boolean).join(', ');
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}
    >
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: 'var(--me-brand-soft)',
          color: 'var(--me-brand)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <div className='col' style={{ gap: 0 }}>
        <div className='t-meta'>{label}</div>
        <div className='me-list-amount' style={{ fontSize: 20 }}>
          {value}
        </div>
      </div>
    </div>
  );
}

// PhotoHero lives in its own file so this module stays under the
// 500-line MDC cap. Re-export here so callers can keep importing
// from MintEditorialPropertyCards.
export { PhotoHero } from './MintEditorialPropertyPhotoHero';

export function PropertyHeader({
  property,
  stats,
}: {
  property: PropertyShape;
  stats: Stats;
}) {
  return (
    <div className='card card-pad-lg' style={{ marginBottom: 18 }}>
      <div className='between' style={{ marginBottom: 16, gap: 16 }}>
        <div className='col' style={{ gap: 4, minWidth: 0 }}>
          <h1 className='t-h1'>{property.name}</h1>
          <div
            className='t-meta'
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <MapPin size={12} strokeWidth={1.75} />
            {fullAddress(property) || 'No address set'}
          </div>
        </div>
        <div className='row' style={{ gap: 8 }}>
          <Link
            href={`/properties/${property.id}/edit`}
            className='btn btn-secondary btn-sm'
            aria-label='Edit property'
          >
            <Edit3 size={13} strokeWidth={1.75} />
          </Link>
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr)) auto',
          gap: 16,
          paddingTop: 12,
          borderTop: '1px solid var(--me-line-2)',
          alignItems: 'center',
        }}
      >
        <StatTile
          icon={<CheckCircle2 size={16} strokeWidth={1.75} />}
          label='Completed'
          value={String(stats.completedJobs)}
        />
        <StatTile
          icon={<Clock size={16} strokeWidth={1.75} />}
          label='Active'
          value={String(stats.activeJobs)}
        />
        <StatTile
          icon={<PoundSterling size={16} strokeWidth={1.75} />}
          label='Total spent'
          value={stats.totalSpent > 0 ? formatGBP(stats.totalSpent) : '—'}
        />
        <Link
          href={`/jobs/create?property_id=${property.id}`}
          className='btn btn-primary'
        >
          <Plus size={14} strokeWidth={2} /> Post a job
        </Link>
      </div>
    </div>
  );
}

export function PropertyDetailsCard({ property }: { property: PropertyShape }) {
  const items: { label: string; value: string }[] = [
    { label: 'Type', value: property.type || '—' },
    {
      label: 'Year built',
      value: property.yearBuilt > 0 ? String(property.yearBuilt) : '—',
    },
    {
      label: 'Bedrooms',
      value: property.bedrooms > 0 ? String(property.bedrooms) : '—',
    },
    {
      label: 'Bathrooms',
      value: property.bathrooms > 0 ? String(property.bathrooms) : '—',
    },
  ];
  if (property.squareFeet > 0) {
    items.push({
      label: 'Floor area',
      value: `${property.squareFeet.toLocaleString('en-GB')} sq ft`,
    });
  }
  return (
    <div className='card card-pad'>
      <h2 className='t-h3' style={{ marginBottom: 14 }}>
        Property details
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 16,
        }}
      >
        {items.map((it) => (
          <div key={it.label} className='col' style={{ gap: 2 }}>
            <div className='t-meta'>{it.label}</div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--me-ink)',
              }}
            >
              {it.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PropertyHealthCard({
  property,
  jobs,
  stats,
}: {
  property: PropertyShape;
  jobs: JobItem[];
  stats: Stats;
}) {
  const completedJobsList = jobs.filter((j) => j.status === 'completed');
  const lastCompletedJob = completedJobsList.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];
  const health = calculatePropertyHealthScore({
    completedJobs: stats.completedJobs,
    activeJobs: stats.activeJobs,
    lastServiceDate: lastCompletedJob?.date || null,
    totalSpent: stats.totalSpent,
    propertyAge: property.yearBuilt
      ? new Date().getFullYear() - property.yearBuilt
      : undefined,
    recentCategories: [
      ...new Set(
        jobs
          .slice(0, 10)
          .map((j) => j.category)
          .filter(Boolean)
      ),
    ],
  });
  const tone =
    health.score >= 80
      ? { fg: 'var(--me-ok-fg)', bg: 'var(--me-ok-bg)' }
      : health.score >= 60
        ? { fg: 'var(--me-brand)', bg: 'var(--me-brand-soft)' }
        : { fg: 'var(--me-warn-fg)', bg: 'var(--me-warn-bg)' };

  return (
    <div className='card card-pad'>
      <div className='t-eyebrow' style={{ marginBottom: 8 }}>
        Property health
      </div>
      <div className='row' style={{ gap: 14, marginBottom: 12 }}>
        <span
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: tone.bg,
            color: tone.fg,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {health.score >= 80 ? (
            <Star size={22} strokeWidth={1.75} />
          ) : (
            <ShieldAlert size={22} strokeWidth={1.75} />
          )}
        </span>
        <div className='col' style={{ gap: 2 }}>
          <div>
            <span className='me-list-amount' style={{ fontSize: 30 }}>
              {health.score}
            </span>
            <span className='t-meta' style={{ marginLeft: 4 }}>
              / 100
            </span>
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: tone.fg,
              textTransform: 'capitalize',
            }}
          >
            {health.grade}
          </div>
        </div>
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 9999,
          background: 'var(--me-bg-3)',
          overflow: 'hidden',
          marginBottom: 14,
        }}
      >
        <div
          style={{
            width: `${health.score}%`,
            height: '100%',
            background: tone.fg,
          }}
        />
      </div>
      {health.recommendations.length > 0 ? (
        <>
          <div className='t-eyebrow' style={{ marginBottom: 8 }}>
            Recommendations
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {health.recommendations.map((r: string) => (
              <li
                key={r}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '6px 0',
                  fontSize: 13,
                  color: 'var(--me-ink-2)',
                }}
              >
                <Sparkles
                  size={12}
                  strokeWidth={1.75}
                  style={{
                    color: 'var(--me-brand)',
                    marginTop: 3,
                    flexShrink: 0,
                  }}
                />
                {r}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

function statusBadge(status: string) {
  const s = (status || '').toLowerCase();
  if (s === 'posted' || s === 'pending')
    return <span className='badge badge-warn'>Awaiting bids</span>;
  if (s === 'assigned' || s === 'in_progress')
    return <span className='badge badge-info'>In progress</span>;
  if (s === 'completed')
    return <span className='badge badge-ok'>Completed</span>;
  return <span className='badge badge-mute'>{status}</span>;
}

export function RecentJobsCard({
  jobs,
  propertyId,
}: {
  jobs: JobItem[];
  propertyId: string;
}) {
  const recent = jobs.slice(0, 6);
  return (
    <div className='card'>
      <div
        className='between'
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--me-line-2)',
        }}
      >
        <h2 className='t-h3'>Jobs at this property · {jobs.length}</h2>
        <Link
          href={`/jobs?property_id=${propertyId}`}
          className='btn btn-ghost btn-sm'
        >
          View all <ArrowRight size={12} strokeWidth={1.75} />
        </Link>
      </div>
      {recent.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <p className='t-body' style={{ marginBottom: 12 }}>
            No jobs yet for this property.
          </p>
          <Link
            href={`/jobs/create?property_id=${propertyId}`}
            className='btn btn-primary'
          >
            <Plus size={14} strokeWidth={2} /> Post the first job
          </Link>
        </div>
      ) : (
        recent.map((j) => (
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
            <div
              className='job-thumb'
              style={{
                background: 'var(--me-cat-default-bg)',
                color: 'var(--me-cat-default-fg)',
              }}
            >
              {j.category.slice(0, 2).toUpperCase()}
            </div>
            <div className='col' style={{ gap: 4, minWidth: 0 }}>
              <div className='row' style={{ gap: 8 }}>
                <h3 className='t-h4'>{j.title}</h3>
                {statusBadge(j.status)}
              </div>
              <div className='t-meta'>
                {j.contractor ? `${j.contractor} · ` : ''}
                {j.date}
              </div>
            </div>
            <div className='me-list-amount'>
              {j.amount > 0 ? formatGBP(j.amount) : '—'}
            </div>
          </Link>
        ))
      )}
    </div>
  );
}
