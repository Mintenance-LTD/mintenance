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

function JobThumb({ category }: { category?: string }) {
  const map: Record<string, { Icon: typeof Droplet; key: string }> = {
    plumbing: { Icon: Droplet, key: 'plumbing' },
    electrical: { Icon: Zap, key: 'electrical' },
    landscaping: { Icon: Trees, key: 'landscape' },
    painting: { Icon: Brush, key: 'painting' },
  };
  const lookup = (category || '').toLowerCase();
  const m = map[lookup] || { Icon: Briefcase, key: 'default' };
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

export function MintEditorialJobsPanel({
  activeJobs,
}: {
  activeJobs: ActiveJob[];
}) {
  const visible = activeJobs.slice(0, 4);

  return (
    <div className='card'>
      <div
        className='between'
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--me-line-2)',
        }}
      >
        <h2 className='t-h3'>Your jobs</h2>
        <div className='row' style={{ gap: 4 }}>
          <span className='chip on'>All · {activeJobs.length}</span>
        </div>
      </div>
      {visible.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <p className='t-body'>
            Nothing posted yet. Start with a job and verified tradespeople will
            respond within 24-48h.
          </p>
          <Link
            href='/jobs/create'
            className='btn btn-primary'
            style={{ marginTop: 12 }}
          >
            <Plus size={14} strokeWidth={2} /> Post your first job
          </Link>
        </div>
      ) : (
        <div>
          {visible.map((job) => (
            <div key={job.id} className='job-row'>
              <JobThumb category={job.category} />
              <div className='col' style={{ gap: 4, minWidth: 0 }}>
                <div className='row' style={{ gap: 8 }}>
                  <h3 className='t-h4'>{job.title}</h3>
                  {statusBadge(job.status, job.bidsCount)}
                  {(job.status === 'in_progress' ||
                    job.status === 'assigned') &&
                    job.budget > 0 && (
                      <span className='badge badge-brand'>
                        <ShieldCheck size={11} strokeWidth={2} />{' '}
                        {formatGBP(job.budget)} held
                      </span>
                    )}
                </div>
                <div className='t-meta'>
                  {job.contractor?.name
                    ? `${job.contractor.name}`
                    : 'Awaiting contractor'}
                  {job.budget > 0 ? ` · ${formatGBP(job.budget)}` : ''}
                  {job.scheduledDate
                    ? ` · Scheduled ${new Date(
                        job.scheduledDate
                      ).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}`
                    : ''}
                </div>
              </div>
              <Link
                href={`/jobs/${job.id}`}
                className='btn btn-secondary btn-sm'
              >
                {job.bidsCount > 0 ? 'Compare bids' : 'View'}{' '}
                <ArrowRight size={13} strokeWidth={1.75} />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
