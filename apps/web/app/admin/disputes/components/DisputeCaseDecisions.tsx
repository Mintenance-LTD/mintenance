'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { MfaStepUpDialog } from '@/components/auth/MfaStepUpDialog';
import type { Dispute, Resolution } from './DisputesTable';
import { ResolveDisputeDialog } from './ResolveDisputeDialog';
import { useDisputeActions } from './useDisputeActions';

export type SettlementCase = Pick<
  Dispute,
  | 'id'
  | 'jobTitle'
  | 'amount'
  | 'homeownerId'
  | 'homeownerName'
  | 'contractorId'
  | 'contractorName'
  | 'resolution'
>;

export function DisputeCaseDecisions({
  dispute,
  canHold,
  canResolve,
  onChanged,
}: {
  dispute: SettlementCase;
  canHold: boolean;
  canResolve: boolean;
  onChanged: () => void;
}) {
  const [reviewingSettlement, setReviewingSettlement] = useState(false);
  const [reviewingHold, setReviewingHold] = useState(false);
  const [resolution, setResolution] = useState<Resolution | ''>('');
  const [reason, setReason] = useState('');
  const [result, setResult] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  const actions = useDisputeActions({
    onConfirmed: (kind) => {
      setReviewingSettlement(false);
      setReviewingHold(false);
      setResult({
        message:
          kind === 'hold'
            ? 'Administrator hold confirmed.'
            : 'Settlement confirmed.',
        error: false,
      });
      onChanged();
    },
    onError: (message) => {
      setResult({ message, error: true });
      onChanged();
    },
  });
  const decision = dispute.resolution?.decision ?? resolution;
  const decisionReason = dispute.resolution?.reason ?? reason;
  const busy = actions.loading || actions.requiresVerification;

  return (
    <section
      className='rounded-xl border bg-white p-5 space-y-3'
      aria-label='Review case decisions'
    >
      <h2 className='text-xl font-semibold'>Review case decisions</h2>
      {canResolve && (
        <Button
          type='button'
          disabled={busy}
          onClick={() => {
            setResult(null);
            setResolution('');
            setReason('');
            setReviewingHold(false);
            setReviewingSettlement(true);
          }}
        >
          {dispute.resolution
            ? 'Review recorded settlement'
            : 'Review settlement options'}
        </Button>
      )}
      {canHold && !reviewingHold && (
        <Button
          variant='secondary'
          disabled={busy}
          onClick={() => {
            setResult(null);
            setReviewingHold(true);
          }}
        >
          Review administrator hold
        </Button>
      )}
      {canHold && reviewingHold && (
        <div className='rounded-lg border p-3 space-y-2'>
          <p>
            An administrator hold keeps the payment blocked for review. It
            records the hold on this case without making a refund or payout.
          </p>
          <Button
            disabled={busy}
            onClick={() =>
              void actions.submit({
                kind: 'hold',
                body: {
                  escrowId: dispute.id,
                  reason: 'Escalated from the dispute case for detailed review',
                },
              })
            }
          >
            Confirm administrator hold
          </Button>
          <Button
            variant='secondary'
            disabled={busy}
            onClick={() => setReviewingHold(false)}
          >
            Cancel
          </Button>
        </div>
      )}
      {result && (
        <div role={result.error ? 'alert' : 'status'} className='space-y-2'>
          <p>{result.message}</p>
          {result.error && (
            <Button variant='secondary' onClick={() => setResult(null)}>
              Close
            </Button>
          )}
        </div>
      )}
      <ResolveDisputeDialog
        open={
          reviewingSettlement &&
          canResolve &&
          !actions.requiresVerification &&
          !result?.error
        }
        selectedDispute={dispute}
        resolution={decision}
        resolveNotes={decisionReason}
        actionLoading={busy}
        onOpenChange={setReviewingSettlement}
        onResolutionChange={setResolution}
        onNotesChange={setReason}
        onResolve={(confirmation) => {
          if (!decision) return;
          void actions.submit({
            kind: 'resolve',
            body: {
              escrowId: dispute.id,
              decision,
              reason: decisionReason.trim(),
              confirmation,
            },
          });
        }}
      />
      {actions.requiresVerification && (
        <MfaStepUpDialog
          onCancel={actions.cancelVerification}
          onSuccess={actions.resumeAfterVerification}
        />
      )}
    </section>
  );
}
