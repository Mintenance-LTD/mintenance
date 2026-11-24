'use client';

import { useRef, useState } from 'react';
import { getCsrfHeaders } from '@/lib/csrf-client';
import {
  canRespondToVisit,
  type VisitRecord,
} from '@/lib/scheduling/visit-history';
import styles from '@/components/property-operations/operations.module.css';

export function VisitResponseActions({
  visit,
  onSaved,
}: {
  visit: VisitRecord;
  onSaved: () => void;
}) {
  const saving = useRef(false);
  const [pending, setPending] = useState<
    'confirmed' | 'change_requested' | null
  >(null);
  const [error, setError] = useState('');
  if (!canRespondToVisit(visit)) return null;

  async function respond(response: 'confirmed' | 'change_requested') {
    if (saving.current || error || !canRespondToVisit(visit)) return;
    saving.current = true;
    setPending(response);
    try {
      const result = await fetch('/api/appointments/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getCsrfHeaders()),
        },
        body: JSON.stringify({
          id: visit.id,
          date: visit.date,
          start: visit.time,
          end: visit.endTime,
          response,
        }),
      });
      if (!result.ok) {
        setError(
          result.status === 409
            ? 'This visit changed. Refresh to review the latest slot.'
            : 'Response not saved. Refresh visits before trying again.'
        );
        return;
      }
      onSaved();
    } catch {
      setError('Response not saved. Refresh visits before trying again.');
    } finally {
      saving.current = false;
      setPending(null);
    }
  }

  return (
    <>
      {error && (
        <p role='alert' className={styles.error}>
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <button
          type='button'
          className={styles.primary}
          disabled={
            !!pending || !!error || visit.clientResponse === 'confirmed'
          }
          onClick={() => void respond('confirmed')}
        >
          {pending === 'confirmed' ? 'Saving…' : 'Confirm visit'}
        </button>
        <button
          type='button'
          className={styles.secondary}
          disabled={
            !!pending || !!error || visit.clientResponse === 'change_requested'
          }
          onClick={() => void respond('change_requested')}
        >
          {pending === 'change_requested' ? 'Saving…' : 'Request another time'}
        </button>
      </div>
    </>
  );
}
