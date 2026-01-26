describe('ml-engine/core exports', () => {
  it('exports a module', () => {
    const moduleExports = require('../index');
    expect(moduleExports).toBeDefined();
  });
});
