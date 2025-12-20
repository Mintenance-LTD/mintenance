/**
 * Profile Form Field Component
 */

'use client';

import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';

interface ProfileFormFieldProps {
  label: string;
  value: string;
  isEditing: boolean;
  displayValue?: string;
  onChange?: (value: string) => void;
  type?: 'text' | 'email' | 'tel';
  placeholder?: string;
  fullWidth?: boolean;
  icon?: string;
  verified?: boolean;
  children?: React.ReactNode;
}

export function ProfileFormField({
  label,
  value,
  isEditing,
  displayValue,
  onChange,
  type = 'text',
  placeholder,
  fullWidth = false,
  icon,
  verified,
  children,
}: ProfileFormFieldProps) {
  return (
    <div style={{
      gridColumn: fullWidth ? '1 / -1' : undefined,
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing[4],
      border: `1px solid ${theme.colors.border}`,
    }}>
      <label style={{
        display: 'block',
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing[2],
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        {label}
      </label>
      {isEditing ? (
        children || (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            style={{
              width: '100%',
              padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
              borderRadius: theme.borderRadius.lg,
              border: `1px solid ${theme.colors.border}`,
              fontSize: theme.typography.fontSize.base,
              color: theme.colors.textPrimary,
              backgroundColor: theme.colors.white,
              outline: 'none',
            }}
          />
        )
      ) : (
        <div style={{
          fontSize: theme.typography.fontSize.lg,
          fontWeight: theme.typography.fontWeight.medium,
          color: theme.colors.textPrimary,
          padding: `${theme.spacing[2]} 0`,
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[2],
          flexWrap: 'wrap',
        }}>
          {icon && <Icon name={icon as any} size={16} color={theme.colors.textSecondary} />}
          {displayValue || value || 'Not set'}
          {verified && (
            <span style={{
              padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
              borderRadius: theme.borderRadius.full,
              backgroundColor: '#10B98115',
              color: '#10B981',
              fontSize: theme.typography.fontSize.xs,
              fontWeight: theme.typography.fontWeight.semibold,
            }}>
              ✓ Verified
            </span>
          )}
        </div>
      )}
    </div>
  );
}

