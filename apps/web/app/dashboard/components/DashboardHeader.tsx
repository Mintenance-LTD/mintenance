'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { DashboardMetric } from './dashboard-metrics.types';
import { MetricsDropdown } from './MetricsDropdown';

interface DashboardHeaderProps {
  userName: string;
  userId?: string;
  userAvatar?: string;
  secondaryMetrics?: DashboardMetric[];
}

export function DashboardHeader({ userName, userId, userAvatar, secondaryMetrics = [] }: DashboardHeaderProps) {
  const router = useRouter();
  const [isMetricsOpen, setIsMetricsOpen] = useState(false);
  const avatarButtonRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const handleAvatarClick = () => {
    if (secondaryMetrics.length === 0) {
      router.push('/profile');
      return;
    }

    setIsMetricsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isMetricsOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        avatarButtonRef.current &&
        !avatarButtonRef.current.contains(target)
      ) {
        setIsMetricsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMetricsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMetricsOpen]);

  return (
    <div className="relative">
      <header
        className="sticky top-0 z-10 bg-[#1e293b] flex items-center justify-between px-8 py-4 border-b border-[#475569] shadow-sm whitespace-nowrap"
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

          {/* User Avatar */}
          <div ref={avatarButtonRef}>
            <button
              onClick={handleAvatarClick}
              aria-label="View profile"
              className="flex items-center gap-2 h-11 px-2 rounded-lg hover:bg-[#334155] transition-colors cursor-pointer border-0 bg-transparent"
            >
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userName}
                  className="w-10 h-10 rounded-full object-cover border-2 border-[#475569]"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-semibold text-sm border-2 border-[#475569]">
                  {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
              )}
              <Icon name="chevronDown" size={16} color="#94A3B8" />
            </button>
          </div>
        </div>
      </header>
      {isMetricsOpen && secondaryMetrics.length > 0 && (
        <div ref={dropdownRef}>
          <MetricsDropdown
            metrics={secondaryMetrics}
            onClose={() => setIsMetricsOpen(false)}
            onViewProfile={() => router.push('/profile')}
          />
        </div>
      )}
    </div>
  );
}

