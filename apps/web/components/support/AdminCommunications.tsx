'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { CommunicationComposer } from './CommunicationComposer';
import { useSupportRequest, type SupportOperators } from './useSupportRequest';
import { isValidUUID } from '@/lib/validation/uuid';

type Delivery = {
  id: string;
  subject: string;
  channel: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  last_checked_at: string | null;
  last_error: string | null;
  provider_id: string | null;
  recipient_email: string | null;
  case_reference: string | null;
  job_reference: string | null;
  dispute_reference: string | null;
  attempts: number;
};

const statuses: Record<string, string> = {
  all: 'All statuses',
  pending: 'Queued',
  sending: 'Sending',
  accepted: 'Accepted',
  delivered: 'Delivered',
  failed: 'Failed',
  needs_review: 'Needs review',
};
const channels: Record<string, string> = {
  email: 'Email',
  push: 'Push and inbox',
  in_app: 'In-app inbox',
};
const formatDate = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/London',
});
function recordLink(row: Delivery) {
  if (row.case_reference && isValidUUID(row.case_reference))
    return {
      href: '/admin/support?case=' + row.case_reference,
      label: 'Open support case',
      reference: row.case_reference,
    };
  if (row.dispute_reference && isValidUUID(row.dispute_reference))
    return {
      href: '/admin/disputes/' + row.dispute_reference,
      label: 'Open dispute',
      reference: row.dispute_reference,
    };
  if (row.job_reference && isValidUUID(row.job_reference))
    return {
      href: '/admin/jobs/' + row.job_reference,
      label: 'Open job',
      reference: row.job_reference,
    };
  return null;
}

export function AdminCommunications() {
  const api = useSupportRequest();
  const [status, setStatus] = useState('all');
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [retrying, setRetrying] = useState<string | null>(null);
  const operators = useQuery({
    queryKey: ['admin', 'support', 'operators'],
    queryFn: () => api<SupportOperators>('/api/admin/support/operators'),
    retry: false,
  });
  const allowed = operators.data?.operators.some(
    (operator) =>
      operator.admin_id === operators.data?.currentAdminId &&
      operator.can_broadcast
  );
  const history = useInfiniteQuery({
    queryKey: ['admin', 'communications', 'deliveries', status, search],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ status });
      if (search) params.set('search', search);
      if (pageParam) params.set('after', pageParam);
      return api<{ records: Delivery[]; next: string | null }>(
        '/api/admin/support/deliveries?' + params
      );
    },
    getNextPageParam: (last) => last.next ?? undefined,
    retry: false,
  });

  async function retry(row: Delivery) {
    if (retrying) return;
    setRetrying(row.id);
    setNotice('');
    try {
      await api('/api/admin/support/deliveries/' + row.id + '/retry', 'POST');
      setNotice('Delivery queued for retry.');
      await history.refetch();
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : 'Retry could not be confirmed.'
      );
    } finally {
      setRetrying(null);
    }
  }

  return (
    <main className='mx-auto max-w-7xl space-y-6 p-6 [&_button]:rounded-lg [&_button]:border [&_button]:px-3 [&_button]:py-2 [&_button]:disabled:opacity-50'>
      <header className='space-y-2'>
        <h1 className='text-3xl font-semibold'>Communications</h1>
        <p>
          Send service updates and check whether a customer’s message was
          delivered.
        </p>
      </header>
      {notice && <p role='status'>{notice}</p>}
      {operators.isError && (
        <p role='alert'>
          Sending permissions are unavailable.{' '}
          <button onClick={() => void operators.refetch()}>Retry</button>
        </p>
      )}
      {allowed && (
        <CommunicationComposer
          api={api}
          onResult={(result) => {
            setNotice(result);
            void history.refetch();
          }}
        />
      )}
      <section
        className='space-y-4 rounded-xl border bg-white p-5'
        aria-label='Delivery history'
      >
        <h2 className='text-xl font-semibold'>Delivery history</h2>
        <p>
          Accepted means the provider or queue accepted the message. Delivered
          requires separate confirmation.
        </p>
        <div className='flex flex-wrap items-end gap-3'>
          <form
            role='search'
            className='flex flex-wrap items-end gap-2'
            onSubmit={(event) => {
              event.preventDefault();
              setSearch(input.trim());
            }}
          >
            <label className='grid gap-1'>
              Recipient email, subject or reference
              <input
                type='search'
                maxLength={254}
                className='rounded border px-3 py-2'
                value={input}
                onChange={(event) => setInput(event.target.value)}
              />
            </label>
            <button>Search delivery history</button>
          </form>
          <label className='grid gap-1'>
            Delivery status
            <select
              className='rounded border px-3 py-2'
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {Object.entries(statuses).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {history.isPending && <p role='status'>Loading delivery history…</p>}
        {history.isError && (
          <p role='alert'>
            {history.error.message}{' '}
            <button onClick={() => void history.refetch()}>
              Reload history
            </button>
          </p>
        )}
        {!history.isError &&
          history.data &&
          !history.data.pages[0]?.records.length && (
            <p>No messages match this search.</p>
          )}
        {!!history.data?.pages[0]?.records.length && (
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[44rem] text-left text-sm'>
              <thead>
                <tr>
                  {[
                    'Message and recipient',
                    'Related record',
                    'Channel',
                    'Queued',
                    'Latest status',
                  ].map((label) => (
                    <th scope='col' className='p-3' key={label}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.data.pages
                  .flatMap((page) => page.records)
                  .map((row) => {
                    const related = recordLink(row);
                    const updated = row.last_checked_at ?? row.completed_at;
                    return (
                      <tr className='border-t' key={row.id}>
                        <th scope='row' className='p-3'>
                          {row.subject}
                          <span className='block font-normal text-slate-600'>
                            {row.recipient_email ?? 'App recipient'}
                          </span>
                        </th>
                        <td className='p-3'>
                          {related ? (
                            <>
                              <Link className='underline' href={related.href}>
                                {related.label}
                              </Link>
                              <code className='block max-w-40 select-all break-all text-xs'>
                                {related.reference}
                              </code>
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className='p-3'>
                          {channels[row.channel] ?? row.channel}
                        </td>
                        <td className='p-3'>
                          <time dateTime={row.created_at}>
                            {formatDate.format(new Date(row.created_at))}
                          </time>
                        </td>
                        <td className='p-3'>
                          <strong>{statuses[row.status] ?? row.status}</strong>
                          {updated && (
                            <time className='block text-xs' dateTime={updated}>
                              {formatDate.format(new Date(updated))}
                            </time>
                          )}
                          {row.last_error && (
                            <p className='break-words text-xs'>
                              {row.last_error}
                            </p>
                          )}
                          {row.provider_id && (
                            <p className='break-all text-xs'>
                              Provider reference {row.provider_id}
                            </p>
                          )}
                          <p className='text-xs'>{row.attempts} attempts</p>
                          {allowed &&
                            row.status === 'failed' &&
                            !row.provider_id && (
                              <button
                                disabled={!!retrying}
                                onClick={() => void retry(row)}
                              >
                                Retry rejected send
                              </button>
                            )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
        {history.hasNextPage && (
          <button
            disabled={history.isFetchingNextPage}
            onClick={() => void history.fetchNextPage()}
          >
            Load more deliveries
          </button>
        )}
      </section>
    </main>
  );
}
