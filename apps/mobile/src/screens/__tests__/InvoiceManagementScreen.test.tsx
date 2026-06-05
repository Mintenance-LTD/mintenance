/**
 * InvoiceManagementScreen — branch-coverage suite.
 *
 * Mocks ONLY externals: AuthContext, mobileApiClient, Toast, LoadingSpinner,
 * navigation, and react-native Alert. The screen itself (and react-query,
 * the styles module, and the mint-editorial design tokens) run for real so
 * every conditional path is exercised against real component output.
 *
 * Branches targeted:
 *   - isLoading early return (LoadingSpinner)
 *   - ListEmptyComponent when no invoices
 *   - populated FlatList render
 *   - status filters: all / unpaid / paid / drafts (matchesFilter all arms)
 *   - STATUS_META lookup incl. unknown-status fallback to draft
 *   - renderItem: paid+paid_date date label vs due_date; canAct gate
 *     (paid/cancelled hide actions); showRail left-border (sent/overdue)
 *   - unpaidTotal: numeric + string total_amount coercion, null coercion
 *   - markPaid Alert flow: success + error
 *   - deleteInv Alert flow: success + error
 *   - navigation: canGoBack true (back btn) + FAB navigate + row navigate
 */
import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InvoiceManagementScreen } from '../InvoiceManagementScreen';

// ---- external mocks ----------------------------------------------------

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 10, bottom: 20, left: 0, right: 0 }),
}));

const mockUser: { id: string } | null = { id: 'contractor-1' };
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, loading: false }),
}));

const mockGet = jest.fn();
const mockPatch = jest.fn();
const mockDelete = jest.fn();
jest.mock('../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: (...a: unknown[]) => mockGet(...a),
    patch: (...a: unknown[]) => mockPatch(...a),
    delete: (...a: unknown[]) => mockDelete(...a),
  },
}));

const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock('../../components/ui/Toast', () => ({
  useToast: () => ({ success: mockToastSuccess, error: mockToastError }),
}));

jest.mock('../../components/LoadingSpinner', () => {
  const { Text } = require('react-native');
  return {
    LoadingSpinner: ({ message }: { message?: string }) => (
      <Text testID='loading-spinner'>{message}</Text>
    ),
  };
});

// Stub Ionicons so we don't depend on the icon font in jsdom.
jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name: string }) => <Text>{`icon:${name}`}</Text>,
  };
});

// In the `node` test environment RN's VirtualizedList never measures layout,
// so FlatList renders zero rows. Replace it (via the react-native barrel) with
// an eager list that renders every row + the empty component synchronously so
// the renderItem branches are exercised. refreshControl is forwarded so
// pull-to-refresh is testable.
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  const React = require('react');
  const MockFlatList = (props: {
    data?: unknown[];
    renderItem?: (info: { item: unknown; index: number }) => unknown;
    keyExtractor?: (item: unknown, i: number) => string;
    ListEmptyComponent?: unknown;
    refreshControl?: unknown;
  }) => {
    const {
      data = [],
      renderItem,
      keyExtractor,
      ListEmptyComponent,
      refreshControl,
    } = props;
    const rows = !data.length
      ? [ListEmptyComponent ?? null]
      : data.map((item, index) =>
          React.createElement(
            React.Fragment,
            { key: keyExtractor ? keyExtractor(item, index) : index },
            renderItem ? renderItem({ item, index }) : null
          )
        );
    return React.createElement(RN.View, null, refreshControl ?? null, ...rows);
  };
  return { ...RN, FlatList: MockFlatList };
});

// ---- helpers -----------------------------------------------------------

const makeNav = (canGoBack = true) => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  canGoBack: jest.fn(() => canGoBack),
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  dispatch: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  isFocused: jest.fn(() => true),
});

type Inv = Record<string, unknown>;

const baseInvoices: Inv[] = [
  {
    id: 'inv-sent',
    invoice_number: 'INV-001',
    client_name: 'Acme Ltd',
    status: 'sent',
    total_amount: 1200.5, // numeric
    due_date: '2026-07-15T00:00:00Z',
    paid_date: null,
  },
  {
    id: 'inv-overdue',
    invoice_number: 'INV-002',
    client_name: '', // falsy → "Client" fallback branch
    status: 'overdue',
    total_amount: '300', // string → coercion branch
    due_date: '2026-06-01T00:00:00Z',
    paid_date: null,
  },
  {
    id: 'inv-paid',
    invoice_number: 'INV-003',
    client_name: 'Beta Co',
    status: 'paid',
    total_amount: 500,
    due_date: '2026-05-01T00:00:00Z',
    paid_date: '2026-05-03T00:00:00Z', // paid + paid_date → "Paid …" label
  },
  {
    id: 'inv-draft',
    invoice_number: 'INV-004',
    client_name: 'Draft Client',
    status: 'draft',
    // NOTE: must be a real number — the screen's fmtGBP() calls
    // n.toLocaleString() with no null guard, so a null total_amount throws
    // at render and unmounts the tree. (See report: the null-coercion arm
    // of unpaidTotal's toNum is therefore unreachable via normal rendering.)
    total_amount: 0,
    due_date: '2026-08-01T00:00:00Z',
    paid_date: null,
  },
  {
    id: 'inv-cancelled',
    invoice_number: 'INV-005',
    client_name: 'Cancel Co',
    status: 'cancelled',
    total_amount: 99,
    due_date: '2026-09-01T00:00:00Z',
    paid_date: null,
  },
  {
    id: 'inv-weird',
    invoice_number: 'INV-006',
    client_name: 'Weird Co',
    status: 'archived', // unknown status → STATUS_META fallback to draft
    total_amount: 42,
    due_date: '2026-10-01T00:00:00Z',
    paid_date: null,
  },
];

const renderScreen = (nav = makeNav()) => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const utils = render(
    <QueryClientProvider client={qc}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <InvoiceManagementScreen navigation={nav as any} />
    </QueryClientProvider>
  );
  return { ...utils, nav };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUser.id = 'contractor-1';
  mockGet.mockResolvedValue({ invoices: baseInvoices });
  mockPatch.mockResolvedValue({});
  mockDelete.mockResolvedValue({});
});

describe('InvoiceManagementScreen', () => {
  it('shows the loading spinner while the query is pending', async () => {
    let resolve!: (v: unknown) => void;
    mockGet.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const { getByTestId, queryByTestId } = renderScreen();

    expect(getByTestId('loading-spinner')).toBeTruthy();

    resolve({ invoices: [] });
    await waitFor(() => expect(queryByTestId('loading-spinner')).toBeNull());
  });

  it('renders the empty state when there are no invoices', async () => {
    mockGet.mockResolvedValue({ invoices: [] });
    const { getByText } = renderScreen();

    await waitFor(() => expect(getByText('No invoices yet')).toBeTruthy());
    expect(getByText('Tap the + button to bill your first job.')).toBeTruthy();
    // Header KPI: 0 total · £0.00 unpaid
    expect(getByText('0 total · £0.00 unpaid')).toBeTruthy();
  });

  it('renders a populated list with GBP amounts and the unpaid KPI total', async () => {
    const { getByText, getAllByText, queryByText } = renderScreen();

    await waitFor(() => expect(getByText('Acme Ltd')).toBeTruthy());

    // GBP formatting. The numeric rows get full 2dp; the string-typed
    // total ('300') is passed straight to String.prototype.toLocaleString
    // which yields '300' (no fraction digits) → '£300'.
    expect(getByText('£1,200.50')).toBeTruthy();
    expect(getByText('£300')).toBeTruthy();
    expect(getByText('£500.00')).toBeTruthy();

    // Empty client_name falls back to "Client"
    expect(getByText('Client')).toBeTruthy();

    // unpaidTotal = 1200.5 (sent) + 300 (overdue) = 1500.50
    expect(getByText('6 total · £1,500.50 unpaid')).toBeTruthy();

    // paid invoice uses "Paid <date>" label; others "Due <date>"
    expect(getByText(/#INV-003 · Paid 03\/05\/2026/)).toBeTruthy();
    expect(getByText(/#INV-001 · Due 15\/07\/2026/)).toBeTruthy();

    // Status badges incl. unknown-status fallback to "Draft".
    // "Paid" appears as a pill + badge + action, so assert via getAllByText.
    expect(queryByText('Sent')).toBeTruthy();
    expect(queryByText('Overdue')).toBeTruthy();
    expect(getAllByText('Paid').length).toBeGreaterThan(0);
    expect(queryByText('Cancelled')).toBeTruthy();
    // two "Draft" badges: the draft invoice + the unknown-status fallback
    // (getAllByText asserted below)
  });

  it('renders Draft badge for both real drafts and unknown statuses (fallback)', async () => {
    const { getAllByText } = renderScreen();
    await waitFor(() => expect(getAllByText('Draft').length).toBe(2));
  });

  it('filters to Unpaid (sent + overdue only)', async () => {
    const { getByText, queryByText } = renderScreen();
    await waitFor(() => expect(getByText('Acme Ltd')).toBeTruthy());

    fireEvent.press(getByText('Unpaid'));

    await waitFor(() => expect(queryByText('Beta Co')).toBeNull());
    expect(getByText('Acme Ltd')).toBeTruthy(); // sent
    expect(queryByText('Weird Co')).toBeNull(); // archived excluded
    expect(queryByText('Draft Client')).toBeNull(); // draft excluded
  });

  it('filters to Paid (paid only)', async () => {
    const { getByText, getAllByText, queryByText } = renderScreen();
    await waitFor(() => expect(getByText('Beta Co')).toBeTruthy());

    // "Paid" also appears as a status badge + an action button, so target
    // the first match — the filter pill renders before the list.
    fireEvent.press(getAllByText('Paid')[0]);

    await waitFor(() => expect(queryByText('Acme Ltd')).toBeNull());
    expect(getByText('Beta Co')).toBeTruthy();
  });

  it('filters to Drafts (draft only)', async () => {
    const { getByText, queryByText } = renderScreen();
    await waitFor(() => expect(getByText('Draft Client')).toBeTruthy());

    fireEvent.press(getByText('Drafts'));

    await waitFor(() => expect(queryByText('Beta Co')).toBeNull());
    expect(getByText('Draft Client')).toBeTruthy();
    expect(queryByText('Weird Co')).toBeNull(); // archived not a draft
  });

  it('returns to All from another filter', async () => {
    const { getByText, getAllByText, queryByText } = renderScreen();
    await waitFor(() => expect(getByText('Acme Ltd')).toBeTruthy());

    fireEvent.press(getAllByText('Paid')[0]); // filter pill
    await waitFor(() => expect(queryByText('Acme Ltd')).toBeNull());

    fireEvent.press(getByText('All'));
    await waitFor(() => expect(getByText('Acme Ltd')).toBeTruthy());
    expect(getByText('Beta Co')).toBeTruthy();
  });

  it('navigates to InvoiceDetail when a row is pressed', async () => {
    const { getByLabelText, nav } = renderScreen();
    await waitFor(() => expect(getByLabelText('Invoice INV-001')).toBeTruthy());

    fireEvent.press(getByLabelText('Invoice INV-001'));
    expect(nav.navigate).toHaveBeenCalledWith('InvoiceDetail', {
      invoiceId: 'inv-sent',
    });
  });

  it('navigates to CreateInvoice from the FAB', async () => {
    const { getByLabelText, nav } = renderScreen();
    await waitFor(() =>
      expect(getByLabelText('Create new invoice')).toBeTruthy()
    );

    fireEvent.press(getByLabelText('Create new invoice'));
    expect(nav.navigate).toHaveBeenCalledWith('CreateInvoice');
  });

  it('shows the back button and calls goBack when canGoBack() is true', async () => {
    const { getByLabelText, nav } = renderScreen(makeNav(true));
    await waitFor(() => expect(getByLabelText('Go back')).toBeTruthy());

    fireEvent.press(getByLabelText('Go back'));
    expect(nav.goBack).toHaveBeenCalled();
  });

  it('hides the back button when canGoBack() is false', async () => {
    const { queryByLabelText, getByText } = renderScreen(makeNav(false));
    await waitFor(() => expect(getByText('Acme Ltd')).toBeTruthy());
    expect(queryByLabelText('Go back')).toBeNull();
  });

  it('hides Paid/Delete actions for paid and cancelled invoices (canAct=false)', async () => {
    const { queryByLabelText, getByText } = renderScreen();
    await waitFor(() => expect(getByText('Beta Co')).toBeTruthy());

    // paid + cancelled → no action buttons
    expect(queryByLabelText('Mark invoice INV-003 paid')).toBeNull();
    expect(queryByLabelText('Delete invoice INV-005')).toBeNull();
    // actionable invoices DO show them
    expect(queryByLabelText('Mark invoice INV-001 paid')).toBeTruthy();
    expect(queryByLabelText('Delete invoice INV-001')).toBeTruthy();
  });

  it('marks an invoice paid (success path)', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByLabelText, getByText } = renderScreen();
    await waitFor(() => expect(getByText('Acme Ltd')).toBeTruthy());

    fireEvent.press(getByLabelText('Mark invoice INV-001 paid'));

    // Drive the Alert "Mark paid" button onPress.
    const [, , buttons] = alertSpy.mock.calls[0];
    const markBtn = (buttons as { text: string; onPress?: () => void }[]).find(
      (b) => b.text === 'Mark paid'
    );
    await markBtn!.onPress!();

    expect(mockPatch).toHaveBeenCalledWith(
      '/api/contractor/invoices?id=inv-sent',
      { status: 'paid' }
    );
    expect(mockToastSuccess).toHaveBeenCalledWith('Invoice marked as paid');
    alertSpy.mockRestore();
  });

  it('shows an error toast when mark-paid fails', async () => {
    mockPatch.mockRejectedValueOnce(new Error('boom'));
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByLabelText, getByText } = renderScreen();
    await waitFor(() => expect(getByText('Acme Ltd')).toBeTruthy());

    fireEvent.press(getByLabelText('Mark invoice INV-001 paid'));
    const [, , buttons] = alertSpy.mock.calls[0];
    const markBtn = (buttons as { text: string; onPress?: () => void }[]).find(
      (b) => b.text === 'Mark paid'
    );
    await markBtn!.onPress!();

    expect(mockToastError).toHaveBeenCalledWith('Failed to update invoice');
    alertSpy.mockRestore();
  });

  it('deletes an invoice (success path)', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByLabelText, getByText } = renderScreen();
    await waitFor(() => expect(getByText('Acme Ltd')).toBeTruthy());

    fireEvent.press(getByLabelText('Delete invoice INV-001'));
    const [, , buttons] = alertSpy.mock.calls[0];
    const delBtn = (buttons as { text: string; onPress?: () => void }[]).find(
      (b) => b.text === 'Delete'
    );
    await delBtn!.onPress!();

    expect(mockDelete).toHaveBeenCalledWith(
      '/api/contractor/invoices?id=inv-sent'
    );
    expect(mockToastSuccess).toHaveBeenCalledWith('Invoice deleted');
    alertSpy.mockRestore();
  });

  it('shows an error toast when delete fails', async () => {
    mockDelete.mockRejectedValueOnce(new Error('boom'));
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByLabelText, getByText } = renderScreen();
    await waitFor(() => expect(getByText('Acme Ltd')).toBeTruthy());

    fireEvent.press(getByLabelText('Delete invoice INV-001'));
    const [, , buttons] = alertSpy.mock.calls[0];
    const delBtn = (buttons as { text: string; onPress?: () => void }[]).find(
      (b) => b.text === 'Delete'
    );
    await delBtn!.onPress!();

    expect(mockToastError).toHaveBeenCalledWith('Failed to delete invoice');
    alertSpy.mockRestore();
  });

  it('handles a null/undefined query result (?? [] fallback)', async () => {
    mockGet.mockResolvedValue(undefined);
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('No invoices yet')).toBeTruthy());
  });

  it('triggers refetch via pull-to-refresh', async () => {
    const { getByText, UNSAFE_getByType } = renderScreen();
    await waitFor(() => expect(getByText('Acme Ltd')).toBeTruthy());

    mockGet.mockClear();
    const { RefreshControl } = require('react-native');
    const rc = UNSAFE_getByType(RefreshControl);
    rc.props.onRefresh();

    await waitFor(() => expect(mockGet).toHaveBeenCalled());
  });
});
