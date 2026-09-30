'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FollowupForm } from './FollowupForm';
import { PortfolioReport } from './PortfolioReport';

interface Item {
  id: string;
  kind: string;
  property_id: string;
  property_name: string;
  title: string;
  status: string;
  next_action: string;
  due_at: string | null;
  can_open_job: boolean;
}
interface Queue {
  items: Item[];
  total: number;
  overdue: number;
  hasMore: boolean;
}

export default function PropertyWorkQueuePage() {
  const [editing, setEditing] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<Queue | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError('');
    fetch(`/api/portfolio/queue?offset=${offset}&limit=25`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            response.status === 401
              ? 'Sign in again to view your queue.'
              : 'Unable to load your queue. Please retry.'
          );
        return response.json() as Promise<Queue>;
      })
      .then(setData)
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, [offset, attempt]);
  return (
    <main className='mx-auto max-w-5xl space-y-6 p-6'>
      <Link href='/properties' className='underline'>
        Back to properties
      </Link>
      <h1 className='text-3xl font-semibold'>Maintenance action queue</h1>
      <details>
        <summary>Portfolio reporting and export</summary>
        <PortfolioReport />
      </details>
      <p>
        Open work across your properties, ordered by urgency and date. Upcoming
        maintenance and certificate renewals cover the next 30 days.
      </p>
      {error ? (
        <div role='alert'>
          {error}{' '}
          <button
            onClick={() => setAttempt((value) => value + 1)}
            className='underline'
          >
            Retry
          </button>
        </div>
      ) : !data ? (
        <p role='status'>Loading your queue…</p>
      ) : (
        <>
          <p>
            {data.total} actions · {data.overdue} priority actions
          </p>
          {data.items.length === 0 ? (
            <p>No actions on this page.</p>
          ) : (
            <ul className='divide-y rounded-xl border bg-white'>
              {data.items.map((item) => (
                <li key={`${item.kind}:${item.id}`} className='p-4'>
                  <p className='text-sm text-gray-600'>
                    {item.property_name} · {item.kind}
                  </p>
                  <h2 className='font-semibold'>{item.title}</h2>
                  <button
                    className='underline'
                    onClick={() =>
                      setEditing(editing === item.id ? null : item.id)
                    }
                  >
                    Manage follow-up
                  </button>
                  {editing === item.id && (
                    <FollowupForm
                      propertyId={item.property_id}
                      kind={item.kind}
                      sourceId={item.id}
                      onSaved={() => setAttempt((value) => value + 1)}
                    />
                  )}
                  <p>
                    {item.next_action}
                    {item.due_at
                      ? ` · ${new Date(item.due_at).toLocaleDateString('en-GB')}`
                      : ''}
                  </p>
                  <Link
                    className='mt-2 inline-block underline'
                    href={
                      item.kind === 'job' && item.can_open_job
                        ? `/jobs/${item.id}`
                        : item.kind === 'report'
                          ? '/landlord/reports'
                          : `/properties/${item.property_id}`
                    }
                  >
                    Review {item.kind}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <nav aria-label='Queue pages' className='flex items-center gap-4'>
            <button
              disabled={offset === 0}
              onClick={() => setOffset((value) => Math.max(0, value - 25))}
              className='rounded border px-4 py-2 disabled:opacity-40'
            >
              Previous
            </button>
            <span>Page {Math.floor(offset / 25) + 1}</span>
            <button
              disabled={!data.hasMore}
              onClick={() => setOffset((value) => value + 25)}
              className='rounded border px-4 py-2 disabled:opacity-40'
            >
              Next
            </button>
          </nav>
        </>
      )}
    </main>
  );
}
