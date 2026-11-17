import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type {
  SettlementConfirmation,
  SettlementPreview,
} from '@/lib/payments/settlement-breakdown';
import Link from 'next/link';
import { theme } from '@/lib/admin-theme';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Input } from '@/components/ui/Input';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatCurrency, type Dispute, type Resolution } from './DisputesTable';

interface ResolveDisputeDialogProps {
  open: boolean;
  selectedDispute: Dispute | null;
  resolution: Resolution | '';
  resolveNotes: string;
  actionLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onResolutionChange: (resolution: Resolution) => void;
  onNotesChange: (notes: string) => void;
  onResolve: (confirmation: SettlementConfirmation) => void;
}

const RESOLUTION_OPTIONS: {
  value: Resolution;
  label: string;
  desc: string;
}[] = [
  {
    value: 'pay_contractor',
    label: 'Pay Contractor',
    desc: 'Release remaining principal to the contractor, less the platform fee',
  },
  {
    value: 'refund_homeowner',
    label: 'Refund Homeowner',
    desc: 'Refund the remaining available balance to the payer',
  },
  {
    value: 'split_50_50',
    label: 'Split 50/50',
    desc: 'Refund half the remaining balance; release the rest less the platform fee. An odd penny stays with the release principal.',
  },
];

export function ResolveDisputeDialog({
  open,
  selectedDispute,
  resolution,
  resolveNotes,
  actionLoading,
  onOpenChange,
  onResolutionChange,
  onNotesChange,
  onResolve,
}: ResolveDisputeDialogProps) {
  const [confirmed, setConfirmed] = useState('');
  const preview = useQuery<SettlementPreview>({
    queryKey: [
      'admin',
      'dispute-preview',
      selectedDispute?.id,
      selectedDispute?.homeownerId,
      selectedDispute?.contractorId,
      resolution,
    ],
    enabled: open && !!selectedDispute && !!resolution,
    retry: false,
    queryFn: async () => {
      const response = await fetch(
        '/api/admin/disputes/preview?' +
          new URLSearchParams({
            escrowId: selectedDispute!.id,
            decision: resolution,
          }),
        { cache: 'no-store' }
      );
      const body = await response.json().catch(() => null);
      if (
        !response.ok ||
        body?.escrowId !== selectedDispute?.id ||
        body?.decision !== resolution ||
        !body?.confirmation ||
        body.confirmation.payerId !== selectedDispute?.homeownerId ||
        body.confirmation.payeeId !== selectedDispute?.contractorId ||
        !Number.isSafeInteger(body.payoutMinor)
      )
        throw new Error(
          'Unable to verify the current settlement amounts. Reload the case before deciding.'
        );
      return body;
    },
  });
  const confirmationKey = JSON.stringify([
    selectedDispute?.id,
    resolution,
    resolveNotes,
    preview.data,
  ]);
  const ready =
    !!resolution &&
    !!preview.data &&
    !preview.isError &&
    !preview.isFetching &&
    resolveNotes.trim().length >= 5;
  return (
    <AlertDialog
      open={open}
      onOpenChange={(value) => {
        setConfirmed('');
        onOpenChange(value);
      }}
    >
      <AlertDialogContent className='max-h-[calc(100dvh-2rem)] overflow-y-auto'>
        <AlertDialogHeader>
          <AlertDialogTitle>Resolve Dispute</AlertDialogTitle>
          <AlertDialogDescription>
            {selectedDispute && (
              <>
                Job: <strong>{selectedDispute.jobTitle}</strong> | Amount:{' '}
                <strong>{formatCurrency(selectedDispute.amount)}</strong>
                <br />
                {selectedDispute.homeownerName} vs{' '}
                {selectedDispute.contractorName}
              </>
            )}
          </AlertDialogDescription>
          {selectedDispute && (
            <Link
              className='underline'
              href={`/admin/disputes/${selectedDispute.id}`}
            >
              View full case, evidence and agreement before deciding
            </Link>
          )}
        </AlertDialogHeader>

        <div
          style={{
            marginTop: theme.spacing[4],
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[3],
          }}
        >
          {selectedDispute?.resolution ? (
            <p role='status'>
              This decision is saved. Retry checks the same settlement; it does
              not create a new payment.
            </p>
          ) : null}
          <label
            style={{
              fontSize: theme.typography.fontSize.sm,
              fontWeight: 600,
              color: '#0F172A',
            }}
          >
            Resolution
          </label>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing[2],
            }}
          >
            {RESOLUTION_OPTIONS.map((option) => (
              <label
                key={option.value}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: theme.spacing[3],
                  padding: theme.spacing[3],
                  borderRadius: theme.borderRadius.md,
                  border: `2px solid ${resolution === option.value ? theme.colors.adminPrimary : '#E2E8F0'}`,
                  backgroundColor:
                    resolution === option.value ? '#EFF6FF' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type='radio'
                  name='resolution'
                  value={option.value}
                  checked={resolution === option.value}
                  disabled={actionLoading || !!selectedDispute?.resolution}
                  onChange={() => onResolutionChange(option.value)}
                  style={{
                    marginTop: 2,
                    accentColor: theme.colors.adminPrimary,
                  }}
                />
                <div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#0F172A',
                    }}
                  >
                    {option.label}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#64748B',
                      marginTop: 2,
                    }}
                  >
                    {option.desc}
                  </div>
                </div>
              </label>
            ))}
          </div>

          <label
            style={{
              fontSize: theme.typography.fontSize.sm,
              fontWeight: 600,
              color: '#0F172A',
            }}
          >
            Reason for this decision (required)
          </label>
          <Input
            disabled={actionLoading || !!selectedDispute?.resolution}
            id='resolution-reason'
            aria-label='Reason for this decision'
            maxLength={500}
            placeholder='Explain the decision (at least 5 characters)...'
            value={resolveNotes}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onNotesChange(e.target.value)
            }
          />
        </div>

        {resolution && (
          <section
            aria-label='Settlement preview'
            className='rounded-lg border p-3 space-y-2'
          >
            {preview.isFetching && (
              <p role='status'>Checking current balance and fees…</p>
            )}
            {preview.isError && (
              <p role='alert'>
                Unable to verify settlement amounts.{' '}
                <button
                  onClick={() => {
                    setConfirmed('');
                    void preview.refetch();
                  }}
                >
                  Retry preview
                </button>
              </p>
            )}
            {preview.data && !preview.isError && (
              <>
                <p>
                  Remaining principal:{' '}
                  <strong>
                    {formatCurrency(preview.data.principalMinor / 100)}
                  </strong>
                </p>
                <p>
                  Refund to {selectedDispute?.homeownerName}:{' '}
                  <strong>
                    {formatCurrency(preview.data.refundMinor / 100)}
                  </strong>
                </p>
                <p>
                  Contractor {selectedDispute?.contractorName} receives:{' '}
                  <strong>
                    {formatCurrency(preview.data.payoutMinor / 100)}
                  </strong>
                </p>
                <p>
                  Platform fee from released principal:{' '}
                  {formatCurrency(preview.data.feeMinor / 100)}
                </p>
                <p>
                  Provider processing and bank arrival may take additional time.
                </p>
                <label className='flex gap-2'>
                  <input
                    type='checkbox'
                    disabled={!ready || actionLoading}
                    checked={ready && confirmed === confirmationKey}
                    onChange={(event) =>
                      setConfirmed(event.target.checked ? confirmationKey : '')
                    }
                  />
                  I have reviewed the case, recipients, amounts and reason.
                </label>
              </>
            )}
          </section>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            onClick={() => {
              if (ready && confirmed === confirmationKey && preview.data)
                onResolve(preview.data.confirmation);
            }}
            disabled={actionLoading || !ready || confirmed !== confirmationKey}
          >
            {actionLoading ? (
              <Spinner size='sm' />
            ) : selectedDispute?.resolution ? (
              'Check settlement'
            ) : (
              'Confirm Resolution'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
