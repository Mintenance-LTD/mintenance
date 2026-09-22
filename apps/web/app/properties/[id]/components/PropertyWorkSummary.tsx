'use client';
import {
  PROPERTY_JOB_STATUS_LABELS,
  isOpenPropertyJob,
} from '@mintenance/shared';
import { useState } from 'react';
import Link from 'next/link';

interface WorkItem {
  id: string;
  title: string;
  status: string;
}
export function PropertyWorkSummary({ jobs }: { jobs: WorkItem[] }) {
  const [filter, setFilter] = useState('open');
  const open = jobs.filter((job) => isOpenPropertyJob(job.status));
  const visible = filter === 'all' ? jobs : open;
  return (
    <section
      className='rounded-2xl border border-gray-200 bg-white p-6'
      aria-labelledby='property-work-heading'
    >
      <h2 id='property-work-heading' className='text-lg font-semibold'>
        Work at this property
      </h2>
      <p className='mt-2 text-sm text-gray-600'>
        Job records describe maintenance activity. They do not establish the
        physical condition or safety of this property.
      </p>
      <div
        className='my-4 flex flex-wrap gap-2'
        role='group'
        aria-label='Filter property work'
      >
        <button
          type='button'
          className='rounded-lg border px-3 py-2'
          aria-pressed={filter === 'open'}
          onClick={() => setFilter('open')}
        >
          Open jobs ({open.length})
        </button>
        <button
          type='button'
          className='rounded-lg border px-3 py-2'
          aria-pressed={filter === 'all'}
          onClick={() => setFilter('all')}
        >
          All jobs ({jobs.length})
        </button>
      </div>
      {visible.length === 0 ? (
        <p className='text-sm text-gray-600'>
          {filter === 'open'
            ? 'No open jobs recorded.'
            : 'No jobs recorded for this property.'}
        </p>
      ) : (
        <ul className='divide-y divide-gray-200'>
          {visible.map((job) => (
            <li key={job.id}>
              <Link
                className='flex items-center justify-between gap-3 py-3 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2'
                href={`/jobs/${encodeURIComponent(job.id)}`}
              >
                <span>{job.title}</span>
                <span className='shrink-0 text-sm text-gray-600'>
                  {PROPERTY_JOB_STATUS_LABELS[job.status] ??
                    'Status unavailable'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
