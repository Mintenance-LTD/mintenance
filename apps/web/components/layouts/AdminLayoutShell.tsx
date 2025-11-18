'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import Logo from '@/app/components/Logo';
import { SessionManager } from '@/lib/session-manager';
import { logger } from '@/lib/logger';
import { theme } from '@/lib/theme';
import styles from './UnifiedSidebar.module.css';
import { AdminNotificationBell } from '@/components/admin/AdminNotificationBell';

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

interface NavItem {
  icon: string;
  label: string;
  href: string;
}

const adminNav: readonly NavItem[] = Object.freeze([
  { icon: 'dashboard', label: 'Dashboard', href: '/admin' },
  { icon: 'trendingUp', label: 'Revenue', href: '/admin/revenue' },
  { icon: 'users', label: 'Users', href: '/admin/users' },
  { icon: 'creditCard', label: 'Payment Setup', href: '/admin/contractors/payment-setup' },
  { icon: 'shield', label: 'Security', href: '/admin/security' },
  { icon: 'messages', label: 'Communications', href: '/admin/communications' },
  { icon: 'fileCheck', label: 'Escrow Reviews', href: '/admin/escrow/reviews' },
  { icon: 'dollarSign', label: 'Fee Management', href: '/admin/payments/fees' },
  { icon: 'building', label: 'Building Assessments', href: '/admin/building-assessments' },
  { icon: 'settings', label: 'Settings', href: '/admin/settings' },
]);

export function AdminLayoutShell({ children, user }: AdminLayoutShellProps) {
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
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      logger.error('Logout failed', error);
      router.push('/login');
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

  const userInitials = user.first_name && user.last_name
    ? `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase()
    : user.email.charAt(0).toUpperCase();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      backgroundColor: '#F9FAFB',
    }}>
      {/* Sidebar */}
      <aside
        style={{
          width: isCollapsed ? '80px' : '280px',
          backgroundColor: '#0C1A33',
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
        <div className={styles.logoSection} style={{
          padding: theme.spacing[4],
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: '64px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3] }}>
            <Logo />
            {!isCollapsed && (
              <span className={styles.logoText} style={{
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.bold,
                color: '#3B82F6',
              }}>
                Mintenance
              </span>
            )}
          </div>
          {!isCollapsed && (
            <AdminNotificationBell userId={user.id} />
          )}
        </div>

        {/* Navigation */}
        <nav style={{
          flex: 1,
          padding: theme.spacing[2],
          overflowY: 'auto',
        }}>
          {adminNav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[3],
                  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                  marginBottom: theme.spacing[1.5],
                  borderRadius: '12px',
                  backgroundColor: active ? 'rgba(74, 103, 255, 0.15)' : 'transparent',
                  borderLeft: active ? `4px solid #4A67FF` : '4px solid transparent',
                  color: active ? '#FFFFFF' : 'rgba(255, 255, 255, 0.8)',
                  textDecoration: 'none',
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: active ? 600 : 500,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.color = '#FFFFFF';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                  }
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon name={item.icon} size={20} color={active ? '#4A67FF' : 'rgba(255, 255, 255, 0.8)'} />
                </div>
                {!isCollapsed && <span>{item.label}</span>}
                {active && !isCollapsed && (
                  <div style={{
                    position: 'absolute',
                    right: theme.spacing[4],
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#4A67FF',
                    boxShadow: '0 0 8px rgba(74, 103, 255, 0.6)',
                  }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div style={{
          padding: theme.spacing[4],
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[3],
            marginBottom: theme.spacing[4],
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#3B82F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: theme.typography.fontWeight.bold,
              fontSize: theme.typography.fontSize.sm,
            }}>
              {userInitials}
            </div>
            {!isCollapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: '#FFFFFF',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {user.first_name && user.last_name
                    ? `${user.first_name} ${user.last_name}`
                    : user.email}
                </p>
                <p style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: 'rgba(255, 255, 255, 0.7)',
                  margin: 0,
                }}>
                  Admin
                </p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
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
            <Icon name="logOut" size={20} color="#FFFFFF" />
            {!isCollapsed && <span>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1,
        marginLeft: isCollapsed ? '80px' : '280px',
        transition: 'margin-left 0.3s ease',
        minHeight: '100vh',
      }}>
        {children}
      </main>
    </div>
  );
}

