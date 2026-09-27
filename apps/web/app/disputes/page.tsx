'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { z } from 'zod';
const pageSchema = z.object({
  records: z
    .array(
      z.object({
        escrow_id: z.string().uuid(),
        archived_at: z.string().datetime({ offset: true }),
      })
    )
    .max(50),
  nextCursor: z.string().max(512).nullable().optional(),
});
export default function RetainedDisputesPage() {
  const [records, setRecords] = useState<z.infer<typeof pageSchema>['records']>(
    []
  );
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    fetch(
      '/api/disputes/retained' +
        (cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''),
      { signal: controller.signal, cache: 'no-store' }
    )
      .then(async (response) => {
        if (!response.ok) throw new Error('Unavailable');
        const body = pageSchema.parse(await response.json());
        if (!controller.signal.aborted) {
          setRecords((previous) => [
            ...new Map(
              [...(cursor ? previous : []), ...body.records].map((record) => [
                record.escrow_id,
                record,
              ])
            ).values(),
          ]);
          setNextCursor(body.nextCursor ?? null);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [cursor, retry]);
  return (
    <main className='mx-auto max-w-3xl p-6 space-y-4'>
      <h1 className='text-2xl font-semibold'>Retained dispute records</h1>
      <p>
        Read-only records preserved after account or job deletion. Only records
        you participated in are shown. Archived does not mean resolved.
      </p>
      {loading ? (
        <p role='status'>Loading records…</p>
      ) : error ? (
        <div role='alert'>
          <p>Records could not be loaded.</p>
          <button onClick={() => setRetry((value) => value + 1)}>Retry</button>
        </div>
      ) : !records.length ? (
        <p>No retained disputes found.</p>
      ) : (
        <ul>
          {records.map((record) => (
            <li key={record.escrow_id} className='py-3'>
              <Link
                className='underline'
                href={`/disputes/${encodeURIComponent(record.escrow_id)}`}
              >
                View dispute archived{' '}
                {new Date(record.archived_at).toLocaleDateString('en-GB')}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!loading && !error && nextCursor && (
        <button onClick={() => setCursor(nextCursor)}>
          Load older records
        </button>
      )}
    </main>
  );
}
