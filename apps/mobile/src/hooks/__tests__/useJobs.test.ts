import { renderHook } from '@testing-library/react-native';

/**
 * Real-coverage tests for src/hooks/useJobs.ts.
 *
 * Strategy: useJobs.ts is a thin composition layer over useOfflineQuery /
 * useOfflineMutation. We mock those two primitives so each call captures the
 * EXACT options object that useJobs.ts builds (queryKey, queryFn, enabled,
 * staleTime, mutationFn, getQueryKey, optimisticUpdate, etc). We then render
 * each hook with renderHook and execute the captured callbacks, which is what
 * actually drives the lines/branches inside useJobs.ts (query-key strings,
 * the createJob validation/transform, optimistic builders, the enabled gates).
 *
 * Real dependencies used (NOT mocked): queryKeys factory and validateJobDraft
 * from @mintenance/api-contracts — so key construction + validation branches
 * are genuinely exercised.
 *
 * COVERAGE CEILING: only useJob, useJobBids, useMyBidForJob, useCreateJob, and
 * useAcceptBid are exported from useJobs.ts. The other 9 hooks (useJobs,
 * useAvailableJobs, useJobsByHomeowner, useJobsByStatus, useSearchJobs,
 * useUpdateJobStatus, useStartJob, useCompleteJob, useSubmitBid) are declared
 * `const` WITHOUT `export` and are not re-exported anywhere in the repo
 * (verified by grep). They are module-private with zero callers, so their lines
 * are physically unreachable from any test.
 */

import {
  useJob,
  useJobBids,
  useMyBidForJob,
  useCreateJob,
  useAcceptBid,
} from '../useJobs';
import { JobService } from '../../services/JobService';
import { BidService } from '../../services/BidService';

// ---- Capture layer for the offline primitives -----------------------------
const capturedQueries: any[] = [];
const capturedMutations: any[] = [];

jest.mock('../useOfflineQuery', () => ({
  useOfflineQuery: jest.fn((options: any) => {
    capturedQueries.push(options);
    return { data: undefined, isLoading: true, __options: options } as any;
  }),
  useOfflineMutation: jest.fn((options: any) => {
    capturedMutations.push(options);
    return {
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      __options: options,
    } as any;
  }),
}));

// ---- Service mocks ---------------------------------------------------------
jest.mock('../../services/JobService', () => ({
  JobService: {
    getJobById: jest.fn(),
    getBidsByJob: jest.fn(),
    createJob: jest.fn(),
    acceptBid: jest.fn(),
  },
}));

jest.mock('../../services/BidService', () => ({
  BidService: {
    getMyBidForJob: jest.fn(),
  },
}));

const lastQuery = () => capturedQueries[capturedQueries.length - 1];
const lastMutation = () => capturedMutations[capturedMutations.length - 1];

beforeEach(() => {
  jest.clearAllMocks();
  capturedQueries.length = 0;
  capturedMutations.length = 0;
});

// =============================================================================
// QUERY HOOKS (exported)
// =============================================================================
describe('useJob (detail)', () => {
  it('builds detail key with retry/gcTime/staleTime, enabled when id present', async () => {
    (JobService.getJobById as jest.Mock).mockResolvedValue({ id: 'job-1' });

    renderHook(() => useJob('job-1'));
    const opts = lastQuery();

    expect(opts.queryKey).toEqual(['jobs', 'detail', 'job-1']);
    expect(opts.enabled).toBe(true);
    expect(opts.staleTime).toBe(30 * 1000);
    expect(opts.retry).toBe(3);
    expect(opts.gcTime).toBe(15 * 60 * 1000);

    const result = await opts.queryFn();
    expect(JobService.getJobById).toHaveBeenCalledWith('job-1');
    expect(result).toEqual({ id: 'job-1' });
  });

  it('placeholderData returns the previous value (and passes through null/undefined)', () => {
    renderHook(() => useJob('job-1'));
    const opts = lastQuery();
    const prev = { id: 'prev' } as any;
    expect(opts.placeholderData(prev)).toBe(prev);
    expect(opts.placeholderData(undefined)).toBeUndefined();
    expect(opts.placeholderData(null)).toBeNull();
  });

  it('enabled false when jobId is empty', () => {
    renderHook(() => useJob(''));
    expect(lastQuery().enabled).toBe(false);
  });
});

describe('useJobBids', () => {
  it('default enabled true (id present), bids key, calls getBidsByJob', async () => {
    (JobService.getBidsByJob as jest.Mock).mockResolvedValue([{ id: 'b1' }]);

    renderHook(() => useJobBids('job-9'));
    const opts = lastQuery();

    expect(opts.queryKey).toEqual(['jobs', 'bids', 'job-9']);
    expect(opts.enabled).toBe(true);
    expect(opts.staleTime).toBe(30 * 1000);

    const result = await opts.queryFn();
    expect(JobService.getBidsByJob).toHaveBeenCalledWith('job-9');
    expect(result).toEqual([{ id: 'b1' }]);
  });

  it('respects caller enabled=false even with a valid id', () => {
    renderHook(() => useJobBids('job-9', { enabled: false }));
    expect(lastQuery().enabled).toBe(false);
  });

  it('enabled false when jobId empty regardless of enabled flag', () => {
    renderHook(() => useJobBids('', { enabled: true }));
    expect(lastQuery().enabled).toBe(false);
  });

  it('defaults the enabled option to true when no options object is passed', () => {
    renderHook(() => useJobBids('job-2'));
    expect(lastQuery().enabled).toBe(true);
  });
});

describe('useMyBidForJob', () => {
  it('uses the contractor my-bid key, enabled true, calls BidService', async () => {
    (BidService.getMyBidForJob as jest.Mock).mockResolvedValue({ id: 'mb' });

    renderHook(() => useMyBidForJob('job-5'));
    const opts = lastQuery();

    expect(opts.queryKey).toEqual(['contractor', 'my-bid', 'job-5']);
    expect(opts.enabled).toBe(true);
    expect(opts.staleTime).toBe(30 * 1000);

    const result = await opts.queryFn();
    expect(BidService.getMyBidForJob).toHaveBeenCalledWith('job-5');
    expect(result).toEqual({ id: 'mb' });
  });

  it('enabled false when disabled by caller', () => {
    renderHook(() => useMyBidForJob('job-5', { enabled: false }));
    expect(lastQuery().enabled).toBe(false);
  });

  it('enabled false when jobId missing', () => {
    renderHook(() => useMyBidForJob(''));
    expect(lastQuery().enabled).toBe(false);
  });
});

// =============================================================================
// MUTATION HOOKS (exported)
// =============================================================================
describe('useCreateJob', () => {
  const valid = {
    title: 'Fix bathroom plumbing issue',
    description:
      'Need a plumber to fix the leaky faucet in the main bathroom please',
    location: 'New York, NY',
    budget: 1000,
    homeownerId: 'homeowner-123',
    category: 'plumbing',
    urgency: 'high' as const,
    photos: ['https://example.com/p1.jpg'],
  };

  it('configures entity/actionType and a homeowner getQueryKey', () => {
    renderHook(() => useCreateJob());
    const opts = lastMutation();
    expect(opts.entity).toBe('job');
    expect(opts.actionType).toBe('CREATE');
    expect(opts.getQueryKey({ homeownerId: 'ho-9' } as any)).toEqual([
      'jobs',
      'list',
      'homeowner:ho-9',
    ]);
  });

  it('mutationFn validates, trims, and forwards to JobService.createJob', async () => {
    (JobService.createJob as jest.Mock).mockResolvedValue({ id: 'new-job' });
    renderHook(() => useCreateJob());
    const opts = lastMutation();

    const result = await opts.mutationFn({
      ...valid,
      title: '  Fix bathroom plumbing issue  ',
      description:
        '  Need a plumber to fix the leaky faucet in the main bathroom please  ',
      location: '  New York, NY  ',
    });

    expect(result).toEqual({ id: 'new-job' });
    expect(JobService.createJob).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Fix bathroom plumbing issue',
        description:
          'Need a plumber to fix the leaky faucet in the main bathroom please',
        location: 'New York, NY',
      })
    );
  });

  it('forwards rental + tenancy + requirements fields into the draft path', async () => {
    (JobService.createJob as jest.Mock).mockResolvedValue({ id: 'rj' });
    renderHook(() => useCreateJob());
    const opts = lastMutation();

    await opts.mutationFn({
      ...valid,
      is_rental_property: true,
      tenancy_metadata: { tenantName: 'Jane' },
      requirements: { contractor_before_photos: true },
    });

    expect(JobService.createJob).toHaveBeenCalledWith(
      expect.objectContaining({
        is_rental_property: true,
        tenancy_metadata: { tenantName: 'Jane' },
        requirements: { contractor_before_photos: true },
      })
    );
  });

  it('throws "User authentication is required" when homeownerId missing', async () => {
    renderHook(() => useCreateJob());
    const opts = lastMutation();
    await expect(
      opts.mutationFn({ ...valid, homeownerId: '' })
    ).rejects.toThrow('User authentication is required');
    expect(JobService.createJob).not.toHaveBeenCalled();
  });

  it('surfaces the first validation error and never calls the service', async () => {
    renderHook(() => useCreateJob());
    const opts = lastMutation();
    await expect(
      opts.mutationFn({
        ...valid,
        title: 'x', // too short -> validateJobDraft fails
        description: 'short',
      })
    ).rejects.toThrow(/.+/); // a real message is surfaced from validation
    expect(JobService.createJob).not.toHaveBeenCalled();
  });

  it('omits budget from the draft when undefined (still valid)', async () => {
    (JobService.createJob as jest.Mock).mockResolvedValue({ id: 'nb' });
    renderHook(() => useCreateJob());
    const opts = lastMutation();
    const { budget, ...noBudget } = valid;
    await opts.mutationFn(noBudget);
    expect(JobService.createJob).toHaveBeenCalled();
  });

  it('optimisticUpdate builds a temp posted job and applies defaults', () => {
    renderHook(() => useCreateJob());
    const opts = lastMutation();

    const optimistic = opts.optimisticUpdate({
      title: '  Title here long  ',
      description: '  Some description text  ',
      location: '  Somewhere  ',
      homeownerId: 'ho-1',
    }) as any;

    expect(optimistic.id).toMatch(/^temp_job_\d+$/);
    expect(optimistic.title).toBe('Title here long');
    expect(optimistic.status).toBe('posted');
    expect(optimistic.contractorId).toBeNull();
    expect(optimistic.category).toBe('handyman'); // default branch
    expect(optimistic.urgency).toBe('medium'); // default branch
    expect(optimistic.photos).toEqual([]); // default branch
    expect(optimistic.bids).toEqual([]);
  });

  it('optimisticUpdate preserves provided category/urgency/photos', () => {
    renderHook(() => useCreateJob());
    const opts = lastMutation();
    const optimistic = opts.optimisticUpdate({
      title: 'Another job title',
      description: 'Another description text',
      location: 'Boston',
      homeownerId: 'ho-2',
      budget: 1500,
      category: 'electrical',
      subcategory: 'wiring',
      urgency: 'emergency',
      photos: ['x.jpg'],
    }) as any;

    expect(optimistic.category).toBe('electrical');
    expect(optimistic.subcategory).toBe('wiring');
    expect(optimistic.urgency).toBe('emergency');
    expect(optimistic.photos).toEqual(['x.jpg']);
    expect(optimistic.budget).toBe(1500);
  });
});

describe('useAcceptBid', () => {
  it('online-only UPDATE that forwards bidId + jobId', async () => {
    (JobService.acceptBid as jest.Mock).mockResolvedValue(undefined);
    renderHook(() => useAcceptBid());
    const opts = lastMutation();

    expect(opts.entity).toBe('bid');
    expect(opts.actionType).toBe('UPDATE');
    expect(opts.onlineOnly).toBe(true);

    await opts.mutationFn({ bidId: 'bid-1', jobId: 'job-1' });
    expect(JobService.acceptBid).toHaveBeenCalledWith('bid-1', 'job-1');
  });
});
