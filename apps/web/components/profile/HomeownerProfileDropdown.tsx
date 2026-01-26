'use client';

import React, { useState, useEffect, useRef } from 'react';
import { logger } from '@mintenance/shared';
import { useRouter } from 'next/navigation';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { supabase } from '@/lib/supabase';

interface HomeownerProfileDropdownProps {
  userName: string;
  profileImageUrl?: string | null;
  initials: string;
}

export function HomeownerProfileDropdown({ userName, profileImageUrl, initials }: HomeownerProfileDropdownProps) {
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
    // logger.info('HomeownerProfileDropdown: Menu item clicked, navigating to:', href);
    setIsOpen(false);
    router.push(href);
  };

  const handleLogout = async () => {
    setIsOpen(false);
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      logger.error('Logout error:', error);
      router.push('/login');
    }
  };

  const toggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // logger.info('HomeownerProfileDropdown: Toggle clicked, current state:', isOpen);
    setIsOpen(!isOpen);
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', zIndex: 50 }}>
      {/* Profile Button */}
      <button
        onClick={toggleDropdown}
        type="button"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          height: '44px',
          padding: '0 8px',
          borderRadius: '8px',
          backgroundColor: isOpen ? '#334155' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
          position: 'relative',
          zIndex: 51,
        }}
        aria-label="Profile menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.backgroundColor = '#334155';
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        {profileImageUrl ? (
          <img
            src={profileImageUrl}
            alt={userName}
            style={{
              width: '40px',
              height: '40px',
              objectFit: 'cover',
              borderRadius: '50%',
              border: '2px solid #475569',
            }}
          />
        ) : (
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#14B8A6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #14B8A6',
            }}
          >
            <span
              style={{
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              {initials}
            </span>
          </div>
        )}
        <Icon name="chevronDown" size={16} color="#94A3B8" />
      </button>

      {/* Dropdown Menu - Only render when mounted to prevent hydration issues */}
      {mounted && isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: '280px',
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            padding: '8px',
            gap: '4px',
            pointerEvents: 'auto',
          }}
        >
          {/* User Info */}
          <div
            style={{
              padding: '12px',
              borderBottom: '1px solid #e5e7eb',
              marginBottom: '4px',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: '600',
                color: '#1f2937',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {userName}
            </p>
            <p
              style={{
                margin: 0,
                marginTop: '4px',
                fontSize: '12px',
                color: '#6b7280',
              }}
            >
              Homeowner Account
            </p>
          </div>

          {/* Menu Items */}
          <button
            type="button"
            onClick={() => handleMenuItemClick('/settings')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon name="settings" size={18} color="#1f2937" />
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#1f2937',
                }}
              >
                Profile Settings
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginTop: '2px',
                }}
              >
                Update your information
              </div>
            </div>
          </button>

          {/* Quick Actions Separator */}
          <div
            style={{
              height: '1px',
              backgroundColor: '#e5e7eb',
              margin: '8px 0',
            }}
          />

          {/* Quick Actions */}
          {[
            { label: 'My Jobs', href: '/jobs', icon: 'briefcase', description: 'View posted jobs' },
            { label: 'Properties', href: '/properties', icon: 'home', description: 'Manage properties' },
            { label: 'Messages', href: '/messages', icon: 'messageSquare', description: 'View conversations' },
            { label: 'Payments', href: '/payments', icon: 'creditCard', description: 'Payment history' },
          ].map((action) => (
            <button
              key={action.href}
              type="button"
              onClick={() => handleMenuItemClick(action.href)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon name={action.icon as any} size={18} color="#1f2937" />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#1f2937',
                  }}
                >
                  {action.label}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    marginTop: '2px',
                  }}
                >
                  {action.description}
                </div>
              </div>
            </button>
          ))}

          {/* Support Section */}
          <div
            style={{
              height: '1px',
              backgroundColor: '#e5e7eb',
              margin: '8px 0',
            }}
          />

          <button
            type="button"
            onClick={() => handleMenuItemClick('/faq')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon name="helpCircle" size={18} color="#1f2937" />
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#1f2937',
                }}
              >
                Help & Support
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginTop: '2px',
                }}
              >
                Get help with your account
              </div>
            </div>
          </button>

          {/* Logout Separator */}
          <div
            style={{
              height: '1px',
              backgroundColor: '#e5e7eb',
              margin: '8px 0',
            }}
          />

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#fef2f2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon name="logOut" size={18} color="#dc2626" />
            </div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#dc2626',
              }}
            >
              Logout
            </div>
          </button>
        </div>
      )}
    </div>
  );
}