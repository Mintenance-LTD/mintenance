import { ConflictManager } from '../ConflictManager';
import type { OfflineAction } from '../types';

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../JobService', () => ({
  JobService: {
    getBidById: jest.fn(),
    getJobById: jest.fn(),
  },
}));

// require() because ConflictManager resolves JobService lazily via require()
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { JobService } = require('../../JobService');

function makeManager() {
  const versionTracker = {
    getEntityVersion: jest.fn().mockResolvedValue(0),
    updateEntityVersion: jest.fn().mockResolvedValue(undefined),
  };
  const dataMerger = {
    mergeJobData: jest.fn(),
    mergeBidData: jest.fn((c, s) => ({ ...(s as object), ...(c as object) })),
    mergeProfileData: jest.fn(),
  };
  const queueAction = jest.fn().mockResolvedValue('queued');
  const manager = new ConflictManager(
    versionTracker as never,
    dataMerger as never,
    queueAction as never
  );
  return { manager, versionTracker, dataMerger, queueAction };
}

const QUEUED_AT = 1_000_000;

function bidAction(overrides: Partial<OfflineAction> = {}): OfflineAction {
  return {
    id: 'action-1',
    type: 'UPDATE',
    entity: 'bid',
    entityId: 'bid-123',
    data: { bidId: 'bid-123', jobId: 'job-9', amount: 500 },
    timestamp: QUEUED_AT,
    retryCount: 0,
    maxRetries: 3,
    ...overrides,
  };
}

describe('ConflictManager — bid conflict detection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches the bid by (jobId, bidId) and flags a conflict when the server row changed after the action was queued', async () => {
    JobService.getBidById.mockResolvedValue({
      id: 'bid-123',
      updated_at: new Date(QUEUED_AT + 60_000).toISOString(),
    });
    const { manager } = makeManager();

    const conflict = await manager.detectConflict(bidAction());

    expect(JobService.getBidById).toHaveBeenCalledWith('job-9', 'bid-123');
    expect(conflict).not.toBeNull();
    expect(conflict?.entity).toBe('bid');
    expect(conflict?.strategy).toBe('merge');
  });

  it('reports no conflict when the server bid is older than the queued action', async () => {
    JobService.getBidById.mockResolvedValue({
      id: 'bid-123',
      updated_at: new Date(QUEUED_AT - 60_000).toISOString(),
    });
    const { manager } = makeManager();

    expect(await manager.detectConflict(bidAction())).toBeNull();
  });

  it('skips the fetch entirely when the queued bid action carries no jobId', async () => {
    const { manager } = makeManager();

    const conflict = await manager.detectConflict(
      bidAction({ data: { bidId: 'bid-123' } })
    );

    expect(JobService.getBidById).not.toHaveBeenCalled();
    expect(conflict).toBeNull();
  });

  it('reports no conflict when the bid no longer exists on the server', async () => {
    JobService.getBidById.mockResolvedValue(null);
    const { manager } = makeManager();

    expect(await manager.detectConflict(bidAction())).toBeNull();
  });

  it('resolves a detected bid conflict through the merge strategy', async () => {
    JobService.getBidById.mockResolvedValue({
      id: 'bid-123',
      amount: 600,
      updated_at: new Date(QUEUED_AT + 60_000).toISOString(),
    });
    const { manager, dataMerger } = makeManager();

    const conflict = await manager.detectConflict(bidAction());
    expect(conflict).not.toBeNull();

    const resolved = await manager.resolveConflict(conflict!);
    expect(resolved).toBe(true);
    expect(dataMerger.mergeBidData).toHaveBeenCalled();
    expect(conflict!.resolution).toBe('merged');
  });
});
