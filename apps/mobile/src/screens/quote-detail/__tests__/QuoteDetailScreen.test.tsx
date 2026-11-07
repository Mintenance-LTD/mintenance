import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { QuoteDetailScreen } from '../QuoteDetailScreen';
const mockGet = jest.fn();
const mockUpdate = jest.fn();
const mockSend = jest.fn();
const mockError = jest.fn();
const mockSuccess = jest.fn();
jest.mock('../../../services/QuoteBuilderService', () => ({
  QuoteBuilderService: {
    getQuotes: (...args: unknown[]) => mockGet(...args),
    updateQuote: (...args: unknown[]) => mockUpdate(...args),
    sendQuote: (...args: unknown[]) => mockSend(...args),
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
  updated_at: '2026-11-06T12:00:00.000Z',
  pricing_edit_version: 1,
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
  mockUpdate.mockReset();
  mockSend.mockReset();
  mockGet.mockResolvedValue([quote]);
});

it('does not send stale prices and reloads the quote for review after a conflict', async () => {
  mockGet.mockResolvedValue([{ ...quote, status: 'draft' }]);
  mockSend.mockRejectedValue({ statusCode: 409 });
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  const view = screen();
  await waitFor(() => expect(view.getByText('Send to Client')).toBeTruthy());
  fireEvent.press(view.getByText('Send to Client'));
  const send = alert.mock.calls[0][2]?.find((button) => button.text === 'Send');
  await act(async () => {
    await send?.onPress?.();
  });
  expect(mockSend).toHaveBeenCalledWith(quote.id, quote.updated_at);
  expect(mockError).toHaveBeenCalledWith(
    'Quote changed. Review the latest prices before sending.'
  );
  expect(mockGet).toHaveBeenCalledTimes(2);
  expect(mockSuccess).not.toHaveBeenCalled();
  alert.mockRestore();
});
it('shows a fallback reference and saved line items, with no edit action on an accepted quote', async () => {
  const view = screen();
  await waitFor(() => expect(view.getByText('Quote #QUOTE-12')).toBeTruthy());
  expect(view.getByText('Repair part · 2 × £5.00')).toBeTruthy();
  expect(view.queryByLabelText('Edit quote')).toBeNull();
  expect(view.queryByText('Edit quote')).toBeNull();
  expect(view.getByText('Tax')).toBeTruthy();
  fireEvent.press(view.getByText('Prepare amendment and view history'));
  expect(navigation.navigate).toHaveBeenCalledWith(
    'QuoteAmendmentPreparation',
    { quoteId: quote.id }
  );
});
it('updates the selected draft instead of opening a new quote', async () => {
  mockGet.mockResolvedValue([{ ...quote, status: 'draft' }]);
  mockUpdate.mockResolvedValue({ id: quote.id });
  const view = screen();
  await waitFor(() => expect(view.getByText('Edit quote')).toBeTruthy());
  fireEvent.press(view.getByText('Edit quote'));
  fireEvent.changeText(view.getByLabelText('Quote title'), 'Updated repair');
  fireEvent.press(view.getByText('Save details'));
  await waitFor(() =>
    expect(mockUpdate).toHaveBeenCalledWith(quote.id, {
      expected_status: 'draft',
      expected_updated_at: quote.updated_at,
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
  await waitFor(() => expect(view.getByText('Edit quote')).toBeTruthy());
  fireEvent.press(view.getByText('Edit quote'));
  fireEvent.changeText(view.getByLabelText('Quote title'), 'Keep my changes');
  fireEvent.press(view.getByText('Save details'));
  await waitFor(() =>
    expect(
      view.getByText(
        'Could not save quote. Your edits are kept here. Try saving again.'
      )
    ).toBeTruthy()
  );
  expect(view.getByLabelText('Quote title').props.value).toBe(
    'Keep my changes'
  );
});

async function openPrices() {
  mockGet.mockResolvedValue([{ ...quote, status: 'draft' }]);
  const view = screen();
  await waitFor(() => expect(view.getByText('Edit quote')).toBeTruthy());
  fireEvent.press(view.getByText('Edit quote'));
  expect(view.queryByText('Send to Client')).toBeNull();
  fireEvent.press(view.getByText('Edit prices and items'));
  return view;
}

it('blocks duplicate saves until the current request completes and reloads saved prices', async () => {
  let finish!: (value: { id: string }) => void;
  mockUpdate.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const view = await openPrices();
  fireEvent.changeText(view.getByLabelText('Tax percentage'), '0');
  fireEvent.press(view.getByText('Save quote'));
  fireEvent.press(view.getByText('Saving…'));
  expect(mockUpdate).toHaveBeenCalledTimes(1);
  expect(view.getByLabelText('Item 1 unit price').props.editable).toBe(false);
  mockGet.mockResolvedValue([
    {
      ...quote,
      status: 'draft',
      total_amount: 10,
      updated_at: '2026-11-06T12:01:00.000Z',
    },
  ]);
  await act(async () => {
    finish({ id: quote.id });
  });
  await waitFor(() =>
    expect(view.queryByLabelText('Tax percentage')).toBeNull()
  );
  expect(mockGet).toHaveBeenCalledTimes(2);
});

it('cancels price edits without saving them', async () => {
  const view = await openPrices();
  fireEvent.changeText(view.getByLabelText('Item 1 unit price'), '999');
  fireEvent.press(view.getByText('Cancel editing'));
  expect(view.queryByLabelText('Item 1 unit price')).toBeNull();
  expect(view.getByText('Repair part · 2 × £5.00')).toBeTruthy();
  expect(mockUpdate).not.toHaveBeenCalled();
});

it('edits, adds and removes items, previews tax and persists a versioned breakdown', async () => {
  mockUpdate.mockResolvedValue({ id: quote.id });
  const view = await openPrices();
  expect(view.getByLabelText('Tax percentage').props.value).toBe('');
  fireEvent.changeText(view.getByLabelText('Item 1 quantity'), '1.5');
  fireEvent.changeText(view.getByLabelText('Item 1 unit price'), '12.50');
  fireEvent.press(view.getByText('Add item'));
  fireEvent.changeText(view.getByLabelText('Item 2 description'), 'Labour');
  fireEvent.changeText(view.getByLabelText('Item 2 unit price'), '20');
  fireEvent.press(view.getByText('Add item'));
  fireEvent.press(view.getByLabelText('Remove item 3'));
  fireEvent.changeText(view.getByLabelText('Tax percentage'), '20');
  expect(view.getByText('New total: £46.50')).toBeTruthy();
  fireEvent.press(view.getByText('Save quote'));
  await waitFor(() =>
    expect(mockUpdate).toHaveBeenCalledWith(
      quote.id,
      expect.objectContaining({
        expected_status: 'draft',
        expected_updated_at: quote.updated_at,
        pricing: {
          tax_rate_percent: 20,
          line_items: [
            { description: 'Repair part', quantity: 1.5, unitPrice: 12.5 },
            { description: 'Labour', quantity: 1, unitPrice: 20 },
          ],
        },
      })
    )
  );
  expect(mockUpdate.mock.calls[0][1]).not.toHaveProperty('total_amount');
});

it.each(['', '-1', '1x', 'Infinity', '0.001'])(
  'rejects invalid unit price %j without saving',
  async (value) => {
    const view = await openPrices();
    fireEvent.changeText(view.getByLabelText('Tax percentage'), '0');
    fireEvent.changeText(view.getByLabelText('Item 1 unit price'), value);
    fireEvent.press(view.getByText('Save quote'));
    expect(mockUpdate).not.toHaveBeenCalled();
  }
);

it('requires explicit tax and at least one item, but allows a free item', async () => {
  const view = await openPrices();
  fireEvent.press(view.getByText('Save quote'));
  expect(mockUpdate).not.toHaveBeenCalled();
  fireEvent.changeText(view.getByLabelText('Tax percentage'), '0');
  fireEvent.changeText(view.getByLabelText('Item 1 unit price'), '0');
  expect(view.getByText('New total: £0.00')).toBeTruthy();
  fireEvent.press(view.getByLabelText('Remove item 1'));
  expect(view.getByText('Include between 1 and 100 line items.')).toBeTruthy();
  fireEvent.press(view.getByText('Save quote'));
  expect(mockUpdate).not.toHaveBeenCalled();
});

it('keeps changes on failure and retries the same pricing', async () => {
  mockUpdate
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({ id: quote.id });
  const view = await openPrices();
  fireEvent.changeText(view.getByLabelText('Tax percentage'), '5');
  fireEvent.changeText(view.getByLabelText('Item 1 unit price'), '7');
  fireEvent.press(view.getByText('Save quote'));
  await waitFor(() =>
    expect(view.getByText(/Could not save quote\./)).toBeTruthy()
  );
  expect(view.getByLabelText('Item 1 unit price').props.value).toBe('7');
  fireEvent.press(view.getByText('Save quote'));
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(2));
  expect(mockUpdate.mock.calls[1]).toEqual(mockUpdate.mock.calls[0]);
});

it('keeps a conflicting edit visible and requires reload before another save', async () => {
  mockUpdate.mockRejectedValue({ statusCode: 409 });
  const view = await openPrices();
  fireEvent.changeText(view.getByLabelText('Tax percentage'), '0');
  fireEvent.press(view.getByText('Save quote'));
  await waitFor(() =>
    expect(view.getByText('Discard edits and reload')).toBeTruthy()
  );
  fireEvent.press(view.getByText('Save quote'));
  expect(mockUpdate).toHaveBeenCalledTimes(1);
  mockGet.mockResolvedValue([{ ...quote, status: 'sent' }]);
  fireEvent.press(view.getByText('Discard edits and reload'));
  await waitFor(() => expect(view.getByText('SENT')).toBeTruthy());
  expect(view.queryByText('Edit quote')).toBeNull();
});

it('can keep existing pricing without silently repricing a title edit', async () => {
  mockUpdate.mockResolvedValue({ id: quote.id });
  const view = await openPrices();
  fireEvent.changeText(view.getByLabelText('Item 1 unit price'), '999');
  fireEvent.press(view.getByText('Keep saved pricing'));
  fireEvent.press(view.getByText('Save details'));
  await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
  expect(mockUpdate.mock.calls[0][1]).not.toHaveProperty('pricing');
});

it('does not offer price saving against an older API without the capability/version', async () => {
  mockGet.mockResolvedValue([
    { ...quote, status: 'draft', pricing_edit_version: undefined },
  ]);
  const view = screen();
  await waitFor(() => expect(view.getByText('Edit quote')).toBeTruthy());
  fireEvent.press(view.getByText('Edit quote'));
  fireEvent.press(view.getByText('Edit prices and items'));
  expect(view.queryByLabelText('Tax percentage')).toBeNull();
  expect(mockUpdate).not.toHaveBeenCalled();
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
