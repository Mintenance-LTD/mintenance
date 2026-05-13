'use client';

/* eslint-disable @next/next/no-img-element */
import {
  MapPin,
  Tag,
  Calendar,
  Check,
  ShieldCheck,
  Briefcase,
  Droplet,
  Zap,
  Trees,
  Brush,
  Flame,
  Hammer,
} from 'lucide-react';
import type { LifecyclePhase, NextStepInfo } from './jobDetailHelpers';

// next/image needs a remotePatterns allow-list for signed Supabase
// URLs that rotate; the legacy detail page already serves these via
// plain <img>, so we stay consistent and silence the lint.

export interface JobShape {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority?: string;
  budget: number;
  location: string;
  created_at: string;
  /** Set when the contractor marks the job complete. Used by the
   *  Timeline tab to render the "Job complete" event. Null while
   *  the job is still posted / in flight. */
  completed_at?: string | null;
  /** Homeowner's preferred start date, stashed during job creation
   *  in `jobs.requirements.preferred_start_date` until a dedicated
   *  column ships. ISO date string (YYYY-MM-DD). */
  preferred_start_date?: string | null;
  contractor_id?: string;
}

export interface ContractorShape {
  id?: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  profile_image_url?: string | null;
  admin_verified?: boolean;
  company_name?: string | null;
  license_number?: string | null;
}

export interface PropertyShape {
  id?: string;
  property_name?: string | null;
  address?: string | null;
  // Access & contacts (migration 20260520000003) — shown on the
  // homeowner's job detail when the job is at a stage where the
  // contractor can see them, so the homeowner can confirm what
  // they've shared.
  access_mode?: 'key_safe' | 'smart_lock' | 'in_person' | null;
  key_safe_code?: string | null;
  access_notes?: string | null;
  stopcock_location?: string | null;
  gas_isolator_location?: string | null;
  consumer_unit_location?: string | null;
}

export const formatGBP = (n: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(n);

export const formatPosted = (iso: string): string => {
  const d = new Date(iso);
  const days = Math.round((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Posted today';
  if (days === 1) return 'Posted yesterday';
  return `Posted ${days} days ago`;
};

const CATEGORY_ICONS: Record<string, { Icon: typeof Droplet; key: string }> = {
  plumbing: { Icon: Droplet, key: 'plumbing' },
  electrical: { Icon: Zap, key: 'electrical' },
  heating: { Icon: Flame, key: 'electrical' },
  landscaping: { Icon: Trees, key: 'landscape' },
  gardening: { Icon: Trees, key: 'landscape' },
  painting: { Icon: Brush, key: 'painting' },
  carpentry: { Icon: Hammer, key: 'painting' },
};

export function getCategorySwatch(category: string) {
  return (
    CATEGORY_ICONS[(category || '').toLowerCase()] || {
      Icon: Briefcase,
      key: 'default',
    }
  );
}

export function statusBadge(status: string) {
  const s = (status || '').toLowerCase();
  if (s === 'posted' || s === 'pending') {
    return <span className='badge badge-warn'>Awaiting bids</span>;
  }
  if (s === 'assigned' || s === 'in_progress') {
    return <span className='badge badge-info'>In progress</span>;
  }
  if (s === 'completed') {
    return (
      <span className='badge badge-ok'>
        <Check size={11} strokeWidth={2.5} /> Completed
      </span>
    );
  }
  return <span className='badge badge-mute'>{status}</span>;
}

export function contractorName(c: ContractorShape | null | undefined): string {
  if (!c) return '';
  if (c.company_name) return c.company_name;
  const name = `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim();
  return name || c.email || 'Contractor';
}

function InfoItem({
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
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        minWidth: 0,
      }}
    >
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'var(--me-bg-2)',
          color: 'var(--me-ink-2)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <div className='col' style={{ gap: 2, minWidth: 0 }}>
        <div className='t-meta'>{label}</div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--me-ink)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

export function JobInfoStrip({
  job,
  property,
}: {
  job: JobShape;
  property?: PropertyShape | null;
}) {
  return (
    <div className='card card-pad'>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 18,
        }}
      >
        <InfoItem
          icon={<MapPin size={16} strokeWidth={1.75} />}
          label='Location'
          value={property?.address || job.location || 'Not set'}
        />
        <InfoItem
          icon={<Tag size={16} strokeWidth={1.75} />}
          label='Category'
          value={job.category || 'General'}
        />
        <InfoItem
          icon={<Calendar size={16} strokeWidth={1.75} />}
          label='Posted'
          value={new Date(job.created_at).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        />
      </div>
    </div>
  );
}

export function DescriptionCard({ description }: { description: string }) {
  return (
    <div className='card card-pad'>
      <h2 className='t-h3' style={{ marginBottom: 10 }}>
        Job description
      </h2>
      <p className='t-body' style={{ whiteSpace: 'pre-wrap' }}>
        {description || 'No description provided.'}
      </p>
    </div>
  );
}

export function ContractorCard({
  contractor,
}: {
  contractor: ContractorShape;
}) {
  const name = contractorName(contractor);
  const initials =
    name
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'C';
  return (
    <div className='card card-pad'>
      <h2 className='t-h3' style={{ marginBottom: 14 }}>
        Assigned contractor
      </h2>
      <div className='row' style={{ gap: 14 }}>
        {contractor.profile_image_url ? (
          <img
            src={contractor.profile_image_url}
            alt={name}
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <span
            className='avatar avatar-lg'
            style={{
              background: 'var(--me-brand)',
              color: 'var(--me-on-brand)',
            }}
          >
            {initials}
          </span>
        )}
        <div className='col' style={{ gap: 4, flex: 1, minWidth: 0 }}>
          <div className='row' style={{ gap: 8, flexWrap: 'wrap' }}>
            <h3 className='t-h4'>{name}</h3>
            {contractor.admin_verified ? (
              <span className='badge badge-brand'>
                <ShieldCheck size={11} strokeWidth={2} /> Verified
              </span>
            ) : null}
          </div>
          {contractor.license_number ? (
            <div className='t-meta'>License: {contractor.license_number}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function JobProgressCard({ phases }: { phases: LifecyclePhase[] }) {
  return (
    <div className='card card-pad'>
      <div className='t-eyebrow' style={{ marginBottom: 12 }}>
        Job progress
      </div>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {phases.map((p) => {
          const isDone = p.status === 'done';
          const isCurrent = p.status === 'current';
          return (
            <li
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 0',
                color:
                  isDone || isCurrent ? 'var(--me-ink)' : 'var(--me-ink-3)',
                fontSize: 13,
                fontWeight: isCurrent ? 600 : 400,
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: isDone
                    ? 'var(--me-brand)'
                    : isCurrent
                      ? 'var(--me-brand-soft)'
                      : 'var(--me-bg-3)',
                  color: isDone
                    ? 'var(--me-on-brand)'
                    : isCurrent
                      ? 'var(--me-brand)'
                      : 'var(--me-ink-3)',
                  border: isCurrent ? '2px solid var(--me-brand)' : 'none',
                }}
              >
                {isDone ? <Check size={11} strokeWidth={3} /> : null}
              </span>
              {p.label}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function NextStepCard({ step }: { step: NextStepInfo }) {
  return (
    <div
      className='card card-pad'
      style={{
        background: 'var(--me-brand-soft)',
        borderColor: 'transparent',
      }}
    >
      <div className='t-eyebrow' style={{ marginBottom: 6 }}>
        Next step
      </div>
      <h2 className='t-h4' style={{ marginBottom: 6 }}>
        {step.title}
      </h2>
      <p className='t-body' style={{ fontSize: 13, color: 'var(--me-ink-2)' }}>
        {step.body}
      </p>
      {step.cta ? (
        <a
          href={step.cta.href}
          className='btn btn-primary btn-sm'
          style={{ marginTop: 12, justifyContent: 'center' }}
        >
          {step.cta.label}
        </a>
      ) : null}
    </div>
  );
}

export function BudgetCard({ budget }: { budget: number }) {
  return (
    <div className='card card-pad'>
      <div className='t-eyebrow' style={{ marginBottom: 6 }}>
        Budget
      </div>
      <div className='me-list-amount' style={{ fontSize: 28 }}>
        {budget > 0 ? formatGBP(budget) : '—'}
      </div>
      <p className='t-meta' style={{ marginTop: 4 }}>
        Total budget for this job
      </p>
    </div>
  );
}
