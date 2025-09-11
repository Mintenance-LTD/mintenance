import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from '../../contexts/AuthContext';

interface Props {
  children: React.ReactNode;
}

// Simple provider wrapper for screen tests
export const Providers: React.FC<Props> = ({ children }) => {
  return (
    <AuthProvider>
      <NavigationContainer>{children}</NavigationContainer>
    </AuthProvider>
  );
};

export const renderWithProviders = (ui: React.ReactElement, renderFn: any) => {
  return renderFn(<Providers>{ui}</Providers>);
};

export default Providers;
