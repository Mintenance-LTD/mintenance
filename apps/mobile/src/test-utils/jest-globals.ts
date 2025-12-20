// Jest globals for test utilities
export const createStub = () => {
  // Use global.jest if available (in test environment), otherwise return a no-op function
  if (typeof global !== 'undefined' && global.jest?.fn) {
    return global.jest.fn();
  }
  return () => {};
};