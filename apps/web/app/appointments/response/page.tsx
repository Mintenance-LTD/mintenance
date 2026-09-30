'use client';
import { useEffect, useState } from 'react';
import { getCsrfHeaders } from '@/lib/csrf-client';
interface Visit {
  id: string;
  title: string;
  date: string;
  time: string;
  endTime: string;
  clientResponse: string;
  canRespond: boolean;
}
export default function VisitResponses() {
  const [visits, setVisits] = useState<Visit[]>([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState<string | null>(null),
    [loading, setLoading] = useState(true),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError('');
    fetch('/api/appointments?daysAhead=180&limit=500', { signal: abort.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error('Unable to load visits');
        return r.json();
      })
      .then((d) => setVisits(d.appointments))
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [attempt]);
  async function respond(v: Visit, response: string) {
    setBusy(v.id);
    setError('');
    try {
      const r = await fetch('/api/appointments/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getCsrfHeaders()),
        },
        body: JSON.stringify({
          id: v.id,
          date: v.date,
          start: v.time,
          end: v.endTime,
          response,
        }),
      });
      if (!r.ok)
        throw new Error(
          'Response not saved. Refresh in case this visit changed.'
        );
      setAttempt((x) => x + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save');
    } finally {
      setBusy(null);
    }
  }
  return (
    <main className='mx-auto max-w-2xl space-y-4 p-6'>
      <h1 className='text-2xl font-semibold'>Visit confirmations</h1>
      {error && <p role='alert'>{error}</p>}
      <button onClick={() => setAttempt((x) => x + 1)}>Refresh visits</button>
      {loading && <p role='status'>Loading visits…</p>}
      {!loading && !error && visits.length === 0 && (
        <p>No upcoming visits in the next 180 days.</p>
      )}
      {visits.map((v) => (
        <section className='rounded border p-4 space-y-3' key={v.id}>
          <h2>{v.title}</h2>
          <p>
            {v.date} · {v.time} · Client response: {v.clientResponse}
          </p>
          {v.canRespond && (
            <div className='flex gap-4'>
              <button
                disabled={busy !== null}
                onClick={() => void respond(v, 'confirmed')}
              >
                Confirm visit
              </button>
              <button
                disabled={busy !== null}
                onClick={() => void respond(v, 'change_requested')}
              >
                Request another time
              </button>
            </div>
          )}
        </section>
      ))}
    </main>
  );
}
