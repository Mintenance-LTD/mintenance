'use client';

import React, { ReactNode } from 'react';

interface HomeownerPageWrapperProps {
  children: ReactNode;
  className?: string;
}

/**
 * Universal wrapper for homeowner pages.
 * Prevents layout conflicts by ensuring pages don't create their own sidebar.
 * The parent HomeownerLayoutShell already provides UnifiedSidebar and layout structure.
 */
export function HomeownerPageWrapper({ children, className = '' }: HomeownerPageWrapperProps) {
  return (
    <div className={`w-full px-8 ${className}`}>
      {children}
    </div>
  );
}
