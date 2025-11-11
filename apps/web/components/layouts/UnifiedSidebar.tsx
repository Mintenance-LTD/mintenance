'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { LogOut } from 'lucide-react';
import { MenuTab } from '@/components/ui/figma';
import Logo from '@/app/components/Logo';
import { Icon } from '@/components/ui/Icon';
import { SessionManager } from '@/lib/session-manager';
import { logger } from '@/lib/logger';
import { theme } from '@/lib/theme';
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
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
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

export function UnifiedSidebar({ userRole, userInfo, isMobileOpen: externalMobileOpen, onMobileClose }: UnifiedSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  
  // Use external mobile state if provided, otherwise use internal state
  const isMobileOpen = externalMobileOpen !== undefined ? externalMobileOpen : internalMobileOpen;
  
  const handleMobileClose = () => {
    if (externalMobileOpen !== undefined && onMobileClose) {
      onMobileClose();
    } else {
      setInternalMobileOpen(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    
    // Check initial screen size
    const checkScreenSize = () => {
      const width = window.innerWidth;
      const mobile = width < 1024;
      setIsMobile(mobile);
      // Auto-collapse on mobile, auto-expand on desktop
      if (mobile) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
        if (externalMobileOpen === undefined) {
          setInternalMobileOpen(false);
        } else if (onMobileClose) {
          onMobileClose();
        }
      }
    };
    
    checkScreenSize();
    
    // Add resize listener
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, [externalMobileOpen, onMobileClose]);

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

  // Memoize isActive calculation to ensure consistency between SSR and client
  // Always default to false during SSR to prevent hydration mismatches
  const isActive = React.useMemo(() => {
    return (href: string) => {
      // During SSR or if pathname is not available, always return false
      // This ensures consistent rendering between server and client
      if (typeof window === 'undefined' || !pathname) {
        return false;
      }
      if (href === '/dashboard' || href === '/contractor/dashboard-enhanced') {
        return pathname === href;
      }
      return pathname.startsWith(href);
    };
  }, [pathname]);

  // Use CSS classes to avoid hydration mismatches from inline style normalization
  // Always render expanded state initially to match SSR, then allow collapse after mount
  // On mobile, sidebar should be hidden by default unless isMobileOpen is true
  const sidebarClassName = `${styles.sidebar} ${isCollapsed && mounted ? styles.sidebarCollapsed : ''} ${isMobile && mounted && !isMobileOpen ? styles.sidebarMobileHidden : ''}`;
  const shouldShowExpanded = !isCollapsed || !mounted;

  // Always render the same structure to prevent hydration mismatches
  // The nav element must always be present, even during SSR
  return (
    <>
      {/* Mobile overlay backdrop */}
      {isMobile && mounted && isMobileOpen && (
        <div 
          className={styles.sidebarOverlay}
          onClick={handleMobileClose}
          suppressHydrationWarning
        />
      )}
      <aside className={sidebarClassName} suppressHydrationWarning>
      {/* Logo Section */}
      <div className={styles.logoSection}>
        <div className={styles.logoContainer}>
          <Logo width={32} height={32} />
        </div>
        <div className={styles.logoText} style={{ opacity: shouldShowExpanded ? 1 : 0, visibility: shouldShowExpanded ? 'visible' : 'hidden' }}>
          Mintenance
        </div>
      </div>

      {/* Navigation Items */}
      <nav className={styles.nav} suppressHydrationWarning>
        {navItems.map((item) => {
          // Only calculate active state after mount to prevent hydration mismatch
          // During SSR, always render as inactive, then update after hydration
          const active = mounted ? isActive(item.href) : false;
          
          return (
            <MenuTab
              key={`${resolvedUserRole}-nav-${item.href}`}
              icon={item.icon}
              label={item.label}
              href={item.href}
              isActive={active}
              isExpanded={shouldShowExpanded}
            />
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className={styles.bottomSection}>
        <MenuTab
          icon="helpCircle"
          label="Help"
          href="/help"
          isActive={false}
          isExpanded={shouldShowExpanded}
        />
        
        {/* Issues Badge - Removed hardcoded badge as there's no actual issue checking logic */}
        {/* TODO: Re-implement when issue checking system is available */}
        
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          suppressHydrationWarning
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: shouldShowExpanded ? '16px' : '0',
            width: shouldShowExpanded ? 'auto' : '48px',
            height: '48px',
            borderRadius: '24px',
            padding: shouldShowExpanded ? '13px 16px 13px 26px' : '13px 16px',
            backgroundColor: 'transparent',
            border: 'none',
            color: theme.colors.textInverse,
            cursor: isLoggingOut ? 'not-allowed' : 'pointer',
            opacity: isLoggingOut ? 0.6 : 1,
            transition: `all ${theme.animation.duration.normal} ${theme.animation.easing.easeOut}`,
            textAlign: 'left',
          }}
          onMouseEnter={(e) => {
            if (!isLoggingOut) {
              e.currentTarget.style.backgroundColor = theme.colors.primaryLight;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <LogOut size={22} style={{ color: theme.colors.textInverse }} />
          <span 
            suppressHydrationWarning
            style={{ 
              fontSize: theme.typography.fontSize.sm, 
              fontWeight: theme.typography.fontWeight.regular,
              opacity: shouldShowExpanded ? 1 : 0,
              visibility: shouldShowExpanded ? 'visible' : 'hidden',
              width: shouldShowExpanded ? 'auto' : '0',
              overflow: 'hidden',
            }}
          >
            {isLoggingOut ? 'Signing out...' : 'Log Out'}
          </span>
        </button>
      </div>
    </aside>
    </>
  );
}

