'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import type { EditProfileFormData } from './types';

interface BusinessInfoTabProps {
  formData: EditProfileFormData;
  setFormData: React.Dispatch<React.SetStateAction<EditProfileFormData>>;
}

export function BusinessInfoTab({ formData, setFormData }: BusinessInfoTabProps) {
  return (
    <div>
      {/* Company Name */}
      <div style={{ marginBottom: theme.spacing[6] }}>
        <label style={{
          display: 'block',
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.semibold,
          color: theme.colors.textPrimary,
          marginBottom: theme.spacing[2],
        }}>
          Company Name
        </label>
        <input
          type="text"
          value={formData.companyName}
          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
          style={{
            width: '100%',
            padding: theme.spacing[3],
            fontSize: theme.typography.fontSize.base,
            borderRadius: theme.borderRadius.md,
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: theme.colors.white,
            color: theme.colors.textPrimary,
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = theme.colors.primary;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = theme.colors.border;
          }}
          placeholder="ABC Plumbing Ltd"
        />
        <p style={{
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.textSecondary,
          marginTop: theme.spacing[2],
          margin: 0,
        }}>
          Your company name helps build trust with homeowners
        </p>
      </div>

      {/* License Number */}
      <div style={{ marginBottom: theme.spacing[6] }}>
        <label style={{
          display: 'block',
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.semibold,
          color: theme.colors.textPrimary,
          marginBottom: theme.spacing[2],
        }}>
          License Registration Number
        </label>
        <input
          type="text"
          value={formData.licenseNumber}
          onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value.toUpperCase() })}
          style={{
            width: '100%',
            padding: theme.spacing[3],
            fontSize: theme.typography.fontSize.base,
            borderRadius: theme.borderRadius.md,
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: theme.colors.white,
            color: theme.colors.textPrimary,
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = theme.colors.primary;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = theme.colors.border;
          }}
          placeholder="LIC-12345-UK"
        />
        <p style={{
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.textSecondary,
          marginTop: theme.spacing[2],
          margin: 0,
        }}>
          Your license number will be verified by our admin team. Once verified, you&apos;ll receive a verification badge.
        </p>
      </div>
    </div>
  );
}
