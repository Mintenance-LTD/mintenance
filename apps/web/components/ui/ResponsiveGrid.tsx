'use client';

import React, { ReactNode, useMemo, useId } from 'react';

export type GridArea = 
  | 'header'
  | 'sidebar'
  | 'main'
  | 'aside'
  | 'footer'
  | 'content'
  | 'widget1'
  | 'widget2'
  | 'widget3'
  | string;

export interface ResponsiveGridProps {
  children: ReactNode;
  areas: {
    mobile?: GridArea[][];
    tablet?: GridArea[][];
    desktop?: GridArea[][];
  };
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * ResponsiveGrid Component
 * 
 * Creates a responsive grid layout using CSS grid-template-areas
 * Supports different grid layouts for mobile, tablet, and desktop breakpoints
 * 
 * @example
 * ```tsx
 * <ResponsiveGrid
 *   areas={{
 *     mobile: [
 *       ['header'],
 *       ['main'],
 *       ['sidebar'],
 *       ['footer']
 *     ],
 *     tablet: [
 *       ['header', 'header'],
 *       ['sidebar', 'main'],
 *       ['footer', 'footer']
 *     ],
 *     desktop: [
 *       ['header', 'header', 'header'],
 *       ['sidebar', 'main', 'aside'],
 *       ['footer', 'footer', 'footer']
 *     ]
 *   }}
 *   gap="lg"
 * >
 *   <GridArea area="header">Header</GridArea>
 *   <GridArea area="sidebar">Sidebar</GridArea>
 *   <GridArea area="main">Main Content</GridArea>
 *   <GridArea area="aside">Aside</GridArea>
 *   <GridArea area="footer">Footer</GridArea>
 * </ResponsiveGrid>
 * ```
 */
export function ResponsiveGrid({
  children,
  areas,
  gap = 'md',
  className = '',
}: ResponsiveGridProps) {
  const gapMap = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };

  // Convert grid areas array to CSS grid-template-areas string
  const areasToCSS = (areaArray: GridArea[][]): string => {
    return areaArray
      .map((row) => `"${row.join(' ')}"`)
      .join(' ');
  };

  // Generate CSS grid-template-areas strings
  const mobileAreas = areas.mobile ? areasToCSS(areas.mobile) : '';
  const tabletAreas = areas.tablet ? areasToCSS(areas.tablet) : '';
  const desktopAreas = areas.desktop ? areasToCSS(areas.desktop) : '';

  // Use useId for stable SSR-safe ID generation
  const styleId = useId().replace(/:/g, '-');

  // Generate inline styles with media queries
  const gridStyles = useMemo(() => {
    return {
      styleId,
      tabletAreas: tabletAreas || mobileAreas,
      desktopAreas: desktopAreas || tabletAreas || mobileAreas,
      mobileAreas,
    };
  }, [mobileAreas, tabletAreas, desktopAreas, styleId]);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .responsive-grid-${gridStyles.styleId} {
              grid-template-areas: ${gridStyles.mobileAreas};
            }
            @media (min-width: 768px) {
              .responsive-grid-${gridStyles.styleId} {
                grid-template-areas: ${gridStyles.tabletAreas};
              }
            }
            @media (min-width: 1024px) {
              .responsive-grid-${gridStyles.styleId} {
                grid-template-areas: ${gridStyles.desktopAreas};
              }
            }
          `,
        }}
      />
      <div
        className={`
          responsive-grid-${gridStyles.styleId}
          grid
          ${gapMap[gap]}
          ${className}
        `}
      >
        {children}
      </div>
    </>
  );
}

/**
 * GridArea Component
 * Helper component to wrap children with grid-area styling
 */
export function GridArea({
  area,
  children,
  className = '',
}: {
  area: GridArea;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div 
      className={`${className}`}
      style={{ gridArea: area }}
    >
      {children}
    </div>
  );
}
