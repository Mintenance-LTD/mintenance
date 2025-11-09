'use client';

import React from 'react';
import Link from 'next/link';
import { theme } from '@/lib/theme';
import { Badge, MessageCircle, Briefcase, BarChart3, Search, ChevronRight } from 'lucide-react';

interface ProfileQuickActionsProps {
  unreadMessagesCount?: number;
}

export function ProfileQuickActions({ unreadMessagesCount = 0 }: ProfileQuickActionsProps) {
  const actions = [
    {
      href: '/contractor/verification',
      icon: <Badge className="h-5 w-5" />,
      label: 'Company & License Verification',
      description: 'Add company name and license to build homeowner trust',
    },
    {
      href: '/messages',
      icon: <MessageCircle className="h-5 w-5" />,
      label: 'Messages',
      description: 'Respond to new homeowner inquiries',
      badge: unreadMessagesCount,
    },
    {
      href: '/jobs',
      icon: <Briefcase className="h-5 w-5" />,
      label: 'Jobs Board',
      description: 'Browse open projects that match your skills',
    },
    {
      href: '/analytics',
      icon: <BarChart3 className="h-5 w-5" />,
      label: 'Performance Analytics',
      description: 'Track revenue, response time, and win rate',
    },
    {
      href: '/discover',
      icon: <Search className="h-5 w-5" />,
      label: 'Discover Leads',
      description: 'See what homeowners are searching for today',
    },
  ];

  return (
    <div
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: '24px',
        border: `1px solid ${theme.colors.border}`,
        boxShadow: 'none',
        padding: theme.spacing[6],
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[4],
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1] }}>
        <h2 className="text-xl font-[560] text-gray-900 m-0 tracking-normal">
          Quick Actions
        </h2>
        <p className="text-sm font-[460] text-gray-600 m-0">
          Stay on top of the work that moves your business forward.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            prefetch={false}
            style={{
              textDecoration: 'none',
              color: theme.colors.textPrimary,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: theme.spacing[3],
                padding: '14px 16px',
                borderRadius: '16px',
                border: `1px solid ${theme.colors.border}`,
                backgroundColor: theme.colors.surface,
                transition: `background-color ${theme.animation.duration.fast} ${theme.animation.easing.easeOut}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.surface;
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], flex: 1 }}>
                <span
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '14px',
                    backgroundColor: theme.colors.backgroundSecondary,
                    border: `1px solid ${theme.colors.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: theme.colors.primary,
                  }}
                >
                  {action.icon}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span
                    style={{
                      fontSize: theme.typography.fontSize.md,
                      fontWeight: theme.typography.fontWeight.semibold,
                    }}
                  >
                    {action.label}
                  </span>
                  <span
                    style={{
                      fontSize: theme.typography.fontSize.xs,
                      color: theme.colors.textSecondary,
                    }}
                  >
                    {action.description}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
                {typeof action.badge === 'number' && action.badge > 0 && (
                  <span
                    style={{
                      minWidth: '28px',
                      padding: '2px 10px',
                      borderRadius: '999px',
                      backgroundColor: theme.colors.error,
                      color: theme.colors.textInverse,
                      fontSize: theme.typography.fontSize.xs,
                      fontWeight: theme.typography.fontWeight.semibold,
                      textAlign: 'center',
                    }}
                  >
                    {action.badge > 99 ? '99+' : action.badge}
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
