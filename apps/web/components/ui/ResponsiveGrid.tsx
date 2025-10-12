'use client';

import React from 'react';
import { theme } from '@/lib/theme';

interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: keyof typeof theme.spacing;
  className?: string;
  style?: React.CSSProperties;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns = { xs: 1, sm: 2, md: 3, lg: 4 },
  gap = 4,
  className = '',
  style = {},
}) => {
  const gridStyles = {
    display: 'grid',
    gap: theme.spacing[gap],
    gridTemplateColumns: `
      repeat(${columns.xs || 1}, 1fr)
    `,
    ...style,
  };

  const responsiveStyles = `
    @media (min-width: 640px) {
      .responsive-grid {
        grid-template-columns: repeat(${columns.sm || columns.xs || 1}, 1fr);
      }
    }
    
    @media (min-width: 768px) {
      .responsive-grid {
        grid-template-columns: repeat(${columns.md || columns.sm || columns.xs || 1}, 1fr);
      }
    }
    
    @media (min-width: 1024px) {
      .responsive-grid {
        grid-template-columns: repeat(${columns.lg || columns.md || columns.sm || columns.xs || 1}, 1fr);
      }
    }
    
    @media (min-width: 1280px) {
      .responsive-grid {
        grid-template-columns: repeat(${columns.xl || columns.lg || columns.md || columns.sm || columns.xs || 1}, 1fr);
      }
    }
  `;

  return (
    <div className={`responsive-grid ${className}`} style={gridStyles}>
      {children}
      <style jsx>{responsiveStyles}</style>
    </div>
  );
};

// Auto-fit grid that adjusts based on content
interface AutoFitGridProps {
  children: React.ReactNode;
  minWidth?: string;
  gap?: keyof typeof theme.spacing;
  className?: string;
  style?: React.CSSProperties;
}

export const AutoFitGrid: React.FC<AutoFitGridProps> = ({
  children,
  minWidth = '300px',
  gap = 4,
  className = '',
  style = {},
}) => {
  const gridStyles = {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}, 1fr))`,
    gap: theme.spacing[gap],
    ...style,
  };

  return (
    <div className={`auto-fit-grid ${className}`} style={gridStyles}>
      {children}
    </div>
  );
};

// Masonry-style grid for cards
interface MasonryGridProps {
  children: React.ReactNode;
  columns?: number;
  gap?: keyof typeof theme.spacing;
  className?: string;
  style?: React.CSSProperties;
}

export const MasonryGrid: React.FC<MasonryGridProps> = ({
  children,
  columns = 3,
  gap = 4,
  className = '',
  style = {},
}) => {
  const gridStyles = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: theme.spacing[gap],
    gridAutoRows: 'masonry',
    ...style,
  };

  return (
    <div className={`masonry-grid ${className}`} style={gridStyles}>
      {children}
    </div>
  );
};

// Flex grid for equal height items
interface FlexGridProps {
  children: React.ReactNode;
  columns?: number;
  gap?: keyof typeof theme.spacing;
  className?: string;
  style?: React.CSSProperties;
}

export const FlexGrid: React.FC<FlexGridProps> = ({
  children,
  columns = 3,
  gap = 4,
  className = '',
  style = {},
}) => {
  const gridStyles = {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: theme.spacing[gap],
    ...style,
  };

  const itemStyles = {
    flex: `1 1 calc(${100 / columns}% - ${theme.spacing[gap]})`,
    minWidth: '0',
  };

  return (
    <div className={`flex-grid ${className}`} style={gridStyles}>
      {React.Children.map(children, (child, index) => (
        <div key={index} style={itemStyles}>
          {child}
        </div>
      ))}
    </div>
  );
};

export default ResponsiveGrid;
