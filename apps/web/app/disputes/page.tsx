'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
export default function RetainedDisputesPage() {
  const [records, setRecords] = useState<
    { escrow_id: string; archived_at: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    fetch('/api/disputes/retained')
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || !Array.isArray(body.records))
          throw new Error('Unavailable');
        if (active) setRecords(body.records);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retry]);
  return (
    <main className='mx-auto max-w-3xl p-6 space-y-4'>
      <h1 className='text-2xl font-semibold'>Retained dispute records</h1>
      <p>
        Read-only records preserved after account or job deletion. Only records
        you participated in are shown, up to the latest 50.
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
    </main>
  );
}
