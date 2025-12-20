import React from 'react';

export type StatusType =
  | 'completed' | 'in_progress' | 'pending' | 'posted' | 'open'
  | 'assigned' | 'delayed' | 'at_risk' | 'on_going' | 'approved'
  | 'in_review' | 'draft' | 'sent' | 'accepted' | 'declined'
  | 'cancelled' | 'paid' | 'overdue' | 'active' | 'inactive';

export interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

const getStatusConfig = (status: string) => {
  const statusLower = status.toLowerCase().replace(/_/g, ' ');

  switch (statusLower) {
    case 'completed':
    case 'approved':
    case 'accepted':
    case 'paid':
      return { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0', label: 'Completed' };

    case 'in progress':
    case 'on going':
    case 'assigned':
      return { bg: '#FEF3C7', text: '#EA580C', border: '#FDE68A', label: 'In Progress' };

    case 'pending':
    case 'in review':
      return { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A', label: 'Pending' };

    case 'posted':
    case 'open':
    case 'sent':
      return { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE', label: 'Open' };

    case 'delayed':
    case 'at risk':
    case 'overdue':
      return { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA', label: 'Delayed' };

    case 'draft':
      return { bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB', label: 'Draft' };

    case 'cancelled':
    case 'declined':
      return { bg: '#FEE2E2', text: '#B91C1C', border: '#FECACA', label: 'Cancelled' };

    case 'active':
      return { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0', label: 'Active' };

    case 'inactive':
      return { bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB', label: 'Inactive' };

    default:
      return { bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB', label: status };
  }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = getStatusConfig(status);

  const sizeStyles = {
    sm: { padding: '2px 8px', fontSize: '11px' },
    md: { padding: '4px 12px', fontSize: '12px' },
    lg: { padding: '6px 16px', fontSize: '14px' },
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        borderRadius: '12px',
        fontWeight: 600,
        textTransform: 'capitalize',
        whiteSpace: 'nowrap',
        ...sizeStyles[size],
      }}
    >
      {config.label}
    </span>
  );
};
