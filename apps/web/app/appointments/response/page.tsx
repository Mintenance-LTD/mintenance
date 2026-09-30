'use client';
import { useEffect, useState } from 'react';
import { getCsrfHeaders } from '@/lib/csrf-client';
import Link from 'next/link';
import { CalendarCheck, RefreshCw } from 'lucide-react';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
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
    <HomeownerPageWrapper className='me-legacy-fit'>
      <main className='mx-auto max-w-5xl space-y-6 py-6'>
        <Link href='/scheduling' className='text-sm font-medium text-teal-800'>
          ← My schedule
        </Link>
        <header className='flex flex-wrap items-center justify-between gap-4'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-widest text-teal-800 mb-2'>
              Plan your next visit
            </p>
            <h1 className='text-3xl font-semibold'>Visit confirmations</h1>
            <p className='mt-2 text-slate-600'>
              Agree a time before your contractor arrives, or ask for a better
              one.
            </p>
          </div>
          <button
            className='inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-semibold disabled:opacity-50'
            disabled={loading || busy !== null}
            onClick={() => setAttempt((x) => x + 1)}
          >
            <RefreshCw size={16} />
            Refresh visits
          </button>
        </header>
        {error && (
          <p
            role='alert'
            className='rounded-xl border border-red-200 bg-red-50 p-4 text-red-800'
          >
            {error}
          </p>
        )}
        {loading && <p role='status'>Loading visits…</p>}
        {!loading && !error && visits.length === 0 && (
          <section className='rounded-2xl border bg-white px-6 py-14 text-center shadow-sm'>
            <CalendarCheck className='mx-auto mb-5 text-teal-800' size={40} />
            <h2 className='text-xl font-semibold'>
              Your next visit will appear here
            </h2>
            <p className='mt-3 text-slate-600'>
              No upcoming visits in the next 180 days.
            </p>
            <p className='mt-2 text-sm text-slate-600'>
              Once a visit is scheduled, you can confirm it or request another
              time.
            </p>
            <Link
              href='/scheduling'
              className='mt-6 inline-flex rounded-xl bg-teal-800 px-5 py-3 font-semibold text-white'
            >
              View my schedule
            </Link>
          </section>
        )}
        {visits.map((v) => (
          <section
            className='rounded-2xl border bg-white p-6 space-y-4 shadow-sm'
            key={v.id}
          >
            <h2 className='text-lg font-semibold'>{v.title}</h2>
            <p className='text-slate-600'>
              {new Date(`${v.date}T12:00:00`).toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}{' '}
              · {v.time.slice(0, 5)}–{v.endTime.slice(0, 5)}
            </p>
            <p role='status' className='text-sm font-semibold text-teal-800'>
              {v.clientResponse === 'confirmed'
                ? 'Visit confirmed'
                : v.clientResponse === 'change_requested'
                  ? 'Another time requested'
                  : 'Awaiting your confirmation'}
            </p>
            {v.canRespond && (
              <div className='flex flex-wrap gap-3'>
                <button
                  className='rounded-xl bg-teal-800 px-5 py-3 font-semibold text-white disabled:opacity-50'
                  disabled={busy !== null}
                  onClick={() => void respond(v, 'confirmed')}
                >
                  Confirm visit
                </button>
                <button
                  className='rounded-xl border px-5 py-3 font-semibold disabled:opacity-50'
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
    </HomeownerPageWrapper>
  );
}
