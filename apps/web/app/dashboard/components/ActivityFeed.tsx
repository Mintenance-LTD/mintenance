import React from 'react';
import Link from 'next/link';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

interface ActivityItem {
  id: string;
  type: 'job' | 'payment' | 'message' | 'estimate' | 'subscription';
  title: string;
  description: string;
  timestamp: string;
  linkText?: string;
  linkHref?: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'job':
        return 'briefcase';
      case 'payment':
        return 'creditCard';
      case 'message':
        return 'messages';
      case 'estimate':
        return 'fileText';
      case 'subscription':
        return 'calendar';
      default:
        return 'bell';
    }
  };

  return (
    <div style={{
      backgroundColor: theme.colors.white,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing[6],
      border: `1px solid ${theme.colors.border}`,
      boxShadow: theme.shadows.sm,
    }}>
      <h2 style={{
        margin: 0,
        marginBottom: theme.spacing[5],
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.textPrimary,
      }}>
        Recent Activity
      </h2>

      {activities.length === 0 ? (
        <div style={{
          padding: theme.spacing[8],
          textAlign: 'center',
          color: theme.colors.textSecondary,
        }}>
          No recent activity
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
          {activities.map((activity, index) => (
            <div
              key={activity.id}
              style={{
                display: 'flex',
                gap: theme.spacing[3],
                paddingBottom: index < activities.length - 1 ? theme.spacing[4] : 0,
                borderBottom:
                  index < activities.length - 1
                    ? `1px solid ${theme.colors.border}`
                    : 'none',
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: theme.borderRadius.full,
                backgroundColor: theme.colors.backgroundSecondary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon
                  name={getActivityIcon(activity.type)}
                  size={16}
                  color={theme.colors.primary}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textPrimary,
                  marginBottom: '4px',
                }}>
                  {activity.title}
                </div>
                <div style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                  marginBottom: '4px',
                }}>
                  {activity.description}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                }}>
                  <span style={{
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textTertiary,
                  }}>
                    {activity.timestamp}
                  </span>
                  {activity.linkText && activity.linkHref && (
                    <>
                      <span style={{ color: theme.colors.textTertiary }}>•</span>
                      <Link
                        href={activity.linkHref}
                        style={{
                          fontSize: theme.typography.fontSize.xs,
                          color: theme.colors.primary,
                          textDecoration: 'none',
                          fontWeight: theme.typography.fontWeight.medium,
                        }}
                      >
                        {activity.linkText}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

