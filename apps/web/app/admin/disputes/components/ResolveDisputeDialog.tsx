import React from 'react';
import { theme } from '@/lib/theme';
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
  resolution: Resolution;
  resolveNotes: string;
  actionLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onResolutionChange: (resolution: Resolution) => void;
  onNotesChange: (notes: string) => void;
  onResolve: () => void;
}

const RESOLUTION_OPTIONS: {
  value: Resolution;
  label: string;
  desc: string;
}[] = [
  {
    value: 'pay_contractor',
    label: 'Pay Contractor',
    desc: 'Release escrow funds to the contractor',
  },
  {
    value: 'refund_homeowner',
    label: 'Refund Homeowner',
    desc: 'Refund the full amount back to the homeowner',
  },
  {
    value: 'split_50_50',
    label: 'Split 50/50',
    desc: 'Split the escrow amount equally between both parties',
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
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
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
        </AlertDialogHeader>

        <div
          style={{
            marginTop: theme.spacing[4],
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[3],
          }}
        >
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
                  border: `2px solid ${resolution === option.value ? '#4A67FF' : '#E2E8F0'}`,
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
                  onChange={() => onResolutionChange(option.value)}
                  style={{ marginTop: 2, accentColor: '#4A67FF' }}
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
            Notes
          </label>
          <Input
            placeholder='Add resolution notes (optional)...'
            value={resolveNotes}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onNotesChange(e.target.value)
            }
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button onClick={onResolve} disabled={actionLoading}>
            {actionLoading ? <Spinner size='sm' /> : 'Confirm Resolution'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
