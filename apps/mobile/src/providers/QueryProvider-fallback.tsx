import React, { ReactNode } from 'react';
import { logger } from '../utils/logger';

interface QueryProviderProps {
  children: ReactNode;
}

// Simple fallback query provider that just passes through children
const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  logger.debug('Using fallback QueryProvider (React Query not available)');

  return <>{children}</>;
};

export default QueryProvider;
