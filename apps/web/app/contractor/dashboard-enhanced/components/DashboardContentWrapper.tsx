import React from 'react';

interface DashboardContentWrapperProps {
  children: React.ReactNode;
}

export function DashboardContentWrapper({ children }: DashboardContentWrapperProps) {
  return (
    <div suppressHydrationWarning style={{
      display: 'flex',
      flexDirection: 'column',
      flex: '1 1 0%',
      width: '100%',
      minWidth: 0,
      overflowX: 'visible',
      position: 'relative',
      zIndex: 100,
    }}>
      {children}
    </div>
  );
}

