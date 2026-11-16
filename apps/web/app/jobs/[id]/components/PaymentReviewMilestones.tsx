'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatUKSchedule } from '@/lib/scheduling/uk-date-time';
import { readActionResponse } from '@/lib/api/read-action-response';

interface Milestones {
  status: string;
  autoApprovalDate?: string | null;
  autoReleaseDate?: string | null;
  coolingOffEndsAt?: string | null;
  onHold?: boolean;
}

export function PaymentReviewMilestones({
  jobId,
  approved,
}: {
  jobId: string;
  approved: boolean;
}) {
  const [schedule, setSchedule] = useState<Milestones | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    setSchedule(null);
    fetch(`/api/jobs/${jobId}/escrow`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then((response) =>
        readActionResponse<{ escrow: Milestones | null }>(
          response,
          'Unable to load payment milestones.'
        )
      )
      .then((data) => {
        if (!controller.signal.aborted) {
          setSchedule(data.escrow);
          setState('ready');
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setState('error');
      });
    return () => controller.abort();
  }, [jobId, approved, retry]);

  const dates = [
    schedule?.autoReleaseDate,
    schedule?.coolingOffEndsAt,
    !approved ? schedule?.autoApprovalDate : null,
  ].filter(
    (value): value is string =>
      Boolean(value) && Number.isFinite(Date.parse(value!))
  );
  const earliest = dates.length
    ? new Date(Math.max(...dates.map(Date.parse))).toISOString()
    : null;
  const released =
    schedule?.status === 'released' || schedule?.status === 'completed';
  return (
    <section
      aria-label='Payment milestones'
      className='space-y-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950'
    >
      <h4 className='font-semibold'>Review and payment milestones · UK time</h4>
      {state === 'loading' && (
        <p role='status'>Loading the recorded payment schedule…</p>
      )}
      {state === 'error' && (
        <p>
          Payment milestones could not be loaded.{' '}
          <button
            type='button'
            className='underline'
            onClick={() => setRetry((value) => value + 1)}
          >
            Retry payment schedule
          </button>
        </p>
      )}
      {state === 'ready' && !schedule && (
        <p>No payment schedule is recorded yet.</p>
      )}
      {state === 'ready' && schedule && (
        <>
          {released ? (
            <p>
              Payment release is recorded. Bank arrival follows payment-provider
              processing.
            </p>
          ) : (
            <>
              {!approved && schedule.autoApprovalDate && (
                <p>
                  <strong>Automatic review approval:</strong>{' '}
                  {formatUKSchedule(schedule.autoApprovalDate)}. This is not a
                  payment release date.
                </p>
              )}
              {approved && (
                <p>
                  Work approved. The review deadline no longer applies; the
                  recorded approval hold and release checks apply.
                </p>
              )}
              {schedule.coolingOffEndsAt && (
                <p>
                  <strong>Approval hold ends:</strong>{' '}
                  {formatUKSchedule(schedule.coolingOffEndsAt)}.
                </p>
              )}
              {earliest && (
                <p>
                  <strong>Earliest recorded release eligibility:</strong>{' '}
                  {formatUKSchedule(earliest)}. This is not a guaranteed
                  transfer or bank-arrival time.
                </p>
              )}
              {!earliest && (
                <p>A release eligibility date is not recorded yet.</p>
              )}
              {schedule.onHold && (
                <p className='font-semibold'>
                  An additional payment hold requires review before release.
                </p>
              )}
              <p>
                Release requires approval or eligible automatic approval, the
                end of applicable holds, no unresolved dispute and final checks.
                Approving work can change the recorded schedule.
              </p>
            </>
          )}
        </>
      )}
      <Link className='underline' href='/payments'>
        View payments and report a payment problem
      </Link>
    </section>
  );
}
