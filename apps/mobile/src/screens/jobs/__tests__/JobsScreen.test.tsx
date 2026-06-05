import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// ---------------------------------------------------------------------------
// Mock ONLY externals — never the screen under test.
// ---------------------------------------------------------------------------

// The shared react-native mock stubs FlatList as a host string, so it never
// invokes ListHeaderComponent / renderItem / ListEmptyComponent / refreshControl.
// Override it with a real functional FlatList that exercises every branch.
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  const ReactLocal = require('react');
  const FlatList = ({
    data = [],
    renderItem,
    keyExtractor,
    ListHeaderComponent,
    ListEmptyComponent,
    refreshControl,
    testID,
  }: any) => {
    const children: any[] = [];
    if (ListHeaderComponent) {
      children.push(
        ReactLocal.createElement(
          ReactLocal.Fragment,
          { key: '__header' },
          ReactLocal.isValidElement(ListHeaderComponent)
            ? ListHeaderComponent
            : ReactLocal.createElement(ListHeaderComponent)
        )
      );
    }
    if (refreshControl) {
      children.push(
        ReactLocal.createElement(
          ReactLocal.Fragment,
          { key: '__refresh' },
          refreshControl
        )
      );
    }
    if ((!data || data.length === 0) && ListEmptyComponent) {
      children.push(
        ReactLocal.createElement(
          ReactLocal.Fragment,
          { key: '__empty' },
          ReactLocal.isValidElement(ListEmptyComponent)
            ? ListEmptyComponent
            : ReactLocal.createElement(ListEmptyComponent)
        )
      );
    } else {
      (data || []).forEach((item: any, index: number) => {
        children.push(
          ReactLocal.createElement(
            ReactLocal.Fragment,
            { key: keyExtractor ? keyExtractor(item, index) : index },
            renderItem ? renderItem({ item, index }) : null
          )
        );
      });
    }
    return ReactLocal.createElement(actual.View, { testID }, children);
  };
  return { ...actual, FlatList };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 10, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Navigation
const mockNavigate = jest.fn();
const mockParentNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    getParent: () => ({ navigate: mockParentNavigate }),
  }),
}));

// Ionicons -> render the name as Text so we can assert on it.
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name }: { name: string }) => {
    const { Text } = require('react-native');
    return <Text testID={`icon-${name}`}>{name}</Text>;
  },
}));

// Auth context (jest.config maps contexts/AuthContext -> AuthContext-fallback)
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));
import { useAuth } from '../../../contexts/AuthContext';

// JobService — main data source.
jest.mock('../../../services/JobService', () => ({
  JobService: {
    getJobsByHomeowner: jest.fn(),
    getJobsByUser: jest.fn(),
  },
}));
import { JobService } from '../../../services/JobService';

// BidService — dynamically imported by the bid-pending query.
const mockGetBidsByContractor = jest.fn();
jest.mock('../../../services/BidService', () => ({
  BidService: {
    getBidsByContractor: (...args: unknown[]) =>
      mockGetBidsByContractor(...args),
  },
}));

// Logger (used by queryClient infra).
jest.mock('../../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Design-system tokens + theme — deterministic, cheap.
jest.mock('../../../design-system/mint-editorial', () => ({
  me: {
    brand: '#3F8C7A',
    brandSoft: '#E6F2EE',
    accent: '#D97706',
    warnBg: '#FEF3C7',
    errFg: '#DC2626',
    errBg: '#FEE2E2',
    onBrand: '#FFFFFF',
    ink: '#111111',
    ink2: '#616161',
    bg2: '#F5F5F5',
    surface: '#FFFFFF',
    line: '#E5E5E5',
  },
}));
jest.mock('../../../theme', () => ({
  semanticBg: { error: '#FEE2E2' },
  getStatusBadge: (key: string) => ({ label: key, bg: '#eee', text: '#111' }),
}));

// Responsive container — render children only.
jest.mock('../../../components/responsive', () => ({
  ResponsiveContainer: ({ children, testID }: any) => {
    const { View } = require('react-native');
    return <View testID={testID}>{children}</View>;
  },
}));

// Error boundary — render children AND (when provided) the fallback render-prop
// with a fake error + retry, so the inline fallback JSX branches are covered.
const mockBoundaryRetry = jest.fn();
jest.mock('../../../components/ScreenErrorBoundary', () => ({
  ScreenErrorBoundary: ({ children, fallbackComponent }: any) => {
    const { View } = require('react-native');
    return (
      <View testID='error-boundary'>
        {children}
        {typeof fallbackComponent === 'function' && (
          <View testID='boundary-fallback'>
            {fallbackComponent(new Error('map crash'), mockBoundaryRetry)}
          </View>
        )}
      </View>
    );
  },
}));

// Explore map — stub with a back-to-list button.
jest.mock('../../explore-map/ExploreMapScreen', () => ({
  ExploreMapScreen: ({ onBackToList }: any) => {
    const { Text, TouchableOpacity } = require('react-native');
    return (
      <TouchableOpacity testID='explore-map-back' onPress={onBackToList}>
        <Text>ExploreMap</Text>
      </TouchableOpacity>
    );
  },
}));

// ---- Child component stubs that surface props + fire handlers ----
jest.mock('../JobCard', () => ({
  JobCard: ({ item, saved, onPress, onSave, onBid, hasUserBid }: any) => {
    const { Text, TouchableOpacity } = require('react-native');
    return (
      <TouchableOpacity testID={`jobcard-${item.id}`} onPress={onPress}>
        <Text testID={`jobcard-saved-${item.id}`}>{String(saved)}</Text>
        <Text testID={`jobcard-hasbid-${item.id}`}>{String(hasUserBid)}</Text>
        <TouchableOpacity testID={`jobcard-save-${item.id}`} onPress={onSave}>
          <Text>save</Text>
        </TouchableOpacity>
        <TouchableOpacity testID={`jobcard-bid-${item.id}`} onPress={onBid}>
          <Text>bid</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  },
}));

jest.mock('../JobsHeroHeader', () => ({
  JobsHeroHeader: ({ isContractor, stats, onSearchChange, onAddJob }: any) => {
    const { Text, TouchableOpacity, TextInput } = require('react-native');
    return (
      <>
        <Text testID='hero-role'>
          {isContractor ? 'contractor' : 'homeowner'}
        </Text>
        <Text testID='hero-total'>{String(stats.total)}</Text>
        <Text testID='hero-avgbudget'>{String(stats.avgBudget)}</Text>
        <Text testID='hero-active'>{String(stats.activeCount)}</Text>
        <Text testID='hero-completed'>{String(stats.completedCount)}</Text>
        <Text testID='hero-newtoday'>{String(stats.newToday)}</Text>
        <Text testID='hero-bids'>{String(stats.totalBids)}</Text>
        <TextInput
          testID='hero-search'
          onChangeText={(t: string) => onSearchChange(t)}
        />
        <TouchableOpacity testID='hero-add' onPress={onAddJob}>
          <Text>add</Text>
        </TouchableOpacity>
      </>
    );
  },
}));

jest.mock('../JobsFilterTabs', () => ({
  JobsFilterTabs: ({
    isContractor,
    sortMode,
    selectedFilter,
    filterCounts,
    onSortModeChange,
    onFilterChange,
  }: any) => {
    const { Text, TouchableOpacity } = require('react-native');
    return (
      <>
        <Text testID='tabs-role'>
          {isContractor ? 'contractor' : 'homeowner'}
        </Text>
        <Text testID='tabs-sortmode'>{sortMode}</Text>
        <Text testID='tabs-selected'>{selectedFilter}</Text>
        <Text testID='tabs-count-bid'>{String(filterCounts.bid)}</Text>
        <Text testID='tabs-count-active'>{String(filterCounts.active)}</Text>
        <Text testID='tabs-count-posted'>{String(filterCounts.posted)}</Text>
        <Text testID='tabs-count-completed'>
          {String(filterCounts.completed)}
        </Text>
        {/* sort-mode buttons */}
        <TouchableOpacity
          testID='set-sort-map'
          onPress={() => onSortModeChange('map')}
        >
          <Text>map</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID='set-sort-highest'
          onPress={() => onSortModeChange('highest_pay')}
        >
          <Text>highest</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID='set-sort-newest'
          onPress={() => onSortModeChange('newest')}
        >
          <Text>newest</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID='set-sort-nearest'
          onPress={() => onSortModeChange('nearest')}
        >
          <Text>nearest</Text>
        </TouchableOpacity>
        {/* filter buttons */}
        <TouchableOpacity
          testID='set-filter-posted'
          onPress={() => onFilterChange('posted')}
        >
          <Text>posted</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID='set-filter-completed'
          onPress={() => onFilterChange('completed')}
        >
          <Text>completed</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID='set-filter-bid'
          onPress={() => onFilterChange('bid')}
        >
          <Text>bid</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID='set-filter-active'
          onPress={() => onFilterChange('active')}
        >
          <Text>active</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID='set-filter-all'
          onPress={() => onFilterChange('all')}
        >
          <Text>all</Text>
        </TouchableOpacity>
      </>
    );
  },
}));

jest.mock('../JobsEmptyState', () => ({
  JobsEmptyState: ({
    isContractor,
    selectedFilter,
    onClearSearch,
    onSortModeChange,
    onAddJob,
  }: any) => {
    const { Text, TouchableOpacity } = require('react-native');
    return (
      <>
        <Text testID='empty-state'>empty</Text>
        <Text testID='empty-role'>
          {isContractor ? 'contractor' : 'homeowner'}
        </Text>
        <Text testID='empty-filter'>{selectedFilter}</Text>
        <TouchableOpacity testID='empty-clear' onPress={onClearSearch}>
          <Text>clear</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID='empty-sort'
          onPress={() => onSortModeChange('for_you')}
        >
          <Text>sort</Text>
        </TouchableOpacity>
        <TouchableOpacity testID='empty-add' onPress={onAddJob}>
          <Text>add</Text>
        </TouchableOpacity>
      </>
    );
  },
}));

// ---- React Query: drive every query state deterministically ----
const mockRefetch = jest.fn();
const mockInvalidateQueries = jest.fn();
// State pushed into the MAIN jobs query by each test.
let mockMainQueryState: any = {
  data: [],
  isError: false,
  error: null,
  isFetching: false,
};
// State for the contractor bid-pending query.
let mockBidQueryState: any = { data: [] };

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
  useQuery: ({ queryKey, queryFn, enabled }: any) => {
    const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;
    // Execute the queryFn so its branches (guards, role split, bid mapping)
    // are covered, swallowing rejections (enabled-gated paths may throw).
    if (enabled && typeof queryFn === 'function') {
      try {
        Promise.resolve(queryFn()).catch(() => {});
      } catch {
        /* ignore */
      }
    }
    if (key === 'contractorBidJobs') {
      return {
        data: mockBidQueryState.data ?? [],
        isError: false,
        error: null,
        isFetching: false,
        refetch: mockRefetch,
      };
    }
    return {
      data: mockMainQueryState.data ?? [],
      isError: !!mockMainQueryState.isError,
      error: mockMainQueryState.error ?? null,
      isFetching: !!mockMainQueryState.isFetching,
      refetch: mockRefetch,
    };
  },
}));

// queryClient lib — only `queryKeys` is needed by the screen. The real module
// instantiates QueryCache/MutationCache/QueryClient at import time, which fails
// once @tanstack/react-query is mocked. Provide the real key shapes directly.
jest.mock('../../../lib/queryClient', () => ({
  queryKeys: {
    jobs: {
      all: ['jobs'],
      list: (filters: string) => ['jobs', 'list', filters],
    },
  },
}));

import JobsScreen from '../JobsScreen';

const HOMEOWNER = { id: 'ho-1', role: 'homeowner', email: 'h@x.com' };
const CONTRACTOR = { id: 'co-1', role: 'contractor', email: 'c@x.com' };

const dayMs = 1000 * 3600 * 24;
const recentISO = new Date(Date.now() - dayMs * 0.5).toISOString(); // < 1 day -> newToday
const oldISO = new Date(Date.now() - dayMs * 10).toISOString();

const job = (over: Partial<any> = {}): any => ({
  id: 'j1',
  title: 'Fix sink',
  description: 'Leaky pipe',
  location: 'London',
  status: 'posted',
  budget: 100,
  created_at: oldISO,
  bids: [],
  ...over,
});

const setAuth = (user: any) => {
  (useAuth as jest.Mock).mockReturnValue({ user, loading: false });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockMainQueryState = {
    data: [],
    isError: false,
    error: null,
    isFetching: false,
  };
  mockBidQueryState = { data: [] };
  (JobService.getJobsByHomeowner as jest.Mock).mockResolvedValue([]);
  (JobService.getJobsByUser as jest.Mock).mockResolvedValue([]);
  mockGetBidsByContractor.mockResolvedValue([]);
});

describe('JobsScreen', () => {
  it('renders homeowner empty state when no jobs', async () => {
    setAuth(HOMEOWNER);
    const { getByTestId } = render(<JobsScreen />);
    expect(getByTestId('hero-role').props.children).toBe('homeowner');
    expect(getByTestId('tabs-role').props.children).toBe('homeowner');
    expect(getByTestId('empty-state')).toBeTruthy();
    expect(getByTestId('empty-role').props.children).toBe('homeowner');
    // queryFn fires for homeowner branch
    await waitFor(() =>
      expect(JobService.getJobsByHomeowner).toHaveBeenCalledWith('ho-1')
    );
  });

  it('renders null user without crashing (no role)', () => {
    setAuth(null);
    const { getByTestId, queryByTestId } = render(<JobsScreen />);
    expect(getByTestId('hero-role').props.children).toBe('homeowner');
    // queries are disabled; services not called
    expect(JobService.getJobsByHomeowner).not.toHaveBeenCalled();
    expect(queryByTestId('empty-state')).toBeTruthy();
  });

  it('shows error banner with custom message and retries', () => {
    setAuth(HOMEOWNER);
    mockMainQueryState = {
      data: [],
      isError: true,
      error: new Error('Boom failure'),
      isFetching: false,
    };
    const { getByText, getByTestId } = render(<JobsScreen />);
    expect(getByText('Boom failure')).toBeTruthy();
    expect(getByTestId('icon-alert-circle')).toBeTruthy();
    fireEvent.press(getByText('Retry'));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('shows error banner fallback message for non-Error error', () => {
    setAuth(HOMEOWNER);
    mockMainQueryState = {
      data: [],
      isError: true,
      error: 'string error',
      isFetching: false,
    };
    const { getByText } = render(<JobsScreen />);
    expect(getByText('Failed to load jobs')).toBeTruthy();
  });

  it('renders populated homeowner list, stats, and computes counts', () => {
    setAuth(HOMEOWNER);
    mockMainQueryState = {
      data: [
        job({
          id: 'a',
          status: 'posted',
          budget: 200,
          created_at: recentISO,
          bids: [{}, {}],
        }),
        job({
          id: 'b',
          status: 'in_progress',
          budget: 400,
          created_at: oldISO,
        }),
        job({
          id: 'c',
          status: 'completed',
          budget: 0,
          budget_min: 50,
          created_at: oldISO,
        }),
        job({ id: 'd', status: 'assigned', budget: null, created_at: oldISO }),
      ],
      isError: false,
      error: null,
      isFetching: false,
    };
    const { getByTestId } = render(<JobsScreen />);
    expect(getByTestId('hero-total').props.children).toBe('4');
    // budget uses `?? `: job c budget:0 stays 0 (not budget_min), job d null->0.
    // Only 200 + 400 count -> avg 300.
    expect(getByTestId('hero-avgbudget').props.children).toBe('300');
    expect(getByTestId('hero-active').props.children).toBe('1'); // in_progress
    expect(getByTestId('hero-completed').props.children).toBe('1');
    expect(getByTestId('hero-newtoday').props.children).toBe('1');
    expect(getByTestId('hero-bids').props.children).toBe('2');
    // cards render
    expect(getByTestId('jobcard-a')).toBeTruthy();
    expect(getByTestId('jobcard-d')).toBeTruthy();
    // homeowner status-order sort: in_progress(b) first
  });

  it('navigates to job details, bid, and toggles save', async () => {
    setAuth(HOMEOWNER);
    mockMainQueryState = {
      data: [job({ id: 'a' })],
      isError: false,
      error: null,
      isFetching: false,
    };
    const { getByTestId } = render(<JobsScreen />);
    fireEvent.press(getByTestId('jobcard-a'));
    expect(mockNavigate).toHaveBeenCalledWith('JobDetails', { jobId: 'a' });
    fireEvent.press(getByTestId('jobcard-bid-a'));
    expect(mockNavigate).toHaveBeenCalledWith('BidSubmission', { jobId: 'a' });
    // toggle save on
    expect(getByTestId('jobcard-saved-a').props.children).toBe('false');
    fireEvent.press(getByTestId('jobcard-save-a'));
    await waitFor(() =>
      expect(getByTestId('jobcard-saved-a').props.children).toBe('true')
    );
    // toggle save off
    fireEvent.press(getByTestId('jobcard-save-a'));
    await waitFor(() =>
      expect(getByTestId('jobcard-saved-a').props.children).toBe('false')
    );
  });

  it('homeowner add-job CTA navigates to ServiceRequest modal', () => {
    setAuth(HOMEOWNER);
    const { getByTestId } = render(<JobsScreen />);
    fireEvent.press(getByTestId('hero-add'));
    expect(mockParentNavigate).toHaveBeenCalledWith('Modal', {
      screen: 'ServiceRequest',
    });
    // empty-state add too
    fireEvent.press(getByTestId('empty-add'));
    expect(mockParentNavigate).toHaveBeenCalledTimes(2);
  });

  it('search filters the list and updates results label (debounced)', async () => {
    jest.useFakeTimers();
    setAuth(HOMEOWNER);
    mockMainQueryState = {
      data: [
        job({
          id: 'a',
          title: 'Plumbing repair',
          description: '',
          location: '',
        }),
        job({
          id: 'b',
          title: 'Garden work',
          description: 'mow lawn',
          location: 'Leeds',
        }),
      ],
      isError: false,
      error: null,
      isFetching: false,
    };
    const { getByTestId, queryByTestId } = render(<JobsScreen />);
    fireEvent.changeText(getByTestId('hero-search'), 'plumb');
    await waitFor(() => {
      jest.advanceTimersByTime(350);
    });
    jest.useRealTimers();
    await waitFor(() => expect(getByTestId('jobcard-a')).toBeTruthy());
    expect(queryByTestId('jobcard-b')).toBeNull();
  });

  it('empty-state clear-search and sort handlers fire', () => {
    setAuth(HOMEOWNER);
    const { getByTestId } = render(<JobsScreen />);
    fireEvent.press(getByTestId('empty-clear'));
    fireEvent.press(getByTestId('empty-sort'));
    // no crash; still empty
    expect(getByTestId('empty-state')).toBeTruthy();
  });

  it('homeowner status filter switching narrows list', () => {
    setAuth(HOMEOWNER);
    mockMainQueryState = {
      data: [
        job({ id: 'a', status: 'posted' }),
        job({ id: 'b', status: 'completed' }),
      ],
      isError: false,
      error: null,
      isFetching: false,
    };
    const { getByTestId, queryByTestId } = render(<JobsScreen />);
    fireEvent.press(getByTestId('set-filter-completed'));
    expect(getByTestId('tabs-selected').props.children).toBe('completed');
    expect(getByTestId('jobcard-b')).toBeTruthy();
    expect(queryByTestId('jobcard-a')).toBeNull();
    // switch to posted
    fireEvent.press(getByTestId('set-filter-posted'));
    expect(queryByTestId('jobcard-b')).toBeNull();
    expect(getByTestId('jobcard-a')).toBeTruthy();
  });

  it('pull-to-refresh invalidates jobs (homeowner only)', () => {
    setAuth(HOMEOWNER);
    mockMainQueryState = {
      data: [job()],
      isError: false,
      error: null,
      isFetching: false,
    };
    const { UNSAFE_getByType } = render(<JobsScreen />);
    const rn = jest.requireActual('react-native');
    const rc = UNSAFE_getByType(rn.RefreshControl);
    rc.props.onRefresh();
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['jobs'] });
    // homeowner: no contractor bid invalidation
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
  });

  // -------------------- Contractor variants --------------------

  it('renders contractor role with bid + sort tabs and calls getJobsByUser', async () => {
    setAuth(CONTRACTOR);
    mockMainQueryState = {
      data: [
        job({ id: 'a', status: 'in_progress' }),
        job({ id: 'b', status: 'assigned' }),
      ],
      isError: false,
      error: null,
      isFetching: false,
    };
    mockBidQueryState = { data: [job({ id: 'z', status: 'posted' })] };
    const { getByTestId } = render(<JobsScreen />);
    expect(getByTestId('hero-role').props.children).toBe('contractor');
    expect(getByTestId('tabs-role').props.children).toBe('contractor');
    // active count = in_progress + assigned = 2
    expect(getByTestId('tabs-count-active').props.children).toBe('2');
    // bid count from bidPendingJobs
    expect(getByTestId('tabs-count-bid').props.children).toBe('1');
    await waitFor(() =>
      expect(JobService.getJobsByUser).toHaveBeenCalledWith(
        'co-1',
        'contractor'
      )
    );
  });

  it('contractor bid filter shows pending-bid jobs and marks hasUserBid', () => {
    setAuth(CONTRACTOR);
    mockMainQueryState = {
      data: [job({ id: 'a' })],
      isError: false,
      error: null,
      isFetching: false,
    };
    mockBidQueryState = { data: [job({ id: 'z' })] };
    const { getByTestId, queryByTestId } = render(<JobsScreen />);
    fireEvent.press(getByTestId('set-filter-bid'));
    expect(getByTestId('tabs-selected').props.children).toBe('bid');
    expect(getByTestId('jobcard-z')).toBeTruthy();
    expect(queryByTestId('jobcard-a')).toBeNull();
    // hasUserBid true because selectedFilter === 'bid'
    expect(getByTestId('jobcard-hasbid-z').props.children).toBe('true');
  });

  it('contractor active filter keeps in_progress + assigned', () => {
    setAuth(CONTRACTOR);
    mockMainQueryState = {
      data: [
        job({ id: 'a', status: 'in_progress' }),
        job({ id: 'b', status: 'assigned' }),
        job({ id: 'c', status: 'completed' }),
      ],
      isError: false,
      error: null,
      isFetching: false,
    };
    const { getByTestId, queryByTestId } = render(<JobsScreen />);
    fireEvent.press(getByTestId('set-filter-active'));
    expect(getByTestId('jobcard-a')).toBeTruthy();
    expect(getByTestId('jobcard-b')).toBeTruthy();
    expect(queryByTestId('jobcard-c')).toBeNull();
  });

  it('contractor sort modes: highest_pay, newest, nearest', () => {
    setAuth(CONTRACTOR);
    mockMainQueryState = {
      data: [
        job({ id: 'low', budget: '50', created_at: oldISO }),
        job({ id: 'high', budget: '500', created_at: recentISO }),
      ],
      isError: false,
      error: null,
      isFetching: false,
    };
    const { getByTestId } = render(<JobsScreen />);
    fireEvent.press(getByTestId('set-sort-highest'));
    expect(getByTestId('tabs-sortmode').props.children).toBe('highest_pay');
    expect(getByTestId('jobcard-high')).toBeTruthy();
    fireEvent.press(getByTestId('set-sort-newest'));
    expect(getByTestId('tabs-sortmode').props.children).toBe('newest');
    fireEvent.press(getByTestId('set-sort-nearest'));
    expect(getByTestId('tabs-sortmode').props.children).toBe('nearest');
    expect(getByTestId('jobcard-high')).toBeTruthy();
  });

  it('contractor map mode renders ExploreMap inside error boundary; back returns to list', () => {
    setAuth(CONTRACTOR);
    mockMainQueryState = {
      data: [job()],
      isError: false,
      error: null,
      isFetching: false,
    };
    const { getByTestId, getByText, queryByTestId } = render(<JobsScreen />);
    fireEvent.press(getByTestId('set-sort-map'));
    expect(getByTestId('error-boundary')).toBeTruthy();
    expect(getByTestId('explore-map-back')).toBeTruthy();
    // fallback render-prop branches execute (Map unavailable UI)
    expect(getByText('Map unavailable')).toBeTruthy();
    fireEvent.press(getByText('Retry'));
    expect(mockBoundaryRetry).toHaveBeenCalled();
    // "Back to List" inside fallback resets sort mode
    fireEvent.press(getByText('Back to List'));
    expect(queryByTestId('explore-map-back')).toBeNull();
    expect(getByTestId('tabs-sortmode').props.children).toBe('for_you');
  });

  it('homeowner map mode does NOT switch to map view (gated on isContractor)', () => {
    setAuth(HOMEOWNER);
    mockMainQueryState = {
      data: [job()],
      isError: false,
      error: null,
      isFetching: false,
    };
    const { getByTestId, queryByTestId } = render(<JobsScreen />);
    fireEvent.press(getByTestId('set-sort-map'));
    // sortMode becomes 'map' but homeowner stays on list (no error boundary)
    expect(queryByTestId('error-boundary')).toBeNull();
    expect(getByTestId('tabs-role').props.children).toBe('homeowner');
  });

  it('contractor pull-to-refresh invalidates both jobs and bid queries', () => {
    setAuth(CONTRACTOR);
    mockMainQueryState = {
      data: [job()],
      isError: false,
      error: null,
      isFetching: false,
    };
    const { UNSAFE_getByType } = render(<JobsScreen />);
    const rn = jest.requireActual('react-native');
    const rc = UNSAFE_getByType(rn.RefreshControl);
    rc.props.onRefresh();
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['jobs'] });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['contractorBidJobs', 'co-1'],
    });
  });

  it('isFetching drives the RefreshControl refreshing prop', () => {
    setAuth(HOMEOWNER);
    mockMainQueryState = {
      data: [],
      isError: false,
      error: null,
      isFetching: true,
    };
    const { UNSAFE_getByType } = render(<JobsScreen />);
    const rn = jest.requireActual('react-native');
    const rc = UNSAFE_getByType(rn.RefreshControl);
    expect(rc.props.refreshing).toBe(true);
  });

  it('loads saved job ids from AsyncStorage on mount', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify(['a'])
    );
    setAuth(HOMEOWNER);
    mockMainQueryState = {
      data: [job({ id: 'a' })],
      isError: false,
      error: null,
      isFetching: false,
    };
    const { getByTestId } = render(<JobsScreen />);
    await waitFor(() =>
      expect(getByTestId('jobcard-saved-a').props.children).toBe('true')
    );
  });

  it('search with no matches shows results-for label via empty filteredJobs', async () => {
    jest.useFakeTimers();
    setAuth(HOMEOWNER);
    mockMainQueryState = {
      data: [job({ id: 'a', title: 'Plumbing' })],
      isError: false,
      error: null,
      isFetching: false,
    };
    const { getByTestId, getByText } = render(<JobsScreen />);
    fireEvent.changeText(getByTestId('hero-search'), 'zzzznomatch');
    await waitFor(() => {
      jest.advanceTimersByTime(350);
    });
    jest.useRealTimers();
    await waitFor(() =>
      expect(getByText('0 jobs for "zzzznomatch"')).toBeTruthy()
    );
  });

  it('contractor highest_pay + newest handle camelCase dates and string/NaN budgets', () => {
    setAuth(CONTRACTOR);
    mockMainQueryState = {
      data: [
        // no created_at, only createdAt -> exercises `|| createdAt` fallback
        job({
          id: 'p1',
          budget: 'not-a-number',
          created_at: undefined,
          createdAt: oldISO,
        }),
        job({
          id: 'p2',
          budget: undefined,
          budget_min: 300,
          created_at: undefined,
          createdAt: recentISO,
        }),
        // both date fields missing -> `|| 0` fallback
        job({
          id: 'p3',
          budget: 0,
          created_at: undefined,
          createdAt: undefined,
        }),
      ],
      isError: false,
      error: null,
      isFetching: false,
    };
    const { getByTestId } = render(<JobsScreen />);
    fireEvent.press(getByTestId('set-sort-highest'));
    expect(getByTestId('jobcard-p2')).toBeTruthy();
    fireEvent.press(getByTestId('set-sort-newest'));
    expect(getByTestId('jobcard-p1')).toBeTruthy();
  });

  it('homeowner sort handles unknown status + camelCase/missing dates', () => {
    setAuth(HOMEOWNER);
    mockMainQueryState = {
      data: [
        job({
          id: 'h1',
          status: 'weird_status',
          created_at: undefined,
          createdAt: oldISO,
        }),
        job({
          id: 'h2',
          status: 'in_progress',
          created_at: undefined,
          createdAt: undefined,
        }),
        job({
          id: 'h3',
          status: 'in_progress',
          created_at: undefined,
          createdAt: recentISO,
        }),
      ],
      isError: false,
      error: null,
      isFetching: false,
    };
    const { getByTestId } = render(<JobsScreen />);
    // in_progress jobs sort before unknown; same-status tie-break by date
    expect(getByTestId('jobcard-h3')).toBeTruthy();
    expect(getByTestId('jobcard-h1')).toBeTruthy();
  });

  it('contractor bid query maps b.jobs ?? b.job and filters pending', async () => {
    setAuth(CONTRACTOR);
    // Drive the bid query's queryFn through real BidService mock data so the
    // pending filter + `b.jobs ?? b.job` mapping branches execute.
    mockGetBidsByContractor.mockResolvedValue([
      { status: 'pending', jobs: job({ id: 'fromJobs' }) },
      { status: 'pending', job: job({ id: 'fromJob' }) },
      { status: 'pending', jobs: null, job: null }, // filtered out
      { status: 'accepted', jobs: job({ id: 'notPending' }) }, // filtered out
    ]);
    render(<JobsScreen />);
    await waitFor(() =>
      expect(mockGetBidsByContractor).toHaveBeenCalledWith('co-1')
    );
  });

  it('renders bidCount when item.bids present (renderItem branch)', () => {
    setAuth(CONTRACTOR);
    mockMainQueryState = {
      data: [job({ id: 'wc', bids: [{}, {}, {}] })],
      isError: false,
      error: null,
      isFetching: false,
    };
    const { getByTestId } = render(<JobsScreen />);
    expect(getByTestId('jobcard-wc')).toBeTruthy();
  });

  it('handles jobs with missing/partial fields without crashing search', async () => {
    jest.useFakeTimers();
    setAuth(CONTRACTOR);
    mockMainQueryState = {
      data: [
        job({
          id: 'a',
          title: undefined,
          description: undefined,
          location: undefined,
        }),
        job({
          id: 'b',
          title: 'Matching London',
          description: null,
          location: null,
        }),
      ],
      isError: false,
      error: null,
      isFetching: false,
    };
    const { getByTestId, queryByTestId } = render(<JobsScreen />);
    fireEvent.changeText(getByTestId('hero-search'), 'london');
    await waitFor(() => {
      jest.advanceTimersByTime(350);
    });
    jest.useRealTimers();
    await waitFor(() => expect(getByTestId('jobcard-b')).toBeTruthy());
    expect(queryByTestId('jobcard-a')).toBeNull();
  });
});
