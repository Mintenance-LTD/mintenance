'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';
import type { NavItem, NavSection } from './adminNavConfig';

interface AdminNavSectionProps {
  section: NavSection;
  isCollapsed: boolean;
  isActive: (href: string) => boolean;
}

export function AdminNavSection({
  section,
  isCollapsed,
  isActive,
}: AdminNavSectionProps) {
  return (
    <div style={{ marginBottom: theme.spacing[2] }}>
      {section.title && !isCollapsed && (
        <>
          <div
            style={{
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              margin: `${theme.spacing[1]} ${theme.spacing[4]} ${theme.spacing[2]}`,
            }}
          />
          <p
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'rgba(255, 255, 255, 0.45)',
              padding: `${theme.spacing[1]} ${theme.spacing[4]} ${theme.spacing[1]}`,
              margin: 0,
            }}
          >
            {section.title}
          </p>
        </>
      )}
      {isCollapsed && section.title && (
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            margin: `${theme.spacing[1]} ${theme.spacing[3]}`,
          }}
        />
      )}
      {section.items.map((item) => (
        <AdminNavItemLink
          key={item.href}
          item={item}
          isCollapsed={isCollapsed}
          active={isActive(item.href)}
        />
      ))}
    </div>
  );
}

interface AdminNavItemLinkProps {
  item: NavItem;
  isCollapsed: boolean;
  active: boolean;
}

function AdminNavItemLink({
  item,
  isCollapsed,
  active,
}: AdminNavItemLinkProps) {
  return (
    <Link
      href={item.href}
      prefetch={true}
      aria-current={active ? 'page' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing[3],
        padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
        marginBottom: '2px',
        borderRadius: '10px',
        backgroundColor: active
          ? `rgba(${parseInt(theme.colors.primary.slice(1, 3), 16)}, ${parseInt(theme.colors.primary.slice(3, 5), 16)}, ${parseInt(theme.colors.primary.slice(5, 7), 16)}, 0.15)`
          : 'transparent',
        borderLeft: active
          ? `3px solid ${theme.colors.primary}`
          : '3px solid transparent',
        color: active ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
        textDecoration: 'none',
        fontSize: theme.typography.fontSize.sm,
        fontWeight: active ? 600 : 400,
        transition: 'all 0.2s ease',
        position: 'relative',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
          e.currentTarget.style.color = '#FFFFFF';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
        }
      }}
    >
      <div
        style={{
          width: '22px',
          height: '22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon
          name={item.icon}
          size={18}
          color={active ? theme.colors.primary : 'rgba(255, 255, 255, 0.6)'}
        />
      </div>
      {!isCollapsed && (
        <>
          <span style={{ flex: 1 }}>{item.label}</span>
          {item.badge && (
            <span
              className='admin-nav-badge'
              style={{
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: 'rgba(239, 68, 68, 0.9)',
                color: '#fff',
                borderRadius: '10px',
                padding: '1px 7px',
                minWidth: '18px',
                textAlign: 'center' as const,
                lineHeight: '16px',
                display: 'inline-block',
              }}
              data-badge-type={item.badge}
            >
              !
            </span>
          )}
        </>
      )}
    </Link>
  );
}
