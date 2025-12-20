import React from 'react';
import { theme } from '@/lib/theme';

export function SpendingSummary() {
  // Calculate total spending from completed jobs
  const totalSpent = 0; // This will be calculated from actual data
  
  return (
    <div style={{
      borderRadius: theme.borderRadius.lg,
      border: `1px solid ${theme.colors.border}`,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing[6]
    }}>
      <h3 style={{
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.textPrimary,
        margin: `0 0 ${theme.spacing[1]} 0`,
        fontSize: theme.typography.fontSize.lg
      }}>
        Spending Summary
      </h3>
      <p style={{
        fontSize: theme.typography.fontSize.xs,
        color: theme.colors.textSecondary,
        margin: 0
      }}>
        This month
      </p>

      <div style={{ marginTop: theme.spacing[4] }}>
        {/* Chart placeholder */}
        <div style={{
          position: 'relative',
          height: '160px',
          width: '100%',
          borderRadius: theme.borderRadius.lg,
          backgroundColor: theme.colors.backgroundSecondary,
          padding: theme.spacing[4]
        }}>
          <div style={{ display: 'flex', height: '100%', alignItems: 'flex-end', gap: theme.spacing[2] }}>
            <div style={{
              height: '40%',
              width: '100%',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              borderRadius: `${theme.borderRadius.md} ${theme.borderRadius.md} 0 0`,
              backgroundColor: `${theme.colors.primary}40`
            }} />
            <div style={{
              height: '60%',
              width: '100%',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              borderRadius: `${theme.borderRadius.md} ${theme.borderRadius.md} 0 0`,
              backgroundColor: `${theme.colors.primary}40`
            }} />
            <div style={{
              height: '30%',
              width: '100%',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              borderRadius: `${theme.borderRadius.md} ${theme.borderRadius.md} 0 0`,
              backgroundColor: `${theme.colors.primary}40`
            }} />
            <div style={{
              height: '100%',
              width: '100%',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              borderRadius: `${theme.borderRadius.md} ${theme.borderRadius.md} 0 0`,
              backgroundColor: theme.colors.primary
            }} />
          </div>
          <p style={{
            marginTop: '8px',
            textAlign: 'center',
            fontSize: theme.typography.fontSize.xs,
            color: theme.colors.textSecondary
          }}>
            Monthly Spending Chart
          </p>
        </div>
      </div>

      <div style={{
        marginTop: theme.spacing[4],
        display: 'flex',
        justifyContent: 'space-between',
        borderTop: `1px solid ${theme.colors.border}`,
        paddingTop: theme.spacing[4]
      }}>
        <span style={{
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.medium,
          color: theme.colors.textPrimary
        }}>
          Total Spent
        </span>
        <span style={{
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.secondary
        }}>
          ${totalSpent.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

