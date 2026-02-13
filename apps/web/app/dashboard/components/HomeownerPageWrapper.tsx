import React, { ReactNode } from 'react';

interface HomeownerPageWrapperProps {
  children: ReactNode;
  className?: string;
}

/**
 * Universal wrapper for homeowner pages.
 * Prevents layout conflicts by keeping consistent page spacing.
 * The parent HomeownerLayoutShell provides the shared homeowner header/layout.
 */
export function HomeownerPageWrapper({ children, className = '' }: HomeownerPageWrapperProps) {
  return (
    <div className={`w-full px-8 ${className}`}>
      {children}
    </div>
  );
}
