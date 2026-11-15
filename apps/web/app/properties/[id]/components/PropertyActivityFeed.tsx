'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
interface Event {
  id: string;
  title: string;
  date: string;
  href: string;
  kind: string;
}
export function PropertyActivityFeed({ propertyId }: { propertyId: string }) {
  const [offset, setOffset] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setEvents([]);
    fetch(`/api/properties/${propertyId}/activity?offset=${offset}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error('Property history could not be loaded.');
        return response.json();
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setEvents(data.events);
          setHasMore(data.hasMore && !data.limitReached);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [propertyId, offset, attempt]);
  return (
    <section className='pw-card' aria-label='Property history'>
      <h2>Property history</h2>
      <p>
        Recorded jobs, documents, inspections, payments and your job messages.
        Signed agreements and original event times are preserved.
      </p>
      {loading ? (
        <p role='status'>Loading history…</p>
      ) : error ? (
        <p role='alert'>
          {error}{' '}
          <button onClick={() => setAttempt((v) => v + 1)}>Retry</button>
        </p>
      ) : (
        <>
          {events.length ? (
            <ol>
              {events.map((event) => (
                <li key={event.id} className='pw-event'>
                  <div>
                    <Link href={event.href}>{event.title}</Link>
                    <p>
                      <time dateTime={event.date}>
                        {new Date(event.date).toLocaleString('en-GB', {
                          timeZone: 'Europe/London',
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}{' '}
                        UK
                      </time>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p>No recorded activity on this page.</p>
          )}
          <div className='pw-between'>
            <button
              disabled={!offset}
              onClick={() => setOffset((v) => Math.max(0, v - 25))}
            >
              Newer
            </button>
            <span>Page {offset / 25 + 1}</span>
            <button
              disabled={!hasMore}
              onClick={() => setOffset((v) => v + 25)}
            >
              Older
            </button>
          </div>
        </>
      )}
    </section>
  );
}
