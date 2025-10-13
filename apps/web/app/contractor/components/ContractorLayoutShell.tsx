'use client';

import React, { ReactNode, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { theme } from '@/lib/theme';
import Logo from '../../components/Logo';
import { Icon } from '@/components/ui/Icon';
import { AnimatedSidebar } from '@/components/ui/AnimatedSidebar';
import { useNotificationCounts } from '@/hooks/useNotificationCounts';

type ContractorSummary = {
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  profile_image_url?: string | null;
  city?: string | null;
  country?: string | null;
};

interface ContractorLayoutShellProps {
  children: ReactNode;
  contractor?: ContractorSummary | null;
  email?: string | null;
}

type NavItem = {
  label: string;
  href: string;
  icon: string;
  badge?: number;
};

type NavSection = {
  heading: string;
  items: NavItem[];
};

// Navigation sections for AnimatedSidebar (now a function that takes counts)
const getNavSections = (counts: { messages?: number; connections?: number; quoteRequests?: number }) => [
  {
    title: 'Overview',
    items: [
      { icon: 'home', label: 'Dashboard', href: '/dashboard' },
      { icon: 'briefcase', label: 'Jobs & Bids', href: '/contractor/bid', badge: counts.quoteRequests },
      { icon: 'users', label: 'Connections', href: '/contractor/connections', badge: counts.connections },
      { icon: 'mapPin', label: 'Service Areas', href: '/contractor/service-areas' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { icon: 'fileText', label: 'Quotes & Invoices', href: '/contractor/quotes' },
      { icon: 'currencyDollar', label: 'Finance', href: '/contractor/finance' },
      { icon: 'messages', label: 'Messages', href: '/messages', badge: counts.messages },
    ],
  },
  {
    title: 'Growth',
    items: [
      { icon: 'profile', label: 'Profile', href: '/contractor/profile' },
      { icon: 'idCard', label: 'Business Card', href: '/contractor/card-editor' },
      { icon: 'collection', label: 'Portfolio', href: '/contractor/gallery' },
      { icon: 'megaphone', label: 'Social Hub', href: '/contractor/social' },
      { icon: 'notebook', label: 'CRM', href: '/contractor/crm' },
    ],
  },
  {
    title: 'Support',
    items: [
      { icon: 'help', label: 'Help & Support', href: '/contractor/support' },
      { icon: 'shield', label: 'Verification', href: '/contractor/verification' },
    ],
  },
];

export function ContractorLayoutShell({ children, contractor, email }: ContractorLayoutShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { counts } = useNotificationCounts();

  const initials = useMemo(() => {
    const first = contractor?.first_name?.charAt(0) ?? '';
    const last = contractor?.last_name?.charAt(0) ?? '';
    const fallback = email?.charAt(0) ?? 'M';
    return (first + last || fallback).toUpperCase();
  }, [contractor?.first_name, contractor?.last_name, email]);

  const contractorFullName =
    contractor?.first_name || contractor?.last_name
      ? `${contractor?.first_name ?? ''} ${contractor?.last_name ?? ''}`.trim()
      : contractor?.company_name ?? 'Mintenance Contractor';

  const locationLabel = contractor?.city || contractor?.country
    ? [contractor?.city, contractor?.country].filter(Boolean).join(', ')
    : 'Set your location';

  const userInfo = {
    name: contractorFullName,
    email: email || '',
    avatar: contractor?.profile_image_url || undefined,
    role: 'contractor',
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        backgroundColor: theme.colors.backgroundSecondary,
        color: theme.colors.textPrimary,
        fontFamily: theme.typography.fontFamily.regular,
      }}
    >
      <AnimatedSidebar
        sections={getNavSections(counts)}
        userInfo={userInfo}
        onLogout={handleLogout}
      />

      <div
        style={{
          flex: 1,
          marginLeft: '280px', // Default expanded width
          display: 'flex',
          flexDirection: 'column',
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${theme.spacing[6]} ${theme.spacing[8]}`,
            backgroundColor: theme.colors.surface,
            borderBottom: `1px solid ${theme.colors.border}`,
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[4],
              flex: 1,
            }}
          >
            <form
              action="/contractors"
              method="get"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                backgroundColor: theme.colors.backgroundSecondary,
                borderRadius: '14px',
                padding: '10px 16px',
                border: `1px solid ${theme.colors.border}`,
                maxWidth: '420px',
                gap: theme.spacing[2],
              }}
            >
              <Icon name="discover" size={18} color={theme.colors.textQuaternary} />
              <input
                name="query"
                type="search"
                placeholder="Search contractors or projects"
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textPrimary,
                }}
              />
              <button
                type="submit"
                style={{
                  background: theme.colors.primary,
                  color: theme.colors.textInverse,
                  border: 'none',
                  borderRadius: theme.borderRadius.md,
                  padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.medium,
                  cursor: 'pointer',
                }}
              >
                Search
              </button>
            </form>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[4],
            }}
          >
            <button
              type="button"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                border: `1px solid ${theme.colors.border}`,
                backgroundColor: theme.colors.backgroundSecondary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: `background-color ${theme.animation.duration.fast} ${theme.animation.easing.easeOut}`,
              }}
              aria-label="Notifications"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.background;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
              }}
            >
              <Icon name="bell" size={18} color={theme.colors.textSecondary} />
            </button>

            <Link
              href="/contractor/quotes/create"
              style={{
                padding: '0 18px',
                height: '44px',
                borderRadius: '14px',
                border: 'none',
                backgroundColor: theme.colors.primary,
                color: theme.colors.textInverse,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.semibold,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: theme.spacing[2],
                textDecoration: 'none',
              }}
            >
              <Icon name="plus" size={16} color={theme.colors.textInverse} />
              New Quote
            </Link>
          </div>
        </header>

        <main
          style={{
            flex: 1,
            padding: `${theme.spacing[8]} ${theme.spacing[8]} ${theme.spacing[10]}`,
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[8],
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
