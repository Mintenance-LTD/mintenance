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
  jest.clearAllMocks();
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
    expect(view.getByText(/Save failed or another manager/)).toBeTruthy()
  );
  expect(view.getByDisplayValue('Keep this note')).toBeTruthy();
  expect(onSaved).not.toHaveBeenCalled();
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
