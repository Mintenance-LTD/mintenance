'use client';

import React from 'react';
import { Card } from '@/components/ui/Card.unified';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';
import styles from '../../../app/admin/admin.module.css';

interface SecurityMetrics {
  total_events: number;
  critical_events: number;
  high_severity_events: number;
  unique_ips: number;
  top_event_types: Record<string, number>;
  recent_critical_events: Array<{
    id: string;
    event_type: string;
    details: string;
    ip_address: string;
    created_at: string;
  }>;
}

interface SecurityMetricsCardsProps {
  metrics: SecurityMetrics;
}

const CARD_CONFIG = [
  {
    label: 'Total Events',
    key: 'total_events' as const,
    icon: 'activity',
    color: theme.colors.primary,
    bgColor: 'rgba(59, 130, 246, 0.1)',
  },
  {
    label: 'Critical Events',
    key: 'critical_events' as const,
    icon: 'alert',
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
  },
  {
    label: 'High Severity',
    key: 'high_severity_events' as const,
    icon: 'warning',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.1)',
  },
  {
    label: 'Unique IPs',
    key: 'unique_ips' as const,
    icon: 'shield',
    color: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.1)',
  },
] as const;

export function SecurityMetricsCards({ metrics }: SecurityMetricsCardsProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: theme.spacing[4],
        marginBottom: theme.spacing[8],
      }}
    >
      {CARD_CONFIG.map(({ label, key, icon, color, bgColor }) => (
        <Card
          key={key}
          className={styles.metricCard}
          style={{ padding: theme.spacing[6] }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[3],
              marginBottom: theme.spacing[2],
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: theme.borderRadius.full,
                backgroundColor: bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={icon} size={24} color={color} />
            </div>
            <h3
              style={{
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.textPrimary,
              }}
            >
              {label}
            </h3>
          </div>
          <p
            style={{
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color,
            }}
          >
            {metrics[key].toLocaleString()}
          </p>
        </Card>
      ))}
    </div>
  );
}

export type { SecurityMetrics };
