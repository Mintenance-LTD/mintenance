import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { QuoteAmendmentPreparationScreen } from '../QuoteAmendmentPreparationScreen';
import {
  getAmendmentSource,
  getAmendmentHistory,
  prepareQuoteAmendment,
  publishQuoteAmendment,
} from '../../../services/quotes/QuoteAmendmentPreparation';
const mockDirty = jest.fn(),
  mockLeave = jest.fn();
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'owner' } }),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ dispatch: mockLeave }),
  usePreventRemove: (...args: unknown[]) => mockDirty(...args),
  CommonActions: {
    navigate: (name: string, params: object) => ({
      type: 'NAVIGATE',
      payload: { name, params },
    }),
  },
}));
jest.mock('expo-crypto', () => ({
  randomUUID: () => '11111111-1111-4111-8111-111111111111',
}));
jest.mock('../../../services/quotes/QuoteAmendmentPreparation', () => ({
  getAmendmentSource: jest.fn(),
  getAmendmentHistory: jest.fn(),
  prepareQuoteAmendment: jest.fn(),
  publishQuoteAmendment: jest.fn(),
}));
const sourceRead = getAmendmentSource as jest.Mock,
  history = getAmendmentHistory as jest.Mock,
  prepare = prepareQuoteAmendment as jest.Mock,
  publish = publishQuoteAmendment as jest.Mock;
const navigation = { goBack: jest.fn(), dispatch: jest.fn() };
const source = {
  quote: {
    id: 'quote',
    title: 'Repair',
    status: 'accepted',
    job_id: 'job',
    updated_at: '2026-11-07T00:00:00.123456Z',
    total_amount: 100,
    line_items: [{ description: 'Repair part', quantity: 1, unitPrice: 100 }],
    terms: 'Original terms',
  },
  is_current: true,
};
const snapshot = {
  line_items: [
    { description: 'Repair part', quantity: 1, unitPrice: 100, total: 100 },
  ],
  subtotal: 100,
  tax_amount: 0,
  tax_rate: 0,
  total_amount: 100,
  terms: 'Original terms',
};
const revision = {
  id: 'revision',
  quote_id: 'quote',
  kind: 'amendment_proposed',
  revision_number: 2,
  reason: 'Extra work',
  before_snapshot: snapshot,
  after_snapshot: { ...snapshot, total_amount: 120 },
  created_at: '2026-11-07T00:00:00Z',
};
const screen = () =>
  render(
    <QuoteAmendmentPreparationScreen
      route={{ params: { quoteId: 'quote' } } as any}
      navigation={navigation as any}
    />
  );
type UI = ReturnType<typeof screen>;
async function edit(ui: UI) {
  fireEvent.press(await ui.findByText('Prepare new pricing proposal'));
  fireEvent.changeText(ui.getByLabelText('Reason for amendment'), 'Extra work');
  fireEvent.changeText(ui.getByLabelText('Tax percentage'), '20');
}
beforeEach(() => {
  jest.clearAllMocks();
  sourceRead.mockReset().mockResolvedValue(source);
  history.mockReset().mockResolvedValue({ revisions: [], next_before: null });
  prepare.mockReset().mockResolvedValue(revision);
  publish
    .mockReset()
    .mockResolvedValue({ id: 'revision', status: 'published' });
  jest.spyOn(Alert, 'alert');
});
it('previews the shared rounded price and saves a separate proposal without publishing', async () => {
  const ui = screen();
  await edit(ui);
  fireEvent.changeText(ui.getByLabelText('Item 1 quantity'), '1.5');
  fireEvent.changeText(ui.getByLabelText('Item 1 unit price'), '10.01');
  expect(ui.getByText('Proposed total: £18.02')).toBeTruthy();
  expect(mockDirty).toHaveBeenLastCalledWith(true, expect.any(Function));
  await act(async () => {
    fireEvent.press(ui.getByText('Save proposal'));
  });
  expect(prepare).toHaveBeenCalledWith('quote', {
    request_id: '11111111-1111-4111-8111-111111111111',
    expected_updated_at: source.quote.updated_at,
    reason: 'Extra work',
    pricing: {
      line_items: [
        { description: 'Repair part', quantity: 1.5, unitPrice: 10.01 },
      ],
      tax_rate_percent: 20,
    },
  });
  expect(publish).not.toHaveBeenCalled();
  expect(ui.getByText('Accepted source total: £100.00')).toBeTruthy();
  expect(ui.getByText('Customer review: not submitted')).toBeTruthy();
});
it('requires an explicit tax rate instead of inferring one from the accepted price', async () => {
  const ui = screen();
  fireEvent.press(await ui.findByText('Prepare new pricing proposal'));
  fireEvent.changeText(ui.getByLabelText('Reason for amendment'), 'Extra work');
  fireEvent.press(ui.getByText('Save proposal'));
  expect(prepare).not.toHaveBeenCalled();
  expect(ui.getByLabelText('Tax percentage').props.value).toBe('');
});
it.each(['', '-1', '1e2', '10.001', '1000001'])(
  'rejects invalid unit price %s',
  async (value) => {
    const ui = screen();
    await edit(ui);
    fireEvent.changeText(ui.getByLabelText('Item 1 unit price'), value);
    fireEvent.press(ui.getByText('Save proposal'));
    expect(prepare).not.toHaveBeenCalled();
  }
);
it('supports adding/removing items and refuses an empty proposal', async () => {
  const ui = screen();
  await edit(ui);
  fireEvent.press(ui.getByText('Add item'));
  fireEvent.changeText(ui.getByLabelText('Item 2 description'), 'Second part');
  fireEvent.changeText(ui.getByLabelText('Item 2 unit price'), '5');
  expect(ui.getByText('Proposed total: £126.00')).toBeTruthy();
  fireEvent.press(ui.getByText('Remove item 1'));
  expect(ui.getByLabelText('Item 1 description').props.value).toBe(
    'Second part'
  );
  fireEvent.press(ui.getByText('Remove item 1'));
  fireEvent.press(ui.getByText('Save proposal'));
  expect(prepare).not.toHaveBeenCalled();
});
it('preserves exact request on ambiguous save, locks inputs and prevents duplicate taps', async () => {
  let fail!: (err: Error) => void;
  prepare.mockReturnValueOnce(
    new Promise((_resolve, reject) => {
      fail = reject;
    })
  );
  const ui = screen();
  await edit(ui);
  fireEvent.press(ui.getByText('Save proposal'));
  fireEvent.press(ui.getByText('Saving proposal…'));
  expect(prepare).toHaveBeenCalledTimes(1);
  await act(async () => fail(new Error('Connection lost')));
  fireEvent.changeText(
    ui.getByLabelText('Reason for amendment'),
    'Changed after failure'
  );
  await act(async () => {
    fireEvent.press(ui.getByText('Retry same proposal'));
  });
  expect(prepare).toHaveBeenCalledTimes(2);
  expect(prepare.mock.calls[1]).toEqual(prepare.mock.calls[0]);
});
it('blocks conflicts while retaining edits and asks before discarding them', async () => {
  prepare.mockRejectedValueOnce(
    Object.assign(new Error('Quote changed'), { statusCode: 409 })
  );
  const ui = screen();
  await edit(ui);
  await act(async () => {
    fireEvent.press(ui.getByText('Save proposal'));
  });
  expect(ui.getByText('Quote changed')).toBeTruthy();
  expect(ui.getByLabelText('Reason for amendment').props.value).toBe(
    'Extra work'
  );
  fireEvent.press(ui.getByText('Save proposal'));
  expect(prepare).toHaveBeenCalledTimes(1);
  fireEvent.press(ui.getByText('Discard edits and reload history'));
  expect(Alert.alert).toHaveBeenLastCalledWith(
    'Discard local edits?',
    expect.any(String),
    expect.any(Array)
  );
  const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)[2];
  await act(async () => {
    buttons[1].onPress();
  });
  expect(sourceRead).toHaveBeenCalledTimes(2);
  expect(ui.queryByLabelText('Reason for amendment')).toBeNull();
});
it('reloads saved proposals and publishes only after a separate confirmation', async () => {
  history.mockResolvedValue({ revisions: [revision], next_before: null });
  const ui = screen();
  fireEvent.press(await ui.findByText('Submit for customer review'));
  expect(publish).not.toHaveBeenCalled();
  const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)[2];
  await act(async () => {
    await buttons[1].onPress();
  });
  expect(publish).toHaveBeenCalledWith('job', 'revision');
  expect(prepare).not.toHaveBeenCalled();
  expect(ui.getByText('Customer review: published')).toBeTruthy();
  fireEvent.press(ui.getByText('View customer review'));
  expect(navigation.dispatch).toHaveBeenCalledWith(
    expect.objectContaining({
      payload: expect.objectContaining({ name: 'Main' }),
    })
  );
});
it('can cancel publication without a network mutation', async () => {
  history.mockResolvedValue({ revisions: [revision], next_before: null });
  const ui = screen();
  fireEvent.press(await ui.findByText('Submit for customer review'));
  await act(async () => {
    (Alert.alert as jest.Mock).mock.calls.at(-1)[2][0].onPress();
  });
  expect(publish).not.toHaveBeenCalled();
});
it('retains confirmed saved content when publication fails and retries the same revision', async () => {
  history.mockResolvedValue({ revisions: [revision], next_before: null });
  publish.mockRejectedValueOnce(new Error('Delivery unavailable'));
  const ui = screen();
  fireEvent.press(await ui.findByText('Submit for customer review'));
  await act(async () => {
    await (Alert.alert as jest.Mock).mock.calls.at(-1)[2][1].onPress();
  });
  expect(ui.getByText('Delivery unavailable')).toBeTruthy();
  fireEvent.press(ui.getByText('Submit for customer review'));
  await act(async () => {
    await (Alert.alert as jest.Mock).mock.calls.at(-1)[2][1].onPress();
  });
  expect(publish.mock.calls[1]).toEqual(publish.mock.calls[0]);
  expect(prepare).not.toHaveBeenCalled();
});
it('does not advertise preparation or publication on a superseded quote', async () => {
  sourceRead.mockResolvedValue({ ...source, is_current: false });
  history.mockResolvedValue({ revisions: [revision], next_before: null });
  const ui = screen();
  await ui.findByText(/This is a historical quote/);
  expect(ui.queryByText('Prepare new pricing proposal')).toBeNull();
  expect(ui.queryByText('Submit for customer review')).toBeNull();
});
it('permits saving a standalone proposal but explains why it cannot be published', async () => {
  sourceRead.mockResolvedValue({
    ...source,
    quote: { ...source.quote, job_id: null },
  });
  history.mockResolvedValue({ revisions: [revision], next_before: null });
  const ui = screen();
  await ui.findByText('Prepare new pricing proposal');
  expect(ui.queryByText('Submit for customer review')).toBeNull();
  expect(ui.getByText(/Publication requires a quote/)).toBeTruthy();
});
it('does not offer republishing an already reviewed proposal', async () => {
  history.mockResolvedValue({
    revisions: [{ ...revision, amendment: { status: 'rejected' } }],
    next_before: null,
  });
  const ui = screen();
  await ui.findByText('Customer review: rejected');
  expect(ui.queryByText('Submit for customer review')).toBeNull();
});
it('fails closed on missing history and recovers with refresh', async () => {
  history.mockRejectedValueOnce(new Error('History unavailable'));
  const ui = screen();
  await ui.findByText('History unavailable');
  expect(ui.queryByText('Prepare new pricing proposal')).toBeNull();
  expect(ui.queryByText('No revisions recorded yet.')).toBeNull();
  await act(async () => {
    fireEvent.press(ui.getByText('Refresh quote and history'));
  });
  expect(ui.getByText('Prepare new pricing proposal')).toBeTruthy();
});
it('appends older revisions without dropping the current page', async () => {
  history
    .mockResolvedValueOnce({ revisions: [revision], next_before: 2 })
    .mockResolvedValueOnce({
      revisions: [{ ...revision, id: 'old', revision_number: 1 }],
      next_before: null,
    });
  const ui = screen();
  fireEvent.press(await ui.findByText('Load older revisions'));
  await ui.findByText('Revision 1: Prepared proposal');
  expect(ui.getByText('Revision 2: Prepared proposal')).toBeTruthy();
  expect(history).toHaveBeenLastCalledWith('quote', 2);
});
it('blocks removal during a save and explains uncertain outcomes before allowing leave', async () => {
  let fail!: (err: Error) => void;
  prepare.mockReturnValueOnce(
    new Promise((_resolve, reject) => {
      fail = reject;
    })
  );
  const ui = screen();
  await edit(ui);
  fireEvent.press(ui.getByText('Save proposal'));
  const action = { type: 'GO_BACK' };
  mockDirty.mock.calls.at(-1)[1]({ data: { action } });
  expect(Alert.alert).toHaveBeenLastCalledWith(
    'Saving proposal',
    expect.any(String)
  );
  expect(mockLeave).not.toHaveBeenCalled();
  await act(async () => fail(new Error('Connection lost')));
  mockDirty.mock.calls.at(-1)[1]({ data: { action } });
  const alert = (Alert.alert as jest.Mock).mock.calls.at(-1);
  expect(alert[1]).toContain('may already be saved');
  alert[2][1].onPress();
  expect(mockLeave).toHaveBeenCalledWith(action);
});
it('rejects zero totals and a missing reason before any save', async () => {
  const ui = screen();
  await edit(ui);
  fireEvent.changeText(ui.getByLabelText('Reason for amendment'), '   ');
  fireEvent.press(ui.getByText('Save proposal'));
  expect(prepare).not.toHaveBeenCalled();
  fireEvent.changeText(ui.getByLabelText('Reason for amendment'), 'Change');
  fireEvent.changeText(ui.getByLabelText('Item 1 unit price'), '0');
  fireEvent.press(ui.getByText('Save proposal'));
  expect(prepare).not.toHaveBeenCalled();
  expect(ui.getByText(/must be greater than zero/)).toBeTruthy();
});
it('does not offer amendment preparation for a draft', async () => {
  sourceRead.mockResolvedValue({
    ...source,
    quote: { ...source.quote, status: 'draft' },
  });
  const ui = screen();
  await ui.findByText(/requires an accepted quote/);
  expect(ui.queryByText('Prepare new pricing proposal')).toBeNull();
  expect(ui.getByText('Source quote total: £100.00')).toBeTruthy();
});
