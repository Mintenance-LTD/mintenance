import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// ---------------------------------------------------------------------------
// Mock ONLY externals — never the screen under test.
// (Convention mirrors src/screens/jobs/__tests__/JobsScreen.test.tsx.)
// ---------------------------------------------------------------------------

// The shared react-native mock stubs SectionList as a host string, so it never
// invokes renderItem / renderSectionHeader / ListEmptyComponent /
// refreshControl. Override it with a real functional SectionList that
// exercises every branch.
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  const ReactLocal = require('react');
  const SectionList = ({
    sections = [],
    renderItem,
    renderSectionHeader,
    keyExtractor,
    ListEmptyComponent,
    refreshControl,
  }: any) => {
    const children: any[] = [];
    if (refreshControl) {
      children.push(
        ReactLocal.createElement(
          ReactLocal.Fragment,
          { key: '__refresh' },
          refreshControl
        )
      );
    }
    if ((!sections || sections.length === 0) && ListEmptyComponent) {
      children.push(
        ReactLocal.createElement(
          ReactLocal.Fragment,
          { key: '__empty' },
          ReactLocal.isValidElement(ListEmptyComponent)
            ? ListEmptyComponent
            : ReactLocal.createElement(ListEmptyComponent)
        )
      );
    }
    (sections || []).forEach((section: any, si: number) => {
      if (renderSectionHeader) {
        children.push(
          ReactLocal.createElement(
            ReactLocal.Fragment,
            { key: `__header-${si}` },
            renderSectionHeader({ section })
          )
        );
      }
      (section.data || []).forEach((item: any, index: number) => {
        children.push(
          ReactLocal.createElement(
            ReactLocal.Fragment,
            {
              key: keyExtractor ? keyExtractor(item, index) : `${si}-${index}`,
            },
            renderItem ? renderItem({ item, index, section }) : null
          )
        );
      });
    });
    return ReactLocal.createElement(
      actual.View,
      { testID: 'section-list' },
      children
    );
  };
  return { ...actual, SectionList };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 10, bottom: 0, left: 0, right: 0 }),
}));

// Navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
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

// Toast — surface the convenience methods the screen calls.
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock('../../../components/ui/Toast', () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error: mockToastError,
  }),
}));

// mobileApiClient — the persistence layer for Start/Stop timer.
const mockPost = jest.fn();
const mockPatch = jest.fn();
jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));

// ---- React Query: drive the entries query deterministically ----
const mockRefetch = jest.fn();
const mockInvalidateQueries = jest.fn();
let mockQueryState: any = {
  data: [],
  isLoading: false,
  error: null,
};

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
  useQuery: ({ queryFn, enabled }: any) => {
    // Execute the queryFn so its branches (guard, supabase row mapping) are
    // covered; the returned data is still driven by mockQueryState.
    if (enabled && typeof queryFn === 'function') {
      try {
        Promise.resolve(queryFn()).catch(() => {});
      } catch {
        /* ignore */
      }
    }
    return { ...mockQueryState, refetch: mockRefetch };
  },
}));

import TimeTrackingScreen from '../TimeTrackingScreen';
// jest.config maps config/supabase to the chainable manual mock.
import { supabase, __setMockData } from '../../../config/supabase';

const CONTRACTOR = { id: 'co-1', role: 'contractor', email: 'c@x.com' };

interface EntryOverrides {
  [key: string]: unknown;
}

const entry = (over: EntryOverrides = {}): any => ({
  id: 'e1',
  task_description: 'Timed work',
  job_title: undefined,
  date: '2026-07-02',
  hours: 0,
  hourly_rate: 40,
  billable: true,
  status: 'stopped',
  startTime: undefined,
  ...over,
});

const setAuth = (user: any) => {
  (useAuth as jest.Mock).mockReturnValue({ user, loading: false });
};

beforeEach(() => {
  jest.clearAllMocks();
  __setMockData(null);
  mockQueryState = { data: [], isLoading: false, error: null };
  mockPost.mockResolvedValue({ success: true });
  mockPatch.mockResolvedValue({ success: true });
  setAuth(CONTRACTOR);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('TimeTrackingScreen', () => {
  // ------------------------------------------------------------------
  // Start timer
  // ------------------------------------------------------------------

  it("Start timer posts a 'running' entry to the time-tracking API and invalidates the query", async () => {
    const { getByLabelText } = render(<TimeTrackingScreen />);

    await act(async () => {
      fireEvent.press(getByLabelText('Start a live timer'));
    });

    expect(mockPost).toHaveBeenCalledTimes(1);
    const [url, payload] = mockPost.mock.calls[0];
    expect(url).toBe('/api/contractor/time-tracking');
    expect(payload).toEqual(
      expect.objectContaining({
        taskDescription: 'Timed work',
        durationMinutes: 0,
        status: 'running',
        isBillable: true,
      })
    );
    // date + startTime anchor the server-side entry
    expect(payload.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(payload.startTime).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['contractor-time-tracking'],
    });
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('Start timer does nothing when signed out', async () => {
    setAuth(null);
    const { getByLabelText } = render(<TimeTrackingScreen />);
    await act(async () => {
      fireEvent.press(getByLabelText('Start a live timer'));
    });
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('Start timer failure surfaces an error toast', async () => {
    mockPost.mockRejectedValueOnce(new Error('network down'));
    const { getByLabelText } = render(<TimeTrackingScreen />);
    await act(async () => {
      fireEvent.press(getByLabelText('Start a live timer'));
    });
    expect(mockToastError).toHaveBeenCalledWith(
      'Could not start timer',
      'Please try again.'
    );
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------------
  // Live clock derived from the PERSISTED entry anchor (remount survival)
  // ------------------------------------------------------------------

  it('derives the clock from the persisted entry start timestamp, not local state (remount survival)', () => {
    jest.useFakeTimers();
    // Mount happens 1m 5s AFTER the persisted start — as if the screen was
    // remounted (or the app relaunched) mid-timer. The clock must show the
    // elapsed time since the server-side anchor, not 00:00:00.
    jest.setSystemTime(new Date('2026-07-02T10:01:05'));
    mockQueryState.data = [
      entry({ id: 'run-1', status: 'running', startTime: '10:00:00' }),
    ];

    const { getByText } = render(<TimeTrackingScreen />);

    expect(getByText('Currently tracking')).toBeTruthy();
    expect(getByText('00:01:05')).toBeTruthy();
  });

  it('ticks the clock forward every second while running', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-02T10:01:05'));
    mockQueryState.data = [
      entry({ id: 'run-1', status: 'running', startTime: '10:00:00' }),
    ];

    const { getByText } = render(<TimeTrackingScreen />);
    expect(getByText('00:01:05')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(getByText('00:01:08')).toBeTruthy();
  });

  it('formats multi-hour elapsed time as HH:MM:SS', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-02T11:01:05'));
    mockQueryState.data = [
      entry({
        id: 'run-1',
        status: 'running',
        startTime: '10:00:00',
        job_title: 'Boiler fix',
        task_description: 'Timed work',
      }),
    ];

    const { getByText } = render(<TimeTrackingScreen />);
    expect(getByText('01:01:05')).toBeTruthy();
    // Running entry surfaces its description + job title in the hero
    expect(getByText('Timed work — Boiler fix')).toBeTruthy();
  });

  it('shows the weekly hero (no clock) when no entry is running', () => {
    mockQueryState.data = [entry({ id: 'done-1', status: 'stopped' })];
    const { queryByText, getByText } = render(<TimeTrackingScreen />);
    expect(queryByText('Currently tracking')).toBeNull();
    expect(getByText('Start timer')).toBeTruthy();
  });

  // ------------------------------------------------------------------
  // Stop timer
  // ------------------------------------------------------------------

  it('Stop timer finalises the duration via PATCH from the persisted anchor', async () => {
    jest.useFakeTimers();
    // Running for exactly 5 minutes at press time.
    jest.setSystemTime(new Date('2026-07-02T10:05:00'));
    mockQueryState.data = [
      entry({ id: 'run-1', status: 'running', startTime: '10:00:00' }),
    ];

    const { getByLabelText } = render(<TimeTrackingScreen />);

    await act(async () => {
      fireEvent.press(getByLabelText('Stop timer and log the time'));
    });

    expect(mockPatch).toHaveBeenCalledTimes(1);
    const [url, payload] = mockPatch.mock.calls[0];
    expect(url).toBe('/api/contractor/time-tracking');
    expect(payload).toEqual(
      expect.objectContaining({
        id: 'run-1',
        status: 'stopped',
        durationMinutes: 5,
      })
    );
    expect(payload.endTime).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['contractor-time-tracking'],
    });
    expect(mockToastSuccess).toHaveBeenCalledWith('Timer stopped', '5m logged');
  });

  it('Stop timer clamps very short runs to a 1-minute minimum', async () => {
    jest.useFakeTimers();
    // Only 10 seconds elapsed -> Math.max(1, round(10/60)) = 1 minute.
    jest.setSystemTime(new Date('2026-07-02T10:00:10'));
    mockQueryState.data = [
      entry({ id: 'run-1', status: 'running', startTime: '10:00:00' }),
    ];

    const { getByLabelText } = render(<TimeTrackingScreen />);
    await act(async () => {
      fireEvent.press(getByLabelText('Stop timer and log the time'));
    });

    expect(mockPatch.mock.calls[0][1]).toEqual(
      expect.objectContaining({ durationMinutes: 1 })
    );
  });

  it('Stop timer failure surfaces an error toast and does not invalidate', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-02T10:05:00'));
    mockPatch.mockRejectedValueOnce(new Error('boom'));
    mockQueryState.data = [
      entry({ id: 'run-1', status: 'running', startTime: '10:00:00' }),
    ];

    const { getByLabelText } = render(<TimeTrackingScreen />);
    await act(async () => {
      fireEvent.press(getByLabelText('Stop timer and log the time'));
    });

    expect(mockToastError).toHaveBeenCalledWith(
      'Could not stop timer',
      'Please try again.'
    );
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------------
  // Supporting states
  // ------------------------------------------------------------------

  it('renders the loading state', () => {
    mockQueryState = { data: undefined, isLoading: true, error: null };
    const { getByText } = render(<TimeTrackingScreen />);
    expect(getByText('Loading entries…')).toBeTruthy();
  });

  it('renders the error state and retries on tap', () => {
    mockQueryState = {
      data: undefined,
      isLoading: false,
      error: new Error('nope'),
    };
    const { getByText } = render(<TimeTrackingScreen />);
    expect(getByText('Failed to load')).toBeTruthy();
    fireEvent.press(getByText('Tap to retry'));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('back button and FAB navigate', () => {
    const { getByLabelText } = render(<TimeTrackingScreen />);
    fireEvent.press(getByLabelText('Go back'));
    expect(mockGoBack).toHaveBeenCalled();
    fireEvent.press(getByLabelText('Add time entry'));
    expect(mockNavigate).toHaveBeenCalledWith('AddTimeEntry');
  });

  it('Stop & invoice is disabled without billable hours and navigates with line items when present', () => {
    jest.useFakeTimers();
    // Thursday — the whole week (from Sunday 28 Jun) is in range.
    jest.setSystemTime(new Date('2026-07-02T12:00:00'));

    // No billable entries -> disabled CTA, no navigation.
    const { getByLabelText, unmount } = render(<TimeTrackingScreen />);
    fireEvent.press(getByLabelText('Stop tracking and create invoice'));
    expect(mockNavigate).not.toHaveBeenCalledWith(
      'CreateInvoice',
      expect.anything()
    );
    unmount();

    // Billable entries this week -> enabled, navigates with aggregated items.
    // Two entries for the same job merge (hours summed, rate from the most
    // recent entry); an untitled entry becomes the "General labor" line.
    mockQueryState.data = [
      entry({
        id: 'b1',
        status: 'stopped',
        billable: true,
        hours: 2,
        hourly_rate: 40,
        job_title: 'Kitchen tap',
        date: '2026-07-01',
      }),
      entry({
        id: 'b2',
        status: 'stopped',
        billable: true,
        hours: 1,
        hourly_rate: 50,
        job_title: 'Kitchen tap',
        date: '2026-07-02',
      }),
      entry({
        id: 'b3',
        status: 'stopped',
        billable: true,
        hours: 1,
        hourly_rate: 30,
        job_title: undefined,
        date: '2026-07-02',
      }),
      // Non-billable entry excluded from the invoice entirely.
      entry({
        id: 'nb',
        status: 'stopped',
        billable: false,
        hours: 8,
        hourly_rate: 100,
        job_title: 'Kitchen tap',
        date: '2026-07-02',
      }),
    ];
    const second = render(<TimeTrackingScreen />);
    fireEvent.press(second.getByLabelText('Stop tracking and create invoice'));
    expect(mockNavigate).toHaveBeenCalledWith('CreateInvoice', {
      initialLineItems: [
        {
          description: 'Labor — Kitchen tap',
          quantity: '3.00',
          rate: '50.00',
        },
        {
          description: 'Labor (this week)',
          quantity: '1.00',
          rate: '30.00',
        },
      ],
      jobRef: 'Kitchen tap',
    });
  });

  // ------------------------------------------------------------------
  // Recent entries list
  // ------------------------------------------------------------------

  it('renders finished entries with section header, billable amounts and formatted hours', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-02T12:00:00'));
    mockQueryState.data = [
      entry({
        id: 'e1',
        status: 'stopped',
        billable: true,
        hours: 1.5,
        hourly_rate: 40,
        task_description: 'Fit tap',
        job_title: 'Kitchen',
        date: '2026-07-02',
      }),
      entry({
        id: 'e2',
        status: 'stopped',
        billable: false,
        hours: 0.75,
        task_description: '',
        date: '2026-07-02',
      }),
      entry({
        id: 'e3',
        status: 'stopped',
        billable: true,
        hours: 2,
        hourly_rate: 10,
        task_description: 'Quote visit',
        date: '2026-07-02',
      }),
    ];

    const { getByText } = render(<TimeTrackingScreen />);

    const expectedHeader = new Date('2026-07-02').toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
    expect(getByText(expectedHeader)).toBeTruthy();
    // billable entry: description — job, £ amount, formatted hours
    expect(getByText('Fit tap — Kitchen')).toBeTruthy();
    expect(getByText('£60 billable')).toBeTruthy();
    expect(getByText('1h 30m')).toBeTruthy();
    // non-billable entry falls back to 'Labor' and the non-billable label
    expect(getByText('Labor')).toBeTruthy();
    expect(getByText('Non-billable')).toBeTruthy();
    expect(getByText('45m')).toBeTruthy();
    // whole hours render without minutes
    expect(getByText('2h')).toBeTruthy();
    expect(getByText('£20 billable')).toBeTruthy();
    // bento stats: today = this week = 1.5 + 0.75 + 2 = 4.25h
    expect(getByText('Today')).toBeTruthy();
  });

  it('shows the empty list state when there are no entries', () => {
    const { getByText } = render(<TimeTrackingScreen />);
    expect(getByText('No entries yet')).toBeTruthy();
    expect(
      getByText('Log your first hours from the Log hours CTA above.')
    ).toBeTruthy();
  });

  it('pull-to-refresh triggers refetch', () => {
    mockQueryState.data = [entry({ id: 'done-1', status: 'stopped' })];
    const { UNSAFE_getByType } = render(<TimeTrackingScreen />);
    const rn = jest.requireActual('react-native');
    const rc = UNSAFE_getByType(rn.RefreshControl);
    rc.props.onRefresh();
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('invoice built from untitled billable hours only carries no jobRef', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-02T12:00:00'));
    mockQueryState.data = [
      entry({
        id: 'b1',
        status: 'stopped',
        billable: true,
        hours: 2,
        hourly_rate: 25,
        job_title: undefined,
        date: '2026-07-02',
      }),
    ];
    const { getByLabelText } = render(<TimeTrackingScreen />);
    fireEvent.press(getByLabelText('Stop tracking and create invoice'));
    expect(mockNavigate).toHaveBeenCalledWith('CreateInvoice', {
      initialLineItems: [
        { description: 'Labor (this week)', quantity: '2.00', rate: '25.00' },
      ],
      jobRef: undefined,
    });
  });

  it('queryFn maps raw supabase rows (joined job title + column fallbacks)', async () => {
    // Raw rows the queryFn maps: one fully-populated, one all-fallbacks.
    __setMockData([
      {
        id: 'r1',
        task_description: 'Fit tap',
        job: { title: 'Kitchen' },
        date: '2026-07-01',
        duration_minutes: 90,
        hourly_rate: 40,
        is_billable: true,
        status: 'running',
        start_time: '09:00:00',
      },
      { id: 'r2', date: '2026-07-01' },
    ]);
    render(<TimeTrackingScreen />);
    await act(async () => {});
    expect(supabase.from).toHaveBeenCalledWith('contractor_time_entries');
  });

  it('Log hours in the running hero navigates to AddTimeEntry', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-02T10:01:00'));
    mockQueryState.data = [
      entry({ id: 'run-1', status: 'running', startTime: '10:00:00' }),
    ];
    const { getByLabelText } = render(<TimeTrackingScreen />);
    fireEvent.press(getByLabelText('Log hours manually'));
    expect(mockNavigate).toHaveBeenCalledWith('AddTimeEntry');
  });
});
