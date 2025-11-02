import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

interface ActivityItem {
  id: string;
  type: 'bid' | 'message' | 'payment';
  title: string;
  subtitle: string;
  timestamp: string;
  icon: string;
  iconColor: string;
  iconBg: string;
}

interface RecentActivityProps {
  activities: ActivityItem[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
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
        margin: 0,
        fontSize: theme.typography.fontSize.lg
      }}>
        Recent Activity
      </h3>

      <ul style={{
        marginTop: theme.spacing[4],
        listStyle: 'none',
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[4]
      }}>
        {activities.map((activity) => (
          <li key={activity.id} style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: theme.spacing[3]
          }}>
            <div style={{
              marginTop: theme.spacing[1],
              flexShrink: 0,
              width: '32px',
              height: '32px',
              borderRadius: theme.borderRadius.full,
              backgroundColor: activity.iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Icon name={activity.icon as any} size={16} color={activity.iconColor} />
            </div>
            <div>
              <p style={{
                margin: 0,
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textPrimary
              }}>
                {activity.title}
              </p>
              <p style={{
                margin: 0,
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary
              }}>
                {activity.timestamp}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

