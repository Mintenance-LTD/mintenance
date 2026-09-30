'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FollowupForm } from './FollowupForm';
import { PortfolioReport } from './PortfolioReport';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';

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
    <HomeownerPageWrapper className='me-legacy-fit'>
      <main className='mx-auto max-w-6xl space-y-6 py-6'>
        <Link href='/properties' className='text-sm font-medium text-teal-800'>
          Back to properties
        </Link>
        <h1 className='text-3xl font-semibold'>Maintenance action queue</h1>
        <details className='rounded-2xl border bg-white p-5'>
          <summary className='cursor-pointer font-semibold'>
            Portfolio reporting and export
          </summary>
          <PortfolioReport />
        </details>
        <p>
          Open work across your properties, ordered by urgency and date.
          Upcoming maintenance and certificate renewals cover the next 30 days.
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
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <div className='rounded-2xl border bg-white p-5'>
                <p className='text-sm text-slate-600'>Open actions</p>
                <p className='mt-2 text-3xl font-semibold'>{data.total}</p>
              </div>
              <div className='rounded-2xl border bg-teal-50 p-5'>
                <p className='text-sm text-teal-900'>Priority actions</p>
                <p className='mt-2 text-3xl font-semibold text-teal-900'>
                  {data.overdue}
                </p>
              </div>
            </div>
            {data.items.length === 0 ? (
              <div className='rounded-2xl border bg-white p-10 text-center'>
                <h2 className='text-xl font-semibold'>
                  Nothing waiting on this page
                </h2>
                <p className='mt-2 text-slate-600'>
                  New reports, maintenance and renewals will appear here when
                  they need attention.
                </p>
              </div>
            ) : (
              <ul className='divide-y rounded-xl border bg-white'>
                {data.items.map((item) => (
                  <li key={`${item.kind}:${item.id}`} className='p-6 space-y-3'>
                    <p className='text-sm text-gray-600'>
                      {item.property_name} · {item.kind}
                    </p>
                    <h2 className='text-lg font-semibold'>{item.title}</h2>
                    <button
                      className='rounded-lg border px-3 py-2 text-sm font-medium hover:bg-slate-50'
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
                      className='mt-2 inline-flex rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white'
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
    </HomeownerPageWrapper>
  );
}
