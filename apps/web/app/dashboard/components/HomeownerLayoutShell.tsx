'use client';

import React, { ReactNode, useState } from 'react';
import { theme } from '@/lib/theme';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardHeader } from './DashboardHeader';

interface HomeownerLayoutShellProps {
  children: ReactNode;
  currentPath?: string;
  userName?: string;
  userEmail?: string;
}

export function HomeownerLayoutShell({ 
  children, 
  currentPath = '/dashboard',
  userName,
  userEmail 
}: HomeownerLayoutShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.colors.backgroundSecondary }}>
      {/* Sidebar */}
      <DashboardSidebar 
        currentPath={currentPath}
        userName={userName}
        userEmail={userEmail}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content */}
      <div 
        className="lg:ml-[280px]"
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          flex: 1, 
          marginLeft: '280px',
        }}
      >
        {/* Header */}
        {userName && (
          <DashboardHeader
            userName={userName}
          />
        )}
        
        {/* Page Content */}
        <div style={{ flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

