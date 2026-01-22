const loggerEnhanced = require('../logger-enhanced');
const logger = loggerEnhanced.default || loggerEnhanced.logger;
const {
  createScreenLogger,
  createServiceLogger,
  logNavigation,
  logScreenView,
  logInteraction,
  logApiCall,
  logPerformance,
  logStorage,
  logPermission,
  logNotification,
  logAuth,
  logConnectivity,
  logMedia,
  logPayment,
  logCrash,
  initializeCrashReporting,
  logSessionStart,
  logSessionEnd,
  cleanup,
} = loggerEnhanced;

describe('logger-enhanced', () => {
  it('exports a logger instance and helper functions', () => {
    expect(logger).toBeDefined();
    expect(typeof logNavigation).toBe('function');
    expect(typeof logScreenView).toBe('function');
    expect(typeof logInteraction).toBe('function');
    expect(typeof logApiCall).toBe('function');
    expect(typeof logPerformance).toBe('function');
    expect(typeof logStorage).toBe('function');
    expect(typeof logPermission).toBe('function');
    expect(typeof logNotification).toBe('function');
    expect(typeof logAuth).toBe('function');
    expect(typeof logConnectivity).toBe('function');
    expect(typeof logMedia).toBe('function');
    expect(typeof logPayment).toBe('function');
    expect(typeof logCrash).toBe('function');
    expect(typeof initializeCrashReporting).toBe('function');
    expect(typeof logSessionStart).toBe('function');
    expect(typeof logSessionEnd).toBe('function');
    expect(typeof cleanup).toBe('function');
  });

  it('creates scoped loggers', () => {
    const screenLogger = createScreenLogger('Home');
    const serviceLogger = createServiceLogger('Payments');

    expect(screenLogger).toBeDefined();
    expect(serviceLogger).toBeDefined();
  });
});
