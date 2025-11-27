import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

type VerificationStatus = 'verified' | 'pending' | 'rejected' | 'not_submitted' | 'not_applicable';

interface VerificationBadgeProps {
  status: VerificationStatus;
  size?: 'sm' | 'md' | 'lg';
}

export function VerificationBadge({ status, size = 'md' }: VerificationBadgeProps) {
  const sizeMap = {
    sm: { badge: 16, icon: 12 },
    md: { badge: 20, icon: 14 },
    lg: { badge: 24, icon: 18 },
  };

  const { badge: badgeSize, icon: iconSize } = sizeMap[size];

  const statusConfig = {
    verified: {
      bgColor: '#10B981',
      textColor: '#065F46',
      borderColor: '#10B981',
      icon: 'checkCircle',
      label: 'Verified',
    },
    pending: {
      bgColor: '#FEF3C7',
      textColor: '#92400E',
      borderColor: '#F59E0B',
      icon: 'clock',
      label: 'Pending Review',
    },
    rejected: {
      bgColor: '#FEE2E2',
      textColor: '#991B1B',
      borderColor: '#EF4444',
      icon: 'xCircle',
      label: 'Rejected',
    },
    not_submitted: {
      bgColor: '#F3F4F6',
      textColor: '#6B7280',
      borderColor: '#D1D5DB',
      icon: 'info',
      label: 'Not Submitted',
    },
    not_applicable: {
      bgColor: 'transparent',
      textColor: theme.colors.textSecondary,
      borderColor: 'transparent',
      icon: null,
      label: 'N/A',
    },
  };

  const config = statusConfig[status];

  if (status === 'not_applicable') {
    return (
      <span style={{
        fontSize: theme.typography.fontSize.xs,
        color: config.textColor,
      }}>
        {config.label}
      </span>
    );
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: theme.spacing[1],
      padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
      backgroundColor: config.bgColor,
      border: `1px solid ${config.borderColor}`,
      borderRadius: theme.borderRadius.md,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      color: config.textColor,
    }}>
      {config.icon && (
        <Icon
          name={config.icon}
          size={iconSize}
          color={config.textColor}
        />
      )}
      <span>{config.label}</span>
    </div>
  );
}

