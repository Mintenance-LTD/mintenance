jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

describe('__tests__ module exports', () => {
  it('should export expected modules', () => {
    const moduleExports = require('../index');
    expect(moduleExports).toBeDefined();

    // Verify the module exports something
    const exportKeys = Object.keys(moduleExports);
    expect(exportKeys.length).toBeGreaterThan(0);
  });

  it('should export valid functions or objects', () => {
    const moduleExports = require('../index');

    // Check that exports are valid types
    Object.entries(moduleExports).forEach(([key, value]) => {
      expect(value).toBeDefined();
      // Each export should be a function, object, or class
      const valueType = typeof value;
      expect(['function', 'object', 'string', 'number', 'boolean'].includes(valueType)).toBeTruthy();
    });
  });
});