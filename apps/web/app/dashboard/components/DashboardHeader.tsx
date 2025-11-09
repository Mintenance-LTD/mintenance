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
  secondaryMetrics?: DashboardMetric[];
}

export function DashboardHeader({ userName, userId, secondaryMetrics = [] }: DashboardHeaderProps) {
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
    <div style={{ position: 'relative' }}>
      <header
        className="sticky top-0 z-10 backdrop-blur-md bg-white/80 flex items-center justify-between px-8 py-4 border-b border-gray-200 shadow-sm"
        style={{ whiteSpace: 'nowrap' }}
      >
        {/* Search */}
        <div className="relative hidden lg:block">
          <Input
            type="text"
            placeholder="Search for jobs or contractors..."
            aria-label="Search for jobs or contractors"
            className="h-11 w-full min-w-[400px]"
            leftIcon={<Icon name="search" size={20} color={theme.colors.textSecondary} />}
          />
        </div>

      {/* Right Side */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Help Button */}
        <Button
          variant="ghost"
          size="sm"
          className="h-11 w-11 rounded-xl"
          aria-label="Help and support"
        >
          <Icon name="helpCircle" size={22} color={theme.colors.textSecondary} aria-hidden="true" />
        </Button>

        {/* Real Notifications */}
        {userId && <NotificationDropdown userId={userId} />}

        {/* User Avatar */}
        <div ref={avatarButtonRef}>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAvatarClick}
            aria-label="View profile"
            className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-primary-800 text-white font-bold text-sm hover:scale-110 hover:shadow-lg"
          >
            {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
          </Button>
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

