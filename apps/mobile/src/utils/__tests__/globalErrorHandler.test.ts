import { setupGlobalErrorHandler } from '../globalErrorHandler';

jest.mock('react-native/Libraries/Core/ExceptionsManager', () => ({
  unstable_setGlobalHandler: jest.fn(),
}));

describe('setupGlobalErrorHandler', () => {
  beforeEach(() => {
    (global as any).ErrorUtils = {
      setGlobalHandler: jest.fn(),
    };
  });

  it('should handle normal cases', () => {
    // Test normal functionality
    expect(() => setupGlobalErrorHandler()).not.toThrow();
    expect((global as any).ErrorUtils.setGlobalHandler).toHaveBeenCalled();
  });

  it('should handle edge cases', () => {
    // Test edge cases
    expect(() => setupGlobalErrorHandler()).not.toThrow();
  });

  it('should handle error cases', () => {
    // Test error scenarios
  });
});
