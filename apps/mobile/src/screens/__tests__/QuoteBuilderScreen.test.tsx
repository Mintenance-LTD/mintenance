import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QuoteBuilderScreen } from '../QuoteBuilderScreen';
import type { ContractorQuote } from '../../services/QuoteBuilderService';

// ---- Mock externals only (never the screen under test) ----

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 10, bottom: 0, left: 0, right: 0 }),
}));

const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
};
jest.mock('../../components/ui/Toast', () => ({
  useToast: () => mockToast,
}));

import { logger } from '../../utils/logger';

let mockUser: { id: string } | null = { id: 'contractor-1' };
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

const mockGetQuotes = jest.fn();
const mockGetStats = jest.fn();
const mockSendQuote = jest.fn();
const mockDuplicateQuote = jest.fn();
const mockDeleteQuote = jest.fn();
jest.mock('../../services/QuoteBuilderService', () => ({
  QuoteBuilderService: {
    getQuotes: (...a: unknown[]) => mockGetQuotes(...a),
    getQuoteSummaryStats: (...a: unknown[]) => mockGetStats(...a),
    sendQuote: (...a: unknown[]) => mockSendQuote(...a),
    duplicateQuote: (...a: unknown[]) => mockDuplicateQuote(...a),
    deleteQuote: (...a: unknown[]) => mockDeleteQuote(...a),
  },
}));

// ---- Fixtures ----

const makeQuote = (over: Partial<ContractorQuote> = {}): ContractorQuote =>
  ({
    id: 'quote-abc12345',
    quote_number: 'Q-1001',
    contractor_id: 'contractor-1',
    job_id: 'job-9',
    client_name: 'Jane Homeowner',
    client_email: 'jane@example.com',
    project_title: 'Bathroom refit',
    subtotal: 1000,
    tax_amount: 200,
    total_amount: 1200,
    tax_rate: 0.2,
    currency: 'GBP',
    status: 'draft',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...over,
  }) as ContractorQuote;

const fullStats = {
  total_quotes: 12,
  draft_quotes: 3,
  sent_quotes: 4,
  accepted_quotes: 5,
  rejected_quotes: 0,
  total_value: 7817.05,
  accepted_value: 4000,
  average_quote_value: 651.42,
  acceptance_rate: 41.6,
  conversion_rate: 30,
};

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
} as never;

const renderScreen = () =>
  render(<QuoteBuilderScreen navigation={mockNavigation} />);

let loggerErrorSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { id: 'contractor-1' };
  mockGetQuotes.mockResolvedValue([makeQuote()]);
  mockGetStats.mockResolvedValue(fullStats);
  loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
});

afterEach(() => {
  loggerErrorSpy.mockRestore();
});

// Press the TouchableOpacity that owns an icon rendered as <Text>{name}</Text>.
// QuoteCard action handlers call e.stopPropagation(), so a synthetic event is supplied.
const pressIconButton = (getByText: (t: string) => unknown, name: string) => {
  const iconText = getByText(name) as { parent: unknown };
  fireEvent.press(
    iconText.parent as never,
    {
      stopPropagation: jest.fn(),
    } as never
  );
};

describe('QuoteBuilderScreen', () => {
  it('shows loading spinner before data resolves, then renders content', async () => {
    let resolveQuotes!: (v: ContractorQuote[]) => void;
    mockGetQuotes.mockReturnValueOnce(
      new Promise<ContractorQuote[]>((res) => {
        resolveQuotes = res;
      })
    );
    const { getByText, queryByText } = renderScreen();
    // loading && quotes.length === 0 -> spinner branch
    expect(getByText('Loading quotes...')).toBeTruthy();

    resolveQuotes([makeQuote()]);
    await waitFor(() => expect(queryByText('Quote Builder')).toBeTruthy());
  });

  it('renders header, stats card (GBP), filter counts and a quote card', async () => {
    const { getByText, queryByText } = renderScreen();

    await waitFor(() => expect(getByText('Quote Builder')).toBeTruthy());
    expect(getByText('Revenue Growth')).toBeTruthy();
    expect(getByText('Performance')).toBeTruthy();

    // STAT_ITEMS computed values
    expect(getByText('12')).toBeTruthy(); // total
    expect(getByText('5')).toBeTruthy(); // accepted
    expect(getByText('£7,817.05')).toBeTruthy(); // total_value GBP
    expect(getByText('42%')).toBeTruthy(); // acceptance_rate.toFixed(0)

    // Filter chips with counts
    expect(getByText('All (12)')).toBeTruthy();
    expect(getByText('Draft (3)')).toBeTruthy();
    expect(getByText('Sent (4)')).toBeTruthy();
    expect(getByText('Accepted (5)')).toBeTruthy();
    expect(getByText('Rejected (0)')).toBeTruthy();

    // Section title for 'all'
    expect(getByText('All Quotes')).toBeTruthy();
    // Quote card rendered (GBP total)
    expect(getByText('£1200.00')).toBeTruthy();
    // analytics panel hidden by default
    expect(queryByText('Analytics Overview')).toBeNull();

    // service called with contractor id + no status filter
    expect(mockGetQuotes).toHaveBeenCalledWith('contractor-1', {
      status: undefined,
    });
    expect(mockGetStats).toHaveBeenCalledWith('contractor-1');
  });

  it('does not call services when there is no authenticated user', async () => {
    mockUser = null;
    renderScreen();
    await waitFor(() => {
      expect(mockGetQuotes).not.toHaveBeenCalled();
    });
    expect(mockGetStats).not.toHaveBeenCalled();
  });

  it('falls back to empty contractor id when user.id is missing', async () => {
    mockUser = { id: '' };
    mockGetStats.mockResolvedValue(null);
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('All Quotes')).toBeTruthy());
    // user truthy but id empty -> `user?.id || ''` fallback exercised on load
    expect(mockGetQuotes).toHaveBeenCalledWith('', { status: undefined });

    // and again on the status-filter path
    fireEvent.press(getByText('Draft (0)'));
    await waitFor(() =>
      expect(mockGetQuotes).toHaveBeenLastCalledWith('', { status: ['draft'] })
    );
  });

  it('renders the empty state for "all" when no quotes returned', async () => {
    mockGetQuotes.mockResolvedValue([]);
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('No quotes found')).toBeTruthy());
    expect(
      getByText(
        'Create your first quote to get started with professional proposals'
      )
    ).toBeTruthy();

    // Create button in empty state navigates to CreateQuote
    fireEvent.press(getByText('Create Quote'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('CreateQuote');
  });

  it('filters by status: success path updates section title and empty text', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('All Quotes')).toBeTruthy());

    // Filter -> 'sent', return empty so we hit the status-specific empty branch
    mockGetQuotes.mockResolvedValueOnce([]);
    fireEvent.press(getByText('Sent (4)'));

    await waitFor(() => expect(getByText('Sent Quotes')).toBeTruthy());
    expect(getByText('No sent quotes at the moment')).toBeTruthy();
    // status filter array passed
    expect(mockGetQuotes).toHaveBeenLastCalledWith('contractor-1', {
      status: ['sent'],
    });
  });

  it('filters by status: error path shows toast', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('All Quotes')).toBeTruthy());

    mockGetQuotes.mockRejectedValueOnce(new Error('boom'));
    fireEvent.press(getByText('Draft (3)'));

    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith('Failed to filter quotes')
    );
  });

  it('shows error banner when initial quote load fails', async () => {
    mockGetQuotes.mockRejectedValueOnce(new Error('network'));
    const { getByText } = renderScreen();
    await waitFor(() =>
      expect(getByText('Failed to load quotes. Pull to refresh.')).toBeTruthy()
    );
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Error loading quotes',
      expect.any(Error)
    );
  });

  it('logs stats load failure without crashing', async () => {
    mockGetStats.mockRejectedValueOnce(new Error('stats-fail'));
    const { getByText } = renderScreen();
    // screen still renders quotes list despite stats failure
    await waitFor(() => expect(getByText('All Quotes')).toBeTruthy());
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Error loading stats',
      expect.any(Error)
    );
  });

  it('renders without stats card when stats is null', async () => {
    mockGetStats.mockResolvedValueOnce(null);
    const { getByText, queryByText } = renderScreen();
    await waitFor(() => expect(getByText('All Quotes')).toBeTruthy());
    expect(queryByText('Performance')).toBeNull();
    // filter counts fall back to 0
    expect(getByText('All (0)')).toBeTruthy();
    expect(getByText('Draft (0)')).toBeTruthy();
  });

  it('sends a quote successfully and reloads', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('All Quotes')).toBeTruthy());

    mockSendQuote.mockResolvedValueOnce(undefined);
    // The draft quote card exposes a send button (Ionicon 'send').
    pressIconButton(getByText, 'send');

    await waitFor(() =>
      expect(mockToast.success).toHaveBeenCalledWith('Quote sent successfully')
    );
    expect(mockSendQuote).toHaveBeenCalledWith('quote-abc12345');
  });

  it('shows error toast when sending a quote fails', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('All Quotes')).toBeTruthy());

    mockSendQuote.mockRejectedValueOnce(new Error('send-fail'));
    pressIconButton(getByText, 'send');

    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith('Failed to send quote')
    );
  });

  it('duplicates a quote successfully and on error', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('All Quotes')).toBeTruthy());

    mockDuplicateQuote.mockResolvedValueOnce(undefined);
    pressIconButton(getByText, 'copy');
    await waitFor(() =>
      expect(mockToast.success).toHaveBeenCalledWith(
        'Quote duplicated successfully'
      )
    );
    expect(mockDuplicateQuote).toHaveBeenCalledWith('quote-abc12345');

    // error branch
    mockDuplicateQuote.mockRejectedValueOnce(new Error('dup-fail'));
    pressIconButton(getByText, 'copy');
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith('Failed to duplicate quote')
    );
  });

  it('deletes a quote via Alert confirm: success and error onPress paths', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('All Quotes')).toBeTruthy());

    pressIconButton(getByText, 'trash');
    expect(alertSpy).toHaveBeenCalledWith(
      'Delete Quote',
      expect.stringContaining('cannot be undone'),
      expect.any(Array)
    );

    // Invoke the destructive button's onPress (success)
    const buttons = alertSpy.mock.calls[0][2] as Array<{
      text: string;
      onPress?: () => Promise<void> | void;
    }>;
    const deleteBtn = buttons.find((b) => b.text === 'Delete')!;
    mockDeleteQuote.mockResolvedValueOnce(undefined);
    await deleteBtn.onPress!();
    expect(mockDeleteQuote).toHaveBeenCalledWith('quote-abc12345');
    expect(mockToast.success).toHaveBeenCalledWith(
      'Quote deleted successfully'
    );

    // error path
    mockDeleteQuote.mockRejectedValueOnce(new Error('del-fail'));
    await deleteBtn.onPress!();
    expect(mockToast.error).toHaveBeenCalledWith('Failed to delete quote');

    alertSpy.mockRestore();
  });

  it('pull-to-refresh reloads quotes and stats', async () => {
    const { getByText, UNSAFE_root } = renderScreen();
    await waitFor(() => expect(getByText('All Quotes')).toBeTruthy());

    mockGetQuotes.mockClear();
    mockGetStats.mockClear();

    // Find the vertical ScrollView carrying the RefreshControl and fire its onRefresh.
    const scrollViews = UNSAFE_root.findAll(
      (node: { props?: { refreshControl?: unknown } }) =>
        Boolean(node.props && node.props.refreshControl)
    );
    expect(scrollViews.length).toBeGreaterThan(0);
    const onRefresh = (
      scrollViews[0].props.refreshControl as {
        props: { onRefresh: () => void };
      }
    ).props.onRefresh;
    onRefresh();

    await waitFor(() => {
      expect(mockGetQuotes).toHaveBeenCalled();
      expect(mockGetStats).toHaveBeenCalled();
    });
  });

  it('navigates from header, add button and quick actions', async () => {
    const { getByText, getAllByText, getByLabelText } = renderScreen();
    await waitFor(() => expect(getByText('Quote Builder')).toBeTruthy());

    // back button
    fireEvent.press(getByLabelText('Go back'));
    expect(mockNavigation.goBack).toHaveBeenCalled();

    // header "New Quote" + quick action "New Quote"
    const newQuoteEls = getAllByText('New Quote');
    fireEvent.press(newQuoteEls[0]);
    expect(mockNavigation.navigate).toHaveBeenCalledWith('CreateQuote');

    // quick actions
    fireEvent.press(getByText('Templates'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('QuoteTemplates');
    fireEvent.press(getByText('Quick quote'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('QuickQuote');

    // Quick action "New Quote" (distinct onPress from the header button).
    (mockNavigation.navigate as jest.Mock).mockClear();
    fireEvent.press(newQuoteEls[1]);
    expect(mockNavigation.navigate).toHaveBeenCalledWith('CreateQuote');
  });

  it('navigates to detail and edit from a quote card', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('All Quotes')).toBeTruthy());

    // Press the card itself -> QuoteDetail
    fireEvent.press(getByText('Bathroom refit'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('QuoteDetail', {
      quoteId: 'quote-abc12345',
    });

    // Edit pencil -> CreateQuote with jobId
    pressIconButton(getByText, 'pencil');
    expect(mockNavigation.navigate).toHaveBeenCalledWith('CreateQuote', {
      jobId: 'job-9',
    });
  });
});
