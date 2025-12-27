import { ReactNode } from 'react';

interface ContractorLayoutProps {
  children: ReactNode;
  maxWidth?: 'default' | 'wide' | 'full';
  className?: string;
}

/**
 * Standard layout wrapper for contractor pages
 * Ensures consistent spacing, padding, and max-width across all pages
 *
 * @example
 * ```tsx
 * <ContractorLayout>
 *   <PageTitle>Dashboard</PageTitle>
 *   <div className="space-y-6">
 *     <StandardCard>Content</StandardCard>
 *   </div>
 * </ContractorLayout>
 * ```
 */
export function ContractorLayout({
  children,
  maxWidth = 'default',
  className = '',
}: ContractorLayoutProps) {
  const maxWidthClasses = {
    default: 'max-w-7xl',  // 1280px
    wide: 'max-w-[1536px]', // 1536px for wider layouts
    full: 'max-w-full',     // No max width
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div
        className={`
          ${maxWidthClasses[maxWidth]}
          mx-auto
          px-8
          py-8
          ${className}
        `}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Section wrapper with consistent spacing
 * Use to separate major sections within a page
 */
export function Section({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`space-y-6 ${className}`}>
      {children}
    </section>
  );
}

/**
 * Grid layout for cards
 * Provides responsive grid with consistent gaps
 */
export function CardGrid({
  children,
  columns = 3,
  className = '',
}: {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}) {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 lg:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid ${columnClasses[columns]} gap-6 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Stats grid for KPI cards
 * Optimized for displaying metric cards
 */
export function StatsGrid({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`
        grid
        grid-cols-1
        sm:grid-cols-2
        lg:grid-cols-4
        gap-6
        ${className}
      `}
    >
      {children}
    </div>
  );
}

/**
 * Page header with consistent spacing
 */
export function PageHeader({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <header className={`mb-8 ${className}`}>
      {children}
    </header>
  );
}

/**
 * Content section with optional title
 */
export function ContentSection({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`space-y-6 ${className}`}>
      {title && (
        <h2 className="text-lg font-semibold text-gray-900">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
