'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { SessionManager } from '@/lib/session-manager';
import { logger } from '@/lib/logger';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { AdminNotificationBell } from '@/components/admin/AdminNotificationBell';
import { adminNavSections } from './adminNavConfig';
import type { NavItem, NavSection } from './adminNavConfig';

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

const AUTH_ROUTES = [
  '/admin/login',
  '/admin/register',
  '/admin/forgot-password',
];

export function AdminLayoutShell(props: AdminLayoutShellProps) {
  const { children, user = { id: '', email: '', role: 'admin' as const } } =
    props || {};
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // SECURITY: Never render sidebar on auth routes — prevents leaking admin nav to unauthenticated users
  if (
    pathname &&
    AUTH_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route + '?')
    )
  ) {
    return <>{children}</>;
  }

  const handleLogout = async (): Promise<void> => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      const sessionManager = SessionManager.getInstance();
      sessionManager.clearSession();
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { ...(await getCsrfHeaders()) },
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
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  const userInitials =
    user.first_name && user.last_name
      ? `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase()
      : user.email.charAt(0).toUpperCase();

  return (
    <div className='flex min-h-screen bg-[#f7f9fb]'>
      {/* Skip to content */}
      <a
        href='#main-content'
        className='sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-white focus:text-[#565e74] focus:rounded-lg focus:shadow-lg focus:font-semibold'
      >
        Skip to content
      </a>

      {/* Sidebar */}
      <aside
        aria-label='Admin navigation sidebar'
        className={`fixed left-0 top-0 h-screen z-50 flex flex-col bg-slate-950 shadow-[20px_0_50px_rgba(0,0,0,0.2)] transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Logo */}
        <div className='px-6 py-5 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='w-8 h-8 rounded-lg bg-[#565e74] flex items-center justify-center flex-shrink-0'>
              <Icon name='building' size={16} color='#dae2fd' />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className='text-xl font-bold tracking-tighter text-white leading-none'>
                  Mintenance
                </h1>
                <p className='text-[10px] text-slate-500 uppercase tracking-widest mt-0.5'>
                  Admin Console
                </p>
              </div>
            )}
          </div>
          <div className='flex items-center gap-2'>
            {!isCollapsed && <AdminNotificationBell userId={user.id} />}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className='w-7 h-7 rounded-full bg-white/10 text-white/60 flex items-center justify-center hover:bg-white/20 hover:text-white transition-all flex-shrink-0'
            >
              <Icon
                name={isCollapsed ? 'chevronRight' : 'chevronLeft'}
                size={14}
                color='currentColor'
              />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav
          aria-label='Admin main navigation'
          className='flex-1 px-3 py-2 overflow-y-auto'
        >
          {adminNavSections.map((section) => (
            <SidebarSection
              key={section.title || 'top'}
              section={section}
              isCollapsed={isCollapsed}
              isActive={isActive}
            />
          ))}
        </nav>

        {/* User + Logout */}
        <div className='px-4 py-4 border-t border-white/10 mt-auto'>
          <div className='flex items-center gap-3 mb-4'>
            <div className='w-10 h-10 rounded-full bg-[#565e74] flex items-center justify-center text-white font-bold text-sm flex-shrink-0'>
              {userInitials}
            </div>
            {!isCollapsed && (
              <div className='flex-1 min-w-0'>
                <p className='text-sm font-semibold text-white truncate'>
                  {user.first_name && user.last_name
                    ? `${user.first_name} ${user.last_name}`
                    : user.email}
                </p>
                <p className='text-[10px] text-slate-500 truncate'>Admin</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            aria-label='Log out of admin panel'
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all text-sm ${
              isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Icon name='logOut' size={18} color='currentColor' />
            {!isCollapsed && <span>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        id='main-content'
        role='main'
        className={`flex-1 min-h-screen transition-all duration-300 ${
          isCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        {children}
      </main>
    </div>
  );
}

/* ── Sidebar sub-components ──────────────────────────────────────────── */

function SidebarSection({
  section,
  isCollapsed,
  isActive,
}: {
  section: NavSection;
  isCollapsed: boolean;
  isActive: (href: string) => boolean;
}) {
  return (
    <div className='mb-1'>
      {section.title && !isCollapsed && (
        <>
          <div className='h-px bg-white/[0.08] mx-2 my-2' />
          <p className='text-[10px] font-bold uppercase tracking-widest text-slate-500 px-4 py-1'>
            {section.title}
          </p>
        </>
      )}
      {section.title && isCollapsed && (
        <div className='h-px bg-white/[0.08] mx-3 my-2' />
      )}
      {section.items.map((item) => (
        <SidebarLink
          key={item.href}
          item={item}
          isCollapsed={isCollapsed}
          active={isActive(item.href)}
        />
      ))}
    </div>
  );
}

function SidebarLink({
  item,
  isCollapsed,
  active,
}: {
  item: NavItem;
  isCollapsed: boolean;
  active: boolean;
}) {
  return (
    <Link
      href={item.href}
      prefetch={true}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 px-4 py-2.5 my-0.5 rounded-lg text-sm transition-all ${
        active
          ? 'bg-white/[0.08] text-[#dae2fd] font-semibold'
          : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.05]'
      }`}
    >
      <div className='w-5 h-5 flex items-center justify-center flex-shrink-0'>
        <Icon
          name={item.icon}
          size={18}
          color={active ? '#dae2fd' : 'currentColor'}
        />
      </div>
      {!isCollapsed && (
        <>
          <span className='flex-1'>{item.label}</span>
          {item.badge && (
            <span className='text-[10px] font-bold bg-red-500/90 text-white rounded-full px-1.5 min-w-[18px] text-center leading-[16px]'>
              !
            </span>
          )}
        </>
      )}
    </Link>
  );
}
