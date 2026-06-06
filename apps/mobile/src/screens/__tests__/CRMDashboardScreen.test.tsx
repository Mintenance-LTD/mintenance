import React from 'react';
import { Alert, Linking } from 'react-native';
import { render, waitFor, fireEvent } from '../../__tests__/test-utils';
import { CRMDashboardScreen } from '../CRMDashboardScreen';
import type { DerivedClient } from '../CRMDashboardData';

// ---- External mocks (never the screen under test) ----

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  // Non-zero top to exercise the insets.top + 8 paddingTop branch.
  useSafeAreaInsets: () => ({ top: 20, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// The shared react-native mock stubs FlatList as a host string, so it never
// invokes renderItem and client cards never render. Override FlatList so it
// actually renders rows via renderItem (and ListEmptyComponent when empty),
// and expose refreshControl so the pull-to-refresh handler is reachable.
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  const ReactLocal = require('react');
  const FlatList = ({
    data = [],
    renderItem,
    keyExtractor,
    ListEmptyComponent,
    refreshControl,
    testID,
  }: any) => {
    const children =
      !data || data.length === 0
        ? ListEmptyComponent
          ? ReactLocal.isValidElement(ListEmptyComponent)
            ? ListEmptyComponent
            : ReactLocal.createElement(ListEmptyComponent)
          : null
        : (data || []).map((item: any, index: number) =>
            ReactLocal.createElement(
              ReactLocal.Fragment,
              { key: keyExtractor ? keyExtractor(item, index) : index },
              renderItem ? renderItem({ item, index }) : null
            )
          );
    return ReactLocal.createElement(
      actual.View,
      { testID: testID || 'crm-flatlist', refreshControl },
      children
    );
  };
  return { ...actual, FlatList };
});

// Auth gate — overridden per-test for the !user early-return branch.
const mockUseAuth = jest.fn(() => ({
  user: { id: 'contractor-1', email: 'c@example.com', role: 'contractor' },
  loading: false,
}));
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// tabNav from useNavigation (bottom-tab) — drives JobsTab CTA + message thread.
const mockTabNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockTabNavigate }),
}));

// Messaging deep-link helper.
const mockGoToMessagingThread = jest.fn();
jest.mock('../../navigation/hooks', () => ({
  goToMessagingThread: (...args: unknown[]) => mockGoToMessagingThread(...args),
}));

// API client — the single data source for the screen.
const mockApiGet = jest.fn();
jest.mock('../../utils/mobileApiClient', () => ({
  mobileApiClient: { get: (...args: unknown[]) => mockApiGet(...args) },
}));

jest.mock('../../utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

// SearchBar — replace the debounced production component with a plain
// controlled TextInput so search text propagates synchronously in tests.
jest.mock('../../components/SearchBar', () => {
  const React = require('react');
  const { TextInput } = require('react-native');
  return {
    __esModule: true,
    default: ({
      value,
      onChangeText,
      placeholder,
    }: {
      value: string;
      onChangeText: (t: string) => void;
      placeholder: string;
    }) =>
      React.createElement(TextInput, {
        testID: 'search-input',
        value,
        onChangeText,
        placeholder,
      }),
  };
});

// Ionicons — render as a stub to avoid font/icon-set noise.
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name: string }) =>
      React.createElement(Text, null, name),
  };
});

import { logger } from '../../utils/logger';

// ---- Fixtures ----

const baseClient = (over: Partial<DerivedClient> = {}): DerivedClient => ({
  id: 'h1',
  homeowner_id: 'ho-1',
  recent_job_id: 'job-1',
  first_name: 'Alice',
  last_name: 'Anderson',
  email: 'alice@example.com',
  phone: '+447700900001',
  profile_image_url: 'https://img/alice.png',
  total_jobs: 2,
  total_revenue: 1500,
  last_job_date: '2026-05-01',
  last_job_title: 'Boiler repair',
  relationship_status: 'active',
  ...over,
});

const navigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
} as never;

const renderScreen = () =>
  render(<CRMDashboardScreen navigation={navigation} />);

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: { id: 'contractor-1', email: 'c@example.com', role: 'contractor' },
    loading: false,
  });
  mockApiGet.mockResolvedValue({ clients: [] });
});

describe('CRMDashboardScreen — loading / error / empty', () => {
  it('shows the loading spinner before data resolves', () => {
    let resolve!: (v: unknown) => void;
    mockApiGet.mockReturnValue(new Promise((r) => (resolve = r)));
    const { getByTestId } = renderScreen();
    expect(getByTestId('loading-spinner')).toBeTruthy();
    resolve({ clients: [] });
  });

  it('does not call the API and stays loading when there is no user', async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false } as never);
    const { getByTestId } = renderScreen();
    // !user early-return means setLoading(false) never runs -> spinner persists.
    await waitFor(() => expect(getByTestId('loading-spinner')).toBeTruthy());
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it('renders the full-list empty state for a brand-new contractor', async () => {
    mockApiGet.mockResolvedValue({ clients: [] });
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('No clients yet')).toBeTruthy());
    expect(
      getByText("Build relationships with the homeowners you've worked with.")
    ).toBeTruthy();
    // CTA navigates to the Jobs tab.
    fireEvent.press(getByText('Find Jobs'));
    expect(mockTabNavigate).toHaveBeenCalledWith('JobsTab', undefined);
  });

  it('handles a missing `clients` field (res.clients || [] fallback)', async () => {
    mockApiGet.mockResolvedValue({});
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('No clients yet')).toBeTruthy());
  });

  it('shows the error banner and logs when the API rejects', async () => {
    mockApiGet.mockRejectedValue(new Error('network down'));
    const { getByText } = renderScreen();
    await waitFor(() =>
      expect(
        getByText('Failed to load client data. Pull down to retry.')
      ).toBeTruthy()
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Error loading CRM data',
      expect.any(Error)
    );
  });
});

describe('CRMDashboardScreen — populated metrics + cards', () => {
  it('renders the header summary with pluralization and avg value', async () => {
    mockApiGet.mockResolvedValue({
      clients: [
        baseClient({
          id: 'a',
          relationship_status: 'active',
          total_revenue: 1000,
        }),
        baseClient({
          id: 'b',
          first_name: 'Bob',
          relationship_status: 'inactive',
          total_revenue: 3000,
          phone: undefined,
          profile_image_url: undefined,
          email: '',
        }),
      ],
    });
    const { getByText } = renderScreen();
    // total=2 (plural "s"), active=1, avg = round(4000/2) = 2000
    await waitFor(() => expect(getByText(/2 clients/)).toBeTruthy());
    expect(getByText(/2,000 avg value/)).toBeTruthy();
  });

  it('renders the singular header label for exactly one client', async () => {
    mockApiGet.mockResolvedValue({ clients: [baseClient()] });
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText(/1 client /)).toBeTruthy());
  });

  it('renders an avatar image when profile_image_url is present', async () => {
    mockApiGet.mockResolvedValue({ clients: [baseClient()] });
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('Alice Anderson')).toBeTruthy());
    expect(getByText('Boiler repair')).toBeTruthy();
    // £ revenue badge formatted with locale separators (£ + amount render
    // as separate string children of one Text node).
    expect(getByText('£1,500')).toBeTruthy();
  });

  it('renders initials fallback + default status dot when image/status absent', async () => {
    mockApiGet.mockResolvedValue({
      clients: [
        baseClient({
          id: 'c',
          first_name: 'Carol',
          last_name: 'Clarke',
          profile_image_url: undefined,
          // Unknown status hits the STATUS_DOT[...] || '#B0B0B0' fallback.
          relationship_status: 'mystery' as never,
        }),
      ],
    });
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('CC')).toBeTruthy());
  });

  it('navigates to ClientDetail when a card is pressed', async () => {
    const client = baseClient();
    mockApiGet.mockResolvedValue({ clients: [client] });
    const { getByLabelText } = renderScreen();
    await waitFor(() => getByLabelText('View Alice Anderson'));
    fireEvent.press(getByLabelText('View Alice Anderson'));
    expect(navigation.navigate).toHaveBeenCalledWith('ClientDetail', {
      client,
    });
  });
});

describe('CRMDashboardScreen — card actions', () => {
  it('opens the dialer when phone exists and the URL can be opened', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    const openSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined as never);
    mockApiGet.mockResolvedValue({ clients: [baseClient()] });
    const { getByLabelText } = renderScreen();
    await waitFor(() => getByLabelText('Call'));
    fireEvent.press(getByLabelText('Call'));
    await waitFor(() =>
      expect(openSpy).toHaveBeenCalledWith('tel:+447700900001')
    );
  });

  it('alerts when the dialer URL cannot be opened', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(false);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockApiGet.mockResolvedValue({ clients: [baseClient()] });
    const { getByLabelText } = renderScreen();
    await waitFor(() => getByLabelText('Call'));
    fireEvent.press(getByLabelText('Call'));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Cannot make phone call')
    );
  });

  it('hides the call button entirely when there is no phone', async () => {
    mockApiGet.mockResolvedValue({
      clients: [baseClient({ phone: undefined })],
    });
    const { queryByLabelText, getByLabelText } = renderScreen();
    await waitFor(() => getByLabelText('Message'));
    expect(queryByLabelText('Call')).toBeNull();
  });

  it('opens a messaging thread with recipientId from homeowner_id', async () => {
    mockApiGet.mockResolvedValue({
      clients: [baseClient({ recent_job_id: 'job-99', homeowner_id: 'ho-9' })],
    });
    const { getByLabelText } = renderScreen();
    await waitFor(() => getByLabelText('Message'));
    fireEvent.press(getByLabelText('Message'));
    expect(mockGoToMessagingThread).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        conversationId: 'job-99',
        recipientId: 'ho-9',
        recipientName: 'Alice Anderson',
      })
    );
  });

  it('falls back to client id for recipientId when homeowner_id is null', async () => {
    mockApiGet.mockResolvedValue({
      clients: [
        baseClient({ id: 'cid-7', homeowner_id: null, recent_job_id: 'j7' }),
      ],
    });
    const { getByLabelText } = renderScreen();
    await waitFor(() => getByLabelText('Message'));
    fireEvent.press(getByLabelText('Message'));
    expect(mockGoToMessagingThread).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ recipientId: 'cid-7' })
    );
  });

  it('alerts "No thread yet" when the client has no recent job', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockApiGet.mockResolvedValue({
      clients: [baseClient({ recent_job_id: null })],
    });
    const { getByLabelText } = renderScreen();
    await waitFor(() => getByLabelText('Message'));
    fireEvent.press(getByLabelText('Message'));
    expect(alertSpy).toHaveBeenCalledWith(
      'No thread yet',
      expect.stringContaining('Messaging opens after your first job')
    );
    expect(mockGoToMessagingThread).not.toHaveBeenCalled();
  });

  it('opens the mail client when email can be opened', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    const openSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined as never);
    mockApiGet.mockResolvedValue({ clients: [baseClient()] });
    const { getByLabelText } = renderScreen();
    await waitFor(() => getByLabelText('Email'));
    fireEvent.press(getByLabelText('Email'));
    await waitFor(() =>
      expect(openSpy).toHaveBeenCalledWith('mailto:alice@example.com')
    );
  });

  it('alerts when the mail URL cannot be opened', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(false);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockApiGet.mockResolvedValue({ clients: [baseClient()] });
    const { getByLabelText } = renderScreen();
    await waitFor(() => getByLabelText('Email'));
    fireEvent.press(getByLabelText('Email'));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Cannot open email client')
    );
  });

  it('hides the email button when the client has no email', async () => {
    mockApiGet.mockResolvedValue({
      clients: [baseClient({ email: '' })],
    });
    const { queryByLabelText, getByLabelText } = renderScreen();
    await waitFor(() => getByLabelText('Message'));
    expect(queryByLabelText('Email')).toBeNull();
  });
});

describe('CRMDashboardScreen — search, filters, navigation, refresh', () => {
  const dataset = [
    baseClient({
      id: 'a',
      first_name: 'Alice',
      last_name: 'Anderson',
      email: 'alice@x.com',
      relationship_status: 'active',
    }),
    baseClient({
      id: 'b',
      first_name: 'Bob',
      last_name: 'Brown',
      email: 'bob@y.com',
      relationship_status: 'prospect',
    }),
  ];

  it('goes back when the header back button is pressed', async () => {
    mockApiGet.mockResolvedValue({ clients: dataset });
    const { getByLabelText } = renderScreen();
    await waitFor(() => getByLabelText('Go back'));
    fireEvent.press(getByLabelText('Go back'));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('toggles the filter row and filters by relationship status', async () => {
    mockApiGet.mockResolvedValue({ clients: dataset });
    const { getByLabelText, getByText, queryByText } = renderScreen();
    await waitFor(() => expect(getByText('Alice Anderson')).toBeTruthy());

    // Filters hidden initially.
    expect(queryByText('Prospects')).toBeNull();
    fireEvent.press(getByLabelText('Toggle filters'));
    expect(getByText('Prospects')).toBeTruthy();

    // Select "Active" -> only Alice remains (filter !== 'all' branch).
    fireEvent.press(getByText('Active'));
    await waitFor(() => expect(queryByText('Bob Brown')).toBeNull());
    expect(getByText('Alice Anderson')).toBeTruthy();
  });

  it('searches by name and shows the no-matches empty state', async () => {
    mockApiGet.mockResolvedValue({ clients: dataset });
    const { getByText, getByTestId, queryByText } = renderScreen();
    await waitFor(() => expect(getByText('Alice Anderson')).toBeTruthy());

    // Name match keeps only Bob.
    fireEvent.changeText(getByTestId('search-input'), 'bob');
    await waitFor(() => expect(queryByText('Alice Anderson')).toBeNull());
    expect(getByText('Bob Brown')).toBeTruthy();

    // No match -> "No matches" empty (search-active branch).
    fireEvent.changeText(getByTestId('search-input'), 'zzz-nobody');
    await waitFor(() => expect(getByText('No matches')).toBeTruthy());
    expect(getByText('Try adjusting your search or filters')).toBeTruthy();
  });

  it('matches search against the email field', async () => {
    mockApiGet.mockResolvedValue({ clients: dataset });
    const { getByText, getByTestId, queryByText } = renderScreen();
    await waitFor(() => expect(getByText('Alice Anderson')).toBeTruthy());
    fireEvent.changeText(getByTestId('search-input'), 'bob@y.com');
    await waitFor(() => expect(queryByText('Alice Anderson')).toBeNull());
    expect(getByText('Bob Brown')).toBeTruthy();
  });

  it('reloads data via pull-to-refresh', async () => {
    mockApiGet.mockResolvedValue({ clients: dataset });
    const { getByText, getByTestId } = renderScreen();
    await waitFor(() => expect(getByText('Alice Anderson')).toBeTruthy());

    // The overridden FlatList forwards refreshControl onto its host View.
    const list = getByTestId('crm-flatlist');
    const onRefresh = list.props.refreshControl.props.onRefresh;
    mockApiGet.mockClear();
    await onRefresh();
    expect(mockApiGet).toHaveBeenCalledWith('/api/contractor/clients');
  });
});
