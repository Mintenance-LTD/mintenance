import React, { ReactElement } from 'react';
import {
  render as rtlRender,
  RenderOptions,
} from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock providers for testing - avoid importing real providers to prevent circular dependencies
const MockProviders: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Provide minimal context values for testing
  const mockAuthValue = {
    user: null,
    signIn: jest.fn(),
    signOut: jest.fn(),
    loading: false,
  };

  const mockThemeValue = {
    theme: 'light',
    toggleTheme: jest.fn(),
  };

  // Use React context directly to avoid imports
  const AuthContext = React.createContext(mockAuthValue);
  const ThemeContext = React.createContext(mockThemeValue);

  // Real QueryClientProvider (retries off, per-render instance) — the app
  // wraps everything in one, and screens now reach useQueryClient() through
  // PhoneVerificationBanner, so renders without it throw "No QueryClient set".
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={mockAuthValue}>
        <ThemeContext.Provider value={mockThemeValue}>
          {children}
        </ThemeContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => rtlRender(ui, { wrapper: MockProviders, ...options });

// re-export everything
export * from '@testing-library/react-native';

// override render method
export { customRender as render };

// Helper to wrap a component for testing
export const renderWithProviders = (component: ReactElement) => {
  return customRender(component);
};

// Mock user for auth context
export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User',
    role: 'homeowner' as const,
  },
};

// Mock navigation prop
export const createMockNavigation = () => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  dispatch: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => false),
  getParent: jest.fn(() => null),
  getState: jest.fn(() => ({ routes: [], index: 0 })),
});

// Mock route prop
export const createMockRoute = (params = {}) => ({
  key: 'test-key',
  name: 'TestScreen',
  params,
});

// Export mock providers for direct use
export const MockAuthProvider = MockProviders;
export const MockThemeProvider = MockProviders;

describe('test-utils', () => {
  it('exports render helpers', () => {
    expect(typeof customRender).toBe('function');
    expect(typeof renderWithProviders).toBe('function');
  });
});
