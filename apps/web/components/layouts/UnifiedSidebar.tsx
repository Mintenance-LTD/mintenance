'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Icon } from '@/components/ui/Icon';
import Logo from '@/app/components/Logo';
import { SessionManager } from '@/lib/session-manager';
import { logger } from '@/lib/logger';
import styles from './UnifiedSidebar.module.css';

interface NavItem {
  icon: string;
  label: string;
  href: string;
  badge?: number;
}

interface UnifiedSidebarProps {
  userRole: 'homeowner' | 'contractor';
  userInfo?: {
    name?: string;
    email?: string;
    avatar?: string;
  };
}

// App primary color scheme (blue)
const SIDEBAR_COLORS = {
  background: '#0F172A', // Dark navy blue - app primary color
  hover: '#1E293B', // Lighter blue for hover
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.8)',
  border: 'rgba(255, 255, 255, 0.15)',
  active: 'rgba(255, 255, 255, 0.2)',
};

// Navigation items based on user role - defined outside component to ensure stable references
// Using Object.freeze to prevent any accidental mutations
const homeownerNav: readonly NavItem[] = Object.freeze([
  { icon: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { icon: 'calendar', label: 'Scheduling', href: '/scheduling' },
  { icon: 'briefcase', label: 'Jobs', href: '/jobs' },
  { icon: 'messages', label: 'Messages', href: '/messages' },
  { icon: 'home', label: 'Properties', href: '/properties' },
  { icon: 'currencyDollar', label: 'Financials', href: '/financials' },
  { icon: 'settings', label: 'Settings', href: '/settings' },
]);

const contractorNav: readonly NavItem[] = Object.freeze([
  { icon: 'dashboard', label: 'Dashboard', href: '/contractor/dashboard-enhanced' },
  { icon: 'calendar', label: 'Scheduling', href: '/scheduling' },
  { icon: 'briefcase', label: 'Jobs', href: '/contractor/bid' },
  { icon: 'users', label: 'Customers', href: '/contractor/crm' },
  { icon: 'messages', label: 'Messages', href: '/contractor/messages' },
  { icon: 'currencyDollar', label: 'Financials', href: '/contractor/finance' },
  { icon: 'building', label: 'Company', href: '/contractor/profile' },
  { icon: 'trendingUp', label: 'Reporting', href: '/contractor/reporting' },
]);

export function UnifiedSidebar({ userRole, userInfo }: UnifiedSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Ensure userRole has a default value to prevent hydration mismatches
  // This ensures consistent array selection during SSR and client
  const resolvedUserRole = userRole || 'contractor';

  // Handle logout properly - call API then redirect
  const handleLogout = async (): Promise<void> => {
    if (isLoggingOut) return; // Prevent double-click
    
    setIsLoggingOut(true);
    try {
      // Clear session data
      const sessionManager = SessionManager.getInstance();
      sessionManager.clearSession();

      // Call logout API endpoint
      await fetch('/api/auth/logout', { method: 'POST' });
      
      // Redirect to login page
      router.push('/login');
      router.refresh();
    } catch (error) {
      logger.error('Logout failed', error);
      // Still redirect to login even if API call fails
      router.push('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Select navigation items based on user role - use stable reference
  // Use resolvedUserRole to ensure consistent selection during SSR and client
  const navItems = React.useMemo(() => {
    if (resolvedUserRole === 'contractor') {
      return contractorNav;
    }
    return homeownerNav;
  }, [resolvedUserRole]);

  const isActive = (href: string) => {
    // Use pathname directly - it's available on both server and client in Next.js 15
    // Return false if pathname is not available (shouldn't happen, but defensive)
    if (!pathname) {
      return false;
    }
    if (href === '/dashboard' || href === '/contractor/dashboard-enhanced') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  // Use CSS classes to avoid hydration mismatches from inline style normalization
  const sidebarClassName = `${styles.sidebar} ${isCollapsed && mounted ? styles.sidebarCollapsed : ''}`;

  // Always render the same structure to prevent hydration mismatches
  // The nav element must always be present, even during SSR
  return (
    <>
      {/* Sidebar */}
      <aside className={sidebarClassName}>
        {/* Logo Section */}
        <div className={styles.logoSection}>
          <div className={styles.logoContainer}>
            <Logo width={32} height={32} />
          </div>
          {!isCollapsed && (
            <div className={styles.logoText}>
              Mintenance
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className={styles.nav} suppressHydrationWarning>
          {navItems.map((item) => {
            // Calculate active state - pathname is available on both server and client
            const active = isActive(item.href);
            const linkClassName = `${styles.navLink} ${active ? styles.navLinkActive : ''}`;
            const textClassName = `${styles.navLinkText} ${active ? styles.navLinkTextActive : ''}`;
            
            return (
              <Link
                key={`${resolvedUserRole}-nav-${item.href}`}
                href={item.href}
                className={linkClassName}
                suppressHydrationWarning
              >
                <Icon name={item.icon} size={20} color={SIDEBAR_COLORS.text} />
                {!isCollapsed && (
                  <span className={textClassName} suppressHydrationWarning>
                    {item.label}
                  </span>
                )}
                {active && (
                  <div className={styles.activeIndicator} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className={styles.bottomSection}>
          <Link
            href="/help"
            className={styles.helpLink}
          >
            <Icon name="helpCircle" size={20} color={SIDEBAR_COLORS.text} />
            {!isCollapsed && (
              <span className={styles.navLinkText}>Help</span>
            )}
          </Link>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={styles.logoutButton}
          >
            <Icon name="logOut" size={20} color={SIDEBAR_COLORS.text} />
            {!isCollapsed && (
              <span className={styles.navLinkText}>
                {isLoggingOut ? 'Signing out...' : 'Log Out'}
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

