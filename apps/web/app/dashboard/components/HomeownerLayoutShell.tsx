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
  userAvatar?: string;
}

export function HomeownerLayoutShell({ 
  children, 
  currentPath = '/dashboard',
  userName,
  userEmail,
  userAvatar
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
        className="lg:ml-[240px]"
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          flex: 1, 
          marginLeft: '240px',
        }}
      >
        {/* Header */}
        {userName && (
          <DashboardHeader
            userName={userName}
            userAvatar={userAvatar}
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

