import React from 'react';
import { theme } from '@/lib/theme';

interface BentoGridModernProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function BentoGridModern({ children, className = '', style = {} }: BentoGridModernProps) {
  return (
    <div
      className={`bento-grid-modern ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: `${theme.spacing[6]}px`,
        width: '100%',
        ...style,
      }}
    >
      {children}
      <style jsx>{`
        .bento-grid-modern {
          position: relative;
        }

        @media (max-width: 1280px) {
          .bento-grid-modern {
            grid-template-columns: repeat(8, 1fr) !important;
          }
        }

        @media (max-width: 1024px) {
          .bento-grid-modern {
            grid-template-columns: repeat(6, 1fr) !important;
          }
        }

        @media (max-width: 768px) {
          .bento-grid-modern {
            grid-template-columns: repeat(4, 1fr) !important;
          }
        }

        @media (max-width: 640px) {
          .bento-grid-modern {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

interface BentoItemModernProps {
  children: React.ReactNode;
  colSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  rowSpan?: 1 | 2 | 3 | 4;
  className?: string;
  style?: React.CSSProperties;
}

export function BentoItemModern({ 
  children, 
  colSpan = 3, 
  rowSpan = 1,
  className = '',
  style = {}
}: BentoItemModernProps) {
  return (
    <div
      className={`bento-item-modern group ${className}`}
      style={{
        gridColumn: `span ${colSpan}`,
        gridRow: `span ${rowSpan}`,
        minHeight: rowSpan === 1 ? '200px' : rowSpan === 2 ? '400px' : rowSpan === 3 ? '600px' : '800px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        ...style,
      }}
    >
      {children}
      <style jsx>{`
        .bento-item-modern {
          position: relative;
        }

        .bento-item-modern:hover {
          transform: translateY(-4px);
        }

        @media (max-width: 1024px) {
          .bento-item-modern {
            grid-column: span ${Math.min(colSpan, 6)} !important;
          }
        }

        @media (max-width: 768px) {
          .bento-item-modern {
            grid-column: span ${Math.min(colSpan, 4)} !important;
          }
        }

        @media (max-width: 640px) {
          .bento-item-modern {
            grid-column: span 4 !important;
            min-height: 200px !important;
          }
        }
      `}</style>
    </div>
  );
}

