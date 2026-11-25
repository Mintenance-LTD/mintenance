'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  useAdminFetch,
  AdminVerificationCancelledError,
} from '@/components/admin/AdminVerificationProvider';
import { getCsrfHeaders } from '@/lib/csrf-client';

export type EvidenceReviewFilter = 'all' | 'overdue' | 'soon' | 'held';
type Review = {
  id: string;
  kind: 'contract' | 'dispute';
  title: string;
  review_due_at: string;
  revision: number;
  legal_hold: boolean;
  reason?: string;
};

const labels: Record<EvidenceReviewFilter, string> = {
  all: 'All reviews',
  overdue: 'Overdue',
  soon: 'Due soon',
  held: 'Held',
};
const key = ['admin', 'evidence-retention'] as const;
const date = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeZone: 'Europe/London',
});
const endpoint = '/api/admin/evidence-retention';

class EvidenceSessionExpired extends Error {}

async function read<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, cache: 'no-store' });
  if (response.status === 401)
    throw new EvidenceSessionExpired('Your admin session has expired.');
  if (!response.ok) throw new Error('Unable to load reviews. Please retry.');
  return response.json();
}

export function EvidenceReviewQueue({
  initialFilter = 'all',
}: {
  initialFilter?: EvidenceReviewFilter;
}) {
  const queryClient = useQueryClient();
  const adminFetch = useAdminFetch();
  const [filter, setFilter] = useState(initialFilter);
  const [selected, setSelected] = useState<Pick<Review, 'id' | 'kind'> | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState<Error | null>(null);
  const queue = useInfiniteQuery({
    queryKey: [...key, 'queue', filter],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams({ filter });
      if (pageParam) params.set('after', pageParam);
      return read<{ records: Review[]; next: string | null }>(
        endpoint + '?' + params,
        signal
      );
    },
    getNextPageParam: (last) => last.next ?? undefined,
    retry: false,
  });
  const detail = useQuery({
    queryKey: [...key, 'record', selected?.kind, selected?.id],
    enabled: !!selected,
    queryFn: ({ signal }) =>
      read<{ review: Review }>(
        endpoint +
          '?' +
          new URLSearchParams({ kind: selected!.kind, id: selected!.id }),
        signal
      ),
    retry: false,
  });
  const row = detail.data?.review;
  const sessionExpired = [queue.error, detail.error, actionError].some(
    (error) => error instanceof EvidenceSessionExpired
  );
  const signIn =
    '/admin/login?redirect=' +
    encodeURIComponent('/admin/evidence-retention?filter=' + filter);

  async function save(form: HTMLFormElement, record: Review) {
    if (saving) return;
    setSaving(true);
    setActionError(null);
    setNotice('');
    try {
      const fields = new FormData(form);
      const chosen = new Date(String(fields.get('date')) + 'T12:00:00Z');
      if (!Number.isFinite(chosen.valueOf()))
        throw new Error('Enter the next review date.');
      const response = await adminFetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getCsrfHeaders()),
        },
        body: JSON.stringify({
          kind: record.kind,
          id: record.id,
          revision: record.revision,
          legalHold: fields.get('hold') === 'on',
          reason: String(fields.get('reason')),
          reviewDueAt: chosen.toISOString(),
        }),
      });
      if (response.status === 401)
        throw new EvidenceSessionExpired('Your admin session has expired.');
      const result = await response.json().catch(() => null);
      if (
        !response.ok ||
        result?.success !== true ||
        result.revision !== record.revision + 1
      )
        throw new Error(
          result?.error?.message ??
            'Review was not confirmed. Reload before retrying.'
        );
      setSelected(null);
      setNotice('Review saved. Evidence remains retained.');
      await queryClient.resetQueries({ queryKey: [...key, 'queue'] });
      queryClient.removeQueries({
        queryKey: [...key, 'record', record.kind, record.id],
      });
    } catch (error) {
      setActionError(
        error instanceof Error ? error : new Error('Review could not be saved.')
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className='mx-auto max-w-6xl space-y-5 p-6'>
      <header className='space-y-2'>
        <h1 className='text-3xl font-semibold'>Evidence reviews</h1>
        <p>
          Review deadlines are for checking whether to keep the evidence. They
          never schedule deletion.
        </p>
        <nav
          className='flex flex-wrap gap-4'
          aria-label='Other evidence workflows'
        >
          <Link className='underline' href='/admin/evidence-retention/export'>
            Account evidence export
          </Link>
          <Link className='underline' href='/admin/evidence-retention/disposal'>
            Disposal decisions
          </Link>
        </nav>
      </header>
      {sessionExpired && (
        <p role='alert' className='rounded-lg border border-amber-300 p-3'>
          Your admin session has expired.{' '}
          <Link href={signIn} className='font-semibold underline'>
            Sign in and return to Evidence reviews
          </Link>
        </p>
      )}
      {notice && <p role='status'>{notice}</p>}
      <div
        className='flex flex-wrap gap-2'
        aria-label='Evidence review filters'
      >
        {(Object.keys(labels) as EvidenceReviewFilter[]).map((value) => (
          <button
            key={value}
            type='button'
            aria-pressed={filter === value}
            disabled={saving}
            className='rounded-lg border px-3 py-2 aria-pressed:bg-slate-800 aria-pressed:text-white'
            onClick={() => {
              setFilter(value);
              setSelected(null);
              setActionError(null);
            }}
          >
            {labels[value]}
          </button>
        ))}
      </div>
      {filter === 'soon' && (
        <p className='text-sm'>Due within the next 30 days.</p>
      )}
      {queue.isPending && <p role='status'>Loading reviews…</p>}
      {!sessionExpired && queue.isError && (
        <p role='alert'>
          Reviews unavailable.{' '}
          <button
            type='button'
            className='underline'
            onClick={() => void queue.refetch()}
          >
            Reload reviews
          </button>
        </p>
      )}
      {!queue.isPending &&
        !queue.isError &&
        !queue.data?.pages[0]?.records.length && (
          <p>No reviews match this filter.</p>
        )}
      {!!queue.data?.pages[0]?.records.length && (
        <div className='overflow-x-auto rounded-xl border bg-white'>
          <table className='w-full min-w-[38rem] text-left text-sm'>
            <thead>
              <tr>
                {['Retained record', 'Review due', 'Retention', 'Action'].map(
                  (label) => (
                    <th key={label} scope='col' className='p-3'>
                      {label}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {queue.data.pages
                .flatMap((page) => page.records)
                .map((record) => (
                  <tr key={record.kind + ':' + record.id} className='border-t'>
                    <th scope='row' className='p-3'>
                      {record.title}
                      <span className='block font-normal text-slate-600'>
                        {record.kind === 'contract' ? 'Contract' : 'Dispute'}
                      </span>
                    </th>
                    <td className='p-3'>
                      {date.format(new Date(record.review_due_at))}
                      {Date.parse(record.review_due_at) < Date.now() && (
                        <strong className='block text-red-800'>Overdue</strong>
                      )}
                    </td>
                    <td className='p-3'>
                      {record.legal_hold
                        ? 'Held'
                        : record.revision
                          ? 'Reviewed'
                          : 'Awaiting review'}
                    </td>
                    <td className='p-3'>
                      <button
                        type='button'
                        className='font-semibold underline'
                        disabled={saving || sessionExpired}
                        aria-label={'Open review for ' + record.title}
                        onClick={() => {
                          setSelected(record);
                          setActionError(null);
                        }}
                      >
                        Open review
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
      {queue.hasNextPage && !sessionExpired && (
        <button
          type='button'
          className='rounded border px-4 py-2'
          disabled={queue.isFetchingNextPage}
          onClick={() => void queue.fetchNextPage()}
        >
          {queue.isFetchingNextPage
            ? 'Loading more reviews…'
            : 'Load more reviews'}
        </button>
      )}
      {selected && (
        <section
          aria-label='Selected evidence review'
          className='space-y-3 rounded-xl border bg-white p-5'
        >
          <button
            type='button'
            className='underline'
            disabled={saving}
            onClick={() => setSelected(null)}
          >
            Close review
          </button>
          {detail.isPending && (
            <p role='status'>Loading the selected review…</p>
          )}
          {!sessionExpired && detail.isError && (
            <p role='alert'>
              Review unavailable.{' '}
              <button
                className='underline'
                onClick={() => void detail.refetch()}
              >
                Retry
              </button>
            </p>
          )}
          {row && !sessionExpired && (
            <form
              key={row.kind + ':' + row.id + ':' + row.revision}
              className='space-y-3'
              onSubmit={(event) => {
                event.preventDefault();
                void save(event.currentTarget, row);
              }}
            >
              <h2 className='text-xl font-semibold'>{row.title}</h2>
              <p className='break-all text-sm'>Reference {row.id}</p>
              <p>
                Current review due {date.format(new Date(row.review_due_at))}.{' '}
                {row.legal_hold ? 'Evidence is held.' : 'No hold recorded.'}
              </p>
              <label className='block'>
                Reason for retention or hold
                <textarea
                  className='block w-full rounded border p-2'
                  name='reason'
                  required
                  minLength={10}
                  maxLength={1000}
                  defaultValue={row.reason}
                />
              </label>
              <label className='block'>
                Next review date
                <input
                  className='ml-3 rounded border p-2'
                  type='date'
                  name='date'
                  required
                />
              </label>
              <label className='block'>
                <input
                  type='checkbox'
                  name='hold'
                  defaultChecked={row.legal_hold}
                />{' '}
                Preserve under a hold
              </label>
              <p className='text-sm'>
                Review holds within 90 days and other decisions within one year.
                Disposal is a separate decision.
              </p>
              {actionError && (
                <p role='alert'>
                  {actionError instanceof AdminVerificationCancelledError
                    ? 'Verify your identity to save this review. Your edits are still here.'
                    : actionError.message}
                </p>
              )}
              <button
                type='submit'
                disabled={saving}
                className='rounded bg-emerald-800 px-4 py-2 text-white disabled:opacity-50'
              >
                Save review
              </button>
            </form>
          )}
        </section>
      )}
    </main>
  );
}
