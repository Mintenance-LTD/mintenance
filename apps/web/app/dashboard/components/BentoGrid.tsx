import React from 'react';
import { theme } from '@/lib/theme';

interface BentoGridProps {
  children: React.ReactNode;
}

export function BentoGrid({ children }: BentoGridProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: `${theme.spacing[4]}px`,
        width: '100%',
      }}
      className="bento-grid"
    >
      {children}
    </div>
  );
}

interface BentoItemProps {
  children: React.ReactNode;
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2;
  className?: string;
}

export function BentoItem({ children, colSpan = 1, rowSpan = 1, className = '' }: BentoItemProps) {
  return (
    <div
      className={`bento-item ${className}`}
      style={{
        gridColumn: `span ${colSpan}`,
        gridRow: `span ${rowSpan}`,
        minHeight: rowSpan === 2 ? '400px' : '200px',
      }}
    >
      {children}
    </div>
  );
}

