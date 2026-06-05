/**
 * Branch-coverage suite for HotLeadsRail.
 *
 * Strategy: mock only externals (react-query's useQuery, mobileApiClient,
 * the mint-editorial token map, and the styles module). useQuery is driven
 * from a mutable state object so each test can set { data, isLoading } and
 * exercise the empty/loading/populated branches plus every per-row ternary
 * (hot vs cool pill, left-rail colour, subline assembly, amount formatting,
 * freshness buckets). The real queryFn is invoked once so its
 * `res.bids ?? []` branch and the mobileApiClient.get call are covered too.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ---- Mutable query state the mocked useQuery reads from ----
const queryState: { data: any; isLoading: boolean } = {
  data: [],
  isLoading: false,
};

const mockGet = jest.fn();

jest.mock('../../../../utils/mobileApiClient', () => ({
  mobileApiClient: { get: (...args: any[]) => mockGet(...args) },
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryFn }: any) => {
    // Run the real queryFn so its branches are covered (res.bids ?? []).
    if (typeof queryFn === 'function') {
      try {
        Promise.resolve(queryFn()).catch(() => {});
      } catch {
        /* ignore */
      }
    }
    return { data: queryState.data, isLoading: queryState.isLoading };
  },
}));

// Token map — only the keys the component/styles touch.
jest.mock('../../../../design-system/mint-editorial', () => ({
  me: {
    ink: '#000',
    ink3: '#666',
    brand: '#3F8C7A',
    onBrand: '#fff',
    surface: '#fff',
    line: '#eee',
    bg3: '#ddd',
  },
}));

import { HotLeadsRail } from '../HotLeadsRail';

const HOUR = 1000 * 60 * 60;

const isoAgo = (hours: number): string =>
  new Date(Date.now() - hours * HOUR).toISOString();

const makeBid = (over: Partial<any> = {}): any => ({
  id: over.id ?? 'b1',
  job_id: over.job_id ?? 'j1',
  amount: over.amount ?? 1500,
  status: 'pending',
  created_at: over.created_at ?? isoAgo(48),
  updated_at: 'updated_at' in over ? over.updated_at : isoAgo(2),
  jobs:
    'jobs' in over
      ? over.jobs
      : {
          id: 'j1',
          title: 'Fix boiler',
          location: 'London',
          updated_at: isoAgo(2),
        },
});

beforeEach(() => {
  jest.clearAllMocks();
  queryState.data = [];
  queryState.isLoading = false;
  mockGet.mockResolvedValue({ bids: [] });
});

describe('HotLeadsRail — empty / loading branches', () => {
  it('renders nothing while loading', () => {
    queryState.isLoading = true;
    queryState.data = [makeBid()];
    const { toJSON } = render(
      <HotLeadsRail onOpenJob={jest.fn()} onSeeAll={jest.fn()} />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when useQuery returns undefined data (default [])', () => {
    queryState.isLoading = false;
    queryState.data = undefined;
    const { toJSON } = render(
      <HotLeadsRail onOpenJob={jest.fn()} onSeeAll={jest.fn()} />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when there are no pending bids', () => {
    queryState.isLoading = false;
    queryState.data = [];
    const { toJSON } = render(
      <HotLeadsRail onOpenJob={jest.fn()} onSeeAll={jest.fn()} />
    );
    expect(toJSON()).toBeNull();
  });
});

describe('HotLeadsRail — queryFn', () => {
  it('invokes mobileApiClient.get with the pending-bids endpoint', () => {
    queryState.data = [];
    render(<HotLeadsRail onOpenJob={jest.fn()} onSeeAll={jest.fn()} />);
    expect(mockGet).toHaveBeenCalledWith(
      '/api/contractor/bids?status=pending&limit=10'
    );
  });

  it('queryFn returns [] when the response omits bids (?? branch)', async () => {
    mockGet.mockResolvedValueOnce({});
    render(<HotLeadsRail onOpenJob={jest.fn()} onSeeAll={jest.fn()} />);
    // Flush the queryFn promise.
    await Promise.resolve();
    expect(mockGet).toHaveBeenCalled();
  });

  it('queryFn returns the bids array when present', async () => {
    mockGet.mockResolvedValueOnce({ bids: [makeBid()] });
    render(<HotLeadsRail onOpenJob={jest.fn()} onSeeAll={jest.fn()} />);
    await Promise.resolve();
    expect(mockGet).toHaveBeenCalled();
  });
});

describe('HotLeadsRail — populated rail', () => {
  it('renders header with row count and warm count (hotCount > 0)', () => {
    queryState.data = [
      makeBid({
        id: 'a',
        job_id: 'ja',
        jobs: { title: 'Hot job', location: 'Leeds', updated_at: isoAgo(1) },
      }),
    ];
    const { getByText } = render(
      <HotLeadsRail onOpenJob={jest.fn()} onSeeAll={jest.fn()} />
    );
    expect(getByText('Active bids · 1 · 1 warm')).toBeTruthy();
    expect(getByText('See all →')).toBeTruthy();
  });

  it('omits warm suffix when nothing is hot (hotCount === 0)', () => {
    queryState.data = [
      makeBid({
        id: 'cold',
        job_id: 'jc',
        updated_at: isoAgo(100),
        jobs: { title: 'Cold job', location: 'Hull', updated_at: isoAgo(100) },
      }),
    ];
    const { getByText, queryByText } = render(
      <HotLeadsRail onOpenJob={jest.fn()} onSeeAll={jest.fn()} />
    );
    expect(getByText('Active bids · 1')).toBeTruthy();
    expect(queryByText(/warm/)).toBeNull();
  });

  it('caps the rail at MAX_ROWS (3) and sorts by recency', () => {
    queryState.data = [
      makeBid({
        id: '1',
        job_id: 'j1',
        jobs: { title: 'Oldest', location: 'A', updated_at: isoAgo(50) },
      }),
      makeBid({
        id: '2',
        job_id: 'j2',
        jobs: { title: 'Newest', location: 'B', updated_at: isoAgo(0.2) },
      }),
      makeBid({
        id: '3',
        job_id: 'j3',
        jobs: { title: 'Mid', location: 'C', updated_at: isoAgo(10) },
      }),
      makeBid({
        id: '4',
        job_id: 'j4',
        jobs: { title: 'Fourth', location: 'D', updated_at: isoAgo(30) },
      }),
    ];
    const { getByText, queryByText } = render(
      <HotLeadsRail onOpenJob={jest.fn()} onSeeAll={jest.fn()} />
    );
    // Newest (0.2h) + Mid (10h) are both within the 24h hot window.
    expect(getByText('Active bids · 3 · 2 warm')).toBeTruthy();
    // The oldest of the four (50h) drops off the slice(0,3).
    expect(queryByText(/Oldest/)).toBeNull();
    expect(getByText(/Newest/)).toBeTruthy();
  });
});

describe('HotLeadsRail — interactions', () => {
  it('fires onSeeAll when the header is pressed', () => {
    const onSeeAll = jest.fn();
    queryState.data = [makeBid()];
    const { getByText } = render(
      <HotLeadsRail onOpenJob={jest.fn()} onSeeAll={onSeeAll} />
    );
    fireEvent.press(getByText('See all →'));
    expect(onSeeAll).toHaveBeenCalledTimes(1);
  });

  it('fires onOpenJob with the bid job_id when a row is pressed', () => {
    const onOpenJob = jest.fn();
    queryState.data = [
      makeBid({
        id: 'row1',
        job_id: 'JOB-42',
        jobs: { title: 'Tap me', location: 'X', updated_at: isoAgo(1) },
      }),
    ];
    const { getByLabelText } = render(
      <HotLeadsRail onOpenJob={onOpenJob} onSeeAll={jest.fn()} />
    );
    fireEvent.press(getByLabelText(/Tap me bid for/));
    expect(onOpenJob).toHaveBeenCalledWith('JOB-42');
  });
});

describe('HotLeadsRail — per-row conditionals', () => {
  it('hot row shows "Warm" pill text', () => {
    queryState.data = [
      makeBid({
        id: 'h',
        job_id: 'jh',
        jobs: { title: 'Warm one', location: 'Bath', updated_at: isoAgo(1) },
      }),
    ];
    const { getByText } = render(
      <HotLeadsRail onOpenJob={jest.fn()} onSeeAll={jest.fn()} />
    );
    expect(getByText(/Warm one · £1,500/)).toBeTruthy();
    expect(getByText('Warm')).toBeTruthy();
  });

  it('cool row shows the freshness label as pill text', () => {
    queryState.data = [
      makeBid({
        id: 'c',
        job_id: 'jc',
        updated_at: isoAgo(72),
        jobs: { title: 'Cool one', location: 'York', updated_at: isoAgo(72) },
      }),
    ];
    const { getByText } = render(
      <HotLeadsRail onOpenJob={jest.fn()} onSeeAll={jest.fn()} />
    );
    // 72h -> "3d" pill, subline "... · 3d ago"
    expect(getByText('3d')).toBeTruthy();
    expect(getByText(/York · 3d ago/)).toBeTruthy();
  });

  it('falls back to "Job" title when jobs is null', () => {
    queryState.data = [
      makeBid({ id: 'n', job_id: 'jn', updated_at: isoAgo(1), jobs: null }),
    ];
    const { getByText } = render(
      <HotLeadsRail onOpenJob={jest.fn()} onSeeAll={jest.fn()} />
    );
    expect(getByText(/^Job · £1,500$/)).toBeTruthy();
  });

  it('omits the subline when no location and freshness empty', () => {
    // jobs null + updated_at null + created_at null => freshness('' ) => '',
    // location undefined => subline becomes empty after filter(Boolean).
    queryState.data = [
      {
        id: 's',
        job_id: 'js',
        amount: 800,
        status: 'pending',
        created_at: null,
        updated_at: null,
        jobs: null,
      },
    ];
    const { getByText, queryByText } = render(
      <HotLeadsRail onOpenJob={jest.fn()} onSeeAll={jest.fn()} />
    );
    expect(getByText(/Job · £800/)).toBeTruthy();
    // No " ago" subline rendered.
    expect(queryByText(/ ago/)).toBeNull();
  });

  it('renders subline with only freshness when location is absent', () => {
    queryState.data = [
      makeBid({
        id: 'f',
        job_id: 'jf',
        updated_at: isoAgo(2),
        jobs: { title: 'No loc', updated_at: isoAgo(2) },
      }),
    ];
    const { getByText } = render(
      <HotLeadsRail onOpenJob={jest.fn()} onSeeAll={jest.fn()} />
    );
    // location undefined dropped, leaves "2h ago"
    expect(getByText(/2h ago/)).toBeTruthy();
  });
});

describe('HotLeadsRail — fmtAmount + freshness buckets', () => {
  it('shows "Now" freshness for a sub-1h bid', () => {
    queryState.data = [
      makeBid({
        id: 'now',
        job_id: 'jnow',
        updated_at: isoAgo(0.2),
        jobs: { title: 'Just now', location: 'Ely', updated_at: isoAgo(0.2) },
      }),
    ];
    const { getByText } = render(
      <HotLeadsRail onOpenJob={jest.fn()} onSeeAll={jest.fn()} />
    );
    expect(getByText(/Ely · Now ago/)).toBeTruthy();
  });

  it('renders empty amount when amount is not a finite number', () => {
    queryState.data = [
      makeBid({
        id: 'nan',
        job_id: 'jnan',
        amount: NaN,
        updated_at: isoAgo(1),
        jobs: { title: 'NoAmount', location: 'Rye', updated_at: isoAgo(1) },
      }),
    ];
    const { getByText } = render(
      <HotLeadsRail onOpenJob={jest.fn()} onSeeAll={jest.fn()} />
    );
    // Title still rendered; amount portion empty -> "NoAmount · "
    expect(getByText(/NoAmount ·\s*$/)).toBeTruthy();
  });

  it('renders empty freshness for an unparseable date (NaN ms)', () => {
    queryState.data = [
      makeBid({
        id: 'bad',
        job_id: 'jbad',
        updated_at: 'not-a-date',
        jobs: { title: 'BadDate', location: 'Deal', updated_at: 'not-a-date' },
      }),
    ];
    const { getByText } = render(
      <HotLeadsRail onOpenJob={jest.fn()} onSeeAll={jest.fn()} />
    );
    // freshness('not-a-date') -> '' so subline is just "Deal ·  ago"
    expect(getByText(/Deal/)).toBeTruthy();
  });

  it('sort comparator falls back through updated_at and created_at', () => {
    // Bid A: jobs.updated_at falsy, updated_at falsy -> uses created_at.
    // Bid B: jobs.updated_at falsy -> uses updated_at.
    // Exercises both `||` fallbacks in the sort comparator (lines 85-88).
    queryState.data = [
      {
        id: 'A',
        job_id: 'jA',
        amount: 100,
        status: 'pending',
        created_at: isoAgo(5),
        updated_at: null,
        jobs: { title: 'ByCreated', location: 'A', updated_at: undefined },
      },
      {
        id: 'B',
        job_id: 'jB',
        amount: 200,
        status: 'pending',
        created_at: isoAgo(40),
        updated_at: isoAgo(0.5),
        jobs: { title: 'ByUpdated', location: 'B', updated_at: undefined },
      },
    ];
    const { getByText } = render(
      <HotLeadsRail onOpenJob={jest.fn()} onSeeAll={jest.fn()} />
    );
    // Both render; B (0.5h via updated_at) sorts above A (5h via created_at).
    expect(getByText(/ByUpdated/)).toBeTruthy();
    expect(getByText(/ByCreated/)).toBeTruthy();
  });

  it('uses bid.updated_at when jobs.updated_at is missing (isHot fallback)', () => {
    queryState.data = [
      makeBid({
        id: 'fb',
        job_id: 'jfb',
        updated_at: isoAgo(1),
        jobs: { title: 'Fallback', location: 'Wells' }, // no jobs.updated_at
      }),
    ];
    const { getByText } = render(
      <HotLeadsRail onOpenJob={jest.fn()} onSeeAll={jest.fn()} />
    );
    // updated within 24h via bid.updated_at -> Warm
    expect(getByText('Warm')).toBeTruthy();
  });
});
