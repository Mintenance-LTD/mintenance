'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { NavSection } from './SidebarNavItems';

interface UseSidebarStateOptions {
  externalMobileOpen?: boolean;
  onMobileClose?: () => void;
  navSections: NavSection[];
}

export function useSidebarState({
  externalMobileOpen = false,
  onMobileClose = () => {},
  navSections,
}: UseSidebarStateOptions) {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Jobs']);
  const [collapsedSections, setCollapsedSections] = useState<string[]>([
    'BUSINESS',
    'LANDLORD',
  ]);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [keyboardSequence, setKeyboardSequence] = useState<string[]>([]);

  const isMobileOpen =
    externalMobileOpen !== undefined ? externalMobileOpen : internalMobileOpen;

  const handleMobileClose = useCallback(() => {
    if (externalMobileOpen !== undefined && onMobileClose) {
      onMobileClose();
    } else {
      setInternalMobileOpen(false);
    }
  }, [externalMobileOpen, onMobileClose]);

  useEffect(() => {
    setMounted(true);

    const checkScreenSize = () => {
      const width = window.innerWidth;
      const mobile = width < 1024;
      setIsMobile(mobile);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    const savedCollapsed = localStorage.getItem('sidebar-collapsed');
    if (savedCollapsed) {
      setIsCollapsed(JSON.parse(savedCollapsed));
    }

    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
    }
  }, [isCollapsed, mounted]);

  const toggleExpand = useCallback((label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    );
  }, []);

  const toggleSection = useCallback((name: string) => {
    setCollapsedSections((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  }, []);

  const isActive = useCallback(
    (href: string) => {
      if (href === '/dashboard' || href === '/contractor/dashboard-enhanced') {
        return pathname === href;
      }
      const cleanHref = href.split('?')[0];
      const cleanPathname = pathname?.split('?')[0];
      return (
        cleanPathname === cleanHref ||
        cleanPathname?.startsWith(cleanHref + '/')
      );
    },
    [pathname]
  );

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !searchFocused) {
        e.preventDefault();
        const searchInput = document.getElementById(
          'sidebar-search'
        ) as HTMLInputElement;
        searchInput?.focus();
        return;
      }

      if (e.key === 'Escape' && isMobile && isMobileOpen) {
        handleMobileClose();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        return;
      }

      setKeyboardSequence((prev) => {
        const newSequence = [...prev, e.key].slice(-2);
        const shortcutKey = newSequence.join(' ');

        navSections.forEach((section) => {
          section.items.forEach((item) => {
            if (item.shortcut === shortcutKey) {
              router.push(item.href);
              return [];
            }
          });
        });

        setTimeout(() => setKeyboardSequence([]), 1000);
        return newSequence;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    mounted,
    searchFocused,
    isMobile,
    isMobileOpen,
    handleMobileClose,
    router,
    navSections,
  ]);

  return {
    mounted,
    isMobile,
    isMobileOpen,
    isCollapsed,
    expandedItems,
    collapsedSections,
    searchFocused,
    setSearchFocused,
    handleMobileClose,
    toggleExpand,
    toggleSection,
    toggleCollapsed,
    isActive,
  };
}
