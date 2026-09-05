const startup = vi.hoisted(() => ({
  rejectEnvironment: false,
  initialize: vi.fn(),
  retrain: vi.fn(),
  logConfig: vi.fn(),
}));

vi.mock('@sentry/nextjs', () => ({ captureRequestError: vi.fn() }));
vi.mock('../sentry.server.config', () => ({}));
vi.mock('../sentry.edge.config', () => ({}));
vi.mock('@mintenance/shared', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../lib/env', () => {
  if (startup.rejectEnvironment) throw new Error('Rejected test configuration');
  return { env: {}, isProduction: () => false };
});
vi.mock('../lib/config/roboflow.config', () => ({
  logRoboflowConfig: startup.logConfig,
}));
vi.mock('../lib/services/building-surveyor/RoboflowDetectionService', () => ({
  RoboflowDetectionService: { initialize: startup.initialize },
}));
vi.mock('../lib/services/building-surveyor/YOLORetrainingService', () => ({
  YOLORetrainingService: { checkAndRetrain: startup.retrain },
}));

describe('instrumentation startup environment gate', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    vi.stubEnv('YOLO_CONTINUOUS_LEARNING_ENABLED', 'true');
    startup.rejectEnvironment = false;
    startup.initialize.mockResolvedValue(undefined);
    startup.retrain.mockResolvedValue(undefined);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('does not initialize models or schedule retraining after validation rejects configuration', async () => {
    startup.rejectEnvironment = true;
    const { register } = await import('../instrumentation');
    await expect(register()).resolves.toBeUndefined();
    expect(startup.logConfig).not.toHaveBeenCalled();
    expect(startup.initialize).not.toHaveBeenCalled();
    expect(startup.retrain).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    expect(console.error).toHaveBeenCalledWith(
      '[instrumentation] Environment validation failed:',
      expect.any(Error)
    );
  });

  it('starts configured services and scheduled checks when validation succeeds', async () => {
    const { register } = await import('../instrumentation');
    await register();
    expect(startup.initialize).toHaveBeenCalledOnce();
    expect(startup.retrain).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
    expect(startup.retrain).toHaveBeenCalledTimes(2);
  });

  it('does not start Node background services in the edge runtime', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'edge');
    const { register } = await import('../instrumentation');
    await register();
    expect(startup.initialize).not.toHaveBeenCalled();
    expect(startup.retrain).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
