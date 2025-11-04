'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import Link from 'next/link';

interface TrialStatusBannerProps {
  daysRemaining: number;
  trialEndsAt: Date | null;
}

interface TrialWarning {
  daysRemaining: number;
  level: 'info' | 'warning' | 'urgent';
  message: string;
}

function getTrialWarnings(daysRemaining: number): TrialWarning | null {
  if (daysRemaining <= 0) {
    return {
      daysRemaining: 0,
      level: 'urgent',
      message: 'Your trial has expired. Please subscribe to continue using the platform.',
    };
  }

  if (daysRemaining <= 1) {
    return {
      daysRemaining,
      level: 'urgent',
      message: `Your trial expires in ${daysRemaining} day. Please subscribe to avoid service interruption.`,
    };
  }

  if (daysRemaining <= 3) {
    return {
      daysRemaining,
      level: 'warning',
      message: `Your trial expires in ${daysRemaining} days. Subscribe now to continue.`,
    };
  }

  if (daysRemaining <= 7) {
    return {
      daysRemaining,
      level: 'info',
      message: `Your trial expires in ${daysRemaining} days. Consider subscribing to continue.`,
    };
  }

  return null;
}

export function TrialStatusBanner({ daysRemaining, trialEndsAt }: TrialStatusBannerProps) {
  const warning = getTrialWarnings(daysRemaining);

  if (!warning) {
    return null;
  }

  const getBannerStyle = () => {
    switch (warning.level) {
      case 'urgent':
        return {
          backgroundColor: theme.colors.error + '15',
          borderColor: theme.colors.error,
          color: theme.colors.error,
        };
      case 'warning':
        return {
          backgroundColor: theme.colors.warning + '15',
          borderColor: theme.colors.warning,
          color: theme.colors.warning,
        };
      default:
        return {
          backgroundColor: theme.colors.info + '15',
          borderColor: theme.colors.info,
          color: theme.colors.info,
        };
    }
  };

  const bannerStyle = getBannerStyle();

  return (
    <div style={{
      padding: theme.spacing[4],
      borderRadius: theme.borderRadius.xl,
      border: `2px solid ${bannerStyle.borderColor}`,
      backgroundColor: bannerStyle.backgroundColor,
      marginBottom: theme.spacing[6],
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing[3],
    }}>
      <Icon
        name={warning.level === 'urgent' ? 'alertTriangle' : 'info'}
        size={24}
        color={bannerStyle.color}
      />
      <div style={{ flex: 1 }}>
        <p style={{
          fontSize: theme.typography.fontSize.base,
          fontWeight: theme.typography.fontWeight.semibold,
          color: bannerStyle.color,
          marginBottom: theme.spacing[1],
        }}>
          {warning.message}
        </p>
        {trialEndsAt && (
          <p style={{
            fontSize: theme.typography.fontSize.sm,
            color: bannerStyle.color,
            opacity: 0.8,
          }}>
            Trial ends: {trialEndsAt.toLocaleDateString()}
          </p>
        )}
      </div>
      <Link
        href="/contractor/subscription"
        style={{
          padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
          backgroundColor: bannerStyle.color,
          color: theme.colors.white,
          borderRadius: theme.borderRadius.md,
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.semibold,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        Subscribe Now
      </Link>
    </div>
  );
}

