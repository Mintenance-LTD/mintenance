'use client';

import React, { ReactNode, useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { logger } from '@mintenance/shared';
import { getCsrfHeaders } from '@/lib/csrf-client';
import {
  Home,
  Briefcase,
  MessageSquare,
  Calendar,
  Settings,
  Search,
  Bell,
  Menu,
  X,
  ChevronDown,
  Building2,
  LogOut,
  User,
  HelpCircle,
  PoundSterling,
  CreditCard,
  Video,
  Crown,
} from 'lucide-react';

type HomeownerSummary = {
  first_name?: string | null;
  last_name?: string | null;
  profile_image_url?: string | null;
};

interface ProfessionalHomeownerLayoutProps {
  children: ReactNode;
  homeowner?: HomeownerSummary | null;
  email?: string | null;
  userId?: string | null;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  children?: NavItem[];
}

interface NavSection {
  name: string;
  items: NavItem[];
}

export function ProfessionalHomeownerLayout({
  children,
  homeowner,
  email,
  userId,
}: ProfessionalHomeownerLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showHeaderUserMenu, setShowHeaderUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setMounted(true);
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 1024);
      if (width >= 1024) setIsMobileOpen(false);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showHeaderUserMenu && !target.closest('#ho-header-user-menu')) {
        setShowHeaderUserMenu(false);
      }
    };
    if (showHeaderUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showHeaderUserMenu]);

  const fullName = useMemo(() => {
    return homeowner?.first_name || homeowner?.last_name
      ? `${homeowner?.first_name ?? ''} ${homeowner?.last_name ?? ''}`.trim()
      : email?.split('@')[0] ?? 'Homeowner';
  }, [homeowner?.first_name, homeowner?.last_name, email]);

  const initials = useMemo(() => {
    const first = homeowner?.first_name?.charAt(0) ?? '';
    const last = homeowner?.last_name?.charAt(0) ?? '';
    const fallback = email?.charAt(0) ?? 'H';
    return (first + last || fallback).toUpperCase();
  }, [homeowner?.first_name, homeowner?.last_name, email]);

  const navSections: NavSection[] = useMemo(
    () => [
      {
        name: 'MAIN',
        items: [
          { label: 'Dashboard', href: '/dashboard', icon: Home },
        ],
      },
      {
        name: 'WORK',
        items: [
          {
            label: 'Jobs',
            href: '/jobs',
            icon: Briefcase,
            children: [
              { label: 'All Jobs', href: '/jobs', icon: Briefcase },
              { label: 'Active', href: '/jobs?status=active', icon: Briefcase },
              { label: 'Completed', href: '/jobs?status=completed', icon: Briefcase },
            ],
          },
          { label: 'Messages', href: '/messages', icon: MessageSquare, badge: 0 },
          { label: 'Calendar', href: '/scheduling', icon: Calendar },
          { label: 'Video Calls', href: '/video-calls', icon: Video },
        ],
      },
      {
        name: 'PROPERTY',
        items: [
          { label: 'Properties', href: '/properties', icon: Building2 },
          { label: 'Financials', href: '/financials', icon: PoundSterling },
          { label: 'Payments', href: '/payments', icon: CreditCard },
        ],
      },
      {
        name: 'ACCOUNT',
        items: [
          { label: 'Subscription', href: '/homeowner/subscription', icon: Crown },
          { label: 'Profile', href: '/profile', icon: User },
          { label: 'Settings', href: '/settings', icon: Settings },
        ],
      },
    ],
    []
  );

  const toggleExpand = useCallback((label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  }, []);

  const isActive = useCallback(
    (href: string) => {
      const cleanHref = href.split('?')[0];
      const cleanPathname = pathname?.split('?')[0];
      if (href === '/dashboard') return pathname === href;
      return cleanPathname === cleanHref || cleanPathname?.startsWith(cleanHref + '/');
    },
    [pathname]
  );

  const pageTitle = useMemo(() => {
    const pathToUse = pathname || '/dashboard';
    const normalizedPath = pathToUse.split('?')[0].replace(/\/$/, '') || '/dashboard';
    const routeTitleMap: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/discover': 'Discover',
      '/jobs': 'Jobs',
      '/jobs/create': 'Post a Job',
      '/messages': 'Messages',
      '/scheduling': 'Calendar',
      '/video-calls': 'Video Calls',
      '/properties': 'Properties',
      '/financials': 'Financials',
      '/payments': 'Payments',
      '/homeowner/subscription': 'Subscription',
      '/profile': 'Profile',
      '/settings': 'Settings',
      '/notifications': 'Notifications',
    };
    if (routeTitleMap[normalizedPath]) return routeTitleMap[normalizedPath];
    const pageName = normalizedPath.split('/').pop()?.replace(/-/g, ' ') || 'Dashboard';
    return pageName.charAt(0).toUpperCase() + pageName.slice(1);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: await getCsrfHeaders() });
      router.push('/login');
    } catch (error) {
      logger.error('Logout error', error, { service: 'ui' });
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobile && isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isMobile && !isMobileOpen ? '-translate-x-full' : 'translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
            <Link href="/dashboard" className="flex items-center gap-3">
              <Image src="/assets/icon.png" alt="Mintenance" width={32} height={32} />
              <span className="text-gray-900 font-semibold text-lg">Mintenance</span>
            </Link>
            {isMobile && (
              <button
                onClick={() => setIsMobileOpen(false)}
                className="lg:hidden text-gray-500 hover:text-gray-900"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
            {navSections.map((section) => (
              <div key={section.name} className="mb-6">
                <div className="px-3 mb-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {section.name}
                  </h3>
                </div>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const itemActive = isActive(item.href);
                    const isExpanded = expandedItems.includes(item.label);
                    return (
                      <div key={item.label}>
                        {item.children ? (
                          <>
                            <button
                              onClick={() => toggleExpand(item.label)}
                              className={`
                                w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all
                                ${itemActive ? 'bg-teal-50 text-teal-600' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}
                              `}
                            >
                              <item.icon className="w-5 h-5 flex-shrink-0" />
                              <span className="flex-1 text-left">{item.label}</span>
                              <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="ml-8 mt-1 space-y-1">
                                    {item.children.map((child) => (
                                      <Link
                                        key={child.href}
                                        href={child.href}
                                        className={`
                                          flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all
                                          ${isActive(child.href) ? 'bg-teal-50 text-teal-600 font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
                                        `}
                                      >
                                        {child.label}
                                      </Link>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </>
                        ) : (
                          <Link
                            href={item.href}
                            className={`
                              flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all
                              ${itemActive ? 'bg-teal-50 text-teal-600' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}
                            `}
                          >
                            <item.icon className="w-5 h-5 flex-shrink-0" />
                            <span className="flex-1">{item.label}</span>
                            {item.badge !== undefined && item.badge > 0 && (
                              <span className="bg-teal-500 text-white text-xs px-2 py-0.5 rounded-full min-w-[20px] text-center font-semibold">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* User Profile */}
          <div className="border-t border-gray-200 p-4">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-all"
              >
                {homeowner?.profile_image_url ? (
                  <Image src={homeowner.profile_image_url} alt={fullName} width={36} height={36} className="rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">{initials}</span>
                  </div>
                )}
                <div className="flex-1 text-left overflow-hidden">
                  <p className="text-gray-900 text-sm font-medium truncate">{fullName}</p>
                  <p className="text-gray-500 text-xs truncate">{email}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 py-2"
                  >
                    <Link href="/profile" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setShowUserMenu(false)}>
                      <User className="w-4 h-4" /> Profile
                    </Link>
                    <Link href="/settings" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setShowUserMenu(false)}>
                      <Settings className="w-4 h-4" /> Settings
                    </Link>
                    <Link href="/help" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setShowUserMenu(false)}>
                      <HelpCircle className="w-4 h-4" /> Help Centre
                    </Link>
                    <div className="border-t border-gray-200 my-2" />
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-64 transition-all duration-300">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="h-16 px-4 lg:px-8 flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              {isMobile && (
                <button
                  onClick={() => setIsMobileOpen(true)}
                  className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Open menu"
                >
                  <Menu className="w-6 h-6 text-gray-600" />
                </button>
              )}
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900">{pageTitle}</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:block relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="search"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
              </div>
              {userId ? (
                <NotificationDropdown userId={userId} />
              ) : (
                <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-not-allowed opacity-50">
                  <Bell className="w-5 h-5 text-gray-600" />
                </button>
              )}
              <div className="hidden lg:block relative" id="ho-header-user-menu">
                <button
                  onClick={() => setShowHeaderUserMenu(!showHeaderUserMenu)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  {homeowner?.profile_image_url ? (
                    <Image src={homeowner.profile_image_url} alt={fullName} width={36} height={36} className="rounded-full object-cover border-2 border-gray-200 hover:border-teal-500 transition-colors" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center border-2 border-gray-200 hover:border-teal-400 transition-colors">
                      <span className="text-white font-semibold text-sm">{initials}</span>
                    </div>
                  )}
                </button>
                <AnimatePresence>
                  {showHeaderUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
                    >
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900 truncate">{fullName}</p>
                        <p className="text-xs text-gray-500 truncate">{email}</p>
                      </div>
                      <div className="py-2">
                        <Link href="/profile" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-700" onClick={() => setShowHeaderUserMenu(false)}>
                          <User className="w-4 h-4" /> Profile
                        </Link>
                        <Link href="/settings" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-700" onClick={() => setShowHeaderUserMenu(false)}>
                          <Settings className="w-4 h-4" /> Settings
                        </Link>
                        <Link href="/help" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-700" onClick={() => setShowHeaderUserMenu(false)}>
                          <HelpCircle className="w-4 h-4" /> Help Centre
                        </Link>
                      </div>
                      <div className="border-t border-gray-100 pt-2">
                        <button
                          onClick={() => { setShowHeaderUserMenu(false); handleLogout(); }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
