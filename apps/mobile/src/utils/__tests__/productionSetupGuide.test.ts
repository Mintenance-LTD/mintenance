import {
  initializeProductionSystems,
  validateDeploymentReadiness,
} from '../productionSetupGuide';

jest.mock('../productionReadinessOrchestrator', () => ({
  productionReadinessOrchestrator: {
    initialize: jest.fn(() => Promise.resolve()),
    createDeploymentReport: jest.fn(() =>
      Promise.resolve({
        deploymentApproved: true,
        blockers: [],
        readinessCheck: { score: 95 },
        deploymentId: 'deploy-1',
      })
    ),
  },
}));

jest.mock('../security', () => ({
  securityAuditService: {
    runSecurityAudit: jest.fn(() => Promise.resolve({ summary: {} })),
    runTestSuite: jest.fn(() => Promise.resolve({})),
    getLatestAuditReport: jest.fn(() => null),
  },
}));

jest.mock('../performanceMonitor', () => ({
  performanceMonitor: {
    recordStartupTime: jest.fn(),
    recordMemoryUsage: jest.fn(),
  },
}));

// Source imports the directory-explicit module id `./errorTracking/index`,
// so the mock must target that exact specifier — `../errorTracking` is a
// different module id to jest and would not intercept the real (Sentry-backed)
// module, which crashes at import time.
jest.mock('../errorTracking/index', () => ({
  enhancedErrorAnalytics: {
    getErrorAnalytics: jest.fn(() => ({})),
  },
}));

jest.mock('../monitoringAndAlerting', () => ({
  monitoringAndAlerting: {
    initialize: jest.fn(() => Promise.resolve()),
  },
}));

// Source imports `WebOptimizationsManager` (aliased to WebOptimizations).
jest.mock('../webOptimizations/', () => ({
  WebOptimizationsManager: {
    initialize: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('productionSetupGuide', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports initialization helpers', async () => {
    expect(typeof initializeProductionSystems).toBe('function');
    expect(typeof validateDeploymentReadiness).toBe('function');
  });
});
