'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { HomeownerProfileDropdown } from '@/components/profile/HomeownerProfileDropdown';
import { DashboardMetric } from './dashboard-metrics.types';

interface DashboardHeaderProps {
  userName: string;
  userId?: string;
  userAvatar?: string;
  secondaryMetrics?: DashboardMetric[];
}

export function DashboardHeader({ userName, userId, userAvatar, secondaryMetrics = [] }: DashboardHeaderProps) {
  const router = useRouter();

  return (
    <div className="relative">
      <header
        className="sticky top-0 z-40 bg-[#1e293b] flex items-center justify-between px-8 py-4 border-b border-[#475569] shadow-sm whitespace-nowrap"
      >
        {/* Search */}
        <div className="relative hidden lg:block">
          <Input
            type="text"
            placeholder="Search for jobs or contractors..."
            aria-label="Search for jobs or contractors"
            className="h-11 w-full min-w-[400px] bg-[#334155] border-[#475569] text-white placeholder:text-gray-400 focus:border-emerald-500 focus:ring-emerald-500/20"
          />
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3 ml-auto">
          {/* Help Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-11 w-11 rounded-xl hover:bg-[#334155] text-gray-300 hover:text-white"
            aria-label="Help and support"
          >
            <Icon name="helpCircle" size={22} color="currentColor" aria-hidden="true" />
          </Button>

          {/* Real Notifications */}
          {userId && <NotificationDropdown userId={userId} />}

          {/* Profile Dropdown */}
          <HomeownerProfileDropdown
            userName={userName}
            profileImageUrl={userAvatar}
            initials={userName.split(' ').map(n => n[0]).join('').toUpperCase()}
          />
        </div>
      </header>
    </div>
  );
}

