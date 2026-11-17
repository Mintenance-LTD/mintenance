'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithCsrf } from '@/lib/csrf-client';
export function LegacyReworkRecovery({
  jobId,
  reworkId,
}: {
  jobId: string;
  reworkId: string;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const router = useRouter();
  async function recover() {
    if (!confirmed || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await fetchWithCsrf(
        '/api/jobs/' + encodeURIComponent(jobId) + '/rework/recover',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reworkRequestId: reworkId,
            reopenForEvidence: true,
          }),
        }
      );
      const body = await response.json().catch(() => null);
      if (!response.ok || body?.success !== true || body.jobId !== jobId)
        throw new Error(
          typeof body?.error === 'string'
            ? body.error
            : (body?.error?.message ??
                'Recovery was not confirmed. Reload the job.')
        );
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to reopen rework.'
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <section className='rounded-lg border border-amber-300 p-4 space-y-3'>
      <h3 className='font-semibold'>Finish an older rework submission</h3>
      <p>
        This older completion has no recorded explicit rework submission. If
        evidence is missing, reopen it to add fresh photos and submit it for
        homeowner review. The earlier completion is retained in the recovery
        record. Payment stays held and independent holds remain.
      </p>
      <p>Approved work and active disputes cannot use this recovery.</p>
      <label className='flex gap-2'>
        <input
          type='checkbox'
          disabled={busy}
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        Reopen this unapproved submission so I can complete its evidence.
      </label>
      <button
        className='btn btn-secondary'
        disabled={!confirmed || busy}
        onClick={() => void recover()}
      >
        {busy ? 'Reopening…' : 'Reopen legacy rework'}
      </button>
      {error && <p role='alert'>{error}</p>}
    </section>
  );
}
