'use client';

import React from 'react';

interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function ResponsiveGrid({ children, className = '', style = {} }: ResponsiveGridProps) {
  return (
    <>
      <style jsx>{`
        .metrics-grid {
          display: grid !important;
          grid-template-columns: repeat(4, 1fr) !important;
          grid-template-rows: 1fr !important;
          gap: 20px;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          grid-auto-flow: row;
        }
        .metrics-grid > * {
          min-width: 0 !important;
          max-width: 100%;
          grid-row: 1 !important;
          grid-column: auto !important;
        }
        .metrics-grid > :nth-child(1) {
          grid-column: 1 !important;
          grid-row: 1 !important;
        }
        .metrics-grid > :nth-child(2) {
          grid-column: 2 !important;
          grid-row: 1 !important;
        }
        .metrics-grid > :nth-child(3) {
          grid-column: 3 !important;
          grid-row: 1 !important;
        }
        .metrics-grid > :nth-child(4) {
          grid-column: 4 !important;
          grid-row: 1 !important;
        }
        @media (max-width: 1024px) {
          .metrics-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            grid-template-rows: auto !important;
          }
          .metrics-grid > * {
            grid-row: auto !important;
            grid-column: auto !important;
          }
        }
        @media (max-width: 640px) {
          .metrics-grid {
            grid-template-columns: 1fr !important;
          }
        }
        .project-grid {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 32px;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }
        @media (max-width: 1024px) {
          .project-grid {
            grid-template-columns: 1fr !important;
          }
        }
        .tasks-actions-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 32px;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }
        @media (max-width: 1024px) {
          .tasks-actions-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      <div className={className} style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', ...style }}>
        {children}
      </div>
    </>
  );
}

