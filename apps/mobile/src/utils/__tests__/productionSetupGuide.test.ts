jest.mock('../productionReadinessOrchestrator', () => ({
  productionReadinessOrchestrator: {
    initialize: jest.fn(() => Promise.resolve()),
    createDeploymentReport: jest.fn(() => Promise.resolve({
      deploymentApproved: true,
      blockers: [],
      readinessCheck: { score: 95 },
      deploymentId: 'deploy-1',
    })),
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

jest.mock('../errorTracking', () => ({
  enhancedErrorAnalytics: {
    getErrorAnalytics: jest.fn(() => ({})),
  },
}));

jest.mock('../monitoringAndAlerting', () => ({
  monitoringAndAlerting: {
    initialize: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../webOptimizations/', () => ({
  WebOptimizations: {
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

import {
  initializeProductionSystems,
  validateDeploymentReadiness,
} from '../productionSetupGuide';

describe('productionSetupGuide', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports initialization helpers', async () => {
    expect(typeof initializeProductionSystems).toBe('function');
    expect(typeof validateDeploymentReadiness).toBe('function');
  });
});
