'use client';

import React from 'react';
import { theme } from '@/lib/theme';

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export const SkipLink: React.FC<SkipLinkProps> = ({ 
  href, 
  children, 
  className = '' 
}) => {
  return (
    <a
      href={href}
      className={`skip-link ${className}`}
      style={{
        position: 'absolute',
        top: '-40px',
        left: '6px',
        background: theme.colors.primary,
        color: theme.colors.white,
        padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
        borderRadius: theme.borderRadius.base,
        textDecoration: 'none',
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.medium,
        zIndex: 1000,
        transition: 'top 0.3s ease',
      }}
      onFocus={(e) => {
        e.currentTarget.style.top = '6px';
      }}
      onBlur={(e) => {
        e.currentTarget.style.top = '-40px';
      }}
    >
      {children}
    </a>
  );
};

export default SkipLink;
