'use client';

import React, { useState, useEffect } from 'react';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Icon } from '@/components/ui/Icon';
import type { EscrowRecord } from './RefundManagementClient';

type ActionType = 'release' | 'refund' | 'hold';

interface ActionModalProps {
  open: boolean;
  type: ActionType;
  escrow: EscrowRecord | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: (reason: string, refundAmount?: number) => void;
  formatCurrency: (amount: number) => string;
}

const ACTION_CONFIG: Record<
  ActionType,
  {
    title: string;
    description: string;
    icon: string;
    confirmLabel: string;
    confirmVariant: 'primary' | 'secondary' | 'outline';
    iconColor: string;
  }
> = {
  release: {
    title: 'Release Payment',
    description:
      "This will transfer funds to the contractor's Stripe account. This action cannot be undone.",
    icon: 'unlock',
    confirmLabel: 'Release Payment',
    confirmVariant: 'primary',
    iconColor: '#16a34a',
  },
  refund: {
    title: 'Issue Refund',
    description:
      'This will refund the payment to the homeowner via Stripe. Refunds typically take 5-10 business days.',
    icon: 'undo',
    confirmLabel: 'Process Refund',
    confirmVariant: 'primary',
    iconColor: '#8b5cf6',
  },
  hold: {
    title: 'Place Hold',
    description:
      'This will place the escrow under admin review. Both parties will be notified.',
    icon: 'pause',
    confirmLabel: 'Place Hold',
    confirmVariant: 'secondary',
    iconColor: '#d97706',
  },
};

export function ActionModal({
  open,
  type,
  escrow,
  loading,
  onClose,
  onConfirm,
  formatCurrency,
}: ActionModalProps) {
  const [reason, setReason] = useState('');
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [partialAmount, setPartialAmount] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setReason('');
      setRefundType('full');
      setPartialAmount('');
    }
  }, [open]);

  if (!escrow) return null;

  const config = ACTION_CONFIG[type];
  const isReasonValid = reason.trim().length >= 5;
  const isPartialValid =
    refundType === 'full' ||
    (parseFloat(partialAmount) > 0 &&
      parseFloat(partialAmount) < escrow.amount);
  const canSubmit = isReasonValid && isPartialValid && !loading;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const refundAmount =
      type === 'refund' && refundType === 'partial'
        ? parseFloat(partialAmount)
        : undefined;
    onConfirm(reason, refundAmount);
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Icon name={config.icon} size={20} color={config.iconColor} />
            {config.title}
          </AlertDialogTitle>
          <AlertDialogDescription>{config.description}</AlertDialogDescription>
        </AlertDialogHeader>

        {/* Escrow details summary */}
        <div
          style={{
            padding: theme.spacing[3],
            backgroundColor: theme.colors.backgroundSecondary,
            borderRadius: theme.borderRadius.md,
            marginBottom: theme.spacing[3],
            fontSize: theme.typography.fontSize.sm,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
            }}
          >
            <div>
              <span style={{ color: theme.colors.textSecondary }}>Job: </span>
              <span
                style={{ fontWeight: 500, color: theme.colors.textPrimary }}
              >
                {escrow.jobs.title}
              </span>
            </div>
            <div>
              <span style={{ color: theme.colors.textSecondary }}>
                Amount:{' '}
              </span>
              <span
                style={{ fontWeight: 600, color: theme.colors.textPrimary }}
              >
                {formatCurrency(escrow.amount)}
              </span>
            </div>
            <div>
              <span style={{ color: theme.colors.textSecondary }}>
                Homeowner:{' '}
              </span>
              <span style={{ color: theme.colors.textPrimary }}>
                {escrow.jobs.homeowner
                  ? `${escrow.jobs.homeowner.first_name} ${escrow.jobs.homeowner.last_name}`
                  : 'N/A'}
              </span>
            </div>
            <div>
              <span style={{ color: theme.colors.textSecondary }}>
                Contractor:{' '}
              </span>
              <span style={{ color: theme.colors.textPrimary }}>
                {escrow.jobs.contractor
                  ? `${escrow.jobs.contractor.first_name} ${escrow.jobs.contractor.last_name}`
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Refund type selector (only for refund action) */}
        {type === 'refund' && (
          <div style={{ marginBottom: theme.spacing[3] }}>
            <label
              style={{
                display: 'block',
                fontSize: theme.typography.fontSize.sm,
                fontWeight: 500,
                color: theme.colors.textPrimary,
                marginBottom: theme.spacing[2],
              }}
            >
              Refund Type
            </label>
            <div style={{ display: 'flex', gap: theme.spacing[3] }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                }}
              >
                <input
                  type='radio'
                  name='refundType'
                  value='full'
                  checked={refundType === 'full'}
                  onChange={() => setRefundType('full')}
                />
                <span style={{ fontSize: theme.typography.fontSize.sm }}>
                  Full ({formatCurrency(escrow.amount)})
                </span>
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                }}
              >
                <input
                  type='radio'
                  name='refundType'
                  value='partial'
                  checked={refundType === 'partial'}
                  onChange={() => setRefundType('partial')}
                />
                <span style={{ fontSize: theme.typography.fontSize.sm }}>
                  Partial
                </span>
              </label>
            </div>
            {refundType === 'partial' && (
              <input
                type='number'
                min='0.01'
                max={escrow.amount - 0.01}
                step='0.01'
                value={partialAmount}
                onChange={(e) => setPartialAmount(e.target.value)}
                placeholder={`Max: ${formatCurrency(escrow.amount - 0.01)}`}
                aria-label='Partial refund amount'
                style={{
                  width: '100%',
                  marginTop: theme.spacing[2],
                  padding: theme.spacing[2],
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.md,
                  fontSize: theme.typography.fontSize.sm,
                }}
              />
            )}
          </div>
        )}

        {/* Reason field */}
        <div style={{ marginBottom: theme.spacing[3] }}>
          <label
            htmlFor='action-reason'
            style={{
              display: 'block',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: 500,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[1],
            }}
          >
            Reason <span style={{ color: theme.colors.error }}>*</span>
          </label>
          <textarea
            id='action-reason'
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder='Provide a reason for this action (min 5 characters)...'
            style={{
              width: '100%',
              minHeight: '80px',
              padding: theme.spacing[3],
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.borderRadius.md,
              fontSize: theme.typography.fontSize.sm,
              resize: 'vertical',
            }}
          />
          {reason.length > 0 && reason.trim().length < 5 && (
            <p
              style={{ fontSize: 11, color: theme.colors.error, marginTop: 4 }}
            >
              Reason must be at least 5 characters
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            variant={config.confirmVariant}
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {loading ? 'Processing...' : config.confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
