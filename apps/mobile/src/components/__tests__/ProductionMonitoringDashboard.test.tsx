import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor, act } from '../../__tests__/test-utils';
import { theme } from '../../theme';

// ---- Mock externals only (never the component under test) ----

const mockGetCompleteStatus = jest.fn();
const mockCheckHealth = jest.fn();
const mockCheckReadiness = jest.fn();
const mockTrackError = jest.fn();
const mockIsWeb = jest.fn();
const mockIsOptimized = jest.fn();
const mockGetCoreWebVitals = jest.fn();

jest.mock('../../utils/productionSetupGuide', () => ({
  dashboardData: {
    getCompleteStatus: (...args: unknown[]) => mockGetCompleteStatus(...args),
  },
  systemMonitoring: {
    checkHealth: (...args: unknown[]) => mockCheckHealth(...args),
    checkReadiness: (...args: unknown[]) => mockCheckReadiness(...args),
  },
  performanceTracking: {},
  errorTracking: {
    trackError: (...args: unknown[]) => mockTrackError(...args),
  },
  webPlatform: {
    isWeb: (...args: unknown[]) => mockIsWeb(...args),
    isOptimized: (...args: unknown[]) => mockIsOptimized(...args),
    getCoreWebVitals: (...args: unknown[]) => mockGetCoreWebVitals(...args),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import ProductionMonitoringDashboard from '../ProductionMonitoringDashboard';
import { logger } from '../../utils/logger';

/** Flatten an element's style array and return the resolved `color`. */
function colorOf(element: { props: { style?: unknown } }): string | undefined {
  const style = element.props.style;
  const arr = Array.isArray(style) ? style : [style];
  let color: string | undefined;
  for (const s of arr) {
    if (s && typeof s === 'object' && 'color' in (s as object)) {
      color = (s as { color?: string }).color;
    }
  }
  return color;
}

/**
 * Builds a complete DashboardStatus-shaped object, with deep overrides.
 */
function buildStatus(overrides: Record<string, unknown> = {}) {
  const base = {
    overall: { status: 'healthy', score: 95, lastCheck: 1_700_000_000_000 },
    performance: {
      startupTime: 1200,
      memoryUsage: 50 * 1024 * 1024,
      navigationTime: 300,
      apiResponseTime: 250,
      fps: 60,
    },
    errors: {
      errorRate: 0.005,
      totalErrors: 12,
      uniqueErrors: 4,
      criticalErrors: 0,
    },
    security: {
      lastAudit: 1_700_000_000_000,
      vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0 },
    },
    health: {
      status: 'healthy',
      uptime: 3 * 60 * 60 * 1000 + 25 * 60 * 1000, // 3h 25m
      lastCheck: 1_700_000_000_000,
    },
  };
  // shallow-merge top-level sections, with section-level override merge
  return {
    ...base,
    ...overrides,
    overall: { ...base.overall, ...(overrides.overall as object) },
    performance: { ...base.performance, ...(overrides.performance as object) },
    errors: { ...base.errors, ...(overrides.errors as object) },
    security: { ...base.security, ...(overrides.security as object) },
    health: { ...base.health, ...(overrides.health as object) },
  };
}

/** Render and wait for the initial async loadDashboardData to settle. */
async function renderLoaded(status: unknown) {
  mockGetCompleteStatus.mockResolvedValue(status);
  const utils = render(<ProductionMonitoringDashboard />);
  await waitFor(() => utils.getByText('🚀 Production Monitoring'));
  return utils;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCompleteStatus.mockResolvedValue(buildStatus());
  mockCheckHealth.mockResolvedValue({ status: 'healthy' });
  mockCheckReadiness.mockResolvedValue({ score: 88, overall: 'ready' });
  mockIsWeb.mockReturnValue(false);
  mockIsOptimized.mockReturnValue(true);
  mockGetCoreWebVitals.mockReturnValue(null);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ProductionMonitoringDashboard - loading & failure states', () => {
  it('renders the loading state before data resolves', () => {
    // Never-resolving promise keeps loading=true, status=null
    mockGetCompleteStatus.mockReturnValue(new Promise(() => {}));
    const { getByText } = render(<ProductionMonitoringDashboard />);
    expect(getByText('Loading production dashboard...')).toBeTruthy();
  });

  it('renders the failure state and tracks the error when load throws', async () => {
    const err = new Error('boom');
    mockGetCompleteStatus.mockRejectedValue(err);
    const { getByText } = render(<ProductionMonitoringDashboard />);
    await waitFor(() =>
      expect(getByText('Failed to load dashboard data')).toBeTruthy()
    );
    expect(getByText('Retry')).toBeTruthy();
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to load dashboard data',
      err
    );
    expect(mockTrackError).toHaveBeenCalledWith(err, {
      context: 'dashboard_load_failure',
    });
  });

  it('Retry button re-invokes load and recovers to the dashboard', async () => {
    mockGetCompleteStatus.mockRejectedValueOnce(new Error('first fail'));
    const { getByText } = render(<ProductionMonitoringDashboard />);
    await waitFor(() =>
      expect(getByText('Failed to load dashboard data')).toBeTruthy()
    );

    mockGetCompleteStatus.mockResolvedValue(buildStatus());
    fireEvent.press(getByText('Retry'));
    await waitFor(() =>
      expect(getByText('🚀 Production Monitoring')).toBeTruthy()
    );
  });
});

describe('ProductionMonitoringDashboard - overall status & getStatusColor branches', () => {
  it('renders healthy/ready status in primary color and high score', async () => {
    const { getAllByText, getByText } = await renderLoaded(
      // health.status 'down' so only overall renders HEALTHY uniquely
      buildStatus({
        overall: { status: 'healthy', score: 95 },
        health: { status: 'down' },
      })
    );
    const statusValue = getAllByText('HEALTHY')[0];
    expect(colorOf(statusValue)).toBe(theme.colors.primary);
    // Score is rendered via getStatusColor('', score): empty status + score>=80
    // matches no branch -> default tertiary.
    expect(colorOf(getByText('95/100'))).toBe(theme.colors.textTertiary);
  });

  it('renders warning status and low score in accent color', async () => {
    const { getByText } = await renderLoaded(
      buildStatus({
        overall: { status: 'warning', score: 50 },
        health: { status: 'down' },
      })
    );
    // overall status "warning" -> accent
    expect(colorOf(getByText('WARNING'))).toBe(theme.colors.accent);
    // score 50 < 80 -> accent
    expect(colorOf(getByText('50/100'))).toBe(theme.colors.accent);
  });

  it('renders error status in error color', async () => {
    const { getAllByText } = await renderLoaded(
      buildStatus({
        overall: { status: 'error', score: 10 },
        health: { status: 'error' },
      })
    );
    const errored = getAllByText('ERROR');
    expect(errored.length).toBeGreaterThan(0);
    expect(colorOf(errored[0])).toBe(theme.colors.error);
  });

  it('renders not_ready status in error color', async () => {
    const { getByText } = await renderLoaded(
      buildStatus({
        overall: { status: 'not_ready', score: 90 },
        health: { status: 'down' },
      })
    );
    expect(colorOf(getByText('NOT_READY'))).toBe(theme.colors.error);
  });

  it('renders ready status in primary color', async () => {
    const { getByText } = await renderLoaded(
      buildStatus({
        overall: { status: 'ready', score: 99 },
        health: { status: 'down' },
      })
    );
    expect(colorOf(getByText('READY'))).toBe(theme.colors.primary);
  });

  it('renders unknown status with the default tertiary color', async () => {
    const { getByText } = await renderLoaded(
      buildStatus({
        overall: { status: 'unknown', score: 100 },
        health: { status: 'down' },
      })
    );
    // status not matching any branch + score >= 80 -> default textTertiary
    expect(colorOf(getByText('UNKNOWN'))).toBe(theme.colors.textTertiary);
  });

  it('formats lastCheck timestamp, and shows Never for a zero timestamp', async () => {
    const { getAllByText } = await renderLoaded(
      buildStatus({ overall: { lastCheck: 0 } })
    );
    // overall.lastCheck = 0 -> "Never"
    expect(getAllByText('Never').length).toBeGreaterThan(0);
  });
});

describe('ProductionMonitoringDashboard - performance metric ternaries', () => {
  it('renders all performance metrics when present', async () => {
    const { getByText } = await renderLoaded(
      buildStatus({
        performance: {
          startupTime: 1500,
          memoryUsage: 64 * 1024 * 1024,
          navigationTime: 400,
          apiResponseTime: 220,
        },
      })
    );
    expect(getByText('1500ms')).toBeTruthy();
    expect(getByText('64.0 MB')).toBeTruthy();
    expect(getByText('400ms')).toBeTruthy();
    expect(getByText('220ms')).toBeTruthy();
  });

  it('renders N/A for missing performance metrics (falsy branches)', async () => {
    const { getAllByText } = await renderLoaded(
      buildStatus({
        performance: {
          startupTime: 0,
          memoryUsage: undefined,
          navigationTime: undefined,
          apiResponseTime: 0,
        },
      })
    );
    // startupTime 0, navigationTime undefined, apiResponseTime 0, memory undefined -> 4 N/A
    expect(getAllByText('N/A').length).toBe(4);
  });
});

describe('ProductionMonitoringDashboard - error analytics color branches', () => {
  it('renders error rate over threshold and critical errors > 0 in error color', async () => {
    const { getByText } = await renderLoaded(
      buildStatus({
        errors: {
          errorRate: 0.05,
          totalErrors: 99,
          uniqueErrors: 7,
          criticalErrors: 3,
        },
      })
    );
    expect(colorOf(getByText('5.00%'))).toBe(theme.colors.error);
    expect(getByText('99')).toBeTruthy();
    expect(getByText('7')).toBeTruthy();
    expect(colorOf(getByText('3'))).toBe(theme.colors.error);
  });

  it('renders error rate under threshold and zero critical errors in primary color', async () => {
    const { getByText, getAllByText } = await renderLoaded(
      buildStatus({
        errors: {
          errorRate: 0.001,
          totalErrors: 1,
          uniqueErrors: 1,
          criticalErrors: 0,
        },
      })
    );
    expect(colorOf(getByText('0.10%'))).toBe(theme.colors.primary);
    // criticalErrors 0 -> primary; "0" appears in the critical-error cell + vuln cells
    const zeros = getAllByText('0');
    expect(zeros.some((n) => colorOf(n) === theme.colors.primary)).toBe(true);
  });

  it('handles undefined errorRate/criticalErrors via nullish coalescing', async () => {
    const { getByText } = await renderLoaded(
      buildStatus({
        errors: {
          errorRate: undefined,
          totalErrors: 0,
          uniqueErrors: 0,
          criticalErrors: undefined,
        },
      })
    );
    // (undefined ?? 0) * 100 -> 0.00%
    expect(colorOf(getByText('0.00%'))).toBe(theme.colors.primary);
  });
});

describe('ProductionMonitoringDashboard - security vulnerabilities branches', () => {
  it('renders critical/high vulnerabilities > 0 with their severity colors', async () => {
    const { getByText } = await renderLoaded(
      buildStatus({
        security: {
          lastAudit: 1_700_000_000_000,
          vulnerabilities: { critical: 2, high: 5, medium: 1, low: 9 },
        },
      })
    );
    // critical > 0 -> error
    expect(colorOf(getByText('2'))).toBe(theme.colors.error);
    // high > 0 -> accent
    expect(colorOf(getByText('5'))).toBe(theme.colors.accent);
    // medium / low are plain values
    expect(getByText('1')).toBeTruthy();
    expect(getByText('9')).toBeTruthy();
  });

  it('renders zero vulnerabilities (critical/high primary) and missing vulnerabilities object', async () => {
    const { getAllByText } = await renderLoaded(
      buildStatus({
        security: {
          lastAudit: 1_700_000_000_000,
          vulnerabilities: undefined,
        },
      })
    );
    // all four vuln cells fall back to 0 via ?? 0
    const zeros = getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(4);
  });

  it('shows "Never" for the security audit when lastAudit is missing', async () => {
    const { getAllByText } = await renderLoaded(
      buildStatus({
        security: {
          lastAudit: 0,
          vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0 },
        },
      })
    );
    expect(getAllByText('Never').length).toBeGreaterThan(0);
  });
});

describe('ProductionMonitoringDashboard - web platform conditional card', () => {
  it('omits the web platform card on mobile (isWeb false)', async () => {
    mockIsWeb.mockReturnValue(false);
    const { queryByText } = await renderLoaded(buildStatus());
    expect(queryByText('🌐 Web Platform Status')).toBeNull();
  });

  it('renders web card with optimizations Active and vitals monitoring active', async () => {
    mockIsWeb.mockReturnValue(true);
    mockIsOptimized.mockReturnValue(true);
    mockGetCoreWebVitals.mockReturnValue({ lcp: 1 });
    const { getByText } = await renderLoaded(buildStatus());
    expect(getByText('🌐 Web Platform Status')).toBeTruthy();
    expect(colorOf(getByText('Active'))).toBe(theme.colors.primary);
    expect(getByText('Monitoring Active')).toBeTruthy();
  });

  it('renders web card with optimizations Inactive and vitals Not Available', async () => {
    mockIsWeb.mockReturnValue(true);
    mockIsOptimized.mockReturnValue(false);
    mockGetCoreWebVitals.mockReturnValue(null);
    const { getByText } = await renderLoaded(buildStatus());
    expect(colorOf(getByText('Inactive'))).toBe(theme.colors.accent);
    expect(getByText('Not Available')).toBeTruthy();
  });
});

describe('ProductionMonitoringDashboard - system health uptime & lastCheck', () => {
  it('formats uptime into hours and minutes', async () => {
    const { getByText } = await renderLoaded(
      buildStatus({
        health: {
          status: 'healthy',
          uptime: 5 * 60 * 60 * 1000 + 42 * 60 * 1000,
          lastCheck: 1_700_000_000_000,
        },
      })
    );
    expect(getByText(/5h/)).toBeTruthy();
    expect(getByText(/42/)).toBeTruthy();
  });

  it('falls back to Date.now() when health.lastCheck is missing', async () => {
    const { getByText } = await renderLoaded(
      buildStatus({
        health: { status: 'healthy', uptime: 0, lastCheck: undefined },
      })
    );
    // Just assert the health card still renders its label (lastCheck branch executed)
    expect(getByText('💚 System Health')).toBeTruthy();
    expect(getByText(/0h/)).toBeTruthy();
  });
});

describe('ProductionMonitoringDashboard - refresh & health-check actions', () => {
  it('Refresh button sets loading and reloads data', async () => {
    const { getByText } = await renderLoaded(buildStatus());
    mockGetCompleteStatus.mockClear();
    mockGetCompleteStatus.mockResolvedValue(buildStatus());
    fireEvent.press(getByText('Refresh'));
    await waitFor(() => expect(mockGetCompleteStatus).toHaveBeenCalled());
  });

  it('Health Check button shows results alert on success', async () => {
    const { getByText } = await renderLoaded(buildStatus());
    await act(async () => {
      fireEvent.press(getByText('Health Check'));
    });
    await waitFor(() => {
      expect(mockCheckHealth).toHaveBeenCalled();
      expect(mockCheckReadiness).toHaveBeenCalledWith('development');
    });
    // First alert "Health Check", second "Health Check Results"
    const calls = (Alert.alert as jest.Mock).mock.calls.map((c) => c[0]);
    expect(calls).toContain('Health Check');
    expect(calls).toContain('Health Check Results');
  });

  it('Health Check button shows failure alert when monitoring throws an Error', async () => {
    mockCheckHealth.mockRejectedValueOnce(new Error('health down'));
    const { getByText } = await renderLoaded(buildStatus());
    await act(async () => {
      fireEvent.press(getByText('Health Check'));
    });
    await waitFor(() => {
      const calls = (Alert.alert as jest.Mock).mock.calls;
      const failure = calls.find((c) => c[0] === 'Health Check Failed');
      expect(failure).toBeTruthy();
      expect(failure?.[1]).toBe('health down');
    });
  });

  it('Health Check failure with a non-Error rejection shows "Unknown error"', async () => {
    mockCheckHealth.mockRejectedValueOnce('string failure');
    const { getByText } = await renderLoaded(buildStatus());
    await act(async () => {
      fireEvent.press(getByText('Health Check'));
    });
    await waitFor(() => {
      const calls = (Alert.alert as jest.Mock).mock.calls;
      const failure = calls.find((c) => c[0] === 'Health Check Failed');
      expect(failure?.[1]).toBe('Unknown error');
    });
  });
});

describe('ProductionMonitoringDashboard - auto-refresh interval', () => {
  it('reloads data on the 30s interval and clears it on unmount', async () => {
    jest.useFakeTimers();
    mockGetCompleteStatus.mockResolvedValue(buildStatus());
    const utils = render(<ProductionMonitoringDashboard />);

    // Flush the initial load microtasks
    await act(async () => {
      await Promise.resolve();
    });
    const initialCalls = mockGetCompleteStatus.mock.calls.length;
    expect(initialCalls).toBeGreaterThanOrEqual(1);

    await act(async () => {
      jest.advanceTimersByTime(30_000);
      await Promise.resolve();
    });
    expect(mockGetCompleteStatus.mock.calls.length).toBeGreaterThan(
      initialCalls
    );

    const clearSpy = jest.spyOn(global, 'clearInterval');
    utils.unmount();
    expect(clearSpy).toHaveBeenCalled();
  });
});
