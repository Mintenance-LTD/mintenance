'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

export interface Activity {
  id: string;
  type: 'job_completed' | 'review_received' | 'quote_accepted' | 'payment_received' | 'bid_submitted' | 'message_received';
  title: string;
  description: string;
  timestamp: string;
}

interface ActivityTimelineProps {
  activities: Activity[];
  title?: string;
}

export function ActivityTimeline({ activities, title = 'Recent Activity' }: ActivityTimelineProps) {
  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'job_completed': return 'checkCircle';
      case 'review_received': return 'star';
      case 'quote_accepted': return 'fileText';
      case 'payment_received': return 'currencyDollar';
      case 'bid_submitted': return 'briefcase';
      case 'message_received': return 'messages';
      default: return 'dot';
    }
  };

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'job_completed': return theme.colors.success;
      case 'review_received': return theme.colors.warning;
      case 'quote_accepted': return theme.colors.info;
      case 'payment_received': return theme.colors.secondary;
      case 'bid_submitted': return theme.colors.primary;
      case 'message_received': return theme.colors.info;
      default: return theme.colors.textSecondary;
    }
  };

  if (activities.length === 0) {
    return null;
  }

  return (
    <div style={{
      backgroundColor: theme.colors.surface,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: '20px',
      padding: theme.spacing[6],
    }}>
      <h3 style={{
        margin: 0,
        marginBottom: theme.spacing[5],
        fontSize: theme.typography.fontSize['2xl'],
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.textPrimary,
      }}>
        {title}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
        {activities.map((activity, index) => (
          <div key={activity.id} style={{
            display: 'flex',
            gap: theme.spacing[4],
            position: 'relative',
            paddingBottom: index < activities.length - 1 ? theme.spacing[4] : 0,
            borderBottom: index < activities.length - 1 ? `1px solid ${theme.colors.borderLight}` : 'none',
          }}>
            {/* Icon */}
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: `${getActivityColor(activity.type)}15`,
              border: `1px solid ${getActivityColor(activity.type)}40`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon
                name={getActivityIcon(activity.type)}
                size={20}
                color={getActivityColor(activity.type)}
              />
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4 style={{
                margin: 0,
                marginBottom: theme.spacing[1],
                fontSize: theme.typography.fontSize.md,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.textPrimary,
              }}>
                {activity.title}
              </h4>
              <p style={{
                margin: 0,
                marginBottom: theme.spacing[2],
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textSecondary,
                lineHeight: 1.5,
              }}>
                {activity.description}
              </p>
              <span style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textQuaternary,
              }}>
                {new Date(activity.timestamp).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
