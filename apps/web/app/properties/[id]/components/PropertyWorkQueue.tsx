'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Search, ArrowRight } from 'lucide-react';
import {
  isOpenPropertyJob,
  PROPERTY_JOB_STATUS_LABELS,
} from '@mintenance/shared';
import { WorkspaceBadge } from './PropertyWorkspacePrimitives';
export function PropertyWorkQueue({
  jobs,
}: {
  jobs: {
    id: string;
    title: string;
    status: string;
    contractor?: string | null;
    category?: string;
  }[];
}) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('open');
  const [limit, setLimit] = useState(10);
  const openCount = jobs.filter((j) => isOpenPropertyJob(j.status)).length;
  const visible = jobs.filter(
    (j) =>
      (status === 'all' ||
        (status === 'open'
          ? isOpenPropertyJob(j.status)
          : j.status === status)) &&
      `${j.title} ${j.contractor ?? ''}`
        .toLowerCase()
        .includes(search.trim().toLowerCase())
  );
  return (
    <section className='pw-card' aria-labelledby='property-work-queue'>
      <h3 id='property-work-queue'>Property jobs</h3>
      <div className='pw-between' style={{ margin: '16px 0' }}>
        <div className='pw-tabs' aria-label='Filter property jobs'>
          {[
            { id: 'open', label: `Open (${openCount})` },
            {
              id: 'completed',
              label: `Completed (${jobs.filter((j) => j.status === 'completed').length})`,
            },
            { id: 'all', label: `All (${jobs.length})` },
          ].map((t) => (
            <button
              key={t.id}
              aria-pressed={status === t.id}
              style={{
                color: status === t.id ? 'var(--pw-green)' : undefined,
                borderBottomColor:
                  status === t.id ? 'var(--pw-green)' : undefined,
              }}
              onClick={() => {
                setStatus(t.id);
                setLimit(10);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label className='pw-search'>
          <Search size={18} />
          <input
            aria-label='Search work or contractor'
            placeholder='Search jobs…'
            type='search'
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setLimit(10);
            }}
          />
        </label>
        <select
          className='pw-field'
          aria-label='Work status'
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setLimit(10);
          }}
        >
          <option value='open'>Open work</option>
          <option value='all'>All work</option>
          {[...new Set(['completed', ...jobs.map((j) => j.status)])].map(
            (v) => (
              <option key={v} value={v}>
                {PROPERTY_JOB_STATUS_LABELS[v] || v}
              </option>
            )
          )}
        </select>
      </div>
      <div className='pw-table-wrap'>
        <table className='pw-table'>
          <thead>
            <tr>
              <th>Job</th>
              <th>Status</th>
              <th>Next step</th>
            </tr>
          </thead>
          <tbody>
            {visible.slice(0, limit).map((j) => (
              <tr key={j.id}>
                <td>
                  <Link href={`/jobs/${j.id}`}>{j.title}</Link>
                  <p className='pw-muted'>
                    {j.category || j.contractor || 'No contractor assigned'}
                  </p>
                </td>
                <td>
                  <WorkspaceBadge
                    tone={j.status === 'cancelled' ? 'neutral' : ''}
                  >
                    {PROPERTY_JOB_STATUS_LABELS[j.status] || j.status}
                  </WorkspaceBadge>
                </td>
                <td>
                  <Link className='pw-btn pw-btn-small' href={`/jobs/${j.id}`}>
                    View job <ArrowRight size={15} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!visible.length && (
        <p className='pw-empty'>
          {jobs.length
            ? 'No jobs match these filters.'
            : 'No work has been recorded for this property.'}
        </p>
      )}
      <div className='pw-between pw-footer'>
        <p role='status'>
          {visible.length} matching {visible.length === 1 ? 'job' : 'jobs'}
        </p>
        {visible.length > limit && (
          <button
            className='pw-btn pw-btn-small'
            onClick={() => setLimit((v) => v + 10)}
          >
            Show more jobs
          </button>
        )}
      </div>
    </section>
  );
}
