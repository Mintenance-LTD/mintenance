'use client';

import React, { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Briefcase, Plus, MessageSquare, Settings } from 'lucide-react';
import { DashboardHeader } from './DashboardHeader';

interface HomeownerLayoutShellProps {
  children: ReactNode;
  currentPath?: string;
  userName?: string;
  userId?: string;
  userEmail?: string;
  userAvatar?: string;
}

export function HomeownerLayoutShell({
  children,
  currentPath = '/dashboard',
  userName,
  userId,
  userEmail,
  userAvatar
}: HomeownerLayoutShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex flex-col w-full bg-gray-50">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="text-lg font-semibold text-gray-900">Mintenance</div>
            {userAvatar && (
              <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>

        {/* Desktop Header */}
        {userName && (
          <div className="hidden lg:block">
            <DashboardHeader
              userName={userName}
              userId={userId}
              userAvatar={userAvatar}
            />
          </div>
        )}

        {/* Page Content — add bottom padding on mobile for tab bar */}
        <div className="flex-1 flex justify-center">
          <main className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 pb-20 lg:pb-10">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 flex items-stretch justify-around safe-area-bottom">
        <Link
          href="/dashboard"
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-xs font-medium transition-colors ${
            pathname === '/dashboard' ? 'text-teal-600' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </Link>
        <Link
          href="/jobs"
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-xs font-medium transition-colors ${
            pathname?.startsWith('/jobs') && pathname !== '/jobs/create' ? 'text-teal-600' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Briefcase className="w-5 h-5" />
          <span>Jobs</span>
        </Link>
        <Link
          href="/jobs/create"
          className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-xs font-semibold"
        >
          <div className="w-10 h-10 bg-teal-600 rounded-2xl flex items-center justify-center -mt-4 shadow-lg shadow-teal-500/30">
            <Plus className="w-5 h-5 text-white" />
          </div>
          <span className="text-gray-400 mt-0.5 text-[10px]">Post</span>
        </Link>
        <Link
          href="/messages"
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-xs font-medium transition-colors ${
            pathname?.startsWith('/messages') ? 'text-teal-600' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span>Messages</span>
        </Link>
        <Link
          href="/settings"
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-xs font-medium transition-colors ${
            pathname?.startsWith('/settings') ? 'text-teal-600' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </Link>
      </nav>
    </div>
  );
}

