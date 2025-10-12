'use client';

import React from 'react';
import Link from 'next/link';
import { theme } from '@/lib/theme';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  style?: React.CSSProperties;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  className = '',
  style = {},
}) => {
  const containerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[2],
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    ...style,
  };

  const itemStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[2],
  };

  const linkStyles: React.CSSProperties = {
    color: theme.colors.textSecondary,
    textDecoration: 'none',
    transition: 'color 0.15s ease',
  };

  const currentStyles: React.CSSProperties = {
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.fontWeight.medium,
  };

  const separatorStyles: React.CSSProperties = {
    color: theme.colors.textTertiary,
    fontSize: theme.typography.fontSize.xs,
  };

  return (
    <nav 
      className={`breadcrumbs ${className}`}
      style={containerStyles}
      aria-label="Breadcrumb navigation"
    >
      <ol style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: theme.spacing[2],
        listStyle: 'none',
        margin: 0,
        padding: 0,
      }}>
        {items.map((item, index) => (
          <li key={index} style={itemStyles}>
            {index > 0 && (
              <span style={separatorStyles} aria-hidden="true">
                ›
              </span>
            )}
            {item.href && !item.current ? (
              <Link 
                href={item.href}
                style={linkStyles}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = theme.colors.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = theme.colors.textSecondary;
                }}
              >
                {item.label}
              </Link>
            ) : (
              <span 
                style={item.current ? currentStyles : linkStyles}
                aria-current={item.current ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
