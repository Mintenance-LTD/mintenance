const loggerEnhanced = require('../logger-enhanced');
const logger = loggerEnhanced.default || loggerEnhanced.logger;

// NOTE: commit 867632aa5 ("strip ~1,000 unused type and export declarations,
// knip --fix") removed the `export` keyword from the per-event helper functions
// (logNavigation, logAuth, createScreenLogger, etc.) because no module imported
// them. The functions still exist internally; only `logger`, the default export,
// and `logMedia` remain part of the public surface. These assertions track that
// current surface rather than the pre-knip one.

describe('logger-enhanced', () => {
  it('exports a usable logger instance with the standard level methods', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('exposes the default export and named logger export as the same instance', () => {
    expect(loggerEnhanced.default).toBe(loggerEnhanced.logger);
  });

  it('exports the logMedia helper', () => {
    expect(typeof loggerEnhanced.logMedia).toBe('function');
  });

  it('logMedia delegates to the logger without throwing', () => {
    expect(() =>
      loggerEnhanced.logMedia('capture', 'photo', true, { source: 'camera' })
    ).not.toThrow();
  });
});
