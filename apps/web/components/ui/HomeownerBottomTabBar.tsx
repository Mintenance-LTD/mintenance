'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Briefcase, Plus, MessageSquare, Settings } from 'lucide-react';

/**
 * Mobile bottom tab bar for the homeowner section.
 * Used by both ProfessionalHomeownerLayout (the dashboard shell) and
 * HomeownerLayoutShell (the standalone /financials wrapper) so navigation
 * chrome stays consistent across all homeowner pages on mobile.
 */
export function HomeownerBottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label='Mobile navigation'
      className='lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 flex items-stretch justify-around safe-area-bottom'
    >
      <Link
        href='/dashboard'
        aria-current={pathname === '/dashboard' ? 'page' : undefined}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-xs font-medium transition-colors ${
          pathname === '/dashboard'
            ? 'text-teal-600'
            : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <Home className='w-5 h-5' aria-hidden='true' />
        <span>Home</span>
      </Link>
      <Link
        href='/jobs'
        aria-current={
          pathname?.startsWith('/jobs') && pathname !== '/jobs/create'
            ? 'page'
            : undefined
        }
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-xs font-medium transition-colors ${
          pathname?.startsWith('/jobs') && pathname !== '/jobs/create'
            ? 'text-teal-600'
            : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <Briefcase className='w-5 h-5' aria-hidden='true' />
        <span>Jobs</span>
      </Link>
      <Link
        href='/jobs/create'
        aria-label='Post a new job'
        className='flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-xs font-semibold'
      >
        <div className='w-10 h-10 bg-teal-600 rounded-2xl flex items-center justify-center -mt-4 shadow-lg shadow-teal-500/30'>
          <Plus className='w-5 h-5 text-white' aria-hidden='true' />
        </div>
        <span className='text-gray-400 mt-0.5 text-[10px]'>Post</span>
      </Link>
      <Link
        href='/messages'
        aria-current={pathname?.startsWith('/messages') ? 'page' : undefined}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-xs font-medium transition-colors ${
          pathname?.startsWith('/messages')
            ? 'text-teal-600'
            : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <MessageSquare className='w-5 h-5' aria-hidden='true' />
        <span>Messages</span>
      </Link>
      <Link
        href='/settings'
        aria-current={pathname?.startsWith('/settings') ? 'page' : undefined}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-xs font-medium transition-colors ${
          pathname?.startsWith('/settings')
            ? 'text-teal-600'
            : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <Settings className='w-5 h-5' aria-hidden='true' />
        <span>Settings</span>
      </Link>
    </nav>
  );
}
