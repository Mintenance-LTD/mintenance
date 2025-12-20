'use client';

import React, { ReactNode, useState } from 'react';
import { theme } from '@/lib/theme';
import { DashboardSidebar } from './DashboardSidebar';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <DashboardSidebar
        currentPath={currentPath}
        userName={userName}
        userEmail={userEmail}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content */}
      <div className="flex flex-col flex-1 w-full lg:ml-[240px] bg-gray-50">
        {/* Header with Mobile Menu Toggle */}
        <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-md hover:bg-gray-100"
              aria-label="Open menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
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

        {/* Page Content - Responsive padding */}
        <div className="flex-1 flex justify-center">
          <main className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

