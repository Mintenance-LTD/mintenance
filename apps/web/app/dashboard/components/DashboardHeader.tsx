'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';

interface DashboardHeaderProps {
  userName: string;
  userId?: string;
}

export function DashboardHeader({ userName, userId }: DashboardHeaderProps) {
  const router = useRouter();

  const handleAvatarClick = () => {
    router.push('/profile');
  };

  return (
    <>
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
        borderBottom: `1px solid ${theme.colors.border}`,
        backgroundColor: theme.colors.surface,
        whiteSpace: 'nowrap'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', display: 'none' }} className="lg:block">
        <Icon 
          name="search" 
          size={20} 
          color={theme.colors.textSecondary}
          style={{ position: 'absolute', left: theme.spacing[3], top: '50%', transform: 'translateY(-50%)' }}
        />
        <input
          type="text"
          placeholder="Search for jobs or contractors..."
          aria-label="Search for jobs or contractors"
          style={{
            height: '40px',
            width: '100%',
            minWidth: '300px',
            borderRadius: theme.borderRadius.lg,
            border: 'none',
            backgroundColor: theme.colors.backgroundSecondary,
            padding: `0 ${theme.spacing[3]} 0 ${theme.spacing[10]}`,
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textPrimary,
            outline: 'none'
          }}
        />
      </div>

      {/* Right Side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2], marginLeft: 'auto' }}>
        {/* Help Button */}
        <button 
          className="icon-btn" 
          aria-label="Help and support"
          style={{
            display: 'flex',
            height: '40px',
            width: '40px',
            cursor: 'pointer',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: theme.borderRadius.full,
            backgroundColor: theme.colors.backgroundSecondary,
            border: 'none',
            transition: 'all 0.2s'
          }}
        >
          <Icon name="helpCircle" size={20} color={theme.colors.textSecondary} aria-hidden="true" />
        </button>

        {/* Real Notifications */}
        {userId && <NotificationDropdown userId={userId} />}

        {/* User Avatar */}
        <button
          onClick={handleAvatarClick}
          aria-label="View profile"
          style={{
            aspectRatio: '1',
            height: '40px',
            width: '40px',
            borderRadius: theme.borderRadius.full,
            backgroundColor: theme.colors.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: theme.typography.fontWeight.bold,
            fontSize: theme.typography.fontSize.base,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            padding: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1E293B';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.primary;
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
        </button>
      </div>
        <style jsx>{`
          .icon-btn:hover {
            background-color: ${theme.colors.backgroundTertiary};
          }
          .icon-btn:hover svg {
            stroke: ${theme.colors.primary};
          }
        `}</style>
      </header>
    </>
  );
}

