import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { QuoteBuilderScreen } from '../QuoteBuilderScreen';
import type { ContractorQuote } from '../../services/QuoteBuilderService';
jest.mock('react-native', () => {
  const native = jest.requireActual('react-native');
  const React = require('react');
  return {
    ...native,
    FlatList: ({
      data,
      renderItem,
      ListHeaderComponent,
      ListEmptyComponent,
    }: any) =>
      React.createElement(
        native.View,
        null,
        ListHeaderComponent,
        data.length
          ? data.map((item: any, index: number) =>
              React.createElement(
                React.Fragment,
                { key: item.id },
                renderItem({ item, index })
              )
            )
          : ListEmptyComponent
      ),
  };
});
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) =>
    require('react').useEffect(callback, [callback]),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
  SafeAreaView: require('react-native').View,
}));
const mockToast = { success: jest.fn(), error: jest.fn() };
jest.mock('../../components/ui/Toast', () => ({ useToast: () => mockToast }));
let mockUser: { id: string } | null = { id: 'contractor-1' };
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));
const mockGetQuotes = jest.fn(),
  mockGetStats = jest.fn(),
  mockDuplicateQuote = jest.fn(),
  mockDeleteQuote = jest.fn();
jest.mock('../../services/QuoteBuilderService', () => ({
  QuoteBuilderService: {
    getQuotes: (...a: unknown[]) => mockGetQuotes(...a),
    getQuoteSummaryStats: (...a: unknown[]) => mockGetStats(...a),
    duplicateQuote: (...a: unknown[]) => mockDuplicateQuote(...a),
    deleteQuote: (...a: unknown[]) => mockDeleteQuote(...a),
  },
}));
const draft = {
  id: 'quote-1',
  quote_number: 'Q-001',
  project_title: 'Bathroom refit',
  client_name: 'Jane',
  status: 'draft',
  total_amount: 1200,
  currency: 'GBP',
  created_at: '2026-01-01',
} as ContractorQuote;
const accepted = {
  ...draft,
  id: 'quote-2',
  quote_number: 'Q-002',
  status: 'accepted',
  project_title: 'Garden fence',
  client_name: 'Jim',
} as ContractorQuote;
const stats = {
  total_quotes: 2,
  draft_quotes: 1,
  sent_quotes: 0,
  accepted_quotes: 1,
  rejected_quotes: 0,
  total_value: 2400,
  accepted_value: 1200,
  acceptance_rate: 100,
};
const navigation = { navigate: jest.fn(), goBack: jest.fn() };
const show = () =>
  render(<QuoteBuilderScreen navigation={navigation as never} />);
beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { id: 'contractor-1' };
  mockGetQuotes.mockResolvedValue([draft, accepted]);
  mockGetStats.mockResolvedValue(stats);
  mockDuplicateQuote.mockResolvedValue(draft);
  mockDeleteQuote.mockResolvedValue(undefined);
});
afterEach(() => jest.restoreAllMocks());
it('has one create action, compact summary and existing draft navigation', async () => {
  const ui = show();
  await ui.findByText('Bathroom refit');
  expect(ui.getAllByLabelText('Create new quote')).toHaveLength(1);
  expect(ui.queryByText('Total quoted: £2,400.00')).toBeNull();
  fireEvent.press(ui.getByText('Quote summary'));
  expect(ui.getByText('Total quoted: £2,400.00')).toBeTruthy();
  fireEvent.press(ui.getByLabelText('Review draft Q-001'));
  expect(navigation.navigate).toHaveBeenCalledWith('QuoteDetail', {
    quoteId: 'quote-1',
  });
  fireEvent.press(ui.getByLabelText('Create new quote'));
  expect(navigation.navigate).toHaveBeenCalledWith('CreateQuote', {});
  fireEvent.press(ui.getByText('Quick quote'));
  expect(navigation.navigate).toHaveBeenCalledWith('QuickQuote', {});
  fireEvent.press(ui.getByText('Templates'));
  expect(navigation.navigate).toHaveBeenCalledWith('QuoteTemplates');
});
it('combines client search and all status choices without extra fetches', async () => {
  const ui = show();
  await ui.findByText('Bathroom refit');
  fireEvent.changeText(ui.getByLabelText('Search quotes'), 'jim');
  expect(ui.queryByText('Bathroom refit')).toBeNull();
  expect(ui.getByText('Garden fence')).toBeTruthy();
  fireEvent.press(ui.getByLabelText('Quote status: All statuses (2)'));
  expect(ui.getByText('Expired (0)')).toBeTruthy();
  fireEvent.press(ui.getByText('Draft (1)'));
  expect(ui.getByText('No matching quotes')).toBeTruthy();
  fireEvent.press(ui.getByText('Clear filters'));
  expect(ui.getByText('Bathroom refit')).toBeTruthy();
  expect(mockGetQuotes).toHaveBeenCalledTimes(1);
});
it('shows a retryable error, not a false empty list, and clears it after recovery', async () => {
  mockGetQuotes.mockRejectedValueOnce(new Error('offline'));
  const ui = show();
  await ui.findByText('Retry quotes');
  expect(ui.queryByText('No quotes yet')).toBeNull();
  fireEvent.press(ui.getByText('Retry quotes'));
  await ui.findByText('Bathroom refit');
  expect(ui.queryByText('Retry quotes')).toBeNull();
});
it('reloads counts after duplication and blocks duplicate taps during a mutation', async () => {
  let resolve!: () => void;
  mockDuplicateQuote.mockReturnValue(
    new Promise<void>((r) => {
      resolve = r;
    })
  );
  const ui = show();
  await ui.findByText('Bathroom refit');
  fireEvent.press(ui.getByLabelText('More actions for quote Q-001'));
  fireEvent.press(ui.getByText('Duplicate as a draft'));
  expect(
    ui.getByLabelText('More actions for quote Q-001').props.accessibilityState
      .disabled
  ).toBe(true);
  await act(async () => resolve());
  await waitFor(() =>
    expect(mockToast.success).toHaveBeenCalledWith('Draft copy created')
  );
  expect(mockDuplicateQuote).toHaveBeenCalledTimes(1);
  expect(mockGetStats).toHaveBeenCalledTimes(2);
});
it('requires confirmation before deleting a draft and refreshes summary', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const ui = show();
  await ui.findByText('Bathroom refit');
  fireEvent.press(ui.getByLabelText('More actions for quote Q-001'));
  fireEvent.press(ui.getByText('Delete draft'));
  expect(mockDeleteQuote).not.toHaveBeenCalled();
  const confirm = alert.mock.calls[0][2]?.find(
    (button) => button.text === 'Delete draft'
  );
  await act(async () => {
    confirm?.onPress?.();
  });
  await waitFor(() => expect(mockDeleteQuote).toHaveBeenCalledWith('quote-1'));
  expect(mockGetStats).toHaveBeenCalledTimes(2);
});
it('reports mutation failures and releases the busy control', async () => {
  mockDuplicateQuote.mockRejectedValue(new Error('offline'));
  const ui = show();
  await ui.findByText('Bathroom refit');
  fireEvent.press(ui.getByLabelText('More actions for quote Q-001'));
  fireEvent.press(ui.getByText('Duplicate as a draft'));
  await waitFor(() => expect(mockToast.error).toHaveBeenCalled());
  expect(
    ui.getByLabelText('More actions for quote Q-001').props.accessibilityState
      .disabled
  ).toBe(false);
});
it('ignores an old account response after switching accounts', async () => {
  let resolve!: (value: ContractorQuote[]) => void;
  mockGetQuotes.mockReturnValueOnce(
    new Promise<ContractorQuote[]>((r) => {
      resolve = r;
    })
  );
  const ui = show();
  mockUser = { id: 'contractor-2' };
  mockGetQuotes.mockResolvedValue([]);
  ui.rerender(<QuoteBuilderScreen navigation={navigation as never} />);
  await ui.findByText('No quotes yet');
  await act(async () => resolve([draft]));
  expect(ui.queryByText('Bathroom refit')).toBeNull();
});
it('does not request quotes without a signed in account', async () => {
  mockUser = null;
  const ui = show();
  await ui.findByText('No quotes yet');
  expect(mockGetQuotes).not.toHaveBeenCalled();
});
