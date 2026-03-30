'use client';

import React from 'react';
import { Card } from '@/components/ui/Card.unified';
import { Button } from '@/components/ui/Button';
import { theme } from '@/lib/theme';

interface TopOffendingIPsProps {
  topIPs: Array<{ ip: string; count: number }>;
  onBlockIP: (ip: string) => void;
}

export function TopOffendingIPs({ topIPs, onBlockIP }: TopOffendingIPsProps) {
  if (topIPs.length === 0) return null;

  return (
    <Card style={{ padding: theme.spacing[6], marginBottom: theme.spacing[6] }}>
      <h2
        style={{
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.textPrimary,
          marginBottom: theme.spacing[4],
        }}
      >
        Top Offending IPs
      </h2>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[2],
        }}
      >
        {topIPs.slice(0, 10).map((item, index) => (
          <div
            key={item.ip}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: theme.spacing[3],
              backgroundColor: theme.colors.backgroundSecondary,
              borderRadius: theme.borderRadius.md,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                theme.colors.backgroundTertiary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor =
                theme.colors.backgroundSecondary;
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[2],
              }}
            >
              <span
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  fontFamily: 'monospace',
                  color: theme.colors.textPrimary,
                }}
              >
                {item.ip}
              </span>
              <span
                style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.textTertiary,
                }}
              >
                #{index + 1}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[2],
              }}
            >
              <span
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textPrimary,
                }}
              >
                {item.count} events
              </span>
              <Button
                variant='outline'
                onClick={() => onBlockIP(item.ip)}
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: '#EF4444',
                }}
              >
                Block
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
