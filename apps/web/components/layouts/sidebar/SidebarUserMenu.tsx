'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Bell,
  HelpCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface SidebarUserMenuProps {
  userInfo?: {
    name?: string;
    email?: string;
    avatar?: string;
  };
  isCollapsed: boolean;
  isMobile: boolean;
  toggleCollapsed: () => void;
}

export function SidebarUserMenu({
  userInfo,
  isCollapsed,
  isMobile,
  toggleCollapsed,
}: SidebarUserMenuProps) {
  return (
    <>
      {userInfo && userInfo.name && (
        <div className='border-t border-slate-700 p-4'>
          <div
            className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}
          >
            {userInfo.avatar ? (
              <Image
                src={userInfo.avatar}
                alt={userInfo.name}
                width={40}
                height={40}
                className='rounded-full flex-shrink-0'
              />
            ) : (
              <div className='w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center flex-shrink-0'>
                <span className='text-white font-semibold text-sm'>
                  {userInfo.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            {!isCollapsed && (
              <div className='flex-1 min-w-0'>
                <p className='text-white text-sm font-medium truncate'>
                  {userInfo.name}
                </p>
                {userInfo.email && (
                  <p className='text-slate-400 text-xs truncate'>
                    {userInfo.email}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div
        className={`border-t border-slate-700 p-4 flex items-center ${isCollapsed ? 'flex-col gap-4' : 'justify-around'}`}
      >
        <Link
          href='/notifications'
          className='text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1'
          aria-label='Notifications'
          title='Notifications'
        >
          <Bell className='w-5 h-5' />
        </Link>
        <Link
          href='/help'
          className='text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1'
          aria-label='Help center'
          title='Help'
        >
          <HelpCircle className='w-5 h-5' />
        </Link>
        <Link
          href='/settings'
          className='text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1'
          aria-label='Settings'
          title='Settings'
        >
          <Settings className='w-5 h-5' />
        </Link>
        {!isMobile && (
          <button
            onClick={toggleCollapsed}
            className='text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1'
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? (
              <ChevronRight className='w-5 h-5' />
            ) : (
              <ChevronLeft className='w-5 h-5' />
            )}
          </button>
        )}
      </div>
    </>
  );
}
