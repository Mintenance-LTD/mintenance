'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CalendarCheck, RefreshCw, Clock3 } from 'lucide-react';
import { OperationsPage } from '@/components/property-operations/OperationsPage';
import { VisitResponseActions } from '@/components/scheduling/VisitResponseActions';
import {
  canRespondToVisit,
  currentVisitSlot,
  formatVisitSlot,
  visitHref,
  visitResponseLabel,
  visitStatusLabel,
  type VisitRecord,
} from '@/lib/scheduling/visit-history';
import styles from '@/components/property-operations/operations.module.css';

export default function VisitResponses() {
  return (
    <Suspense fallback={<p role='status'>Loading visits…</p>}>
      <VisitResponseTabs />
    </Suspense>
  );
}

function VisitResponseTabs() {
  const past = useSearchParams().get('view') === 'past';
  return <VisitResponseList key={past ? 'past' : 'upcoming'} past={past} />;
}

function VisitResponseList({ past }: { past: boolean }) {
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const refresh = () => setAttempt((value) => value + 1);

  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError('');
    const params = new URLSearchParams({
      view: past ? 'past' : 'upcoming',
      limit: '500',
    });
    if (!past) params.set('daysAhead', '180');
    fetch('/api/appointments?' + params, { signal: abort.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load visits');
        const data = await response.json();
        if (!Array.isArray(data.appointments))
          throw new Error('Unable to load visits');
        if (!abort.signal.aborted) setVisits(data.appointments);
      })
      .catch(() => {
        if (!abort.signal.aborted)
          setError('Unable to load visits. Try refreshing.');
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [past, attempt]);

  return (
    <OperationsPage
      title='Visit confirmations'
      eyebrow='Scheduled visits'
      backHref='/scheduling'
      backLabel='Back to my schedule'
      description='Confirm upcoming visits or review the times and responses recorded for past visits.'
      action={
        <button
          type='button'
          className={styles.secondary}
          disabled={loading}
          onClick={refresh}
        >
          <RefreshCw size={16} />
          Refresh visits
        </button>
      }
    >
      <nav aria-label='Visit views' className={styles.actions}>
        <Link
          href='/appointments/response'
          aria-current={past ? undefined : 'page'}
          className={past ? styles.secondary : styles.primary}
        >
          Upcoming visits
        </Link>
        <Link
          href='/appointments/response?view=past'
          aria-current={past ? 'page' : undefined}
          className={past ? styles.primary : styles.secondary}
        >
          Past visits
        </Link>
      </nav>
      {!past && !loading && !error && visits.length > 0 && (
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
                  (visit) =>
                    visit.clientResponse === 'pending' &&
                    canRespondToVisit(visit)
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
            {past ? 'No past visits' : 'Your next visit will appear here'}
          </h2>
          {!past && (
            <p className='mt-3 text-slate-600'>
              No upcoming visits in the next 180 days.
            </p>
          )}
          <Link href='/scheduling' className={styles.primary}>
            View my schedule
          </Link>
        </section>
      )}
      {!loading &&
        !error &&
        visits.map((visit) => {
          const slot = currentVisitSlot(visit);
          return (
            <section className={styles.card} key={visit.id}>
              <div className={styles.cardTop}>
                <span className={styles.icon}>
                  <CalendarCheck size={22} />
                </span>
                <div className={styles.content}>
                  <p className={styles.meta}>{visitStatusLabel(slot)}</p>
                  <h2>
                    <Link href={visitHref(visit.id)}>{visit.title}</Link>
                  </h2>
                </div>
              </div>
              <p className={styles.next}>
                <Clock3 size={16} />
                {formatVisitSlot(slot)}
              </p>
              <p className={styles.badge}>{visitResponseLabel(slot)}</p>
              <Link href={visitHref(visit.id)} className={styles.secondary}>
                View visit
              </Link>
              {!past && (
                <VisitResponseActions
                  key={visit.date + visit.time + visit.endTime}
                  visit={visit}
                  onSaved={refresh}
                />
              )}
            </section>
          );
        })}
      {!past &&
        !loading &&
        visits.some((visit) => canRespondToVisit(visit)) && (
          <p className={styles.note}>
            Requesting another time tells the contractor the current slot does
            not suit you. Agree the replacement in Messages.
          </p>
        )}
    </OperationsPage>
  );
}
