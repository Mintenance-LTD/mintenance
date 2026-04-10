'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { logger } from '@mintenance/shared';
import { getCsrfHeaders } from '@/lib/csrf-client';
import {
  Home,
  Briefcase,
  MessageSquare,
  Calendar,
  FileText,
  Receipt,
  BarChart3,
  Settings,
  Compass,
  Users,
  Star,
  TrendingUp,
  Megaphone,
  CreditCard,
  Building2,
  Shield,
  PoundSterling,
  FolderOpen,
  Video,
  Pencil,
} from 'lucide-react';

type ContractorSummary = {
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  profile_image_url?: string | null;
  city?: string | null;
  country?: string | null;
};

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

export function useLayoutState(
  contractor?: ContractorSummary | null,
  email?: string | null
) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(['Jobs']);
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
      if (showHeaderUserMenu && !target.closest('#header-user-menu'))
        setShowHeaderUserMenu(false);
    };
    if (showHeaderUserMenu)
      document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showHeaderUserMenu]);

  const contractorFullName = useMemo(() => {
    return contractor?.first_name || contractor?.last_name
      ? `${contractor?.first_name ?? ''} ${contractor?.last_name ?? ''}`.trim()
      : (contractor?.company_name ?? 'Contractor');
  }, [contractor?.first_name, contractor?.last_name, contractor?.company_name]);

  const initials = useMemo(() => {
    const first = contractor?.first_name?.charAt(0) ?? '';
    const last = contractor?.last_name?.charAt(0) ?? '';
    const fallback = email?.charAt(0) ?? 'C';
    return (first + last || fallback).toUpperCase();
  }, [contractor?.first_name, contractor?.last_name, email]);

  const navSections: NavSection[] = useMemo(
    () => [
      {
        name: 'MAIN',
        items: [
          {
            label: 'Dashboard',
            href: '/contractor/dashboard-enhanced',
            icon: Home,
          },
          {
            label: 'Discover Jobs',
            href: '/contractor/discover',
            icon: Compass,
          },
        ],
      },
      {
        name: 'WORK',
        items: [
          {
            label: 'My Jobs',
            href: '/contractor/jobs',
            icon: Briefcase,
            children: [
              { label: 'All Jobs', href: '/contractor/jobs', icon: Briefcase },
              {
                label: 'Active',
                href: '/contractor/jobs?status=in_progress',
                icon: Briefcase,
              },
              {
                label: 'Completed',
                href: '/contractor/jobs?status=completed',
                icon: Briefcase,
              },
            ],
          },
          { label: 'Quotes', href: '/contractor/quotes', icon: FileText },
          {
            label: 'Messages',
            href: '/contractor/messages',
            icon: MessageSquare,
            badge: 0,
          },
          { label: 'Calendar', href: '/contractor/scheduling', icon: Calendar },
          {
            label: 'Documents',
            href: '/contractor/documents',
            icon: FolderOpen,
          },
          { label: 'Video Calls', href: '/video-calls', icon: Video },
        ],
      },
      {
        name: 'BUSINESS',
        items: [
          { label: 'Portfolio', href: '/contractor/portfolio', icon: Pencil },
          { label: 'Reviews', href: '/contractor/reviews', icon: Star },
          { label: 'Customers', href: '/contractor/customers', icon: Users },
          { label: 'Reports', href: '/contractor/reporting', icon: TrendingUp },
          {
            label: 'Marketing',
            href: '/contractor/marketing',
            icon: Megaphone,
          },
        ],
      },
      {
        name: 'FINANCIAL',
        items: [
          {
            label: 'Finance',
            href: '/contractor/finance',
            icon: PoundSterling,
          },
          { label: 'Invoices', href: '/contractor/invoices', icon: Receipt },
          { label: 'Expenses', href: '/contractor/expenses', icon: CreditCard },
          {
            label: 'Tax Info',
            href: '/contractor/tax-info/dashboard',
            icon: FileText,
          },
          {
            label: 'Subscription',
            href: '/contractor/subscription',
            icon: BarChart3,
          },
        ],
      },
      {
        name: 'ACCOUNT',
        items: [
          {
            label: 'Company Profile',
            href: '/contractor/profile',
            icon: Building2,
          },
          {
            label: 'Verification',
            href: '/contractor/verification',
            icon: Shield,
          },
          { label: 'Settings', href: '/settings', icon: Settings },
        ],
      },
    ],
    []
  );

  const toggleExpand = useCallback((label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    );
  }, []);

  const isActive = useCallback(
    (href: string) => {
      const cleanHref = href.split('?')[0];
      const cleanPathname = pathname?.split('?')[0];
      if (href === '/contractor/dashboard-enhanced') return pathname === href;
      return (
        cleanPathname === cleanHref ||
        cleanPathname?.startsWith(cleanHref + '/')
      );
    },
    [pathname]
  );

  const pageTitle = useMemo(() => {
    const pathToUse = pathname || '/contractor/dashboard-enhanced';
    const normalizedPath =
      pathToUse.split('?')[0].replace(/\/$/, '') ||
      '/contractor/dashboard-enhanced';
    const routeTitleMap: Record<string, string> = {
      '/contractor/dashboard-enhanced': 'Dashboard',
      '/contractor/discover': 'Discover Jobs',
      '/contractor/jobs': 'My Jobs',
      '/contractor/messages': 'Messages',
      '/contractor/scheduling': 'Calendar',
      '/contractor/quotes': 'Quotes',
      '/contractor/invoices': 'Invoices',
      '/contractor/reporting': 'Reports',
      '/contractor/finance': 'Finance',
      '/contractor/portfolio': 'Portfolio',
      '/contractor/customers': 'Customers',
      '/contractor/marketing': 'Marketing',
      '/contractor/profile': 'Profile',
      '/contractor/verification': 'Verification',
      '/settings': 'Settings',
    };
    if (routeTitleMap[normalizedPath]) return routeTitleMap[normalizedPath];
    if (normalizedPath.startsWith('/contractor/')) {
      const segments = normalizedPath.split('/').filter(Boolean);
      if (segments.length >= 2) {
        const base = `/${segments[0]}/${segments[1]}`;
        if (routeTitleMap[base]) return routeTitleMap[base];
      }
    }
    const pageName =
      normalizedPath.split('/').pop()?.replace(/-/g, ' ') || 'Dashboard';
    return pageName.charAt(0).toUpperCase() + pageName.slice(1);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: await getCsrfHeaders(),
      });
      router.push('/login');
    } catch (error) {
      logger.error('Logout error', error, { service: 'ui' });
    }
  };

  return {
    pathname,
    mounted,
    isMobile,
    isMobileOpen,
    setIsMobileOpen,
    expandedItems,
    toggleExpand,
    showUserMenu,
    setShowUserMenu,
    showHeaderUserMenu,
    setShowHeaderUserMenu,
    searchQuery,
    setSearchQuery,
    contractorFullName,
    initials,
    navSections,
    isActive,
    pageTitle,
    handleLogout,
  };
}
