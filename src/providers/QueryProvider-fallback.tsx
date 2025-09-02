import React, { ReactNode } from 'react';

interface QueryProviderProps {
  children: ReactNode;
}

// Simple fallback query provider that just passes through children
const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  console.log('Using fallback QueryProvider (React Query not available)');
  
  return (
    <>
      {children}
    </>
  );
};

export default QueryProvider;