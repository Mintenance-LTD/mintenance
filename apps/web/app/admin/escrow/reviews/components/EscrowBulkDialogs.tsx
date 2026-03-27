'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ── Table style constants ──────────────────────────────────────────────
export const tableHeaderStyle: React.CSSProperties = {
  padding: theme.spacing.sm,
  textAlign: 'left',
  fontSize: theme.typography.fontSize.sm,
  color: theme.colors.textSecondary,
  fontWeight: theme.typography.fontWeight.semibold,
};

export const tableCellStyle: React.CSSProperties = {
  padding: theme.spacing.sm,
  fontSize: theme.typography.fontSize.sm,
  color: theme.colors.text,
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending_review':
      return theme.colors.warning;
    case 'admin_hold':
      return theme.colors.error;
    case 'admin_approved':
      return theme.colors.success;
    default:
      return theme.colors.textSecondary;
  }
};

// ── Bulk action dialogs ────────────────────────────────────────────────
interface BulkDialogsProps {
  selectedCount: number;
  bulkApproveDialog: boolean;
  setBulkApproveDialog: (v: boolean) => void;
  bulkHoldDialog: boolean;
  setBulkHoldDialog: (v: boolean) => void;
  bulkNotes: string;
  setBulkNotes: (v: string) => void;
  bulkReason: string;
  setBulkReason: (v: string) => void;
  actionLoading: boolean;
  onBulkApprove: () => void;
  onBulkHold: () => void;
  errorDialog: { open: boolean; message: string };
  setErrorDialog: (v: { open: boolean; message: string }) => void;
}

export function EscrowBulkDialogs({
  selectedCount,
  bulkApproveDialog,
  setBulkApproveDialog,
  bulkHoldDialog,
  setBulkHoldDialog,
  bulkNotes,
  setBulkNotes,
  bulkReason,
  setBulkReason,
  actionLoading,
  onBulkApprove,
  onBulkHold,
  errorDialog,
  setErrorDialog,
}: BulkDialogsProps) {
  return (
    <>
      {/* Bulk Approve Dialog */}
      <AlertDialog open={bulkApproveDialog} onOpenChange={setBulkApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bulk Approve Escrow Releases</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to approve {selectedCount} escrow release
              {selectedCount > 1 ? 's' : ''}. Funds will be released to the
              contractors.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div style={{ marginTop: theme.spacing.md }}>
            <Input
              placeholder='Optional notes for all approvals'
              value={bulkNotes}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setBulkNotes(e.target.value)
              }
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button onClick={onBulkApprove} disabled={actionLoading}>
              {actionLoading ? (
                <Spinner size='sm' />
              ) : (
                `Approve ${selectedCount}`
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Hold Dialog */}
      <AlertDialog open={bulkHoldDialog} onOpenChange={setBulkHoldDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bulk Hold Escrows</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to hold {selectedCount} escrow
              {selectedCount > 1 ? 's' : ''} for review. Please provide a
              reason.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div style={{ marginTop: theme.spacing.md }}>
            <Input
              placeholder='Reason for hold (required)'
              value={bulkReason}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setBulkReason(e.target.value)
              }
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              onClick={onBulkHold}
              disabled={!bulkReason.trim() || actionLoading}
            >
              {actionLoading ? <Spinner size='sm' /> : `Hold ${selectedCount}`}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Dialog */}
      <AlertDialog
        open={errorDialog.open}
        onOpenChange={(open) => setErrorDialog({ ...errorDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: theme.colors.error }}>
              Error
            </AlertDialogTitle>
            <AlertDialogDescription>
              {errorDialog.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
