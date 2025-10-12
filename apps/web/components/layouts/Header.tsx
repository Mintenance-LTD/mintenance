'use client';

import React, { useState } from 'react';
import { designSystem } from '@/lib/design-system';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  searchPlaceholder?: string;
  actions?: React.ReactNode;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
}

export function Header({ 
  title, 
  subtitle, 
  searchPlaceholder = "Search or type a command",
  actions,
  user 
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1rem 1.5rem',
      backgroundColor: 'white',
      borderBottom: '1px solid #e2e8f0',
    }}>
      {/* Left Section - Title */}
      <div>
        {title && (
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#1f2937',
            margin: 0,
            lineHeight: '1.25',
          }}>
            {title}
          </h1>
        )}
        {subtitle && (
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            margin: '0.25rem 0 0 0',
            lineHeight: '1.5',
          }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Center Section - Search */}
      <div style={{ flex: 1, maxWidth: '500px', margin: '0 2rem' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              ...designSystem.components.input.base,
              paddingLeft: '2.5rem',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          />
          <div style={{
            position: 'absolute',
            left: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#6b7280',
            fontSize: '1rem',
          }}>
            🔍
          </div>
        </div>
      </div>

      {/* Right Section - Actions & User */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
      }}>
        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          {/* Quick Actions */}
          <button
            style={{
              padding: '0.5rem',
              borderRadius: '0.5rem',
              border: '1px solid #e2e8f0',
              backgroundColor: 'white',
              color: '#6b7280',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.color = '#374151';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.color = '#6b7280';
            }}
          >
            ⚡
          </button>

          {/* Notifications */}
          <button
            style={{
              padding: '0.5rem',
              borderRadius: '0.5rem',
              border: '1px solid #e2e8f0',
              backgroundColor: 'white',
              color: '#6b7280',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.color = '#374151';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.color = '#6b7280';
            }}
          >
            🔔
            {/* Notification Badge */}
            <span style={{
              position: 'absolute',
              top: '-0.25rem',
              right: '-0.25rem',
              backgroundColor: designSystem.colors.error[500],
              color: 'white',
              fontSize: '0.625rem',
              fontWeight: '600',
              padding: '0.125rem 0.25rem',
              borderRadius: '9999px',
              minWidth: '1rem',
              textAlign: 'center',
            }}>
              3
            </span>
          </button>

          {/* Add User/Contact */}
          <button
            style={{
              padding: '0.5rem',
              borderRadius: '0.5rem',
              border: '1px solid #e2e8f0',
              backgroundColor: 'white',
              color: '#6b7280',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.color = '#374151';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.color = '#6b7280';
            }}
          >
            👤+
          </button>
        </div>

        {/* Custom Actions */}
        {actions && (
          <div style={{ marginLeft: '1rem' }}>
            {actions}
          </div>
        )}

        {/* User Profile */}
        {user && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.5rem',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          >
            <div style={{
              width: '2rem',
              height: '2rem',
              borderRadius: '50%',
              backgroundColor: designSystem.colors.primary[100],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: designSystem.colors.primary[700],
              fontSize: '0.75rem',
              fontWeight: '600',
            }}>
              {user.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                user.name.split(' ').map(n => n[0]).join('').toUpperCase()
              )}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              color: '#6b7280',
            }}>
              <span style={{ fontSize: '0.75rem' }}>▼</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
