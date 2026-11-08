import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ActionFollowup } from '../components/ActionFollowup';
const mockGet = jest.fn(),
  mockPatch = jest.fn();
jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));
beforeEach(() => {
  jest.resetAllMocks();
  mockGet.mockResolvedValue({
    followup: {
      revision: 3,
      assigned_to: null,
      due_at: null,
      waiting_for: 'manager',
    },
    people: [],
    updates: [],
  });
});
it('retains an existing timestamp when editing only the note', async () => {
  mockGet.mockResolvedValue({
    followup: {
      revision: 3,
      assigned_to: null,
      due_at: '2026-07-15T23:30:00Z',
      waiting_for: 'manager',
    },
    people: [],
    updates: [],
  });
  mockPatch.mockResolvedValue({ followup: { revision: 4 } });
  const view = render(
    <ActionFollowup
      propertyId='property'
      sourceId='job'
      kind='job'
      onSaved={jest.fn()}
    />
  );
  fireEvent.changeText(
    await view.findByLabelText('Internal update'),
    'Keep deadline'
  );
  expect(view.getByDisplayValue('2026-07-16')).toBeTruthy();
  fireEvent.press(view.getByText('Save follow-up'));
  await waitFor(() =>
    expect(mockPatch).toHaveBeenCalledWith(
      '/api/properties/property/followups',
      expect.objectContaining({ dueAt: '2026-07-15T23:30:00Z' })
    )
  );
});
it('does not report success for a malformed save response', async () => {
  mockPatch.mockResolvedValue({});
  const onSaved = jest.fn();
  const view = render(
    <ActionFollowup
      propertyId='property'
      sourceId='job'
      kind='job'
      onSaved={onSaved}
    />
  );
  fireEvent.changeText(
    await view.findByLabelText('Internal update'),
    'Keep note'
  );
  fireEvent.press(view.getByText('Save follow-up'));
  await view.findByText(/Save could not be confirmed/);
  fireEvent.press(view.getByText('Save follow-up'));
  expect(mockPatch).toHaveBeenCalledTimes(1);
  expect(onSaved).not.toHaveBeenCalled();
  expect(view.getByDisplayValue('Keep note')).toBeTruthy();
});
it('clears the previous property draft and ignores its late load', async () => {
  let resolve!: (value: unknown) => void;
  mockGet.mockReturnValueOnce(
    new Promise((r) => {
      resolve = r;
    })
  );
  const onSaved = jest.fn();
  const view = render(
    <ActionFollowup
      propertyId='first'
      sourceId='job'
      kind='job'
      onSaved={onSaved}
    />
  );
  view.rerender(
    <ActionFollowup
      propertyId='second'
      sourceId='job'
      kind='job'
      onSaved={onSaved}
    />
  );
  fireEvent.changeText(
    await view.findByLabelText('Internal update'),
    'Second property'
  );
  resolve({
    followup: { revision: 10, due_at: '2026-12-01T00:00:00Z' },
    people: [],
    updates: [],
  });
  await waitFor(() =>
    expect(view.getByDisplayValue('Second property')).toBeTruthy()
  );
  expect(view.queryByDisplayValue('2026-12-01')).toBeNull();
});
it('preserves the typed note when a save is rejected', async () => {
  mockPatch.mockRejectedValue(new Error('conflict'));
  const onSaved = jest.fn();
  const view = render(
    <ActionFollowup
      propertyId='property'
      sourceId='job'
      kind='job'
      onSaved={onSaved}
    />
  );
  await waitFor(() =>
    expect(view.getByLabelText('Internal update')).toBeTruthy()
  );
  fireEvent.changeText(
    view.getByLabelText('Internal update'),
    'Keep this note'
  );
  fireEvent.press(view.getByText('Save follow-up'));
  await waitFor(() =>
    expect(view.getByText(/Save could not be confirmed/)).toBeTruthy()
  );
  expect(view.getByDisplayValue('Keep this note')).toBeTruthy();
  expect(onSaved).not.toHaveBeenCalled();
});
it.each(['2026-02-30', '2026-02-29', '2026-04-31'])(
  'rejects an impossible follow-up date %s without writing',
  async (date) => {
    const view = render(
      <ActionFollowup
        propertyId='property'
        sourceId='job'
        kind='job'
        onSaved={jest.fn()}
      />
    );
    fireEvent.changeText(
      await view.findByLabelText('Follow-up date (UK date)'),
      date
    );
    fireEvent.press(view.getByText('Save follow-up'));
    expect(
      view.getByText('Enter a valid calendar date as YYYY-MM-DD.')
    ).toBeTruthy();
    expect(mockPatch).not.toHaveBeenCalled();
  }
);
it('uses London summer time for a changed date', async () => {
  mockPatch.mockResolvedValue({ followup: { revision: 4 } });
  const view = render(
    <ActionFollowup
      propertyId='property'
      sourceId='job'
      kind='job'
      onSaved={jest.fn()}
    />
  );
  fireEvent.changeText(
    await view.findByLabelText('Follow-up date (UK date)'),
    '2026-07-15'
  );
  fireEvent.press(view.getByText('Save follow-up'));
  await waitFor(() =>
    expect(mockPatch).toHaveBeenCalledWith(
      '/api/properties/property/followups',
      expect.objectContaining({ dueAt: '2026-07-15T22:59:59.000Z' })
    )
  );
});
it('blocks a stale revision, retains the note, and reloads the current revision', async () => {
  mockPatch.mockRejectedValue({ statusCode: 409 });
  const onSaved = jest.fn();
  const view = render(
    <ActionFollowup
      propertyId='property'
      sourceId='job'
      kind='job'
      onSaved={onSaved}
    />
  );
  fireEvent.changeText(
    await view.findByLabelText('Internal update'),
    'Keep my note'
  );
  fireEvent.press(view.getByText('Save follow-up'));
  await view.findByText(/This follow-up changed/);
  fireEvent.press(view.getByText('Save follow-up'));
  expect(mockPatch).toHaveBeenCalledTimes(1);
  expect(view.getByDisplayValue('Keep my note')).toBeTruthy();
  mockGet.mockResolvedValue({
    followup: {
      revision: 4,
      assigned_to: null,
      due_at: null,
      waiting_for: 'tenant',
    },
    people: [],
    updates: [],
  });
  fireEvent.press(view.getByText('Reload follow-up'));
  await view.findByText('✓ Tenant');
  mockPatch.mockResolvedValue({ followup: { revision: 5 } });
  fireEvent.press(view.getByText('Save follow-up'));
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  expect(mockPatch.mock.calls[1][1]).toMatchObject({
    revision: 4,
    note: 'Keep my note',
    waitingFor: 'tenant',
  });
});
it('sends the loaded revision and notifies the queue only after a successful save', async () => {
  mockPatch.mockResolvedValue({ followup: { revision: 4 } });
  const onSaved = jest.fn();
  const view = render(
    <ActionFollowup
      propertyId='property'
      sourceId='job'
      kind='job'
      onSaved={onSaved}
    />
  );
  await waitFor(() =>
    expect(view.getByLabelText('Internal update')).toBeTruthy()
  );
  fireEvent.changeText(view.getByLabelText('Internal update'), 'Updated');
  fireEvent.press(view.getByText('Save follow-up'));
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  expect(mockPatch).toHaveBeenCalledWith(
    '/api/properties/property/followups',
    expect.objectContaining({ revision: 3, note: 'Updated', sourceId: 'job' })
  );
});
