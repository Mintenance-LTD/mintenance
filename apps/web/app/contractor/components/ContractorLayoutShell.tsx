'use client';

import React, { ReactNode, useMemo, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { theme } from '@/lib/theme';
import Logo from '../../components/Logo';
import { Icon } from '@/components/ui/Icon';
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { useNotificationCounts } from '@/hooks/useNotificationCounts';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { ProfileDropdown } from '@/components/profile/ProfileDropdown';

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
  userId?: string | null;
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

// UnifiedSidebar handles navigation sections internally

export function ContractorLayoutShell({ children, contractor, email, userId }: ContractorLayoutShellProps) {
  const pathname = usePathname();
  const { counts } = useNotificationCounts();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch - pathname is not available on server
  useEffect(() => {
    setMounted(true);
  }, []);

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
      <UnifiedSidebar
        userRole="contractor"
        userInfo={userInfo}
      />

      <div
        style={{
          flex: 1,
          width: 'calc(100% - 280px)',
          marginLeft: '280px',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <header
          suppressHydrationWarning
          style={{
            display: 'flex',
            alignItems: mounted && pathname === '/contractor/dashboard-enhanced' ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            padding: mounted && pathname === '/contractor/dashboard-enhanced' 
              ? `${theme.spacing[4]} ${theme.spacing[8]}` 
              : `${theme.spacing[6]} ${theme.spacing[8]}`,
            backgroundColor: theme.colors.surface,
            borderBottom: `1px solid ${theme.colors.border}`,
            position: 'sticky',
            top: 0,
            zIndex: 10,
            flexWrap: mounted && pathname === '/contractor/dashboard-enhanced' ? 'wrap' : 'nowrap',
            gap: theme.spacing[4],
          }}
        >
          {/* Left Side - Conditional content based on page */}
          <div
            suppressHydrationWarning
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[4],
              flex: mounted && pathname === '/contractor/dashboard-enhanced' ? '0 1 auto' : 1,
              minWidth: 0,
            }}
          >
            {mounted && pathname === '/contractor/dashboard-enhanced' ? (
              // Dashboard: Show title and welcome message
              <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1] }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: theme.typography.fontSize['3xl'],
                    fontWeight: theme.typography.fontWeight.bold,
                    color: theme.colors.textPrimary,
                  }}
                >
                  Dashboard
                </h1>
                <p
                  style={{
                    margin: 0,
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.textSecondary,
                  }}
                >
                  Welcome back, {contractor?.first_name || contractor?.company_name || email || 'Contractor'}
                </p>
              </div>
            ) : (
              // Non-dashboard pages: Show search bar (or placeholder on server)
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
            )}
          </div>

          {/* Right Side - Actions */}
          <div
            suppressHydrationWarning
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[3],
              flexWrap: 'wrap',
            }}
          >
            {/* Dashboard-specific actions */}
            {mounted && pathname === '/contractor/dashboard-enhanced' ? (
              <>
                <Link
                  href="/contractor/bid"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: theme.spacing[2],
                    padding: `${theme.spacing[3]} ${theme.spacing[5]}`,
                    borderRadius: theme.borderRadius.lg,
                    backgroundColor: 'transparent',
                    color: theme.colors.primary,
                    textDecoration: 'none',
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.semibold,
                    border: `1px solid ${theme.colors.primary}`,
                  }}
                >
                  <Icon name="briefcase" size={16} color={theme.colors.primary} />
                  View Jobs
                </Link>
                <Link
                  href="/contractor/jobs-near-you"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: theme.spacing[2],
                    padding: `${theme.spacing[3]} ${theme.spacing[5]}`,
                    borderRadius: theme.borderRadius.lg,
                    backgroundColor: theme.colors.primary,
                    color: theme.colors.textInverse,
                    textDecoration: 'none',
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.semibold,
                    boxShadow: theme.shadows.sm,
                    border: `1px solid ${theme.colors.primary}`,
                  }}
                >
                  <Icon name="mapPin" size={16} color={theme.colors.textInverse} />
                  Jobs Near You
                </Link>
              </>
            ) : (
              /* Jobs Near You button for non-dashboard pages */
              <Link
                href="/contractor/jobs-near-you"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                  padding: `${theme.spacing[3]} ${theme.spacing[5]}`,
                  borderRadius: theme.borderRadius.lg,
                  backgroundColor: theme.colors.primary,
                  color: theme.colors.textInverse,
                  textDecoration: 'none',
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.semibold,
                  boxShadow: theme.shadows.sm,
                  border: `1px solid ${theme.colors.primary}`,
                }}
              >
                <Icon name="mapPin" size={16} color={theme.colors.textInverse} />
                Jobs Near You
              </Link>
            )}

            {/* Notification button */}
            {userId ? (
              <div style={{ width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <NotificationDropdown userId={userId} />
              </div>
            ) : (
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
            )}

            {/* Profile Dropdown */}
            <ProfileDropdown
              contractorName={contractorFullName}
              profileImageUrl={contractor?.profile_image_url}
              initials={initials}
            />
          </div>
        </header>

        <main
          style={{
            flex: 1,
            padding: `${theme.spacing[8]} ${theme.spacing[8]} ${theme.spacing[10]}`,
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[8],
            position: 'relative',
            zIndex: 1,
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
