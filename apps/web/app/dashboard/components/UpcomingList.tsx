import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import Link from 'next/link';

interface UpcomingItem {
  id: string;
  title: string;
  location: string;
  scheduledTime: string;
  avatar?: string;
}

interface UpcomingListProps {
  title: string;
  items: UpcomingItem[];
  emptyMessage?: string;
  actionLabel?: string;
  actionHref?: string;
  date?: string;
}

export function UpcomingList({
  title,
  items,
  emptyMessage = 'No upcoming items',
  actionLabel = 'See All',
  actionHref = '#',
  date,
}: UpcomingListProps) {
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
          {title}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3] }}>
          {date && (
            <span style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
            }}>
              {date}
            </span>
          )}
          <Link
            href={actionHref}
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
            {actionLabel}
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{
          padding: theme.spacing[8],
          textAlign: 'center',
          color: theme.colors.textSecondary,
        }}>
          {emptyMessage}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[3],
                padding: theme.spacing[3],
                borderRadius: theme.borderRadius.lg,
                backgroundColor: theme.colors.backgroundSecondary,
                border: `1px solid ${theme.colors.border}`,
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: theme.borderRadius.full,
                backgroundColor: theme.colors.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {item.avatar ? (
                  <img
                    src={item.avatar}
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: theme.borderRadius.full,
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <Icon name="user" size={20} color="white" />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textPrimary,
                  marginBottom: '2px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {item.title}
                </div>
                <div style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.textSecondary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {item.location}
                </div>
              </div>
              <div style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
                whiteSpace: 'nowrap',
                fontWeight: theme.typography.fontWeight.medium,
              }}>
                {item.scheduledTime}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

