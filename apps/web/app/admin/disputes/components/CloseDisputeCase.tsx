'use client';

import { useState } from 'react';
import { MfaStepUpDialog } from '@/components/auth/MfaStepUpDialog';
import { useDisputeActions } from './useDisputeActions';

export function CloseDisputeCase({
  escrowId,
  disputeId,
  onClosed,
}: {
  escrowId: string;
  disputeId: string;
  onClosed: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const actions = useDisputeActions({
    onConfirmed: () => {
      setExpanded(false);
      setReason('');
      setConfirmed(false);
      onClosed();
    },
    onError: setError,
  });
  const busy = actions.loading || actions.requiresVerification;
  return (
    <section
      className='rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-3'
      aria-label='Close case without moving money'
    >
      <h2 className='text-xl font-semibold'>Close without settlement</h2>
      <p>
        For a withdrawn or erroneous case. Closing records the decision but
        keeps the payment on an administrator hold. It does not pay, refund or
        restart automatic release. The job stays blocked until separately
        reviewed.
      </p>
      {!expanded ? (
        <button
          className='underline font-semibold'
          onClick={() => setExpanded(true)}
        >
          Review nonfinancial closure
        </button>
      ) : (
        <form
          className='space-y-3'
          onSubmit={(event) => {
            event.preventDefault();
            if (!confirmed || busy || reason.trim().length < 10) return;
            setError('');
            void actions.submit({
              kind: 'close',
              body: {
                escrowId,
                disputeId,
                reason: reason.trim(),
                keepAdminHold: true,
              },
            });
          }}
        >
          <label className='block' htmlFor='closure-reason'>
            Reason for closing this case
          </label>
          <textarea
            id='closure-reason'
            className='w-full rounded border p-3'
            required
            minLength={10}
            maxLength={1000}
            value={reason}
            disabled={busy}
            onChange={(event) => {
              setReason(event.target.value);
              setConfirmed(false);
            }}
          />
          <label className='flex gap-2 items-start'>
            <input
              type='checkbox'
              checked={confirmed}
              disabled={busy}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            I confirm: close this case only and keep the payment on
            administrator hold.
          </label>
          <div className='flex gap-4'>
            <button
              type='submit'
              className='rounded bg-slate-900 text-white px-4 py-2 disabled:opacity-50'
              disabled={!confirmed || busy || reason.trim().length < 10}
            >
              {busy ? 'Confirming closure…' : 'Close case; keep payment held'}
            </button>
            <button
              type='button'
              disabled={busy}
              onClick={() => {
                setExpanded(false);
                setConfirmed(false);
                setError('');
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {error && <p role='alert'>{error}</p>}
      {actions.requiresVerification && (
        <MfaStepUpDialog
          onCancel={actions.cancelVerification}
          onSuccess={actions.resumeAfterVerification}
        />
      )}
    </section>
  );
}
