'use client';

import React, { ReactNode, useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { theme } from '@/lib/theme';
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { Briefcase, MapPin, Bell, Menu, X } from 'lucide-react';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { ProfileDropdown } from '@/components/profile/ProfileDropdown';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Search } from 'lucide-react';

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
  initialPathname?: string;
}

// UnifiedSidebar handles navigation sections internally

export function ContractorLayoutShell({ children, contractor, email, userId, initialPathname }: ContractorLayoutShellProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Calculate these consistently for both server and client initial render
  // Use initialPathname for SSR consistency, fallback to pathname if available
  const pathForCalculation = initialPathname ?? pathname ?? '';
  const isDashboard = pathForCalculation === '/contractor/dashboard-enhanced' || pathForCalculation.startsWith('/contractor/dashboard-enhanced');
  const isJobDetail = pathForCalculation.startsWith('/contractor/jobs/');

  useEffect(() => {
    setMounted(true);
    
    // Check screen size for mobile menu
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 1024);
      if (width >= 1024) {
        setIsMobileOpen(false);
      }
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
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

  // Memoize page title to prevent hydration mismatches
  const pageTitle = useMemo(() => {
    // Prioritize initialPathname for SSR consistency, only use pathname if initialPathname is not provided
    const pathToUse = initialPathname || pathname || '';
    
    // Normalize pathname: remove query params, trailing slashes, and ensure consistent format
    const normalizedPath = pathToUse.split('?')[0].split('#')[0].replace(/\/$/, '') || '/contractor/dashboard-enhanced';
    
    // Map specific routes to their display titles
    const routeTitleMap: Record<string, string> = {
      '/contractor/dashboard-enhanced': 'Dashboard',
      '/contractor/crm': 'Customers',
      '/contractor/bid': 'Jobs & Bids',
      '/contractor/messages': 'Messages',
      '/contractor/profile': 'Profile',
      '/contractor/finance': 'Financials',
      '/contractor/jobs-near-you': 'Jobs Near You',
      '/contractor/discover': 'Discover Jobs',
      '/contractor/connections': 'Connections',
      '/contractor/gallery': 'Gallery',
      '/contractor/resources': 'Resources',
      '/contractor/quotes': 'Quotes',
      '/contractor/invoices': 'Invoices',
      '/contractor/payouts': 'Payouts',
      '/contractor/reporting': 'Reporting',
      '/contractor/service-areas': 'Service Areas',
      '/contractor/social': 'Social',
      '/contractor/subscription': 'Subscription',
      '/contractor/support': 'Support',
      '/contractor/verification': 'Verification',
      '/contractor/card-editor': 'Card Editor',
      '/contractor/company': 'Company',
      '/scheduling': 'Scheduling',
    };
    
    // Check for exact match first
    if (routeTitleMap[normalizedPath]) {
      return routeTitleMap[normalizedPath];
    }
    
    // Check for dynamic routes (e.g., /contractor/bid/[jobId], /contractor/crm/[id])
    // For contractor routes, check if path starts with /contractor/ and has a known base route
    if (normalizedPath.startsWith('/contractor/')) {
      const pathSegments = normalizedPath.split('/').filter(Boolean);
      // pathSegments[0] = 'contractor', pathSegments[1] = route name (e.g., 'crm', 'bid', 'payouts')
      if (pathSegments.length >= 2) {
        const basePath = `/${pathSegments[0]}/${pathSegments[1]}`;
        if (routeTitleMap[basePath]) {
          return routeTitleMap[basePath];
        }
      }
    }
    
    // Fallback: extract page name from path
    const pageName = normalizedPath.split('/').pop()?.replace(/-/g, ' ') || 'Dashboard';
    return pageName.charAt(0).toUpperCase() + pageName.slice(1);
  }, [initialPathname, pathname]);

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
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
      />

      <div
        suppressHydrationWarning
        style={{
          flex: '1 1 0%',
          width: mounted && isMobile ? '100%' : 'calc(100% - 280px)',
          marginLeft: mounted && isMobile ? '0' : '280px',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          minWidth: 0,
        }}
      >
        <header
          suppressHydrationWarning
          className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-gray-200"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${theme.spacing[6]} ${theme.spacing[8]}`,
            flexWrap: 'nowrap',
            gap: theme.spacing[4],
          }}
        >
          {/* Left Side - Mobile Menu Button & Search */}
          <div
            suppressHydrationWarning
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[4],
              flex: '1 1 0%',
              minWidth: 0,
            }}
          >
            {/* Mobile Menu Toggle Button - Only visible on mobile */}
            {mounted && isMobile && (
              <button
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                suppressHydrationWarning
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  border: `1px solid ${theme.colors.border}`,
                  backgroundColor: theme.colors.backgroundSecondary,
                  cursor: 'pointer',
                  transition: `background-color ${theme.animation.duration.fast} ${theme.animation.easing.easeOut}`,
                }}
                aria-label="Toggle menu"
              >
                {isMobileOpen ? (
                  <X className="h-5 w-5" style={{ color: theme.colors.textPrimary }} />
                ) : (
                  <Menu className="h-5 w-5" style={{ color: theme.colors.textPrimary }} />
                )}
              </button>
            )}
            {/* Search form - hide on dashboard and job detail pages, show on other pages */}
            {!isDashboard && !isJobDetail && (
              <div suppressHydrationWarning style={{ display: 'flex', flex: '1 1 0%', maxWidth: '420px' }}>
                <form
                  action="/contractors"
                  method="get"
                  suppressHydrationWarning
                  style={{
                    flex: '1 1 0%',
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: theme.colors.backgroundSecondary,
                    borderRadius: '14px',
                    padding: '10px 16px',
                    border: `1px solid ${theme.colors.border}`,
                    gap: theme.spacing[2],
                  }}
                >
                  <Search className="h-4 w-4 text-gray-400" />
                  <Input
                    name="query"
                    type="search"
                    placeholder="Search contractors or projects"
                    suppressHydrationWarning
                    className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                    style={{
                      fontSize: theme.typography.fontSize.sm,
                    }}
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                  >
                    Search
                  </Button>
                </form>
              </div>
            )}
            {/* Page title - show for all pages except dashboard (dashboard has its own header) */}
            {!isDashboard && (
              <div suppressHydrationWarning style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1], flex: '0 0 auto' }}>
                <h1
                  suppressHydrationWarning
                  style={{
                    margin: 0,
                    fontSize: theme.typography.fontSize['3xl'],
                    fontWeight: theme.typography.fontWeight.bold,
                    color: theme.colors.textPrimary,
                  }}
                >
                  {pageTitle}
                </h1>
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
            {mounted && (pathname === '/contractor/dashboard-enhanced') ? (
              <>
                <Link
                  href="/contractor/bid"
                  suppressHydrationWarning
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
                  <Briefcase className="h-4 w-4" style={{ color: theme.colors.primary }} />
                  View Jobs
                </Link>
                <Link
                  href="/contractor/jobs-near-you"
                  suppressHydrationWarning
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
                  <MapPin className="h-4 w-4" style={{ color: theme.colors.textInverse }} />
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
                <MapPin className="h-4 w-4" style={{ color: theme.colors.textInverse }} />
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
                <Bell className="h-[18px] w-[18px]" style={{ color: theme.colors.textSecondary }} />
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
                    flex: '1 1 0%',
                    // Consistent padding based on page type
                    padding: isJobDetail ? '32px 32px 32px 24px' : '32px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '32px', // Add proper spacing between sections
                    position: 'relative',
                    zIndex: 1,
                    backgroundColor: theme.colors.white,
                  }}
                >
          {children}
        </main>
      </div>
    </div>
  );
}
