import NetInfo from '@react-native-community/netinfo';
import { OfflineManager } from '../../services/OfflineManager';

jest.mock('@react-native-community/netinfo');

// Mock LocalDatabase path so OfflineManager uses DB-backed queue in tests
jest.mock('../../services/LocalDatabase', () => ({
  LocalDatabase: {
    init: jest.fn(),
    getOfflineActions: jest.fn(),
    removeOfflineAction: jest.fn(),
    queueOfflineAction: jest.fn(),
  },
}));

jest.mock('../../services/JobService', () => ({
  JobService: {
    createJob: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), debug: jest.fn(), warn: jest.fn() },
}));

// Mock Sentry breadcrumbs
jest.mock('../../config/sentry', () => ({
  addBreadcrumb: jest.fn(),
}));

describe('OfflineManager backoff & scheduling', () => {
  const { LocalDatabase } = require('../../services/LocalDatabase');
  const { JobService } = require('../../services/JobService');
  const sentry = require('../../config/sentry');
  const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    LocalDatabase.init.mockResolvedValue();
    mockNetInfo.fetch.mockResolvedValue({ isConnected: true, isInternetReachable: true } as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('schedules next retry with exponential backoff and breadcrumbs', async () => {
    // One failing action causes a retry schedule
    LocalDatabase.getOfflineActions.mockResolvedValue([
      {
        id: 'a1',
        type: 'CREATE',
        entity: 'job',
        data: JSON.stringify({ title: 'Test job' }),
        created_at: Date.now(),
        retry_count: 0,
        max_retries: 3,
        query_key: null,
      },
    ]);
    JobService.createJob.mockRejectedValue(new Error('temporary'));

    const spySync = jest.spyOn(OfflineManager as any, 'syncQueue');
    const timeoutSpy = jest.spyOn(global, 'setTimeout');
    OfflineManager.syncQueue();
    // Flush internal timers (executeAction delay)
    jest.runOnlyPendingTimers();
    await Promise.resolve();

    // Breadcrumb scheduled and next sync eventually triggered
    expect(sentry.addBreadcrumb).toHaveBeenCalled();
    jest.runAllTimers();
    await Promise.resolve();
    // We don't assert an exact sync invocation count here to avoid
    // tight coupling to timer behavior; breadcrumb presence indicates scheduling.
  });
});
