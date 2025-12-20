import React from 'react';
import { theme } from '@/lib/theme';

interface BentoGridProps {
  children: React.ReactNode;
}

export function BentoGrid({ children }: BentoGridProps) {
  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          .contractor-bento-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: ${theme.spacing[4]}px;
            width: 100%;
          }
          
          @media (max-width: 1024px) {
            .contractor-bento-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }
          
          @media (max-width: 640px) {
            .contractor-bento-grid {
              grid-template-columns: 1fr;
            }
          }
        `
      }} />
      <div className="contractor-bento-grid">
        {children}
      </div>
    </>
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
      className={`contractor-bento-item ${className}`}
      suppressHydrationWarning
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

