import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QuoteDetailScreen } from '../QuoteDetailScreen';
const mockGet = jest.fn();
const mockUpdate = jest.fn();
const mockError = jest.fn();
const mockSuccess = jest.fn();
jest.mock('../../../services/QuoteBuilderService', () => ({
  QuoteBuilderService: {
    getQuotes: (...args: unknown[]) => mockGet(...args),
    updateQuote: (...args: unknown[]) => mockUpdate(...args),
  },
}));
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'contractor' } }),
}));
jest.mock('../../../components/ui/Toast', () => ({
  useToast: () => ({ error: mockError, success: mockSuccess }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
const navigation = { navigate: jest.fn(), goBack: jest.fn() };
const quote = {
  id: 'quote-1234',
  status: 'accepted',
  quote_number: null,
  project_title: 'Test repair',
  client_name: 'Synthetic client',
  subtotal: 10,
  total_amount: 10,
  tax_amount: 0,
  created_at: '2026-11-01',
  line_items: [
    { description: 'Repair part', quantity: 2, unitPrice: 5, total: 10 },
  ],
};
const screen = () =>
  render(
    <QuoteDetailScreen
      navigation={navigation as never}
      route={{ params: { quoteId: quote.id } } as never}
    />
  );
beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue([quote]);
});
it('shows a fallback reference and saved line items, with no edit action on an accepted quote', async () => {
  const view = screen();
  await waitFor(() => expect(view.getByText('Quote #QUOTE-12')).toBeTruthy());
  expect(view.getByText('Repair part · 2 × £5.00')).toBeTruthy();
  expect(view.queryByLabelText('Edit quote details')).toBeNull();
  expect(view.queryByText('Edit details')).toBeNull();
  expect(view.getByText('Tax')).toBeTruthy();
});
it('updates the selected draft instead of opening a new quote', async () => {
  mockGet.mockResolvedValue([{ ...quote, status: 'draft' }]);
  mockUpdate.mockResolvedValue({ id: quote.id });
  const view = screen();
  await waitFor(() => expect(view.getByText('Edit details')).toBeTruthy());
  fireEvent.press(view.getByText('Edit details'));
  fireEvent.changeText(view.getByLabelText('Quote title'), 'Updated repair');
  fireEvent.press(view.getByText('Save details'));
  await waitFor(() =>
    expect(mockUpdate).toHaveBeenCalledWith(quote.id, {
      expected_status: 'draft',
      title: 'Updated repair',
      client_name: 'Synthetic client',
    })
  );
  expect(navigation.navigate).not.toHaveBeenCalled();
});
it('retains edited draft details after a failed save', async () => {
  mockGet.mockResolvedValue([{ ...quote, status: 'draft' }]);
  mockUpdate.mockRejectedValue(new Error('offline'));
  const view = screen();
  await waitFor(() => expect(view.getByText('Edit details')).toBeTruthy());
  fireEvent.press(view.getByText('Edit details'));
  fireEvent.changeText(view.getByLabelText('Quote title'), 'Keep my changes');
  fireEvent.press(view.getByText('Save details'));
  await waitFor(() => expect(mockError).toHaveBeenCalled());
  expect(view.getByLabelText('Quote title').props.value).toBe(
    'Keep my changes'
  );
});
it('offers retry for an unavailable quote instead of claiming it does not exist', async () => {
  mockGet
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce([quote]);
  const view = screen();
  await waitFor(() =>
    expect(view.getByText('Could not load quote')).toBeTruthy()
  );
  expect(view.queryByText('Quote not found')).toBeNull();
  fireEvent.press(view.getByText('Retry loading quote'));
  await waitFor(() => expect(view.getByText('Quote #QUOTE-12')).toBeTruthy());
});
