jest.mock('react-native/Libraries/Interaction/InteractionManager', () => ({
  runAfterInteractions: jest.fn((callback) => callback()),
  createInteractionHandle: jest.fn(),
  clearInteractionHandle: jest.fn(),
  setDeadline: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockPerformance = {
  now: jest.fn(),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024,
    totalJSHeapSize: 100 * 1024 * 1024,
    jsHeapSizeLimit: 2 * 1024 * 1024 * 1024,
  },
};

describe('PerformanceMonitor', () => {
  let PerformanceMonitor: any;
  let performanceMonitor: any;
  let monitor: any;
  let DeviceEventEmitter: any;
  let logger: any;

  beforeEach(() => {
    jest.resetModules();
    global.__DEV__ = true;
    global.performance = mockPerformance as any;

    const perf = require('../../utils/performance');
    PerformanceMonitor = perf.PerformanceMonitor;
    performanceMonitor = perf.performanceMonitor;
    DeviceEventEmitter = require('react-native').DeviceEventEmitter;
    logger = require('../../utils/logger').logger;

    monitor = PerformanceMonitor.getInstance();
    jest.spyOn(DeviceEventEmitter, 'emit').mockImplementation(jest.fn());
    jest.clearAllMocks();
  });

  afterEach(() => {
    monitor.stopPeriodicReporting();
    monitor.clearMetrics();
    jest.restoreAllMocks();
  });

  it('returns the singleton instance', () => {
    expect(PerformanceMonitor.getInstance()).toBe(performanceMonitor);
  });

  it('loads default budgets from advanced rules', () => {
    expect(monitor.getBudget('app_start_time')).toBe(5000);
    expect(monitor.getBudget('screen_transition_time')).toBe(300);
    expect(monitor.getBudget('component_render_time')).toBe(33);
    expect(monitor.getBudget('api_response_time')).toBe(5000);
    expect(monitor.getBudget('storage_operation_time')).toBe(100);
  });

  it('emits violations and logs only critical breaches', () => {
    monitor.setBudget('test_metric', 100);

    monitor.recordMetric('test_metric', 350);

    expect(DeviceEventEmitter.emit).toHaveBeenCalledWith(
      'performance_violation',
      expect.objectContaining({
        metric: 'test_metric',
        severity: 'critical',
        threshold: 100,
        actual: 350,
      })
    );
    expect(logger.warn).toHaveBeenCalledWith(
      'Performance violation: test_metric',
      {
        data: { expected: 100, actual: 350, tags: undefined },
      }
    );
  });

  it('measures timer durations', () => {
    mockPerformance.now.mockReturnValueOnce(1000).mockReturnValueOnce(1100);

    const endTimer = monitor.startTimer('timer_test', { context: 'test' });
    endTimer();

    const metrics = monitor.getMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0].name).toBe('timer_test');
    expect(metrics[0].value).toBe(100);
    expect(metrics[0].tags).toEqual({ context: 'test' });
  });

  it('measures async operations', async () => {
    mockPerformance.now.mockReturnValueOnce(1000).mockReturnValueOnce(1150);

    const asyncOperation = jest.fn().mockResolvedValue('result');
    const result = await monitor.measureAsync('async_test', asyncOperation, 'network');

    expect(result).toBe('result');
    const metrics = monitor.getMetrics();
    expect(metrics[0].name).toBe('async_test');
    expect(metrics[0].value).toBe(150);
    expect(metrics[0].tags).toEqual({ status: 'success' });
  });

  it('records memory usage when available', () => {
    monitor.recordMemoryUsage();

    const metrics = monitor.getMetrics();
    expect(metrics).toHaveLength(3);
    expect(metrics.map((metric: any) => metric.name)).toEqual(
      expect.arrayContaining([
        'js_heap_size_used',
        'js_heap_size_total',
        'js_heap_size_limit',
      ])
    );
  });

  it('tracks network requests with sanitized URLs', () => {
    monitor.trackNetworkRequest(
      'https://api.example.com/users/123?token=abc',
      1000,
      1250,
      true
    );

    const metric = monitor.getMetrics('network')[0];
    expect(metric.value).toBe(250);
    expect(metric.tags).toEqual({
      url: 'https://api.example.com/users/123',
      success: 'true',
    });
  });
});
