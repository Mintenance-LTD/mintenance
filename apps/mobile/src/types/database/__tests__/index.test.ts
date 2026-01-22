describe('__tests__ module exports', () => {
  it('exports an object safely', () => {
    const moduleExports = require('../index');
    expect(moduleExports).toBeDefined();
    expect(typeof moduleExports).toBe('object');
  });

  it('allows consuming defined exports', () => {
    const moduleExports = require('../index');
    Object.entries(moduleExports).forEach(([key, value]) => {
      expect(value).toBeDefined();
      const valueType = typeof value;
      expect(
        ['function', 'object', 'string', 'number', 'boolean'].includes(valueType)
      ).toBe(true);
    });
  });
});
