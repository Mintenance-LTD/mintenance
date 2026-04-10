'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNavSections } from './sidebar/sidebarNavConfig';
import { SidebarNavItems } from './sidebar/SidebarNavItems';
import { SidebarUserMenu } from './sidebar/SidebarUserMenu';
import { useBadgeCounts } from './sidebar/SidebarNotifications';
import { useSidebarState } from './sidebar/useSidebarState';

interface UnifiedSidebarProps {
  userRole: 'homeowner' | 'contractor' | 'admin';
  userInfo?: {
    name?: string;
    email?: string;
    avatar?: string;
  };
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function UnifiedSidebar(props: UnifiedSidebarProps) {
  const {
    userRole = 'homeowner',
    userInfo,
    isMobileOpen: externalMobileOpen = false,
    onMobileClose = () => {},
  } = props || {};

  const router = useRouter();
  const { user } = useCurrentUser();
  const navSections = useNavSections(userRole);
  const { getBadgeCount } = useBadgeCounts();

  const {
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
  } = useSidebarState({
    externalMobileOpen,
    onMobileClose,
    navSections,
  });

  const handleQuickAction = useCallback(() => {
    if (userRole === 'homeowner') {
      router.push('/jobs/create');
    } else {
      router.push('/contractor/discover');
    }
  }, [userRole, router]);

  const sidebarWidth = isCollapsed ? 'w-16' : 'w-60';

  const sidebarClassName = `fixed left-0 top-0 h-screen ${sidebarWidth} bg-slate-900 flex flex-col z-50 transition-all duration-300 ease-in-out ${
    isMobile && mounted && !isMobileOpen ? '-translate-x-full' : ''
  }`;

  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  return (
    <>
      {isMobile && mounted && isMobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
          className='fixed inset-0 bg-black/50 z-40'
          onClick={handleMobileClose}
          suppressHydrationWarning
        />
      )}

      <aside
        className={sidebarClassName}
        suppressHydrationWarning
        role='navigation'
        aria-label='Main navigation'
      >
        {/* Logo */}
        <div className='p-4 border-b border-slate-700'>
          <Link
            href='/dashboard'
            className='flex items-center gap-2'
            aria-label='Mintenance home'
          >
            <div className='w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center flex-shrink-0'>
              <span className='text-white font-bold text-lg'>M</span>
            </div>
            {!isCollapsed && (
              <span className='text-white font-semibold text-lg'>
                Mintenance
              </span>
            )}
          </Link>
        </div>

        {/* Search Bar */}
        {!isCollapsed && (
          <div className='p-4 border-b border-slate-700'>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
              <input
                id='sidebar-search'
                type='search'
                placeholder='Search or jump to...'
                className='w-full bg-slate-800 text-white rounded-lg pl-9 pr-12 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all'
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                aria-label='Search navigation'
              />
              <kbd className='absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 bg-slate-700 px-1.5 py-0.5 rounded'>
                ⌘K
              </kbd>
            </div>
          </div>
        )}

        {/* Quick Action Button */}
        {!isCollapsed && (
          <div className='p-4 border-b border-slate-700'>
            <button
              onClick={handleQuickAction}
              className='w-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white rounded-lg py-2.5 font-semibold transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900'
              aria-label={
                userRole === 'homeowner' ? 'Post a new job' : 'Find jobs'
              }
            >
              {userRole === 'homeowner' ? '+ Post a Job' : '+ Find Jobs'}
            </button>
          </div>
        )}

        {/* Navigation Sections */}
        <SidebarNavItems
          navSections={navSections}
          isCollapsed={isCollapsed}
          collapsedSections={collapsedSections}
          expandedItems={expandedItems}
          toggleSection={toggleSection}
          toggleExpand={toggleExpand}
          isActive={isActive}
          getBadgeCount={getBadgeCount}
          prefersReducedMotion={prefersReducedMotion}
        />

        {/* User Profile + Bottom Actions */}
        <SidebarUserMenu
          userInfo={userInfo}
          isCollapsed={isCollapsed}
          isMobile={isMobile}
          toggleCollapsed={toggleCollapsed}
        />
      </aside>

      {/* Custom scrollbar styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1e293b;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
    </>
  );
}
