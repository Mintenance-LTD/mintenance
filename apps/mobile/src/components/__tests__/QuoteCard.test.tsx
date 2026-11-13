import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { QuoteCard } from '../QuoteCard';
import type { ContractorQuote } from '../../services/QuoteBuilderService';
const quote = {
  id: 'quote-123',
  quote_number: 'Q-001',
  project_title: 'Kitchen repair',
  client_name: 'Jo Smith',
  total_amount: 1200,
  currency: 'GBP',
  status: 'draft',
  created_at: '2026-01-15',
  valid_until: '2020-01-01',
} as ContractorQuote;
const handlers = {
  onPress: jest.fn(),
  onEdit: jest.fn(),
  onDuplicate: jest.fn(),
  onDelete: jest.fn(),
};
beforeEach(() => jest.clearAllMocks());
it('shows a scannable title, client, formatted total and server status', () => {
  const ui = render(<QuoteCard quote={quote} {...handlers} />);
  expect(ui.getByText('£1,200.00')).toBeTruthy();
  expect(ui.getByText('Jo Smith')).toBeTruthy();
  expect(ui.getByText('Draft')).toBeTruthy();
  fireEvent.press(ui.getByLabelText('Review draft Q-001'));
  expect(handlers.onEdit).toHaveBeenCalledTimes(1);
  expect(handlers.onPress).not.toHaveBeenCalled();
});
it.each(['accepted', 'rejected', 'sent'] as const)(
  'preserves %s status after the offer date passes and hides draft-only actions',
  (status) => {
    const ui = render(<QuoteCard quote={{ ...quote, status }} {...handlers} />);
    expect(
      ui.getByText(status.charAt(0).toUpperCase() + status.slice(1))
    ).toBeTruthy();
    expect(ui.queryByText('Expired')).toBeNull();
    expect(ui.queryByLabelText('Review draft Q-001')).toBeNull();
    fireEvent.press(ui.getByLabelText('More actions for quote Q-001'));
    expect(ui.queryByText('Delete draft')).toBeNull();
    fireEvent.press(ui.getByText('Duplicate as a draft'));
    expect(handlers.onDuplicate).toHaveBeenCalledTimes(1);
    expect(handlers.onPress).not.toHaveBeenCalled();
  }
);
it('keeps deletion behind the draft action menu', () => {
  const ui = render(<QuoteCard quote={quote} {...handlers} />);
  expect(ui.queryByText('Delete draft')).toBeNull();
  fireEvent.press(ui.getByLabelText('More actions for quote Q-001'));
  fireEvent.press(ui.getByText('Delete draft'));
  expect(handlers.onDelete).toHaveBeenCalledTimes(1);
});
it('disables more actions while a mutation is pending', () => {
  const ui = render(<QuoteCard quote={quote} {...handlers} busy />);
  expect(
    ui.getByLabelText('More actions for quote Q-001').props.accessibilityState
      .disabled
  ).toBe(true);
});
