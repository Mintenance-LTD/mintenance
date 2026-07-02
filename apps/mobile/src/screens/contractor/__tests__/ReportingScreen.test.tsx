import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Share, Alert } from 'react-native';

// ---------------------------------------------------------------------------
// Mock ONLY externals — never the screen under test.
// (Convention mirrors src/screens/jobs/__tests__/JobsScreen.test.tsx.
// `react-native` resolves to the shared manual mock, so Share.share and
// Alert.alert are already jest.fn()s we can assert on.)
// ---------------------------------------------------------------------------

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 10, bottom: 0, left: 0, right: 0 }),
}));

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

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

// ---- React Query: drive the reporting query deterministically ----
const mockRefetch = jest.fn();
let mockQueryState: any = {
  data: undefined,
  isLoading: false,
  error: null,
};

jest.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryFn, enabled }: any) => {
    // Execute the queryFn so its guard + fetch wiring is covered (it runs
    // against the chainable supabase manual mock); the returned data is
    // still driven by mockQueryState.
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

import ReportingScreen from '../ReportingScreen';
import { EMPTY_STATS } from '../reportingData';

const CONTRACTOR = { id: 'co-1', role: 'contractor', email: 'c@x.com' };

const statsWith = (over: Partial<typeof EMPTY_STATS> = {}) => ({
  ...EMPTY_STATS,
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockQueryState = { data: undefined, isLoading: false, error: null };
  (useAuth as jest.Mock).mockReturnValue({ user: CONTRACTOR, loading: false });
  (Share.share as jest.Mock).mockResolvedValue({ action: 'sharedAction' });
});

describe('ReportingScreen', () => {
  // ------------------------------------------------------------------
  // Export -> Share sheet
  // ------------------------------------------------------------------

  it('export builds a text report with every data section and hands it to Share.share', () => {
    mockQueryState.data = statsWith({
      totalEarnings: 1234,
      completedJobs: 3,
      monthlyTrend: [
        { month: 'May', count: 1, earnings: 500 },
        { month: 'Jun', count: 2, earnings: 734 },
      ],
      categoryBreakdown: [
        { category: 'Plumbing', count: 2 },
        { category: 'Electrical', count: 1 },
      ],
    });

    const { getByText } = render(<ReportingScreen />);
    fireEvent.press(getByText('Share report for accountant'));

    expect(Share.share).toHaveBeenCalledTimes(1);
    const [{ title, message }] = (Share.share as jest.Mock).mock.calls[0];
    expect(title).toBe('Mintenance report — This quarter');

    // Header + headline figures
    expect(message).toContain('Mintenance — contractor report');
    expect(message).toContain('This quarter');
    expect(message).toContain('Net revenue: £1,234');
    expect(message).toContain('Jobs completed: 3');
    // Monthly breakdown with singular/plural job counts
    expect(message).toContain('Monthly breakdown:');
    expect(message).toContain('May: £500 (1 job)');
    expect(message).toContain('Jun: £734 (2 jobs)');
    // Category section
    expect(message).toContain('Top categories:');
    expect(message).toContain('Plumbing: 2 jobs');
    expect(message).toContain('Electrical: 1 job');
    // Footer
    expect(message).toContain('Generated from the Mintenance contractor app.');
  });

  it('export omits the monthly and category sections when there is nothing to report', () => {
    mockQueryState.data = statsWith({
      totalEarnings: 0,
      completedJobs: 0,
      // months exist but all zero-earnings -> filtered out of the report
      monthlyTrend: [{ month: 'May', count: 0, earnings: 0 }],
      categoryBreakdown: [],
    });

    const { getByText } = render(<ReportingScreen />);
    fireEvent.press(getByText('Share report for accountant'));

    const [{ message }] = (Share.share as jest.Mock).mock.calls[0];
    expect(message).toContain('Net revenue: £0');
    expect(message).toContain('Jobs completed: 0');
    expect(message).not.toContain('Monthly breakdown:');
    expect(message).not.toContain('Top categories:');
  });

  it('export reflects the selected period after switching range pills', () => {
    mockQueryState.data = statsWith({ totalEarnings: 10 });

    const { getByText } = render(<ReportingScreen />);
    fireEvent.press(getByText('Last 30 days'));
    fireEvent.press(getByText('Share report for accountant'));

    const [{ title, message }] = (Share.share as jest.Mock).mock.calls[0];
    expect(title).toBe('Mintenance report — Last 30 days');
    expect(message).toContain('Last 30 days');
  });

  it('handles Share.share rejection without crashing and shows a fallback alert', async () => {
    mockQueryState.data = statsWith({ totalEarnings: 10 });
    (Share.share as jest.Mock).mockRejectedValueOnce(
      new Error('share sheet unavailable')
    );

    const { getByText } = render(<ReportingScreen />);
    fireEvent.press(getByText('Share report for accountant'));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Could not open share sheet',
        'Please try again, or sign in at mintenance.co.uk/contractor for the full dashboard.'
      )
    );
    // Screen is still mounted and interactive
    expect(getByText('Share report for accountant')).toBeTruthy();
  });

  // ------------------------------------------------------------------
  // Rendering states
  // ------------------------------------------------------------------

  it('renders net revenue and category rows from the fetched stats', () => {
    mockQueryState.data = statsWith({
      totalEarnings: 2500,
      monthlyTrend: [{ month: 'Jun', count: 2, earnings: 2500 }],
      categoryBreakdown: [
        { category: 'Plumbing', count: 2 },
        { category: 'Roofing', count: 1 },
      ],
    });

    const { getByText } = render(<ReportingScreen />);
    expect(getByText('£2,500')).toBeTruthy();
    expect(getByText('Top categories · this period')).toBeTruthy();
    expect(getByText('Plumbing')).toBeTruthy();
    expect(getByText('2 jobs')).toBeTruthy();
    expect(getByText('Roofing')).toBeTruthy();
    expect(getByText('1 job')).toBeTruthy();
  });

  it('renders the empty-chart hint when no month has earnings', () => {
    mockQueryState.data = statsWith({
      monthlyTrend: [{ month: 'Jun', count: 0, earnings: 0 }],
    });
    const { getByText } = render(<ReportingScreen />);
    expect(
      getByText('Bars appear once you have completed jobs in this window.')
    ).toBeTruthy();
  });

  it('renders the loading state', () => {
    mockQueryState = { data: undefined, isLoading: true, error: null };
    const { getByText } = render(<ReportingScreen />);
    expect(getByText('Loading analytics…')).toBeTruthy();
  });

  it('renders the error state and retries', () => {
    mockQueryState = {
      data: undefined,
      isLoading: false,
      error: new Error('nope'),
    };
    const { getByText } = render(<ReportingScreen />);
    expect(getByText('Failed to load reports')).toBeTruthy();
    fireEvent.press(getByText('Try again'));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('back button navigates back', () => {
    mockQueryState.data = statsWith();
    const { getByLabelText } = render(<ReportingScreen />);
    fireEvent.press(getByLabelText('Go back'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});
