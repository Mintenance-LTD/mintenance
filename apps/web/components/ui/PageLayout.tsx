import React from 'react';
import { theme } from '@/lib/theme';

/**
 * PageLayout Component
 * Standardized two-column layout matching Dashboard/Profile pattern
 */

interface PageLayoutProps {
  sidebar?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
  sidebarWidth?: string;
  gap?: string | number;
}

export function PageLayout({
  sidebar,
  children,
  maxWidth = '1400px',
  sidebarWidth = '320px',
  gap = theme.spacing[8],
}: PageLayoutProps) {
  if (!sidebar) {
    // Single column layout
    return (
      <div
        style={{
          maxWidth,
          margin: '0 auto',
          padding: theme.spacing[8],
        }}
      >
        {children}
      </div>
    );
  }

  // Two-column layout with sidebar
  return (
    <div
      style={{
        maxWidth,
        margin: '0 auto',
        padding: theme.spacing[8],
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `minmax(280px, ${sidebarWidth}) 1fr`,
          gap,
          alignItems: 'start',
        }}
      >
        {/* Sidebar */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[6],
          }}
        >
          {sidebar}
        </div>

        {/* Main Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[8],
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * PageHeader Component
 * Standardized page header
 */
interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  backUrl?: string;
}

export function PageHeader({ title, description, actions, backUrl }: PageHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: theme.spacing[8],
      }}
    >
      <div>
        {backUrl && (
          <a
            href={backUrl}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              color: theme.colors.textSecondary,
              textDecoration: 'none',
              marginBottom: theme.spacing[2],
              fontSize: theme.typography.fontSize.sm,
            }}
          >
            ← Back
          </a>
        )}
        <h1
          style={{
            fontSize: theme.typography.fontSize['4xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
            marginBottom: description ? theme.spacing[3] : 0,
            margin: 0,
          }}
        >
          {title}
        </h1>
        {description && (
          <p
            style={{
              fontSize: theme.typography.fontSize.xl,
              color: theme.colors.textSecondary,
              margin: 0,
            }}
          >
            {description}
          </p>
        )}
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
}

/**
 * StatsGrid Component
 * Grid layout for stat cards
 */
interface StatsGridProps {
  children: React.ReactNode;
  columns?: number;
}

export function StatsGrid({ children, columns = 3 }: StatsGridProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(180px, 1fr))`,
        gap: theme.spacing[4],
      }}
    >
      {children}
    </div>
  );
}

