'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import Logo from '@/app/components/Logo';
import { SessionManager } from '@/lib/session-manager';
import { logger } from '@/lib/logger';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { theme } from '@/lib/theme';
import styles from './UnifiedSidebar.module.css';
import { AdminNotificationBell } from '@/components/admin/AdminNotificationBell';

import { adminNavSections } from './adminNavConfig';
import { AdminNavSection } from './AdminNavItem';

interface AdminLayoutShellProps {
  children: React.ReactNode;
  user: {
    id: string;
    email: string;
    role: 'admin';
    first_name?: string;
    last_name?: string;
  };
}

export function AdminLayoutShell(props: AdminLayoutShellProps) {
  // Defensive prop destructuring with defaults to prevent test crashes
  const { children, user = { id: '', email: '', role: 'admin' as const } } =
    props || {};
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async (): Promise<void> => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      const sessionManager = SessionManager.getInstance();
      sessionManager.clearSession();
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          ...(await getCsrfHeaders()),
        },
      });
      router.push('/admin/login');
      router.refresh();
    } catch (error) {
      logger.error('Logout failed', error);
      router.push('/admin/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  const userInitials =
    user.first_name && user.last_name
      ? `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase()
      : user.email.charAt(0).toUpperCase();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        backgroundColor: '#F9FAFB',
      }}
    >
      {/* Skip to content link for keyboard users */}
      <a
        href='#main-content'
        className='sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-white focus:text-purple-700 focus:rounded-lg focus:shadow-lg focus:font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500'
      >
        Skip to content
      </a>

      {/* Sidebar */}
      <aside
        aria-label='Admin navigation sidebar'
        style={{
          width: isCollapsed ? '80px' : '280px',
          backgroundColor: theme.colors.navy[950],
          color: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'fixed',
          height: '100vh',
          zIndex: 1000,
          overflowY: 'auto',
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Logo Section */}
        <div
          className={styles.logoSection}
          style={{
            padding: theme.spacing[4],
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: '64px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[3],
            }}
          >
            <Logo />
            {!isCollapsed && (
              <span
                className={styles.logoText}
                style={{
                  fontSize: theme.typography.fontSize.xl,
                  fontWeight: theme.typography.fontWeight.bold,
                  color: theme.colors.primary,
                }}
              >
                Mintenance
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!isCollapsed && <AdminNotificationBell userId={user.id} />}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
              }}
            >
              <Icon
                name={isCollapsed ? 'chevronRight' : 'chevronLeft'}
                size={16}
                color='currentColor'
              />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav
          aria-label='Admin main navigation'
          style={{
            flex: 1,
            padding: theme.spacing[2],
            overflowY: 'auto',
          }}
        >
          {adminNavSections.map((section) => (
            <AdminNavSection
              key={section.title || 'top'}
              section={section}
              isCollapsed={isCollapsed}
              isActive={isActive}
            />
          ))}
        </nav>

        {/* User Section */}
        <div
          style={{
            padding: theme.spacing[4],
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[3],
              marginBottom: theme.spacing[4],
            }}
          >
            <div
              aria-hidden='true'
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: theme.colors.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontWeight: theme.typography.fontWeight.bold,
                fontSize: theme.typography.fontSize.sm,
              }}
            >
              {userInitials}
            </div>
            {!isCollapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.semibold,
                    color: '#FFFFFF',
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user.first_name && user.last_name
                    ? `${user.first_name} ${user.last_name}`
                    : user.email}
                </p>
                <p
                  style={{
                    fontSize: theme.typography.fontSize.xs,
                    color: 'rgba(255, 255, 255, 0.7)',
                    margin: 0,
                  }}
                >
                  Admin
                </p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            aria-label='Log out of admin panel'
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[3],
              padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
              backgroundColor: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: theme.borderRadius.md,
              color: '#FFFFFF',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              cursor: isLoggingOut ? 'not-allowed' : 'pointer',
              opacity: isLoggingOut ? 0.5 : 1,
            }}
          >
            <Icon name='logOut' size={20} color='#FFFFFF' />
            {!isCollapsed && <span>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        id='main-content'
        role='main'
        style={{
          flex: 1,
          marginLeft: isCollapsed ? '80px' : '280px',
          transition: 'margin-left 0.3s ease',
          minHeight: '100vh',
        }}
      >
        {children}
      </main>
    </div>
  );
}
