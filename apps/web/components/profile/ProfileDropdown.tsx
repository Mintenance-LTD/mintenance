'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

interface ProfileDropdownProps {
  contractorName: string;
  profileImageUrl?: string | null;
  initials: string;
}

export function ProfileDropdown({ contractorName, profileImageUrl, initials }: ProfileDropdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close dropdown on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleMenuItemClick = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  if (!mounted) {
    return null;
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '14px',
          border: `1px solid ${theme.colors.border}`,
          backgroundColor: profileImageUrl ? 'transparent' : theme.colors.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: `all ${theme.animation.duration.fast} ${theme.animation.easing.easeOut}`,
          padding: 0,
          overflow: 'hidden',
        }}
        aria-label="Profile"
        aria-expanded={isOpen}
        aria-haspopup="true"
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = theme.shadows.sm;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {profileImageUrl ? (
          <img
            src={profileImageUrl}
            alt={contractorName}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <span
            style={{
              color: theme.colors.textInverse,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold,
            }}
          >
            {initials}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: '240px',
            backgroundColor: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.lg,
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            padding: theme.spacing[2],
            gap: theme.spacing[1],
          }}
        >
          {/* User Info */}
          <div
            style={{
              padding: theme.spacing[3],
              borderBottom: `1px solid ${theme.colors.border}`,
              marginBottom: theme.spacing[1],
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.textPrimary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {contractorName}
            </p>
          </div>

          {/* Menu Items */}
          <button
            type="button"
            onClick={() => handleMenuItemClick('/contractor/profile')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[3],
              padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
              borderRadius: theme.borderRadius.md,
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: theme.borderRadius.md,
                backgroundColor: `${theme.colors.primary}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon name="user" size={18} color={theme.colors.primary} />
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  color: theme.colors.textPrimary,
                }}
              >
                Edit Profile
              </div>
              <div
                style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.textSecondary,
                  marginTop: '2px',
                }}
              >
                Update your information
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleMenuItemClick('/contractor/social')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[3],
              padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
              borderRadius: theme.borderRadius.md,
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: theme.borderRadius.md,
                backgroundColor: `${theme.colors.primary}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon name="users" size={18} color={theme.colors.primary} />
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  color: theme.colors.textPrimary,
                }}
              >
                Social Media
              </div>
              <div
                style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.textSecondary,
                  marginTop: '2px',
                }}
              >
                Community feed & posts
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

