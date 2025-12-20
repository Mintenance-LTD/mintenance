'use client';

import React, { ReactNode } from 'react';

interface ContractorPageWrapperProps {
  children: ReactNode;
  className?: string;
}

/**
 * ContractorPageWrapper - Universal wrapper for ALL contractor pages
 *
 * IMPORTANT: ALL contractor page client components MUST use this wrapper
 * to prevent layout conflicts and white gap issues.
 *
 * DO NOT:
 * - Import UnifiedSidebar in page components
 * - Use min-h-screen classes
 * - Create custom flex layouts
 * - Set custom max-widths (handled by ContractorLayoutShell)
 *
 * The ContractorLayoutShell already provides:
 * - Sidebar navigation
 * - Header with search and actions
 * - Centered content (max-width: 1280px)
 * - Proper spacing and padding
 *
 * @example
 * ```tsx
 * export function MyPageClient() {
 *   return (
 *     <ContractorPageWrapper>
 *       <h1>Page Title</h1>
 *       <div className="space-y-6">
 *         {content}
 *       </div>
 *     </ContractorPageWrapper>
 *   );
 * }
 * ```
 */
export function ContractorPageWrapper({ children, className = '' }: ContractorPageWrapperProps) {
  return (
    <div className={`w-full ${className}`}>
      {children}
    </div>
  );
}
