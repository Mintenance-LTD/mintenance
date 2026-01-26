import { renderHook, act } from '@testing-library/react-native';
import { renderHook, act } from '@testing-library/react';
import useFinanceDashboard from '../useFinanceDashboard';


// Mock dependencies
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

describe('useFinanceDashboard', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useFinanceDashboard());
    expect(result.current).toBeDefined();
  });

  it('should handle updates correctly', () => {
    const { result } = renderHook(() => useFinanceDashboard());
    // Add specific test logic based on hook functionality
  });

  it('should clean up on unmount', () => {
    const { result, unmount } = renderHook(() => useFinanceDashboard());
    unmount();
    // Verify cleanup
  });
});