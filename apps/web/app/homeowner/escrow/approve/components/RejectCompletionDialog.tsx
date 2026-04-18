'use client';

/**
 * RejectCompletionDialog — modal for a homeowner rejecting a
 * completion. Extracted from HomeownerApprovalClient to keep that file
 * under the 500-line pre-commit limit.
 */

import React from 'react';
import { theme } from '@/lib/theme';
import { Card } from '@/components/ui/Card.unified';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';

interface Props {
  open: boolean;
  rejectionReason: string;
  actionLoading: boolean;
  onReasonChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export function RejectCompletionDialog({
  open,
  rejectionReason,
  actionLoading,
  onReasonChange,
  onCancel,
  onSubmit,
}: Props) {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <Card
        style={{
          padding: theme.spacing.xl,
          maxWidth: '500px',
          width: '90%',
        }}
      >
        <h3
          style={{
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.bold,
            marginBottom: theme.spacing.md,
          }}
        >
          Reject Completion
        </h3>
        <p
          style={{
            marginBottom: theme.spacing.md,
            color: theme.colors.textSecondary,
          }}
        >
          Please provide a reason for rejecting this completion. An admin will
          review your concerns.
        </p>
        <Input
          placeholder='Reason for rejection (required)'
          value={rejectionReason}
          onChange={(e) => onReasonChange(e.target.value)}
          style={{ marginBottom: theme.spacing.md }}
        />
        <div style={{ display: 'flex', gap: theme.spacing.md }}>
          <Button variant='outline' onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!rejectionReason.trim() || actionLoading}
          >
            {actionLoading ? <Spinner size='sm' /> : 'Submit Rejection'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default RejectCompletionDialog;
