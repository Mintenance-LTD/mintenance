import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { QuoteAmendmentsScreen } from '../job-details/QuoteAmendmentsScreen';
import {
  getQuoteAmendments,
  decideQuoteAmendment,
} from '../../services/quotes/QuoteAmendments';
jest.mock('../../services/quotes/QuoteAmendments', () => ({
  getQuoteAmendments: jest.fn(),
  decideQuoteAmendment: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) =>
    jest
      .requireActual<typeof import('react')>('react')
      .useEffect(callback, [callback]),
}));
const load = getQuoteAmendments as jest.Mock,
  decide = decideQuoteAmendment as jest.Mock;
const navigation = { replace: jest.fn() };
const price = {
  line_items: [
    { description: 'Repair', quantity: 2, unitPrice: 60, total: 120 },
  ],
  subtotal: 120,
  tax_rate: 0,
  tax_amount: 0,
  total_amount: 120,
  terms: 'After review',
};
const amendment = {
  id: 'proposal',
  version: 1,
  sequence: 1,
  status: 'published',
  reason: 'Extra work',
  before_snapshot: { ...price, total_amount: 100 },
  after_snapshot: price,
  events: [
    {
      version: 1,
      action: 'publish',
      note: 'Review requested',
      created_at: '2026-11-06T10:00:00Z',
    },
  ],
};
const page = {
  amendments: [amendment],
  can_approve: true,
  is_contractor: false,
  next_before: null,
};
const screen = () =>
  render(
    <QuoteAmendmentsScreen
      route={{ params: { jobId: 'job' } } as any}
      navigation={navigation as any}
    />
  );
beforeEach(() => {
  jest.clearAllMocks();
  load.mockReset().mockResolvedValue(page);
  decide
    .mockReset()
    .mockResolvedValue({ amendment: { id: 'proposal', status: 'approved' } });
});
it('shows recorded full pricing and requires review before approval', async () => {
  const ui = screen();
  await ui.findByText('Extra work');
  expect(ui.getByText('Previously accepted pricing')).toBeTruthy();
  expect(ui.getByText('Total: £100.00')).toBeTruthy();
  expect(ui.getByText('Total: £120.00')).toBeTruthy();
  fireEvent.press(ui.getByText('Approve proposal'));
  expect(decide).not.toHaveBeenCalled();
  fireEvent.press(ui.getByLabelText('I have reviewed the complete pricing'));
  fireEvent.changeText(ui.getByLabelText('Decision note'), 'Agreed');
  fireEvent.press(ui.getByText('Approve proposal'));
  await waitFor(() =>
    expect(decide).toHaveBeenCalledWith('job', 'proposal', {
      action: 'approve',
      expected_version: 1,
      confirmed: true,
      note: 'Agreed',
    })
  );
});
it('withholds decision controls for read-only participants', async () => {
  load.mockResolvedValue({ ...page, can_approve: false });
  const ui = screen();
  await ui.findByText('Extra work');
  expect(ui.queryByText('Approve proposal')).toBeNull();
  expect(ui.queryByText('Apply approved pricing')).toBeNull();
});
it.each(['reject', 'apply', 'withdraw'])(
  'submits %s with the recorded version',
  async (action) => {
    const contractor = action !== 'reject';
    load.mockResolvedValue({
      ...page,
      can_approve: !contractor,
      is_contractor: contractor,
      amendments: [
        {
          ...amendment,
          status: contractor ? 'approved' : 'published',
          version: 2,
        },
      ],
    });
    const ui = screen();
    await ui.findByText('Extra work');
    fireEvent.press(ui.getByLabelText('I have reviewed the complete pricing'));
    fireEvent.press(
      ui.getByText(
        action === 'reject'
          ? 'Reject proposal'
          : action === 'apply'
            ? 'Apply approved pricing'
            : 'Withdraw proposal'
      )
    );
    await waitFor(() =>
      expect(decide).toHaveBeenCalledWith(
        'job',
        'proposal',
        expect.objectContaining({ action, expected_version: 2 })
      )
    );
  }
);
it('retains the exact ambiguous request and prevents overlapping submissions', async () => {
  let reject!: (error: Error) => void;
  decide.mockReturnValueOnce(
    new Promise((_resolve, fail) => {
      reject = fail;
    })
  );
  const ui = screen();
  await ui.findByText('Extra work');
  fireEvent.press(ui.getByLabelText('I have reviewed the complete pricing'));
  fireEvent.changeText(ui.getByLabelText('Decision note'), 'Original');
  fireEvent.press(ui.getByText('Approve proposal'));
  fireEvent.press(ui.getByText('Approve proposal'));
  expect(decide).toHaveBeenCalledTimes(1);
  await act(async () => reject(new Error('Connection lost')));
  fireEvent.press(ui.getByText('Retry same action'));
  await waitFor(() => expect(decide).toHaveBeenCalledTimes(2));
  expect(decide.mock.calls[1]).toEqual(decide.mock.calls[0]);
});
it('blocks stale decisions until refresh and requires review again', async () => {
  decide.mockRejectedValueOnce(
    Object.assign(new Error('Proposal changed'), { statusCode: 409 })
  );
  const ui = screen();
  await ui.findByText('Extra work');
  fireEvent.press(ui.getByLabelText('I have reviewed the complete pricing'));
  fireEvent.press(ui.getByText('Approve proposal'));
  await ui.findByText('Proposal changed');
  expect(ui.queryByText('Retry same action')).toBeNull();
  fireEvent.press(ui.getByText('Approve proposal'));
  expect(decide).toHaveBeenCalledTimes(1);
  await act(async () => {
    fireEvent.press(ui.getByText('Refresh review'));
  });
  expect(load).toHaveBeenCalledTimes(2);
  expect(load).toHaveBeenLastCalledWith('job', undefined);
  await waitFor(() => expect(ui.queryByText('Proposal changed')).toBeNull());
  fireEvent.press(ui.getByText('Approve proposal'));
  expect(decide).toHaveBeenCalledTimes(1);
});
it('shows failed loads as retryable errors instead of an empty history', async () => {
  load.mockRejectedValueOnce(new Error('Review unavailable'));
  const ui = screen();
  await ui.findByText('Review unavailable');
  expect(
    ui.queryByText('No proposals have been submitted for customer review.')
  ).toBeNull();
  fireEvent.press(ui.getByText('Refresh review'));
  await ui.findByText('Extra work');
});
it('appends older history and preserves current entries', async () => {
  load
    .mockResolvedValueOnce({ ...page, next_before: 1 })
    .mockResolvedValueOnce({
      ...page,
      amendments: [
        { ...amendment, id: 'older', sequence: 0, reason: 'Old work' },
      ],
    });
  const ui = screen();
  await ui.findByText('Load older amendments');
  fireEvent.press(ui.getByText('Load older amendments'));
  await ui.findByText('Old work');
  expect(ui.getByText('Extra work')).toBeTruthy();
  expect(load).toHaveBeenLastCalledWith('job', 1);
});
it('returns a notification-opened screen to its job', async () => {
  const ui = screen();
  await ui.findByText('Extra work');
  fireEvent.press(ui.getByText('Back to job'));
  expect(navigation.replace).toHaveBeenCalledWith('JobDetails', {
    jobId: 'job',
  });
});
it('preserves confirmed success when the following history refresh fails', async () => {
  load
    .mockResolvedValueOnce(page)
    .mockRejectedValueOnce(new Error('History unavailable'));
  const ui = screen();
  await ui.findByText('Extra work');
  fireEvent.press(ui.getByLabelText('I have reviewed the complete pricing'));
  await act(async () => {
    fireEvent.press(ui.getByText('Approve proposal'));
  });
  expect(ui.getByText('Recorded: approved.')).toBeTruthy();
  expect(ui.getByText('History unavailable')).toBeTruthy();
  expect(ui.queryByText('Approve proposal')).toBeNull();
  expect(ui.queryByText('Retry same action')).toBeNull();
});
