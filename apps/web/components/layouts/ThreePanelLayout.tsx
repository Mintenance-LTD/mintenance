'use client';

import React from 'react';
import { designSystem } from '@/lib/design-system';

interface ThreePanelLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  detailPanel?: React.ReactNode;
  header?: React.ReactNode;
}

export function ThreePanelLayout({ 
  children, 
  sidebar, 
  detailPanel, 
  header 
}: ThreePanelLayoutProps) {
  return (
    <div style={designSystem.layouts.threePanel.container}>
      {/* Left Sidebar */}
      {sidebar && (
        <div style={designSystem.layouts.threePanel.sidebar}>
          {sidebar}
        </div>
      )}

      {/* Main Content Area */}
      <div style={designSystem.layouts.threePanel.mainContent}>
        {/* Header */}
        {header && (
          <div style={{
            backgroundColor: 'white',
            borderBottom: '1px solid #e2e8f0',
            padding: '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            {header}
          </div>
        )}

        {/* Content */}
        <div style={designSystem.layouts.threePanel.contentArea}>
          {children}
        </div>
      </div>

      {/* Right Detail Panel */}
      {detailPanel && (
        <div style={designSystem.layouts.threePanel.detailPanel}>
          {detailPanel}
        </div>
      )}
    </div>
  );
}
