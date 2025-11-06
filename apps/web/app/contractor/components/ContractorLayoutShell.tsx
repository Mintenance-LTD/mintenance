'use client';

import React, { ReactNode, useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { theme } from '@/lib/theme';
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { Icon } from '@/components/ui/Icon';
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

// UnifiedSidebar handles navigation sections internally

export function ContractorLayoutShell({ children, contractor, email, userId }: ContractorLayoutShellProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const isDashboard = mounted && pathname === '/contractor/dashboard-enhanced';

  useEffect(() => {
    setMounted(true);
  }, []);

  const contractorFullName = useMemo(() => {
    return contractor?.first_name || contractor?.last_name
      ? `${contractor?.first_name ?? ''} ${contractor?.last_name ?? ''}`.trim()
      : contractor?.company_name ?? 'Mintenance Contractor';
  }, [contractor?.first_name, contractor?.last_name, contractor?.company_name]);

  const initials = useMemo(() => {
    const first = contractor?.first_name?.charAt(0) ?? '';
    const last = contractor?.last_name?.charAt(0) ?? '';
    const fallback = email?.charAt(0) ?? 'M';
    return (first + last || fallback).toUpperCase();
  }, [contractor?.first_name, contractor?.last_name, email]);

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
        suppressHydrationWarning
        style={{
          flexGrow: 1,
          flexShrink: 1,
          flexBasis: '0%',
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
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${theme.spacing[6]} ${theme.spacing[8]}`,
            backgroundColor: theme.colors.surface,
            borderBottom: `1px solid ${theme.colors.border}`,
            position: 'sticky',
            top: 0,
            zIndex: 10,
            flexWrap: 'nowrap',
            gap: theme.spacing[4],
          }}
        >
          {/* Left Side - Search */}
          <div
            suppressHydrationWarning
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[4],
              flexGrow: 1,
              flexShrink: 1,
              flexBasis: '0%',
              minWidth: 0,
            }}
          >
            {/* Always render search form on server, hide/show conditionally after mount */}
            <div suppressHydrationWarning style={{ display: isDashboard ? 'none' : 'flex', flexGrow: 1, flexShrink: 1, flexBasis: '0%' }}>
              <form
                action="/contractors"
                method="get"
                suppressHydrationWarning
                style={{
                  flexGrow: 1,
                  flexShrink: 1,
                  flexBasis: '0%',
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
                  suppressHydrationWarning
                  style={{
                    flexGrow: 1,
                    flexShrink: 1,
                    flexBasis: '0%',
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
            {/* Dashboard content - only show after mount to prevent hydration mismatch */}
            {isDashboard && (
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
            {/* Dashboard-specific actions - Only render after mount to prevent hydration mismatch */}
            {isDashboard ? (
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
          suppressHydrationWarning
          style={{
            flexGrow: 1,
            flexShrink: 1,
            flexBasis: '0%',
            padding: '32px 32px 40px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '32px',
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
