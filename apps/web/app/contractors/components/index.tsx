'use client';

import React from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ContractorsBrowseClient as ContractorsBrowseClientBase } from './ContractorsBrowseClient';

/**
 * Contractors Browse Client with Error Boundary
 *
 * Wraps the ContractorsBrowseClient component with an ErrorBoundary
 * to catch and handle any runtime errors gracefully
 */
export function ContractorsBrowseClient(props: React.ComponentProps<typeof ContractorsBrowseClientBase>) {
  return (
    <ErrorBoundary>
      <ContractorsBrowseClientBase {...props} />
    </ErrorBoundary>
  );
}
