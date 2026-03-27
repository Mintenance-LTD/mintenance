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

interface HoldDialogProps {
  open: boolean;
  holdReason: string;
  onOpenChange: (open: boolean) => void;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
}

export function HoldTransferDialog({
  open,
  holdReason,
  onOpenChange,
  onReasonChange,
  onConfirm,
}: HoldDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hold Fee Transfer</AlertDialogTitle>
          <AlertDialogDescription>
            Enter a reason for holding this fee transfer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div style={{ marginBottom: theme.spacing[4] }}>
          <textarea
            value={holdReason}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              onReasonChange(e.target.value)
            }
            placeholder='Reason for hold...'
            style={{
              width: '100%',
              minHeight: '100px',
              padding: theme.spacing[3],
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.borderRadius.md,
            }}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button onClick={onConfirm} disabled={!holdReason.trim()}>
            Hold Transfer
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface ErrorDialogProps {
  open: boolean;
  message: string;
  onClose: () => void;
}

export function ErrorDialog({ open, message, onClose }: ErrorDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Error</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button onClick={onClose}>Close</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
