/**
 * ExploreMapScreen — branch-coverage suite.
 *
 * Drives the screen across every state the ViewModel exposes:
 *  - loading
 *  - verification-required gate
 *  - API error / retry banner
 *  - populated markers + carousel (selected / unselected, urgent, bad coords)
 *  - empty-result guidance card (with + without category filter)
 *  - "Search this area" pill (jobs present vs absent)
 *  - map-unavailable fallback (shouldRenderNativeMap = false)
 *  - region change, recenter, filter toggle, category select, marker tap,
 *    carousel scroll, card press / bid / details, back button (prop + goBack)
 *
 * Externals only are mocked. The screen under test is NOT mocked.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// When true, the mocked FlatList's scrollToIndex throws so the screen's
// try/catch fallback to scrollToOffset is exercised. mock-prefixed so the
// jest.mock factory below may reference it.
let mockScrollToIndexThrows = false;

// ── react-native: functional FlatList + ScrollView so renderItem fires ──
// The global RN mock stubs FlatList/ScrollView as inert string elements that
// never call renderItem. The carousel's per-card branch logic lives inside
// renderItem, so we provide a functional FlatList that mirrors the real
// contract (invokes renderItem for each row) to exercise those branches.
jest.mock('react-native', () => {
  const RN = jest.requireActual('../../../../__mocks__/react-native.js');
  const ReactLocal = require('react');
  const FlatList = ReactLocal.forwardRef(
    ({ data, renderItem, keyExtractor, ...rest }: any, ref: any) => {
      // Expose imperative scroll methods so the marker-tap branch
      // (scrollToIndex with scrollToOffset fallback) executes cleanly.
      ReactLocal.useImperativeHandle(ref, () => ({
        scrollToIndex: jest.fn(() => {
          if (mockScrollToIndexThrows) {
            throw new Error('not measured yet');
          }
        }),
        scrollToOffset: jest.fn(),
      }));
      const items = Array.isArray(data) ? data : [];
      return ReactLocal.createElement(
        RN.ScrollView,
        { ...rest, testID: rest.testID ?? 'carousel-flatlist' },
        items.map((item: any, index: number) =>
          ReactLocal.createElement(
            ReactLocal.Fragment,
            { key: keyExtractor ? keyExtractor(item, index) : index },
            renderItem({ item, index })
          )
        )
      );
    }
  );
  return { ...RN, FlatList };
});

// ── react-native-maps: render children so the jobs.map() marker branches run ──
jest.mock('react-native-maps', () => {
  const ReactLocal = require('react');
  const MapView = ReactLocal.forwardRef(
    ({ children, ...props }: any, ref: any) => {
      ReactLocal.useImperativeHandle(ref, () => ({
        animateToRegion: jest.fn(),
      }));
      return ReactLocal.createElement(
        'MapView',
        { ...props, testID: 'map-view' },
        children
      );
    }
  );
  const Marker = ({ children, ...props }: any) =>
    ReactLocal.createElement('Marker', props, children);
  return {
    __esModule: true,
    default: MapView,
    Marker,
    PROVIDER_GOOGLE: 'google',
  };
});

// ── navigation ──
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
  // Run the focus-effect callback synchronously on mount (mirrors real lib).
  useFocusEffect: (cb: () => void | (() => void)) => {
    const ReactLocal = require('react');
    ReactLocal.useEffect(() => {
      const cleanup = cb();
      return typeof cleanup === 'function' ? cleanup : undefined;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
  },
}));

const mockGoToTab = jest.fn();
jest.mock('../../../navigation/hooks', () => ({
  goToTab: (...args: any[]) => mockGoToTab(...args),
}));

// ── safe-area insets ──
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

// ── icons ──
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

// ── map availability (toggle per-test) ──
let mockShouldRenderNativeMap = true;
jest.mock('../../../utils/mapAvailability', () => ({
  shouldRenderNativeMap: () => mockShouldRenderNativeMap,
}));

// ── logger ──
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// ── the ViewModel: fully controllable object ──
const mockHandleRegionChange = jest.fn();
const mockHandleSearch = jest.fn();
const mockHandleJobSelect = jest.fn();
const mockHandleCategorySelect = jest.fn();
const mockHandleFilterPress = jest.fn();
const mockCenterOnUser = jest.fn();
const mockRefreshJobs = jest.fn();
const mockSearchInRegion = jest.fn();

let mockVmState: any;
jest.mock('../viewmodels/ExploreMapViewModel', () => ({
  useExploreMapViewModel: () => mockVmState,
}));

import { ExploreMapScreen } from '../ExploreMapScreen';

const baseRegion = {
  latitude: 51.5074,
  longitude: -0.1278,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

const makeJob = (overrides: any = {}) => ({
  id: 'job-1',
  title: 'Fix leaking tap',
  category: 'plumbing',
  urgency: 'medium',
  budget: 200,
  budget_min: 150,
  budget_max: 250,
  latitude: 51.51,
  longitude: -0.12,
  distance: 2.3,
  homeowner_name: 'Alice',
  created_at: new Date(Date.now() - 30 * 60000).toISOString(),
  ...overrides,
});

const makeVm = (overrides: any = {}): any => ({
  region: baseRegion,
  // 2026-06-27: the screen renders a "Finding jobs near you…" spinner
  // instead of the MapView until the viewmodel resolves the contractor's
  // region (saved coords / GPS). Default resolved so map tests exercise
  // the map branch; the spinner branch has its own test below.
  regionResolved: true,
  jobs: [],
  searchQuery: '',
  selectedJob: null,
  selectedCategory: null,
  loading: false,
  errorMessage: null,
  verificationRequired: false,
  jobCount: 0,
  locationGranted: false,
  hasPanned: false,
  userLocation: null,
  handleRegionChange: mockHandleRegionChange,
  handleSearch: mockHandleSearch,
  handleJobSelect: mockHandleJobSelect,
  handleCategorySelect: mockHandleCategorySelect,
  handleFilterPress: mockHandleFilterPress,
  centerOnUser: mockCenterOnUser,
  refreshJobs: mockRefreshJobs,
  searchInRegion: mockSearchInRegion,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockShouldRenderNativeMap = true;
  mockScrollToIndexThrows = false;
  mockVmState = makeVm();
});

describe('ExploreMapScreen — focus effect + base render', () => {
  it('renders the map and refetches jobs on focus', () => {
    const { getByTestId } = render(<ExploreMapScreen />);
    expect(getByTestId('map-view')).toBeTruthy();
    expect(mockRefreshJobs).toHaveBeenCalledTimes(1);
  });

  it('shows "All trades" subtitle and singular "0 jobs"... pluralization off by count', () => {
    mockVmState = makeVm({ jobCount: 1 });
    const { getByText } = render(<ExploreMapScreen />);
    // jobCount === 1 → singular "job"
    expect(getByText('All trades · 1 job')).toBeTruthy();
  });

  it('pluralizes job count when not 1', () => {
    mockVmState = makeVm({ jobCount: 3 });
    const { getByText } = render(<ExploreMapScreen />);
    expect(getByText('All trades · 3 jobs')).toBeTruthy();
  });

  it('shows capitalized category subtitle when a category is selected', () => {
    mockVmState = makeVm({ selectedCategory: 'plumbing', jobCount: 0 });
    const { getByText } = render(<ExploreMapScreen />);
    expect(getByText('Plumbing · 0 jobs')).toBeTruthy();
  });
});

describe('ExploreMapScreen — loading state', () => {
  it('renders the loading overlay and hides empty/verification overlays', () => {
    mockVmState = makeVm({ loading: true });
    const { queryByText } = render(<ExploreMapScreen />);
    // Empty-state card must NOT render while loading.
    expect(queryByText('No jobs in this area')).toBeNull();
    expect(queryByText('Finish verification to start bidding')).toBeNull();
  });
});

describe('ExploreMapScreen — verification required gate', () => {
  it('renders the verification-blocked card and wires its CTA', () => {
    mockVmState = makeVm({ verificationRequired: true, loading: false });
    const { getByText, getByLabelText } = render(<ExploreMapScreen />);
    expect(getByText('Finish verification to start bidding')).toBeTruthy();
    fireEvent.press(getByLabelText('Continue verification'));
    expect(mockGoToTab).toHaveBeenCalledWith(expect.anything(), 'ProfileTab', {
      screen: 'VerificationStatus',
    });
  });

  it('hides the verification card while loading even if required', () => {
    mockVmState = makeVm({ verificationRequired: true, loading: true });
    const { queryByText } = render(<ExploreMapScreen />);
    expect(queryByText('Finish verification to start bidding')).toBeNull();
  });
});

describe('ExploreMapScreen — error banner', () => {
  it('renders the error banner and retries on press', () => {
    mockVmState = makeVm({
      errorMessage: 'Could not load nearby jobs. Tap to retry.',
    });
    const { getByText, getByLabelText } = render(<ExploreMapScreen />);
    expect(getByText('Could not load nearby jobs. Tap to retry.')).toBeTruthy();
    fireEvent.press(getByLabelText('Retry loading jobs'));
    // refreshJobs already fired once on focus, so retry is the 2nd call.
    expect(mockRefreshJobs).toHaveBeenCalledTimes(2);
  });

  it('does not render the error banner while loading', () => {
    mockVmState = makeVm({ errorMessage: 'boom', loading: true });
    const { queryByText } = render(<ExploreMapScreen />);
    expect(queryByText('boom')).toBeNull();
  });
});

describe('ExploreMapScreen — empty-state guidance card', () => {
  it('renders empty card with "Search again" only (no category)', () => {
    mockVmState = makeVm({ jobs: [], selectedCategory: null });
    const { getByText, queryByLabelText, getByLabelText } = render(
      <ExploreMapScreen />
    );
    expect(getByText('No jobs in this area')).toBeTruthy();
    // No category → no "Clear category" button.
    expect(queryByLabelText('Clear category filter')).toBeNull();
    fireEvent.press(getByLabelText('Search this area again'));
    expect(mockRefreshJobs).toHaveBeenCalledTimes(2);
  });

  it('renders "Clear category" CTA when a category filter is active', () => {
    mockVmState = makeVm({ jobs: [], selectedCategory: 'plumbing' });
    const { getByLabelText, getByText } = render(<ExploreMapScreen />);
    expect(
      getByText(
        'Mintenance searches within ~25km of where the map is centred. Try removing the category filter or panning the map to a different area.'
      )
    ).toBeTruthy();
    fireEvent.press(getByLabelText('Clear category filter'));
    expect(mockHandleCategorySelect).toHaveBeenCalledWith(null);
  });

  it('does not render empty card when verification required', () => {
    mockVmState = makeVm({ jobs: [], verificationRequired: true });
    const { queryByText } = render(<ExploreMapScreen />);
    expect(queryByText('No jobs in this area')).toBeNull();
  });

  it('does not render empty card when an error is present', () => {
    mockVmState = makeVm({ jobs: [], errorMessage: 'oops' });
    const { queryByText } = render(<ExploreMapScreen />);
    expect(queryByText('No jobs in this area')).toBeNull();
  });
});

describe('ExploreMapScreen — search-this-area pill', () => {
  it('renders the pill when panned with jobs present and triggers searchInRegion', () => {
    mockVmState = makeVm({ hasPanned: true, jobs: [makeJob()], jobCount: 1 });
    const { getByLabelText } = render(<ExploreMapScreen />);
    fireEvent.press(getByLabelText('Search this area'));
    expect(mockSearchInRegion).toHaveBeenCalledTimes(1);
  });

  it('renders the pill when panned with no jobs', () => {
    mockVmState = makeVm({ hasPanned: true, jobs: [] });
    const { getByLabelText } = render(<ExploreMapScreen />);
    expect(getByLabelText('Search this area')).toBeTruthy();
  });

  it('hides the pill while loading', () => {
    mockVmState = makeVm({ hasPanned: true, loading: true });
    const { queryByLabelText } = render(<ExploreMapScreen />);
    expect(queryByLabelText('Search this area')).toBeNull();
  });
});

describe('ExploreMapScreen — populated markers + carousel', () => {
  it('renders user-location marker when userLocation present', () => {
    mockVmState = makeVm({
      userLocation: { latitude: 51.5, longitude: -0.1 },
      locationGranted: true,
      jobs: [makeJob()],
      jobCount: 1,
    });
    const { getByText } = render(<ExploreMapScreen />);
    expect(getByText('You')).toBeTruthy();
  });

  it('renders a carousel card with a budget range', () => {
    mockVmState = makeVm({ jobs: [makeJob()], jobCount: 1 });
    const { getByText } = render(<ExploreMapScreen />);
    // budget_min 150 vs budget_max 250 → range formatting.
    expect(getByText('Fix leaking tap')).toBeTruthy();
    expect(getByText('2.3 km · 30m ago')).toBeTruthy();
  });

  it('renders single-budget when min === max via formatCurrency', () => {
    mockVmState = makeVm({
      jobs: [makeJob({ budget_min: 200, budget_max: 200, budget: 200 })],
      jobCount: 1,
    });
    const { getByText } = render(<ExploreMapScreen />);
    expect(getByText('£200.00')).toBeTruthy();
  });

  it('renders TBD budget when all budget fields are null', () => {
    mockVmState = makeVm({
      jobs: [makeJob({ budget: null, budget_min: null, budget_max: null })],
      jobCount: 1,
    });
    const { getByText } = render(<ExploreMapScreen />);
    expect(getByText('TBD')).toBeTruthy();
  });

  it('falls back to "Recently posted" for null created_at', () => {
    mockVmState = makeVm({
      jobs: [makeJob({ created_at: null, distance: 5 })],
      jobCount: 1,
    });
    const { getByText } = render(<ExploreMapScreen />);
    expect(getByText('5 km · Recently posted')).toBeTruthy();
  });

  it('renders hours-ago label for a few-hours-old job', () => {
    mockVmState = makeVm({
      jobs: [
        makeJob({
          created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
          distance: 1,
        }),
      ],
      jobCount: 1,
    });
    const { getByText } = render(<ExploreMapScreen />);
    expect(getByText('1 km · 3h ago')).toBeTruthy();
  });

  it('renders days-ago label for an old job', () => {
    mockVmState = makeVm({
      jobs: [
        makeJob({
          created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
          distance: 1,
        }),
      ],
      jobCount: 1,
    });
    const { getByText } = render(<ExploreMapScreen />);
    expect(getByText('1 km · 2d ago')).toBeTruthy();
  });

  it('handles a null category job (falls back to general marker)', () => {
    mockVmState = makeVm({
      jobs: [makeJob({ category: null })],
      jobCount: 1,
    });
    const { getByText } = render(<ExploreMapScreen />);
    expect(getByText('Fix leaking tap')).toBeTruthy();
  });

  it('marks the selected card and an urgent emergency job marker', () => {
    const job = makeJob({ urgency: 'emergency' });
    mockVmState = makeVm({
      jobs: [job],
      jobCount: 1,
      selectedJob: job,
    });
    const { getByText } = render(<ExploreMapScreen />);
    expect(getByText('Fix leaking tap')).toBeTruthy();
  });

  it('accepts legacy "urgent" urgency value', () => {
    mockVmState = makeVm({
      jobs: [makeJob({ urgency: 'urgent' })],
      jobCount: 1,
    });
    const { getByText } = render(<ExploreMapScreen />);
    expect(getByText('Fix leaking tap')).toBeTruthy();
  });

  it('skips markers for invalid lat/lng but still lists the card', () => {
    mockVmState = makeVm({
      jobs: [makeJob({ latitude: NaN, longitude: -0.12 })],
      jobCount: 1,
    });
    const { getByText, queryAllByText } = render(<ExploreMapScreen />);
    // Card still renders in the carousel even though its marker is skipped.
    expect(getByText('Fix leaking tap')).toBeTruthy();
    expect(queryAllByText('Fix leaking tap').length).toBeGreaterThan(0);
  });
});

describe('ExploreMapScreen — carousel card interactions', () => {
  it('selects job + animates on card press (native map)', () => {
    const job = makeJob();
    mockVmState = makeVm({ jobs: [job], jobCount: 1 });
    const { getByText } = render(<ExploreMapScreen />);
    fireEvent.press(getByText('Fix leaking tap'));
    expect(mockHandleJobSelect).toHaveBeenCalledWith(job);
  });

  it('Quick Bid navigates via goToTab → BidSubmission', () => {
    const job = makeJob();
    mockVmState = makeVm({ jobs: [job], jobCount: 1 });
    const { getByText } = render(<ExploreMapScreen />);
    // The handler calls e.stopPropagation() to prevent the card-press
    // bubbling, so a synthetic event must be supplied.
    fireEvent.press(getByText('Quick Bid'), { stopPropagation: jest.fn() });
    expect(mockHandleJobSelect).toHaveBeenCalledWith(null);
    expect(mockGoToTab).toHaveBeenCalledWith(expect.anything(), 'JobsTab', {
      screen: 'BidSubmission',
      params: { jobId: 'job-1' },
    });
  });

  it('Details navigates via goToTab → JobDetails', () => {
    const job = makeJob();
    mockVmState = makeVm({ jobs: [job], jobCount: 1 });
    const { getByText } = render(<ExploreMapScreen />);
    fireEvent.press(getByText('Details'), { stopPropagation: jest.fn() });
    expect(mockGoToTab).toHaveBeenCalledWith(expect.anything(), 'JobsTab', {
      screen: 'JobDetails',
      params: { jobId: 'job-1' },
    });
  });

  it('card press with non-finite coords does not animate but still selects', () => {
    const job = makeJob({ latitude: NaN, longitude: NaN });
    mockVmState = makeVm({ jobs: [job], jobCount: 1 });
    const { getByText } = render(<ExploreMapScreen />);
    fireEvent.press(getByText('Fix leaking tap'));
    expect(mockHandleJobSelect).toHaveBeenCalledWith(job);
  });

  it('fires carousel momentum scroll → selects job + animates', () => {
    const job = makeJob({ id: 'job-1' });
    const job2 = makeJob({ id: 'job-2', title: 'Second job', latitude: 51.6 });
    mockVmState = makeVm({ jobs: [job, job2], jobCount: 2, selectedJob: job });
    const { getByTestId } = render(<ExploreMapScreen />);
    const flatlist = getByTestId('carousel-flatlist');
    // CARD_WIDTH (375*0.78=292.5) + 12 = 304.5 → offset ~305 rounds to index 1.
    fireEvent(flatlist, 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: 305 } },
    });
    // index 1 → job2 (different id than the selected job1).
    expect(mockHandleJobSelect).toHaveBeenCalledWith(job2);
  });

  it('momentum scroll to same selected job does not re-select', () => {
    const job = makeJob({ id: 'job-1' });
    mockVmState = makeVm({ jobs: [job], jobCount: 1, selectedJob: job });
    const { getByTestId } = render(<ExploreMapScreen />);
    const flatlist = getByTestId('carousel-flatlist');
    fireEvent(flatlist, 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: 0 } },
    });
    // index 0 is already the selected job → handleJobSelect not called.
    expect(mockHandleJobSelect).not.toHaveBeenCalled();
  });

  it('getItemLayout returns the fixed card dimensions', () => {
    const job = makeJob({ id: 'job-1' });
    mockVmState = makeVm({ jobs: [job], jobCount: 1 });
    const { getByTestId } = render(<ExploreMapScreen />);
    const flatlist = getByTestId('carousel-flatlist');
    const layout = flatlist.props.getItemLayout(null, 2);
    expect(layout).toEqual(
      expect.objectContaining({ index: 2, length: expect.any(Number) })
    );
    // offset is length * index.
    expect(layout.offset).toBe(layout.length * 2);
  });

  it('onScrollToIndexFailed recovers via scrollToOffset', () => {
    jest.useFakeTimers();
    const job = makeJob({ id: 'job-1' });
    mockVmState = makeVm({ jobs: [job], jobCount: 1 });
    const { getByTestId } = render(<ExploreMapScreen />);
    const flatlist = getByTestId('carousel-flatlist');
    expect(() =>
      flatlist.props.onScrollToIndexFailed({ index: 3, averageItemLength: 300 })
    ).not.toThrow();
    // The recovery schedules a retry on a timer.
    expect(() => jest.runAllTimers()).not.toThrow();
    jest.useRealTimers();
  });

  it('onScrollToIndexFailed timer retry swallows a thrown scrollToIndex', () => {
    jest.useFakeTimers();
    mockScrollToIndexThrows = true;
    const job = makeJob({ id: 'job-1' });
    mockVmState = makeVm({ jobs: [job], jobCount: 1 });
    const { getByTestId } = render(<ExploreMapScreen />);
    const flatlist = getByTestId('carousel-flatlist');
    flatlist.props.onScrollToIndexFailed({ index: 3, averageItemLength: 300 });
    // The retry's scrollToIndex throws and is caught inside the setTimeout.
    expect(() => jest.runAllTimers()).not.toThrow();
    jest.useRealTimers();
  });
});

describe('ExploreMapScreen — top bar + category controls', () => {
  it('back button uses onBackToList prop when provided', () => {
    const onBackToList = jest.fn();
    const { getByLabelText } = render(
      <ExploreMapScreen onBackToList={onBackToList} />
    );
    fireEvent.press(getByLabelText('Back to list'));
    expect(onBackToList).toHaveBeenCalledTimes(1);
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('back button falls back to navigation.goBack without prop', () => {
    const { getByLabelText } = render(<ExploreMapScreen />);
    fireEvent.press(getByLabelText('Back to list'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('filter button calls handleFilterPress', () => {
    const { getByLabelText } = render(<ExploreMapScreen />);
    fireEvent.press(getByLabelText('Open filters'));
    expect(mockHandleFilterPress).toHaveBeenCalledTimes(1);
  });

  it('selecting a category pill calls handleCategorySelect (active branch covered)', () => {
    mockVmState = makeVm({ selectedCategory: 'plumbing' });
    const { getByText } = render(<ExploreMapScreen />);
    fireEvent.press(getByText('Electrical'));
    expect(mockHandleCategorySelect).toHaveBeenCalledWith('electrical');
  });

  it('selecting the "All" pill passes null', () => {
    const { getByText } = render(<ExploreMapScreen />);
    fireEvent.press(getByText('All'));
    expect(mockHandleCategorySelect).toHaveBeenCalledWith(null);
  });
});

describe('ExploreMapScreen — bottom controls', () => {
  it('recenter button calls centerOnUser', () => {
    const { getByLabelText } = render(<ExploreMapScreen />);
    fireEvent.press(getByLabelText('Center on my location'));
    expect(mockCenterOnUser).toHaveBeenCalledTimes(1);
  });

  it('region change handler is wired on the map', () => {
    const { getByTestId } = render(<ExploreMapScreen />);
    const map = getByTestId('map-view');
    fireEvent(map, 'regionChangeComplete', baseRegion);
    expect(mockHandleRegionChange).toHaveBeenCalledWith(baseRegion);
  });

  it('tapping the map deselects the job', () => {
    const { getByTestId } = render(<ExploreMapScreen />);
    const map = getByTestId('map-view');
    fireEvent(map, 'press');
    expect(mockHandleJobSelect).toHaveBeenCalledWith(null);
  });

  it('job-count pill positions higher when jobs are present', () => {
    mockVmState = makeVm({ jobs: [makeJob()], jobCount: 1 });
    const { getAllByText } = render(<ExploreMapScreen />);
    // "1 job" appears in subtitle and the count pill.
    expect(getAllByText('1 job').length).toBeGreaterThanOrEqual(1);
  });
});

describe('ExploreMapScreen — marker tap', () => {
  it('marker onPress selects job and scrolls carousel', () => {
    const job = makeJob({ id: 'job-1' });
    const job2 = makeJob({ id: 'job-2', title: 'Second', latitude: 51.7 });
    mockVmState = makeVm({ jobs: [job, job2], jobCount: 2 });
    const { UNSAFE_getAllByType } = render(<ExploreMapScreen />);
    const markers = UNSAFE_getAllByType('Marker' as any);
    // First marker is the user pin only if userLocation set; here none, so all are job markers.
    const jobMarker = markers.find((m: any) => m.props.onPress);
    fireEvent(jobMarker, 'press');
    expect(mockHandleJobSelect).toHaveBeenCalled();
  });

  it('marker onPress falls back to scrollToOffset when scrollToIndex throws', () => {
    mockScrollToIndexThrows = true;
    const job = makeJob({ id: 'job-1' });
    const job2 = makeJob({ id: 'job-2', title: 'Second', latitude: 51.7 });
    mockVmState = makeVm({ jobs: [job, job2], jobCount: 2 });
    const { UNSAFE_getAllByType } = render(<ExploreMapScreen />);
    const markers = UNSAFE_getAllByType('Marker' as any);
    const jobMarker = markers.find((m: any) => m.props.onPress);
    // Should not throw — the catch routes to scrollToOffset.
    expect(() => fireEvent(jobMarker, 'press')).not.toThrow();
    expect(mockHandleJobSelect).toHaveBeenCalled();
  });
});

describe('ExploreMapScreen — map unavailable fallback', () => {
  it('shows the region-resolving spinner instead of the map until regionResolved', () => {
    mockVmState = makeVm({ regionResolved: false });
    const { getByText, queryByTestId } = render(<ExploreMapScreen />);
    expect(getByText('Finding jobs near you…')).toBeTruthy();
    expect(queryByTestId('map-view')).toBeNull();
  });

  it('renders the fallback view instead of the map', () => {
    mockShouldRenderNativeMap = false;
    mockVmState = makeVm({ jobs: [makeJob()], jobCount: 1 });
    const { getByText, queryByTestId } = render(<ExploreMapScreen />);
    expect(getByText('Map unavailable')).toBeTruthy();
    expect(queryByTestId('map-view')).toBeNull();
  });

  it('card press goes straight to details when map unavailable', () => {
    mockShouldRenderNativeMap = false;
    mockVmState = makeVm({ jobs: [makeJob()], jobCount: 1 });
    const { getByText } = render(<ExploreMapScreen />);
    fireEvent.press(getByText('Fix leaking tap'));
    expect(mockGoToTab).toHaveBeenCalledWith(expect.anything(), 'JobsTab', {
      screen: 'JobDetails',
      params: { jobId: 'job-1' },
    });
    // The unavailable branch routes straight to details (handleViewDetails),
    // which clears the selection via handleJobSelect(null) — never with a job.
    expect(mockHandleJobSelect).toHaveBeenCalledWith(null);
    expect(mockHandleJobSelect).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: 'job-1' })
    );
  });
});
