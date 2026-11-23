'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Briefcase,
  ClipboardCheck,
  FileText,
  History,
  MessageSquare,
  ShieldAlert,
  Wallet,
} from 'lucide-react';
import styles from './property-activity.module.css';
interface Event {
  id: string;
  title: string;
  date: string;
  href: string;
  kind: string;
}
const eventTypes = {
  job: { label: 'Job', Icon: Briefcase },
  document: { label: 'Document', Icon: FileText },
  inspection: { label: 'Inspection', Icon: ClipboardCheck },
  payment: { label: 'Payment', Icon: Wallet },
  dispute: { label: 'Dispute', Icon: ShieldAlert },
  message: { label: 'Message', Icon: MessageSquare },
};
const monthFormat = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/London',
});

export function PropertyActivityFeed({ propertyId }: { propertyId: string }) {
  const [pages, setPages] = useState<Array<string | null>>([null]);
  const cursor = pages.at(-1) ?? null;
  const [attempt, setAttempt] = useState(0);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setEvents([]);
    const query = cursor ? '?' + new URLSearchParams({ cursor }) : '';
    fetch(`/api/properties/${propertyId}/activity${query}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error('Property history could not be loaded.');
        return response.json();
      })
      .then((data) => {
        if (!Array.isArray(data.events))
          throw new Error('Property history could not be loaded.');
        if (!controller.signal.aborted) {
          setEvents(data.events);
          setNextCursor(
            typeof data.nextCursor === 'string' ? data.nextCursor : null
          );
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [propertyId, cursor, attempt]);
  const groups = new Map<string, Event[]>();
  for (const event of events) {
    const month = monthFormat.format(new Date(event.date));
    groups.set(month, [...(groups.get(month) ?? []), event]);
  }
  return (
    <section className={`pw-card ${styles.feed}`} aria-label='Property history'>
      <header className={styles.header}>
        <span className={styles.headerIcon}>
          <History size={22} aria-hidden='true' />
        </span>
        <div>
          <h2>Property history</h2>
          <p className={styles.intro}>A record of what happened, and when.</p>
        </div>
        <span className={styles.timezone}>UK time</span>
      </header>
      <p className={styles.description}>
        Recorded jobs, documents, inspections, payments, disputes and your job
        messages.
      </p>
      {loading ? (
        <p role='status' className={styles.state}>
          Loading history…
        </p>
      ) : error ? (
        <p role='alert' className={styles.state}>
          {error}{' '}
          <button
            className='pw-btn pw-btn-small'
            onClick={() => setAttempt((v) => v + 1)}
          >
            Retry
          </button>
        </p>
      ) : (
        <>
          {events.length ? (
            <div className={styles.groups}>
              {[...groups].map(([month, entries]) => (
                <section key={month} aria-label={month}>
                  <h3 className={styles.month}>{month}</h3>
                  <ol className={styles.list}>
                    {entries.map((event) => {
                      const { Icon, label } = eventTypes[
                        event.kind as keyof typeof eventTypes
                      ] ?? { label: 'Activity', Icon: History };
                      return (
                        <li key={event.id} className={styles.event}>
                          <span className={styles.eventIcon}>
                            <Icon size={18} aria-hidden='true' />
                          </span>
                          <Link href={event.href} className={styles.eventLink}>
                            <span className={styles.eventContent}>
                              <span className={styles.kind}>{label}</span>
                              <span className={styles.title}>
                                {event.title}
                              </span>
                              <time
                                dateTime={event.date}
                                className={styles.date}
                              >
                                {new Date(event.date).toLocaleString('en-GB', {
                                  timeZone: 'Europe/London',
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })}{' '}
                                UK
                              </time>
                              {event.kind === 'dispute' && (
                                <span className='underline'>View dispute</span>
                              )}
                            </span>
                            <ArrowUpRight size={18} aria-hidden='true' />
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))}
            </div>
          ) : (
            <p className={styles.state}>No recorded activity on this page.</p>
          )}
          <nav
            className={styles.pagination}
            aria-label='Property history pages'
          >
            <button
              className='pw-btn pw-btn-small'
              disabled={pages.length <= 1}
              onClick={() => setPages((current) => current.slice(0, -1))}
            >
              Newer
            </button>
            <span>Page {pages.length}</span>
            <button
              className='pw-btn pw-btn-small'
              disabled={!nextCursor}
              onClick={() => {
                if (nextCursor) setPages((current) => [...current, nextCursor]);
              }}
            >
              Older
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
