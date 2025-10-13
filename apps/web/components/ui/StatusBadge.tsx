'use client';

import React from 'react';
import { theme } from '@/lib/theme';

export type StatusType =
  | 'completed'
  | 'in_progress'
  | 'pending'
  | 'posted'
  | 'open'
  | 'assigned'
  | 'delayed'
  | 'at_risk'
  | 'on_going'
  | 'approved'
  | 'in_review'
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'declined'
  | 'cancelled';

interface StatusBadgeProps {
  status: StatusType | string;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    const statusLower = status.toLowerCase().replace(/_/g, ' ');

    switch (statusLower) {
      case 'completed':
      case 'approved':
      case 'accepted':
        return {
          bg: '#ECFDF5',
          text: '#047857',
          border: '#A7F3D0',
          label: 'Completed',
        };

      case 'in progress':
      case 'on going':
      case 'assigned':
        return {
          bg: '#FEF3C7',
          text: '#EA580C',
          border: '#FDE68A',
          label: 'In Progress',
        };

      case 'pending':
        return {
          bg: '#F3F4F6',
          text: '#6B7280',
          border: '#D1D5DB',
          label: 'Pending',
        };

      case 'posted':
      case 'open':
        return {
          bg: '#EFF6FF',
          text: '#2563EB',
          border: '#BFDBFE',
          label: 'Open',
        };

      case 'delayed':
      case 'at risk':
        return {
          bg: '#FEE2E2',
          text: '#DC2626',
          border: '#FCA5A5',
          label: 'Delayed',
        };

      case 'in review':
        return {
          bg: '#FEF3C7',
          text: '#B45309',
          border: '#FDE68A',
          label: 'In Review',
        };

      case 'draft':
        return {
          bg: '#F3F4F6',
          text: '#4B5563',
          border: '#D1D5DB',
          label: 'Draft',
        };

      case 'sent':
        return {
          bg: '#DBEAFE',
          text: '#1E40AF',
          border: '#93C5FD',
          label: 'Sent',
        };

      case 'declined':
      case 'cancelled':
        return {
          bg: '#FEE2E2',
          text: '#991B1B',
          border: '#FCA5A5',
          label: 'Cancelled',
        };

      default:
        return {
          bg: theme.colors.backgroundSecondary,
          text: theme.colors.textSecondary,
          border: theme.colors.border,
          label: status.charAt(0).toUpperCase() + status.slice(1),
        };
    }
  };

  const sizeConfig = {
    sm: {
      padding: '4px 8px',
      fontSize: theme.typography.fontSize.xs,
      borderRadius: '8px',
    },
    md: {
      padding: '6px 12px',
      fontSize: theme.typography.fontSize.sm,
      borderRadius: '12px',
    },
    lg: {
      padding: '8px 16px',
      fontSize: theme.typography.fontSize.md,
      borderRadius: '14px',
    },
  };

  const config = getStatusConfig(status);
  const sizes = sizeConfig[size];

  return (
    <span
      style={{
        display: 'inline-block',
        padding: sizes.padding,
        borderRadius: sizes.borderRadius,
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        fontSize: sizes.fontSize,
        fontWeight: theme.typography.fontWeight.medium,
        textTransform: 'capitalize',
        whiteSpace: 'nowrap',
      }}
    >
      {config.label}
    </span>
  );
}
