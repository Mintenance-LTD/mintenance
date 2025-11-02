'use client';
import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import Link from 'next/link';

interface InvoicesChartProps {
  pastDue: number;
  due: number;
  unsent: number;
  openCount: number;
}

export function InvoicesChart({ pastDue, due, unsent, openCount }: InvoicesChartProps) {
  const total = pastDue + due + unsent;
  const maxValue = Math.max(pastDue, due, unsent) || 1;

  return (
    <div style={{
      backgroundColor: theme.colors.white,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing[6],
      border: `1px solid ${theme.colors.border}`,
      boxShadow: theme.shadows.sm,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing[5],
      }}>
        <h2 style={{
          margin: 0,
          fontSize: theme.typography.fontSize.lg,
          fontWeight: theme.typography.fontWeight.semibold,
          color: theme.colors.textPrimary,
        }}>
          Invoices
        </h2>
        <Link
          href="/financials"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[1],
            color: theme.colors.primary,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
            textDecoration: 'none',
          }}
        >
          <Icon name="plus" size={16} color={theme.colors.primary} />
          See All
        </Link>
      </div>

      {/* Column Chart */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        gap: theme.spacing[4],
        height: '200px',
        marginBottom: theme.spacing[6],
      }}>
        {[
          { label: 'Past due', value: pastDue, color: '#F3E8DD' },
          { label: 'Due', value: due, color: '#C8856A' },
          { label: 'Unsent', value: unsent, color: '#A5D6A7' },
        ].map((item) => {
          const heightPercent = (item.value / maxValue) * 100;
          return (
            <div
              key={item.label}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: theme.spacing[2],
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: `${heightPercent}%`,
                  minHeight: item.value > 0 ? '20px' : '0px',
                  backgroundColor: item.color,
                  borderRadius: `${theme.borderRadius.md} ${theme.borderRadius.md} 0 0`,
                  transition: 'height 0.3s ease',
                }}
              />
              <div style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
                textAlign: 'center',
              }}>
                {item.label}
              </div>
              <div style={{
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {item.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Open Invoices Badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: theme.spacing[2],
      }}>
        <span style={{
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.textSecondary,
        }}>
          Open Invoices
        </span>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
          borderRadius: theme.borderRadius.full,
          backgroundColor: '#D1FAE5',
          color: '#065F46',
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.semibold,
        }}>
          {openCount}
        </div>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
          borderRadius: theme.borderRadius.full,
          backgroundColor: '#D1FAE5',
          color: '#065F46',
          fontSize: theme.typography.fontSize.xs,
          fontWeight: theme.typography.fontWeight.semibold,
        }}>
          +32%
        </div>
      </div>
    </div>
  );
}

