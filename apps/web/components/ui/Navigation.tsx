'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from './Button';
import { theme } from '@/lib/theme';

export interface NavigationItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  active?: boolean;
  badge?: number;
}

export interface NavigationProps {
  items: NavigationItem[];
  variant?: 'horizontal' | 'vertical' | 'tabs';
  className?: string;
  style?: React.CSSProperties;
}

export const Navigation: React.FC<NavigationProps> = ({
  items,
  variant = 'horizontal',
  className = '',
  style = {},
}) => {
  const containerStyles: React.CSSProperties = {
    display: 'flex',
    gap: variant === 'vertical' ? theme.spacing[1] : theme.spacing[2],
    flexDirection: variant === 'vertical' ? 'column' : 'row',
    alignItems: variant === 'vertical' ? 'stretch' : 'center',
    ...style,
  };

  const tabStyles: React.CSSProperties = {
    borderBottom: `2px solid ${theme.colors.border}`,
    paddingBottom: theme.spacing[2],
  };

  const getItemStyles = (item: NavigationItem): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing[2],
      padding: variant === 'vertical' ? theme.spacing[3] : `${theme.spacing[2]} ${theme.spacing[3]}`,
      borderRadius: variant === 'vertical' ? theme.borderRadius.lg : theme.borderRadius.base,
      textDecoration: 'none',
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.medium,
      transition: 'all 0.15s ease-in-out',
      position: 'relative' as const,
      cursor: 'pointer',
      ...(variant === 'tabs' && tabStyles),
    };

    if (item.active) {
      return {
        ...baseStyles,
        backgroundColor: variant === 'vertical' ? theme.colors.primary : 'transparent',
        color: variant === 'vertical' ? theme.colors.white : theme.colors.primary,
        ...(variant === 'tabs' && {
          borderBottomColor: theme.colors.primary,
        }),
      };
    }

    return {
      ...baseStyles,
      backgroundColor: 'transparent',
      color: theme.colors.textSecondary,
    };
  };

  const badgeStyles: React.CSSProperties = {
    backgroundColor: theme.colors.error,
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
    borderRadius: theme.borderRadius.full,
    minWidth: '20px',
    textAlign: 'center',
    lineHeight: 1,
  };

  return (
    <nav className={`navigation navigation--${variant} ${className}`} style={containerStyles}>
      {items.map((item, index) => (
        <Link
          key={index}
          href={item.href}
          style={getItemStyles(item)}
          className={item.active ? 'navigation__item--active' : 'navigation__item'}
        >
          {item.icon && (
            <span style={{ display: 'flex', alignItems: 'center' }}>
              {item.icon}
            </span>
          )}
          <span>{item.label}</span>
          {item.badge && item.badge > 0 && (
            <span style={badgeStyles}>
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
        </Link>
      ))}

    </nav>
  );
};

export default Navigation;
