'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface RejectDialogProps {
  open: boolean;
  contractorName: string;
  rejectReason: string;
  actionLoading: string | null;
  onOpenChange: (open: boolean) => void;
  onRejectReasonChange: (reason: string) => void;
  onConfirmReject: () => void;
  onCancel: () => void;
}

export function RejectDialog({
  open,
  contractorName,
  rejectReason,
  actionLoading,
  onOpenChange,
  onRejectReasonChange,
  onConfirmReject,
  onCancel,
}: RejectDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject Contractor</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to reject <strong>{contractorName}</strong>. Please
            provide a reason. The contractor will be notified.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div style={{ padding: `${theme.spacing[2]} 0` }}>
          <label
            htmlFor='reject-reason'
            style={{
              display: 'block',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[1],
            }}
          >
            Rejection Reason{' '}
            <span style={{ color: theme.colors.error }}>*</span>
          </label>
          <textarea
            id='reject-reason'
            value={rejectReason}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              onRejectReasonChange(e.target.value)
            }
            placeholder='E.g., Expired insurance, missing certifications, incomplete profile...'
            rows={3}
            style={{
              width: '100%',
              padding: theme.spacing[2],
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.borderRadius.md,
              fontSize: theme.typography.fontSize.sm,
              fontFamily: theme.typography.fontFamily.regular,
              backgroundColor: theme.colors.surface,
              color: theme.colors.textPrimary,
              resize: 'vertical',
              minHeight: '80px',
            }}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <Button
            variant='destructive'
            onClick={onConfirmReject}
            disabled={!rejectReason.trim() || actionLoading !== null}
          >
            {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
