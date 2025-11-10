/**
 * Danger Zone Component
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';

interface DangerZoneProps {
  onDeleteClick: () => void;
  disabled?: boolean;
}

export function DangerZone({ onDeleteClick, disabled }: DangerZoneProps) {
  return (
    <div style={{
      backgroundColor: theme.colors.white,
      border: `1px solid ${theme.colors.error}20`,
      borderRadius: theme.borderRadius['2xl'],
      padding: theme.spacing[6],
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[4],
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[2],
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: theme.borderRadius.full,
            backgroundColor: `${theme.colors.error}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon name="alertTriangle" size={20} color={theme.colors.error} />
          </div>
          <h3 style={{
            margin: 0,
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
          }}>
            Danger Zone
          </h3>
        </div>
        <p style={{
          margin: 0,
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.textSecondary,
          lineHeight: 1.6,
          paddingLeft: theme.spacing[12],
        }}>
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <div style={{ paddingLeft: theme.spacing[12] }}>
          <Button
            type="button"
            variant="destructive"
            onClick={onDeleteClick}
            disabled={disabled}
            leftIcon={<Icon name="trash" size={16} />}
          >
            Delete Account
          </Button>
        </div>
      </div>
    </div>
  );
}

