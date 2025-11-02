'use client';

import React from 'react';

interface DashboardContentWrapperProps {
  children: React.ReactNode;
}

export function DashboardContentWrapper({ children }: DashboardContentWrapperProps) {
  return (
    <>
      <style jsx>{`
        .dashboard-content-wrapper {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
          overflow-x: visible;
          width: 100%;
          position: relative;
          z-index: 100;
        }
        .dashboard-inner-content {
          max-width: 100%;
          margin: 0;
          margin-left: -280px;
          width: calc(100% + 280px);
          padding: 0 0 0 32px;
          display: flex;
          flex-direction: column;
          gap: 32px;
          box-sizing: border-box;
        }
        @media (max-width: 1600px) {
          .dashboard-inner-content {
            margin-left: -200px;
            width: calc(100% + 200px);
            padding-left: 32px;
          }
        }
        @media (max-width: 1440px) {
          .dashboard-inner-content {
            margin-left: -120px;
            width: calc(100% + 120px);
            padding-left: 24px;
          }
        }
        @media (max-width: 1280px) {
          .dashboard-inner-content {
            margin-left: 0;
            width: 100%;
            padding-left: 0;
          }
        }
      `}</style>
      <div className="dashboard-content-wrapper">
        {children}
      </div>
    </>
  );
}

