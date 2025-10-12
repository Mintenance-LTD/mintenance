'use client';

import React, { ReactNode, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { theme } from '@/lib/theme';
import Logo from '../../components/Logo';
import { Icon } from '@/components/ui/Icon';

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

const navSections: NavSection[] = [
  {
    heading: 'Workflows',
    items: [
      { label: 'Jobs & Bids', href: '/contractor/bid', icon: 'briefcase' },
      { label: 'Connections', href: '/contractor/connections', icon: 'users' },
      { label: 'Service Areas', href: '/contractor/service-areas', icon: 'mapPin' },
    ],
  },
  {
    heading: 'Operations',
    items: [
      { label: 'Quotes & Templates', href: '/contractor/quotes', icon: 'fileText' },
      { label: 'Quote Builder', href: '/contractor/quotes', icon: 'fileText' },
      { label: 'Finance', href: '/contractor/finance', icon: 'currencyDollar' },
      { label: 'Invoices', href: '/contractor/invoices', icon: 'creditCard' },
    ],
  },
  {
    heading: 'Growth',
    items: [
      { label: 'Profile', href: '/contractor/profile', icon: 'profile' },
      { label: 'Card Editor', href: '/contractor/card-editor', icon: 'idCard' },
      { label: 'Portfolio', href: '/contractor/gallery', icon: 'collection' },
      { label: 'Social Hub', href: '/contractor/social', icon: 'megaphone' },
      { label: 'CRM', href: '/contractor/crm', icon: 'notebook' },
    ],
  },
];

const footerItems: NavItem[] = [
  { label: 'Analytics', href: '/contractor/finance', icon: 'chart' },
  { label: 'Support', href: '/contractor/support', icon: 'badge' },
];

export function ContractorLayoutShell({ children, contractor, email }: ContractorLayoutShellProps) {
  const pathname = usePathname();

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

  const renderNavItem = (item: NavItem) => {
    const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

    return (
      <Link
        key={item.href}
        href={item.href}
        prefetch={false}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textDecoration: 'none',
          color: isActive ? theme.colors.primary : theme.colors.textSecondary,
          backgroundColor: isActive ? theme.colors.backgroundSecondary : 'transparent',
          borderRadius: '12px',
          padding: '12px 14px',
          transition: `background-color ${theme.animation.duration.fast} ${theme.animation.easing.easeOut}`,
          fontWeight: isActive ? theme.typography.fontWeight.semibold : theme.typography.fontWeight.medium,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              backgroundColor: isActive ? theme.colors.background : theme.colors.backgroundSecondary,
              border: `1px solid ${isActive ? theme.colors.primary : theme.colors.borderLight}`,
            }}
          >
            <Icon name={item.icon} size={18} color={isActive ? theme.colors.primary : theme.colors.textSecondary} />
          </span>
          <span>{item.label}</span>
        </span>
        {typeof item.badge === 'number' && item.badge > 0 && (
          <span
            style={{
              minWidth: '26px',
              padding: '2px 8px',
              borderRadius: '999px',
              backgroundColor: theme.colors.error,
              color: theme.colors.textInverse,
              fontSize: theme.typography.fontSize.xs,
              fontWeight: theme.typography.fontWeight.semibold,
              textAlign: 'center',
            }}
          >
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
      </Link>
    );
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
      <aside
        style={{
          width: '280px',
          backgroundColor: theme.colors.surface,
          borderRight: `1px solid ${theme.colors.border}`,
          display: 'flex',
          flexDirection: 'column',
          padding: theme.spacing[6],
          gap: theme.spacing[6],
        }}
      >
        <Link
          href="/dashboard"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[3],
            textDecoration: 'none',
            color: theme.colors.textPrimary,
          }}
        >
          <Logo width={36} height={36} />
          <div>
            <span
              style={{
                fontSize: theme.typography.fontSize['2xl'],
                fontWeight: theme.typography.fontWeight.bold,
              }}
            >
              Mintenance
            </span>
            <div
              style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
                fontWeight: theme.typography.fontWeight.medium,
              }}
            >
              Contractor Workspace
            </div>
          </div>
        </Link>

        <div
          style={{
            backgroundColor: theme.colors.backgroundSecondary,
            color: theme.colors.textPrimary,
            borderRadius: '16px',
            padding: theme.spacing[5],
            border: `1px solid ${theme.colors.border}`,
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[3],
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[3],
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                overflow: 'hidden',
                backgroundColor: theme.colors.surface,
                border: `1px solid ${theme.colors.borderLight}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: theme.typography.fontSize['2xl'],
                fontWeight: theme.typography.fontWeight.bold,
                textTransform: 'uppercase',
              }}
            >
              {contractor?.profile_image_url ? (
                <img
                  src={contractor.profile_image_url}
                  alt={contractorFullName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                initials
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span
                style={{
                  fontSize: theme.typography.fontSize.lg,
                  fontWeight: theme.typography.fontWeight.semibold,
                  lineHeight: 1.2,
                }}
              >
                {contractorFullName}
              </span>
              <span
                style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.textSecondary,
                }}
              >
                {email}
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: theme.colors.surface,
              border: `1px solid ${theme.colors.borderLight}`,
              borderRadius: '12px',
              padding: '12px 14px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span
                style={{
                  fontSize: theme.typography.fontSize.xs,
                  textTransform: 'uppercase',
                  letterSpacing: '1.2px',
                  color: theme.colors.textSecondary,
                }}
              >
                Availability
              </span>
              <span
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  color: theme.colors.textPrimary,
                }}
              >
                {locationLabel}
              </span>
            </div>
            <span
              style={{
                padding: '6px 12px',
                borderRadius: '999px',
                backgroundColor: theme.colors.secondary,
                color: theme.colors.white,
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.semibold,
              }}
            >
              Active
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[5], flex: 1 }}>
          {navSections.map((section) => (
            <div key={section.heading} style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
              <span
                style={{
                  textTransform: 'uppercase',
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.textQuaternary,
                  letterSpacing: '1.4px',
                }}
              >
                {section.heading}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {section.items.map(renderNavItem)}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            borderTop: `1px solid ${theme.colors.border}`,
            paddingTop: theme.spacing[5],
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {footerItems.map(renderNavItem)}
        </div>
      </aside>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
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
