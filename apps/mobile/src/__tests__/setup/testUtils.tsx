/**
 * Test Utilities
 *
 * Common utilities and helpers for testing React Native components
 */

import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContextProvider } from '../../contexts/AuthContext-fallback';

// Create a custom render function that includes providers
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContextProvider>
        {children}
      </AuthContextProvider>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react-native';
export { customRender as render };

// Mock data factories
export const createMockUser = (overrides = {}) => ({
  id: '1',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  role: 'homeowner',
  phone: '123-456-7890',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  ...overrides,
});

export const createMockJob = (overrides = {}) => ({
  id: '1',
  title: 'Test Job',
  description: 'Test job description',
  location: 'Test Location',
  homeowner_id: '1',
  contractor_id: null,
  status: 'posted',
  budget: 1000,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  ...overrides,
});

export const createMockBid = (overrides = {}) => ({
  id: '1',
  job_id: '1',
  contractor_id: '2',
  amount: 500,
  description: 'Test bid description',
  status: 'pending',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  ...overrides,
});

export const createMockMessage = (overrides = {}) => ({
  id: '1',
  job_id: '1',
  sender_id: '1',
  receiver_id: '2',
  content: 'Test message',
  messageType: 'text' as const,
  created_at: '2023-01-01T00:00:00Z',
  ...overrides,
});

export const createMockContractorProfile = (overrides = {}) => ({
  user_id: '1',
  bio: 'Test contractor bio',
  skills: ['plumbing', 'electrical'],
  hourly_rate: 50,
  availability: 'full-time',
  rating: 4.5,
  completed_jobs: 10,
  ...overrides,
});

// Test helper functions
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

export const mockAuthState = (isAuthenticated = true, user = null) => {
  return {
    isAuthenticated,
    user: user || (isAuthenticated ? createMockUser() : null),
    login: jest.fn(() => Promise.resolve()),
    logout: jest.fn(() => Promise.resolve()),
    register: jest.fn(() => Promise.resolve()),
    loading: false,
  };
};

// Service mock helpers
export const createMockService = (methods: Record<string, any>) => {
  const service: any = {};
  Object.entries(methods).forEach(([method, returnValue]) => {
    if (typeof returnValue === 'function') {
      service[method] = returnValue;
    } else {
      service[method] = jest.fn(() => Promise.resolve(returnValue));
    }
  });
  return service;
};

// Error boundary test helper
export const TestErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    const errorHandler = (error: ErrorEvent) => {
      setHasError(true);
    };

    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  if (hasError) {
    return <div>Error occurred</div>;
  }

  return <>{children}</>;
};

// Navigation mock helpers
export const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  dispatch: jest.fn(),
  setParams: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  canGoBack: jest.fn(() => true),
  dangerouslyGetParent: jest.fn(),
  dangerouslyGetState: jest.fn(),
  isFocused: jest.fn(() => true),
  push: jest.fn(),
  replace: jest.fn(),
  pop: jest.fn(),
  popToTop: jest.fn(),
  reset: jest.fn(),
  setOptions: jest.fn(),
};

export const mockRoute = {
  key: 'test',
  name: 'Test',
  params: {},
};

// Async test utilities
export const flushPromises = () => new Promise(resolve => setImmediate(resolve));

export const advanceTimersByTime = (ms: number) => {
  jest.advanceTimersByTime(ms);
  return flushPromises();
};

// Mock implementations for common hooks
export const mockUseNetworkState = (isConnected = true) => ({
  isConnected,
  isInternetReachable: isConnected,
  type: isConnected ? 'wifi' : 'none',
});

export const mockUseAuth = (overrides = {}) => ({
  user: createMockUser(),
  isAuthenticated: true,
  loading: false,
  login: jest.fn(() => Promise.resolve()),
  logout: jest.fn(() => Promise.resolve()),
  register: jest.fn(() => Promise.resolve()),
  ...overrides,
});

// Form testing utilities
export const fillForm = async (form: any, data: Record<string, string>) => {
  const { fireEvent } = await import('@testing-library/react-native');

  for (const [field, value] of Object.entries(data)) {
    const input = form.getByTestId(field) || form.getByPlaceholderText(field);
    fireEvent.changeText(input, value);
  }
};

export const submitForm = async (form: any) => {
  const { fireEvent } = await import('@testing-library/react-native');
  const submitButton = form.getByRole('button') || form.getByTestId('submit');
  fireEvent.press(submitButton);
  return flushPromises();
};

// Cleanup utilities
export const resetAllMocks = () => {
  jest.clearAllMocks();
  jest.clearAllTimers();
};

// Performance testing utilities
export const measureRenderTime = async (Component: React.ComponentType) => {
  const start = performance.now();
  render(React.createElement(Component));
  await waitForAsync();
  const end = performance.now();
  return end - start;
};