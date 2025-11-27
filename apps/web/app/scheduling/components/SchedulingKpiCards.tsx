import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { TrendSparkline } from '@/components/ui/TrendSparkline';
import { theme } from '@/lib/theme';

interface KpiCard {
  icon: string;
  title: string;
  value: string;
}

interface SchedulingKpiCardsProps {
  kpis?: KpiCard[];
}

const defaultKpis: KpiCard[] = [
  { icon: 'calendar', title: 'Scheduled Jobs', value: '8 Bids' },
  { icon: 'target', title: 'Active Bids', value: '3 Bids' },
  { icon: 'user', title: 'Active Bids', value: '3 Bids' },
  { icon: 'clock', title: 'Active Bids', value: '4 Bids' },
  { icon: 'target', title: 'Scheduled Jobs', value: '8 Bids' },
  { icon: 'calendar', title: 'Scheduled Jobs', value: '8 Bids' },
];

export function SchedulingKpiCards({ kpis = defaultKpis }: SchedulingKpiCardsProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing[4],
    }}>
      <h3 style={{
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing[2],
      }}>
        Additional KPIs
      </h3>
      
      {kpis.map((kpi, index) => (
        <div
          key={index}
          style={{
            backgroundColor: theme.colors.white,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing[4],
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[3],
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Icon and Title */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[3],
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: theme.borderRadius.full,
              backgroundColor: theme.colors.backgroundSecondary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Icon name={kpi.icon as any} size={20} color={theme.colors.primary} />
            </div>
            <span style={{
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.textPrimary,
            }}>
              {kpi.title}
            </span>
          </div>

          {/* Value and Sparkline */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
            }}>
              {kpi.value}
            </span>
            <TrendSparkline direction="up" showLabel={false} />
          </div>
        </div>
      ))}
    </div>
  );
}

