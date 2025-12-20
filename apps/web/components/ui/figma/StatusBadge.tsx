import React from 'react';
import { theme } from '@/lib/theme';

export type StatusBadgeVariant = 'completed' | 'delayed' | 'at_risk' | 'on_going' | 'posted' | 'approved' | 'in_review' | 'pending';

interface StatusBadgeProps {
  status: StatusBadgeVariant;
  label?: string;
}

const statusConfig: Record<StatusBadgeVariant, { bg: string; text: string; border: string }> = {
  completed: {
    bg: '#ECFDF5',
    text: '#047857',
    border: '#A7F3D0',
  },
  delayed: {
    bg: '#FEF3C7',
    text: '#B45309',
    border: '#FDE68A',
  },
  at_risk: {
    bg: '#FEE2E2',
    text: '#DC2626',
    border: '#FCA5A5',
  },
  on_going: {
    bg: '#FEF3C7',
    text: '#EA580C',
    border: '#FDE68A',
  },
  posted: {
    bg: '#EFF6FF',
    text: '#2563EB',
    border: '#BFDBFE',
  },
  approved: {
    bg: '#ECFDF5',
    text: '#047857',
    border: '#A7F3D0',
  },
  in_review: {
    bg: '#FEE2E2',
    text: '#DC2626',
    border: '#FCA5A5',
  },
  pending: {
    bg: '#FEF3C7',
    text: '#B45309',
    border: '#FDE68A',
  },
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  const displayLabel = label || status.replace(/_/g, ' ');

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
      }}
    >
      {displayLabel}
    </span>
  );
}

