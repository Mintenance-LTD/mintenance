'use client';

import React from 'react';
import { Card } from '@/components/ui/Card.unified';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  user_id?: string;
  ip_address: string;
  user_agent: string;
  endpoint: string;
  method: string;
  details: string;
  resolved: boolean;
  created_at: string;
}

interface RecentSecurityEventsProps {
  events: SecurityEvent[];
  onResolve: (eventId: string) => void;
}

const SEVERITY_BORDER_COLORS: Record<string, string> = {
  critical: '#EF4444',
  high: '#F59E0B',
  medium: '#FCD34D',
  low: '#10B981',
};

export function RecentSecurityEvents({
  events,
  onResolve,
}: RecentSecurityEventsProps) {
  return (
    <Card style={{ padding: theme.spacing[6] }}>
      <h2
        style={{
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.textPrimary,
          marginBottom: theme.spacing[4],
        }}
      >
        Recent Security Events
      </h2>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[3],
        }}
      >
        {events.slice(0, 20).map((event) => {
          const borderColor =
            SEVERITY_BORDER_COLORS[event.severity] || theme.colors.border;

          return (
            <div
              key={event.id}
              style={{
                padding: theme.spacing[4],
                borderRadius: theme.borderRadius.md,
                borderLeft: `4px solid ${borderColor}`,
                backgroundColor: event.resolved
                  ? theme.colors.backgroundSecondary
                  : '#FFFFFF',
                opacity: event.resolved ? 0.6 : 1,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!event.resolved)
                  e.currentTarget.style.backgroundColor =
                    theme.colors.backgroundSecondary;
              }}
              onMouseLeave={(e) => {
                if (!event.resolved)
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing[2],
                      marginBottom: theme.spacing[1],
                      flexWrap: 'wrap',
                    }}
                  >
                    <Icon name='shield' size={20} color={borderColor} />
                    <span
                      style={{
                        fontSize: theme.typography.fontSize.sm,
                        fontWeight: theme.typography.fontWeight.semibold,
                        color: theme.colors.textPrimary,
                      }}
                    >
                      {event.event_type
                        .replace('_', ' ')
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                    <span
                      style={{
                        padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                        borderRadius: theme.borderRadius.full,
                        fontSize: theme.typography.fontSize.xs,
                        fontWeight: theme.typography.fontWeight.medium,
                        backgroundColor: `${borderColor}20`,
                        color: borderColor,
                      }}
                    >
                      {event.severity}
                    </span>
                    {event.resolved && (
                      <span
                        style={{
                          padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                          borderRadius: theme.borderRadius.full,
                          fontSize: theme.typography.fontSize.xs,
                          fontWeight: theme.typography.fontWeight.medium,
                          backgroundColor: 'rgba(16, 185, 129, 0.1)',
                          color: theme.colors.success,
                        }}
                      >
                        Resolved
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.colors.textSecondary,
                      marginBottom: theme.spacing[1],
                    }}
                  >
                    {event.details}
                  </p>
                  <div
                    style={{
                      fontSize: theme.typography.fontSize.xs,
                      color: theme.colors.textTertiary,
                    }}
                  >
                    <span style={{ fontFamily: 'monospace' }}>
                      {event.ip_address}
                    </span>
                    <span style={{ margin: `0 ${theme.spacing[2]}` }}>•</span>
                    <span>{event.method}</span>
                    <span style={{ margin: `0 ${theme.spacing[2]}` }}>•</span>
                    <span>{event.endpoint}</span>
                    <span style={{ margin: `0 ${theme.spacing[2]}` }}>•</span>
                    <span>{new Date(event.created_at).toLocaleString()}</span>
                  </div>
                </div>
                {!event.resolved && (
                  <Button
                    variant='outline'
                    onClick={() => onResolve(event.id)}
                    style={{
                      marginLeft: theme.spacing[4],
                      fontSize: theme.typography.fontSize.sm,
                    }}
                  >
                    Resolve
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export type { SecurityEvent };
