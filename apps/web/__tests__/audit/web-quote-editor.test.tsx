import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  act,
  cleanup,
} from '@testing-library/react';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { EditQuoteClient } from '@/app/contractor/(dashboard)/quotes/[id]/edit/components/EditQuoteClient';

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  confirm: vi.fn(),
  success: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));
vi.mock('react-hot-toast', () => ({ default: { success: mocks.success } }));
vi.mock('@/components/ui/confirm-dialog', () => ({
  useConfirm: () => mocks.confirm,
}));
const quote = {
  id: 'quote-1',
  title: 'Repair',
  client_name: 'Test client',
  status: 'draft',
  total_amount: 12,
  updated_at: '2026-11-06T12:00:00.123456Z',
  terms: 'Old terms',
  notes: 'Old notes',
  valid_until: '2026-12-01',
  line_items: [{ description: 'Part', quantity: 2, unitPrice: 5 }],
};
const response = (status: number, data: unknown) => ({
  ok: status < 400,
  status,
  json: async () => data,
});
beforeEach(() => {
  vi.stubGlobal('fetch', mocks.fetch);
  mocks.confirm.mockResolvedValue(true);
  mocks.fetch.mockResolvedValue(response(200, { quote: { id: quote.id } }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const open = () => render(<EditQuoteClient quote={quote} />);
const change = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const prices = () => {
  open();
  fireEvent.click(screen.getByText('Edit prices and items'));
};

it('saves details with the loaded version, and clearing terms/notes/date actually persists', async () => {
  open();
  change('Title', 'Updated');
  change('Terms (optional)', '');
  change('Notes (optional)', '');
  change('Valid until', '');
  expect(screen.queryByLabelText('Status')).toBeNull();
  expect(screen.queryByLabelText('Total amount (£)')).toBeNull();
  fireEvent.click(screen.getByText('Save changes'));
  await waitFor(() =>
    expect(mocks.push).toHaveBeenCalledWith('/contractor/quotes/quote-1')
  );
  expect(JSON.parse(mocks.fetch.mock.calls[0][1].body)).toEqual({
    expected_status: 'draft',
    expected_updated_at: quote.updated_at,
    title: 'Updated',
    client_name: 'Test client',
    terms: '',
    notes: '',
    valid_until: null,
  });
});
it('adds/removes rows and saves explicit pricing whose total matches the preview', async () => {
  prices();
  expect(screen.getByLabelText('Tax (%)')).toHaveValue('');
  change('Item 1 quantity', '1.5');
  change('Item 1 unit price', '12.50');
  fireEvent.click(screen.getByText('Add item'));
  change('Item 2 description', 'Labour');
  change('Item 2 unit price', '20');
  fireEvent.click(screen.getByText('Add item'));
  fireEvent.click(screen.getByLabelText('Remove item 3'));
  change('Tax (%)', '20');
  expect(screen.getByText('New total: £46.50')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Save changes'));
  await waitFor(() => expect(mocks.success).toHaveBeenCalled());
  const body = JSON.parse(mocks.fetch.mock.calls[0][1].body);
  expect(body.pricing).toEqual({
    tax_rate_percent: 20,
    line_items: [
      { description: 'Part', quantity: 1.5, unitPrice: 12.5 },
      { description: 'Labour', quantity: 1, unitPrice: 20 },
    ],
  });
  expect(body).not.toHaveProperty('total_amount');
  expect(body).not.toHaveProperty('status');
});
it.each(['', '-1', '1x', 'Infinity', '0.001'])(
  'blocks invalid prices %j without a request',
  (value) => {
    prices();
    change('Item 1 unit price', value);
    change('Tax (%)', '0');
    fireEvent.click(screen.getByText('Save changes'));
    expect(mocks.fetch).not.toHaveBeenCalled();
  }
);
it('requires tax and items, while accepting zero-priced items', () => {
  prices();
  fireEvent.click(screen.getByText('Save changes'));
  expect(mocks.fetch).not.toHaveBeenCalled();
  change('Tax (%)', '0');
  change('Item 1 unit price', '0');
  expect(screen.getByText('New total: £0.00')).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Remove item 1'));
  expect(screen.getByText('Save changes')).toBeDisabled();
});
it('can discard just the new pricing and still save the other details', async () => {
  prices();
  change('Title', 'New title');
  change('Item 1 unit price', '999');
  fireEvent.click(screen.getByText('Keep saved pricing'));
  fireEvent.click(screen.getByText('Save changes'));
  await waitFor(() => expect(mocks.fetch).toHaveBeenCalled());
  expect(JSON.parse(mocks.fetch.mock.calls[0][1].body)).not.toHaveProperty(
    'pricing'
  );
});
it('retains edits and handles structured API errors for retry', async () => {
  mocks.fetch.mockResolvedValueOnce(
    response(500, { error: { message: 'Service unavailable' } })
  );
  prices();
  change('Tax (%)', '5');
  change('Item 1 unit price', '7');
  fireEvent.click(screen.getByText('Save changes'));
  await screen.findByText('Service unavailable');
  expect(screen.getByLabelText('Item 1 unit price')).toHaveValue('7');
  fireEvent.click(screen.getByText('Save changes'));
  await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
  expect(mocks.fetch.mock.calls[0][1].body).toEqual(
    mocks.fetch.mock.calls[1][1].body
  );
});
it('does not overwrite newer data using a refreshed prop version', async () => {
  mocks.fetch.mockResolvedValueOnce(
    response(409, { error: { message: 'Changed elsewhere' } })
  );
  const view = open();
  change('Title', 'Keep my work');
  view.rerender(
    <EditQuoteClient
      quote={{
        ...quote,
        title: 'Other edit',
        updated_at: '2026-11-06T13:00:00Z',
      }}
    />
  );
  fireEvent.click(screen.getByText('Save changes'));
  await screen.findByText('Changed elsewhere');
  expect(
    JSON.parse(mocks.fetch.mock.calls[0][1].body).expected_updated_at
  ).toBe(quote.updated_at);
  expect(screen.getByLabelText('Title')).toHaveValue('Keep my work');
  expect(screen.getByText('Save changes')).toBeDisabled();
  expect(screen.getByText('Delete draft')).toBeDisabled();
  fireEvent.click(screen.getByText('Discard edits and review latest quote'));
  await waitFor(() =>
    expect(mocks.push).toHaveBeenCalledWith('/contractor/quotes/quote-1')
  );
});
it('blocks duplicate requests and save/delete overlap', async () => {
  let finish!: (value: unknown) => void;
  mocks.fetch.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  open();
  change('Title', 'Edited');
  fireEvent.click(screen.getByText('Save changes'));
  fireEvent.click(screen.getByText('Saving…'));
  fireEvent.click(screen.getByText('Delete draft'));
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
  expect(mocks.confirm).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Title')).toBeDisabled();
  await act(async () => finish(response(200, { quote: { id: quote.id } })));
});
it('only deletes a confirmed draft with its loaded version', async () => {
  mocks.fetch.mockResolvedValue(response(200, { success: true }));
  open();
  fireEvent.click(screen.getByText('Delete draft'));
  await waitFor(() =>
    expect(mocks.push).toHaveBeenCalledWith('/contractor/quotes')
  );
  expect(mocks.fetch).toHaveBeenCalledWith(
    '/api/contractor/quotes/quote-1',
    expect.objectContaining({
      method: 'DELETE',
      body: JSON.stringify({ expected_updated_at: quote.updated_at }),
    })
  );
});
it('cancelled deletion leaves the draft intact', async () => {
  mocks.confirm.mockResolvedValue(false);
  open();
  fireEvent.click(screen.getByText('Delete draft'));
  await waitFor(() => expect(screen.getByText('Delete draft')).toBeEnabled());
  expect(mocks.fetch).not.toHaveBeenCalled();
});
it.each(['sent', 'accepted', 'viewed', 'expired', 'rejected'])(
  'does not expose edits/deletion for %s',
  (status) => {
    render(<EditQuoteClient quote={{ ...quote, status }} />);
    expect(screen.getByText('This quote is read-only')).toBeInTheDocument();
    expect(screen.queryByText('Save changes')).toBeNull();
  }
);
it('rejects an unconfirmed successful response instead of losing edits', async () => {
  mocks.fetch.mockResolvedValue(response(200, {}));
  open();
  change('Title', 'Keep this');
  fireEvent.click(screen.getByText('Save changes'));
  await screen.findByText(/save could not be confirmed/);
  expect(mocks.push).not.toHaveBeenCalled();
});
