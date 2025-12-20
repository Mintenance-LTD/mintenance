import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../contexts/AuthContext';

// Create a new QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });

interface Props {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

// Provider wrapper with QueryClient for screen tests
export const Providers: React.FC<Props> = ({ 
  children, 
  queryClient = createTestQueryClient() 
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NavigationContainer>{children}</NavigationContainer>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export const renderWithProviders = (ui: React.ReactElement, renderFn?: any) => {
  const queryClient = createTestQueryClient();
  
  if (renderFn) {
    return renderFn(<Providers queryClient={queryClient}>{ui}</Providers>);
  }
  
  return render(ui, {
    wrapper: ({ children }) => (
      <Providers queryClient={queryClient}>{children}</Providers>
    ),
  });
};

export default Providers;

// Dummy test to prevent Jest from complaining about no tests
describe('RenderWithProviders', () => {
  it('should export providers and render function', () => {
    expect(Providers).toBeDefined();
    expect(renderWithProviders).toBeDefined();
  });
});
