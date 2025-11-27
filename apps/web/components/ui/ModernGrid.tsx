import React from 'react';
import { theme } from '@/lib/theme';

interface ModernGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4 | 6 | 12;
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  style?: React.CSSProperties;
}

const gapMap = {
  sm: theme.spacing[3],
  md: theme.spacing[4],
  lg: theme.spacing[6],
  xl: theme.spacing[8],
};

export function ModernGrid({ 
  children, 
  columns = 4, 
  gap = 'lg',
  className = '',
  style = {}
}: ModernGridProps) {
  const gapValue = gapMap[gap];

  return (
    <div
      className={`modern-grid ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gapValue}px`,
        width: '100%',
        ...style,
      }}
    >
      {children}
      <style jsx>{`
        .modern-grid {
          position: relative;
        }

        @media (max-width: 1280px) {
          .modern-grid {
            grid-template-columns: repeat(${Math.min(columns, 3)}, 1fr) !important;
          }
        }

        @media (max-width: 1024px) {
          .modern-grid {
            grid-template-columns: repeat(${Math.min(columns, 2)}, 1fr) !important;
          }
        }

        @media (max-width: 640px) {
          .modern-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

interface GridItemProps {
  children: React.ReactNode;
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2 | 3;
  className?: string;
  style?: React.CSSProperties;
}

export function GridItem({ 
  children, 
  colSpan = 1, 
  rowSpan = 1,
  className = '',
  style = {}
}: GridItemProps) {
  return (
    <div
      className={`grid-item ${className}`}
      style={{
        gridColumn: `span ${colSpan}`,
        gridRow: `span ${rowSpan}`,
        minHeight: rowSpan === 1 ? 'auto' : rowSpan === 2 ? '400px' : '600px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

