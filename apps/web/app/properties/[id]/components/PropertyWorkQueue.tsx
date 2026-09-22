'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  isOpenPropertyJob,
  PROPERTY_JOB_STATUS_LABELS,
} from '@mintenance/shared';

export function PropertyWorkQueue({
  jobs,
}: {
  jobs: {
    id: string;
    title: string;
    status: string;
    contractor?: string | null;
  }[];
}) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('open');
  const [limit, setLimit] = useState(10);
  const openCount = jobs.filter((job) => isOpenPropertyJob(job.status)).length;
  const visible = jobs.filter(
    (job) =>
      (status === 'all' ||
        (status === 'open'
          ? isOpenPropertyJob(job.status)
          : job.status === status)) &&
      `${job.title} ${job.contractor ?? ''}`
        .toLowerCase()
        .includes(search.trim().toLowerCase())
  );
  return (
    <section className='card card-pad' aria-labelledby='property-work-queue'>
      <h3 id='property-work-queue' className='t-h3'>
        Work to follow up · {openCount} open
      </h3>
      <p className='t-meta'>
        Open a job to review bids, messages, scheduling, and its next available
        action.
      </p>
      <div className='flex flex-wrap gap-3 my-4'>
        <label className='flex-1 min-w-0'>
          Search work or contractor
          <input
            className='w-full border rounded-lg p-2'
            type='search'
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setLimit(10);
            }}
          />
        </label>
        <label>
          Work status
          <select
            className='block border rounded-lg p-2'
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setLimit(10);
            }}
          >
            <option value='open'>Open work</option>
            <option value='all'>All work</option>
            {[...new Set(jobs.map((job) => job.status))].map((value) => (
              <option key={value} value={value}>
                {PROPERTY_JOB_STATUS_LABELS[value] || value}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p role='status' className='t-meta'>
        {visible.length} matching {visible.length === 1 ? 'job' : 'jobs'}
      </p>
      {visible.length ? (
        <ul className='divide-y'>
          {visible.slice(0, limit).map((job) => (
            <li
              key={job.id}
              className='py-3 flex flex-wrap justify-between gap-2'
            >
              <div>
                <Link
                  className='font-semibold underline'
                  href={`/jobs/${job.id}`}
                >
                  {job.title}
                </Link>
                <p className='t-meta'>
                  {job.contractor || 'No contractor assigned'}
                </p>
              </div>
              <span>
                {PROPERTY_JOB_STATUS_LABELS[job.status] || job.status}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className='py-3'>
          {jobs.length
            ? 'No jobs match these filters.'
            : 'No work has been recorded for this property.'}
        </p>
      )}
      {visible.length > limit && (
        <button
          type='button'
          className='btn btn-secondary btn-sm'
          onClick={() => setLimit((current) => current + 10)}
        >
          Show more jobs
        </button>
      )}
    </section>
  );
}
