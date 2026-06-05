describe('lazy components module exports', () => {
  it('should export expected modules', () => {
    const moduleExports = require('../VideoCallService');
    expect(moduleExports).toBeDefined();

    // Verify the module exports something
    const exportKeys = Object.keys(moduleExports);
    expect(exportKeys.length).toBeGreaterThan(0);
  });

  it('should export the lazy VideoCallService wrapper', () => {
    const moduleExports = require('../VideoCallService');
    expect(moduleExports.VideoCallService).toBeDefined();
    expect(typeof moduleExports.VideoCallService).toBe('function');
  });

  it('should export valid functions or objects', () => {
    const moduleExports = require('../VideoCallService');

    // Check that exports are valid types
    Object.entries(moduleExports).forEach(([, value]) => {
      expect(value).toBeDefined();
      // Each export should be a function, object, or class
      const valueType = typeof value;
      expect(
        ['function', 'object', 'string', 'number', 'boolean'].includes(
          valueType
        )
      ).toBeTruthy();
    });
  });
});
