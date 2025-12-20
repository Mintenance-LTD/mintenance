import React from 'react';
import { PageHeader } from './PageHeader';
import { Navigation } from './Navigation';
import { theme } from '@/lib/theme';

export interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  navigation?: Array<{
    label: string;
    href: string;
    icon?: React.ReactNode;
    active?: boolean;
    badge?: number;
  }>;
  variant?: 'default' | 'compact' | 'hero';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  style?: React.CSSProperties;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  title,
  subtitle,
  actions,
  breadcrumbs,
  navigation,
  variant = 'default',
  maxWidth = 'xl',
  className = '',
  style = {},
}) => {
  const maxWidthMap = {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    full: '100%',
  };

  const containerStyles: React.CSSProperties = {
    minHeight: '100vh',
    backgroundColor: theme.colors.backgroundSecondary,
    ...style,
  };

  const contentStyles: React.CSSProperties = {
    maxWidth: maxWidthMap[maxWidth],
    margin: '0 auto',
    padding: `0 ${theme.spacing[6]}`,
    paddingBottom: theme.spacing[8],
  };

  return (
    <div className={`layout layout--${variant} ${className}`} style={containerStyles}>
      {/* Header */}
      {(title || navigation) && (
        <div>
          {title && (
            <PageHeader
              title={title}
              subtitle={subtitle}
              actions={actions}
              breadcrumbs={breadcrumbs}
              variant={variant}
            />
          )}
          
          {navigation && (
            <div style={{
              backgroundColor: theme.colors.surface,
              borderBottom: `1px solid ${theme.colors.border}`,
              padding: `${theme.spacing[4]} ${theme.spacing[6]}`,
            }}>
              <div style={{
                maxWidth: maxWidthMap[maxWidth],
                margin: '0 auto',
              }}>
                <Navigation items={navigation} variant="horizontal" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <main style={contentStyles}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
