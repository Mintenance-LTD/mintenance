'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from './Button';
import { theme } from '@/lib/theme';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  variant?: 'default' | 'compact' | 'hero';
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions,
  breadcrumbs,
  variant = 'default',
}) => {
  const containerStyles: React.CSSProperties = {
    backgroundColor: theme.colors.surface,
    borderBottom: `1px solid ${theme.colors.border}`,
    padding: variant === 'compact' ? theme.spacing[4] : theme.spacing[6],
    marginBottom: theme.spacing[6],
  };

  const heroStyles: React.CSSProperties = {
    ...containerStyles,
    background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryLight} 100%)`,
    color: theme.colors.white,
    borderBottom: 'none',
    marginBottom: theme.spacing[8],
  };

  const titleStyles: React.CSSProperties = {
    fontSize: variant === 'hero' ? theme.typography.fontSize['5xl'] : 
              variant === 'compact' ? theme.typography.fontSize['2xl'] : 
              theme.typography.fontSize['4xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: variant === 'hero' ? theme.colors.white : theme.colors.textPrimary,
    marginBottom: subtitle ? theme.spacing[2] : 0,
    lineHeight: theme.typography.lineHeight.tight,
  };

  const subtitleStyles: React.CSSProperties = {
    fontSize: theme.typography.fontSize.lg,
    color: variant === 'hero' ? theme.colors.textInverseMuted : theme.colors.textSecondary,
    lineHeight: theme.typography.lineHeight.normal,
  };

  const breadcrumbStyles: React.CSSProperties = {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing[4],
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing[1],
  };

  const breadcrumbItemStyles: React.CSSProperties = {
    color: theme.colors.textTertiary,
    textDecoration: 'none',
    transition: 'color 0.15s ease-in-out',
  };

  const breadcrumbSeparatorStyles: React.CSSProperties = {
    color: theme.colors.textQuaternary,
    margin: `0 ${theme.spacing[1]}`,
  };

  const headerStyles = variant === 'hero' ? heroStyles : containerStyles;

  return (
    <div style={headerStyles}>
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[4],
      }}>
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="page-breadcrumbs" style={breadcrumbStyles}>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {crumb.href ? (
                  <Link href={crumb.href} className="breadcrumb-link" style={breadcrumbItemStyles}>
                    {crumb.label}
                  </Link>
                ) : (
                  <span style={{ color: theme.colors.textSecondary }}>
                    {crumb.label}
                  </span>
                )}
                {index < breadcrumbs.length - 1 && (
                  <span className="breadcrumb-separator" style={breadcrumbSeparatorStyles}>/</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <style jsx>{`
          .page-breadcrumbs .breadcrumb-link:hover {
            color: ${theme.colors.primary};
          }
          .page-breadcrumbs .breadcrumb-separator {
            user-select: none;
          }
        `}</style>

        {/* Header Content */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: variant === 'compact' ? 'center' : 'flex-start',
          flexWrap: 'wrap',
          gap: theme.spacing[4],
        }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <h1 style={titleStyles}>{title}</h1>
            {subtitle && <p style={subtitleStyles}>{subtitle}</p>}
          </div>
          
          {actions && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[2],
              flexWrap: 'wrap',
            }}>
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
