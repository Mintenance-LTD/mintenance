/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import {
  Briefcase,
  Check,
  ShieldCheck,
  ArrowRight,
  Droplet,
  Zap,
  Trees,
  Brush,
  Plus,
} from 'lucide-react';
import { formatGBP, type ActiveJob } from './dashboardHelpers';

// `next/image` would need an allow-list for every signed Supabase host,
// and Job-storage signed URLs rotate. The dashboard already serves these
// URLs via the legacy layout with plain <img>, so we stay consistent
// here and disable the lint rule rather than adding remotePatterns.

function CategoryIcon({ category }: { category?: string }) {
  const map: Record<string, { Icon: typeof Droplet; key: string }> = {
    plumbing: { Icon: Droplet, key: 'plumbing' },
    electrical: { Icon: Zap, key: 'electrical' },
    landscaping: { Icon: Trees, key: 'landscape' },
    painting: { Icon: Brush, key: 'painting' },
  };
  const m = map[(category || '').toLowerCase()] || {
    Icon: Briefcase,
    key: 'default',
  };
  const Icon = m.Icon;
  return (
    <div
      className='fallback'
      style={{
        background: `var(--me-cat-${m.key}-bg)`,
        color: `var(--me-cat-${m.key}-fg)`,
      }}
    >
      <Icon size={48} strokeWidth={1.5} />
    </div>
  );
}

function statusBadge(status: string, bidsCount: number) {
  const s = status.toLowerCase();
  if (bidsCount > 0 && (s === 'posted' || s === 'pending')) {
    return <span className='badge badge-info'>{bidsCount} new bids</span>;
  }
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
  return <span className='badge badge-mute'>{status}</span>;
}

function ProjectCard({ job }: { job: ActiveJob }) {
  // Only show the badge when real escrow rows exist for this job
  // (page.tsx sums payments.status='in_escrow' into job.escrowAmount).
  // Previously this was a job.budget proxy that lied when escrow was
  // never funded — and disagreed with the KPI total.
  const held = job.escrowAmount ?? 0;
  const showHeldBadge = held > 0;

  return (
    <article className='me-project-card'>
      <div className='me-project-photo'>
        {job.photoUrl ? (
          <img src={job.photoUrl} alt={job.title} />
        ) : (
          <CategoryIcon category={job.category} />
        )}
        <div className='status-pin'>
          {statusBadge(job.status, job.bidsCount)}
        </div>
      </div>
      <div className='me-project-body'>
        <div>
          <h3 className='me-project-title'>{job.title}</h3>
          <div className='me-project-sub me-project-sub-row'>
            <span className='who'>
              {job.contractor?.name
                ? job.contractor.name
                : (job.category ?? 'Awaiting contractor')}
            </span>
            {showHeldBadge ? (
              <span className='badge badge-brand'>
                <ShieldCheck size={11} strokeWidth={2} /> {formatGBP(held)} held
              </span>
            ) : null}
          </div>
        </div>
        <div className='me-project-budget'>
          <span className='label'>Budget</span>
          <span className='amount'>
            {job.budget > 0 ? formatGBP(job.budget) : '—'}
          </span>
        </div>
        <Link href={`/jobs/${job.id}`} className='btn btn-primary btn-block'>
          {job.bidsCount > 0 ? 'Compare bids' : 'View details'}{' '}
          <ArrowRight size={14} strokeWidth={1.75} />
        </Link>
      </div>
    </article>
  );
}

export function MintEditorialJobsPanel({
  activeJobs,
}: {
  activeJobs: ActiveJob[];
}) {
  const visible = activeJobs.slice(0, 4);

  if (visible.length === 0) {
    return (
      <section>
        <header className='me-section-head'>
          <div className='left'>
            <h2 className='t-h2'>Active projects</h2>
            <p>Track progress on your home improvement projects</p>
          </div>
        </header>
        <div
          className='card'
          style={{
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <p className='t-body' style={{ marginBottom: 12 }}>
            Nothing posted yet. Start with a job and verified tradespeople will
            respond within 24-48h.
          </p>
          <Link href='/jobs/create' className='btn btn-primary'>
            <Plus size={14} strokeWidth={2} /> Post your first job
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section>
      <header className='me-section-head'>
        <div className='left'>
          <h2 className='t-h2'>Active projects</h2>
          <p>Track progress on your home improvement projects</p>
        </div>
        <Link href='/jobs'>
          View all <ArrowRight size={13} strokeWidth={2} />
        </Link>
      </header>
      <div className='me-projects-grid'>
        {visible.map((job) => (
          <ProjectCard key={job.id} job={job} />
        ))}
      </div>
    </section>
  );
}
