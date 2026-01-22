describe('ml-engine/analysis exports', () => {
  it('exports a module', () => {
    const moduleExports = require('../index');
    expect(moduleExports).toBeDefined();
  });
});
