'use client';
import { useEffect, useState } from 'react';
import { getCsrfHeaders } from '@/lib/csrf-client';
import Link from 'next/link';
import { CalendarCheck, RefreshCw, Clock3 } from 'lucide-react';
import { OperationsPage } from '@/components/property-operations/OperationsPage';
import styles from '@/components/property-operations/operations.module.css';
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
    <OperationsPage
      title='Visit confirmations'
      eyebrow='Ready for your next visit'
      backHref='/scheduling'
      backLabel='Back to my schedule'
      description='Confirm the agreed time so your contractor knows you are ready, or request a different time before they travel.'
      action={
        <button
          className={styles.secondary}
          disabled={loading || busy !== null}
          onClick={() => setAttempt((x) => x + 1)}
        >
          <RefreshCw size={16} />
          Refresh visits
        </button>
      }
    >
      {!loading && !error && visits.length > 0 && (
        <div className={styles.stats}>
          <div className={styles.stat}>
            <p>Upcoming visits</p>
            <strong>{visits.length}</strong>
          </div>
          <div className={styles.stat}>
            <p>Awaiting confirmation</p>
            <strong>
              {
                visits.filter(
                  (v) => v.clientResponse === 'pending' && v.canRespond
                ).length
              }
            </strong>
          </div>
        </div>
      )}
      {error && (
        <p role='alert' className={styles.error}>
          {error}
        </p>
      )}
      {loading && <p role='status'>Loading visits…</p>}
      {!loading && !error && visits.length === 0 && (
        <section className={styles.empty}>
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
          <Link href='/scheduling' className={styles.primary}>
            View my schedule
          </Link>
        </section>
      )}
      {visits.map((v) => (
        <section className={styles.card} key={v.id}>
          <div className={styles.cardTop}>
            <span className={styles.icon}>
              <CalendarCheck size={22} />
            </span>
            <div className={styles.content}>
              <p className={styles.meta}>Scheduled visit</p>
              <h2>{v.title}</h2>
            </div>
          </div>
          <p className={styles.next}>
            <Clock3 size={16} />
            {new Date(`${v.date}T12:00:00`).toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}{' '}
            · {v.time.slice(0, 5)}–{v.endTime.slice(0, 5)}
          </p>
          <p role='status' className={styles.badge}>
            {v.clientResponse === 'confirmed'
              ? 'Visit confirmed'
              : v.clientResponse === 'change_requested'
                ? 'Another time requested'
                : 'Awaiting your confirmation'}
          </p>
          {v.canRespond && (
            <div className={styles.actions}>
              <button
                className={styles.primary}
                disabled={busy !== null}
                onClick={() => void respond(v, 'confirmed')}
              >
                {busy === v.id ? 'Saving…' : 'Confirm visit'}
              </button>
              <button
                className={styles.secondary}
                disabled={busy !== null}
                onClick={() => void respond(v, 'change_requested')}
              >
                Request another time
              </button>
            </div>
          )}
        </section>
      ))}
      {!loading && visits.length > 0 && (
        <p className={styles.note}>
          Requesting another time lets the contractor know the current slot does
          not suit you. Agree the replacement time in Messages; this action does
          not automatically reschedule the visit.
        </p>
      )}
    </OperationsPage>
  );
}
