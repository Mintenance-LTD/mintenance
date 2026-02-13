'use client';

import React, { ReactNode } from 'react';
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

