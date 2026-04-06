'use client';

import React from 'react';
import { theme } from '@/lib/theme';

interface ModalFooterProps {
  loading: boolean;
  onClose: () => void;
}

export function ModalFooter({ loading, onClose }: ModalFooterProps) {
  return (
    <div style={{
      padding: theme.spacing[6],
      borderTop: `1px solid ${theme.colors.border}`,
      display: 'flex',
      gap: theme.spacing[4],
      justifyContent: 'flex-end',
      backgroundColor: theme.colors.surface,
    }}>
      <button
        type="button"
        onClick={onClose}
        disabled={loading}
        style={{
          padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
          backgroundColor: theme.colors.backgroundSecondary,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.borderRadius.lg,
          fontSize: theme.typography.fontSize.base,
          fontWeight: theme.typography.fontWeight.semibold,
          color: theme.colors.textPrimary,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.backgroundColor = theme.colors.border;
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
        }}
      >
        Cancel
      </button>

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
          backgroundColor: loading ? theme.colors.primaryLight : theme.colors.primary,
          border: 'none',
          borderRadius: theme.borderRadius.lg,
          fontSize: theme.typography.fontSize.base,
          fontWeight: theme.typography.fontWeight.semibold,
          color: 'white',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.8 : 1,
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.backgroundColor = theme.colors.primaryLight;
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = loading ? theme.colors.primaryLight : theme.colors.primary;
        }}
      >
        {loading ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}
