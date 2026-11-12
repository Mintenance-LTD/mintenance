'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  ArrowRight,
  Wrench,
  Info,
  Layers,
  Briefcase,
  Check,
  X,
  Coins,
} from 'lucide-react';
import {
  isOpenPropertyJob,
  PROPERTY_JOB_STATUS_LABELS,
} from '@mintenance/shared';
import { formatGBP, type JobItem } from './MintEditorialPropertyCards';
import { WorkspaceBadge } from './PropertyWorkspacePrimitives';
export function MintEditorialPropertyTimeline({ jobs }: { jobs: JobItem[] }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [period, setPeriod] = useState('all');
  const [sort, setSort] = useState('newest');
  const years = [
    ...new Set(
      jobs.map((j) => new Date(j.date).getFullYear()).filter(Number.isFinite)
    ),
  ].sort((a, b) => b - a);
  const visible = jobs
    .filter(
      (j) =>
        Number.isFinite(new Date(j.date).getTime()) &&
        j.title.toLowerCase().includes(query.toLowerCase()) &&
        (status === 'all' ||
          (status === 'open'
            ? isOpenPropertyJob(j.status)
            : j.status === status)) &&
        (period === 'all' || String(new Date(j.date).getFullYear()) === period)
    )
    .sort(
      (a, b) =>
        (new Date(b.date).getTime() - new Date(a.date).getTime()) *
        (sort === 'newest' ? 1 : -1)
    );
  const groups = new Map<string, JobItem[]>();
  visible.forEach((j) => {
    const key = new Date(j.date).toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric',
    });
    groups.set(key, [...(groups.get(key) ?? []), j]);
  });
  const completed = jobs.filter((j) => j.status === 'completed');
  const total = completed.reduce((sum, j) => sum + (j.amount || 0), 0);
  return (
    <div className='pw-stack'>
      <div className='pw-toolbar'>
        <label className='pw-search'>
          <Search size={20} />
          <input
            placeholder='Search activity…'
            aria-label='Search activity'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          className='pw-field'
          aria-label='Activity status'
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value='all'>All activity</option>
          <option value='open'>Open jobs</option>
          <option value='completed'>Completed jobs</option>
          <option value='cancelled'>Cancelled jobs</option>
        </select>
        <select
          className='pw-field'
          aria-label='Activity year'
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value='all'>All dates</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          className='pw-field'
          aria-label='Sort activity'
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value='newest'>Newest first</option>
          <option value='oldest'>Oldest first</option>
        </select>
      </div>
      <div className='pw-split'>
        <section className='pw-card' aria-label='Property activity'>
          <p className='pw-notice'>
            <Info size={20} />
            Showing recorded creation events. Status labels reflect the current
            job status.
          </p>
          {[...groups].map(([month, entries]) => (
            <div className='pw-timeline-group' key={month}>
              <h2 className='pw-month'>{month}</h2>
              {entries.map((j) => (
                <article className='pw-event' key={j.id}>
                  <span className='pw-icon'>
                    <Wrench size={25} />
                  </span>
                  <div className='pw-event-content'>
                    <h3>
                      {j.category
                        ? j.category.charAt(0).toUpperCase() +
                          j.category.slice(1)
                        : 'Maintenance'}{' '}
                      job created
                    </h3>
                    <p className='pw-muted'>{j.title}</p>
                    <WorkspaceBadge
                      tone={j.status === 'cancelled' ? 'neutral' : ''}
                    >
                      Current status:{' '}
                      {PROPERTY_JOB_STATUS_LABELS[j.status] || j.status}
                    </WorkspaceBadge>
                  </div>
                  <Link href={`/jobs/${j.id}`} className='pw-btn pw-btn-small'>
                    View job <ArrowRight size={16} />
                  </Link>
                </article>
              ))}
            </div>
          ))}
          {!visible.length && (
            <div className='pw-empty'>
              <Wrench size={28} />
              <h3>
                {jobs.length ? 'No matching activity' : 'No activity yet'}
              </h3>
              <p>
                {jobs.length
                  ? 'Try another search or date filter.'
                  : 'Jobs created for this property will appear here.'}
              </p>
            </div>
          )}
        </section>
        <aside className='pw-stack'>
          <section className='pw-card'>
            <h2>Job summary</h2>
            {[
              { label: 'Total jobs', value: jobs.length, icon: Layers },
              {
                label: 'Open',
                value: jobs.filter((j) => isOpenPropertyJob(j.status)).length,
                icon: Briefcase,
              },
              { label: 'Completed', value: completed.length, icon: Check },
              {
                label: 'Cancelled',
                value: jobs.filter((j) => j.status === 'cancelled').length,
                icon: X,
              },
            ].map(({ label, value, icon: Icon }) => (
              <div className='pw-summary-row' key={label}>
                <span className='pw-icon'>
                  <Icon size={23} />
                </span>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </section>
          <section className='pw-card'>
            <h2>Budget summary</h2>
            <div className='pw-summary-row'>
              <span className='pw-icon'>
                <Coins />
              </span>
              <span>Completed job budgets</span>
              <strong>{formatGBP(total)}</strong>
            </div>
            <div className='pw-summary-row'>
              <span>Average completed-job budget</span>
              <strong>
                {completed.length ? formatGBP(total / completed.length) : '—'}
              </strong>
            </div>
            <p className='pw-muted' style={{ marginTop: 14 }}>
              Budgets, not confirmed payments.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
