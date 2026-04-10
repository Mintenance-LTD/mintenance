'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

interface NotificationDropdownButtonProps {
  unreadCount: number;
  mounted: boolean;
  onClick: () => void;
}

export function NotificationDropdownButton({
  unreadCount,
  mounted,
  onClick,
}: NotificationDropdownButtonProps) {
  if (!mounted) {
    // SSR placeholder — matches client structure to prevent hydration mismatch
    const backgroundColor = theme.colors.backgroundSecondary;
    const iconColor = theme.colors.textSecondary;

    return (
      <button
        type='button'
        aria-label='Notifications'
        aria-live='polite'
        className='icon-btn'
        style={{
          position: 'relative',
          display: 'flex',
          height: '40px',
          width: '40px',
          cursor: 'pointer',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: theme.borderRadius.full,
          backgroundColor: backgroundColor,
          border: 'none',
          transition: 'all 0.2s',
        }}
      >
        <Icon name='bell' size={20} color={iconColor} aria-hidden='true' />
      </button>
    );
  }

  return (
    <button
      type='button'
      aria-label='Notifications'
      aria-live='polite'
      className='icon-btn'
      onClick={onClick}
      style={{
        position: 'relative',
        display: 'flex',
        height: '40px',
        width: '40px',
        cursor: 'pointer',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.backgroundSecondary,
        border: 'none',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor =
          theme.colors.backgroundSecondary;
      }}
    >
      <Icon
        name='bell'
        size={20}
        color={theme.colors.textSecondary}
        aria-hidden='true'
      />
      {unreadCount > 0 && (
        <span
          style={{
            position: 'absolute',
            right: '6px',
            top: '6px',
            minWidth: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: theme.borderRadius.full,
            backgroundColor: '#EF4444',
            color: 'white',
            fontSize: '10px',
            fontWeight: theme.typography.fontWeight.bold,
            padding: '0 4px',
            border: '2px solid white',
          }}
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
