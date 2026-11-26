import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { AssessmentMaintenanceHandoff } from '../AssessmentMaintenanceHandoff';

const mockGet = jest.fn();
const mockPost = jest.fn();
jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

const endpoint =
  '/api/properties/property-a/assessments/assessment-a/portfolio-ticket';
const ticket = { id: 'ticket-a', org_id: 'workspace-a' };

beforeEach(() => jest.resetAllMocks());

it('creates an internal task from a reviewed source and opens the exact receipt', async () => {
  mockGet.mockResolvedValue({ canCreate: true, ticket: null });
  mockPost.mockResolvedValue({ ticket });
  const openTicket = jest.fn();
  const view = render(
    <AssessmentMaintenanceHandoff
      propertyId='property-a'
      assessmentId='assessment-a'
      openTicket={openTicket}
    />
  );
  fireEvent.press(await view.findByText('Create internal maintenance task'));
  fireEvent.changeText(
    view.getByLabelText('Task title'),
    'Check kitchen window'
  );
  fireEvent.changeText(
    view.getByLabelText('Room, reviewed finding and next action'),
    'Kitchen: failed seal; inspect and replace.'
  );
  fireEvent.press(view.getByText('Save internal task'));
  expect(mockGet).toHaveBeenCalledWith(endpoint);
  await waitFor(() =>
    expect(mockPost).toHaveBeenCalledWith(endpoint, {
      title: 'Check kitchen window',
      description: 'Kitchen: failed seal; inspect and replace.',
      priority: 'medium',
    })
  );
  fireEvent.press(await view.findByText('Open maintenance task'));
  expect(openTicket).toHaveBeenCalledWith(ticket);
});

it('does not offer creation while the evidence still needs review', async () => {
  mockGet.mockResolvedValue({
    canCreate: false,
    ticket: null,
    reason: 'Review this assessment first.',
  });
  const view = render(
    <AssessmentMaintenanceHandoff
      propertyId='property-a'
      assessmentId='assessment-a'
      openTicket={jest.fn()}
    />
  );
  expect(await view.findByText('Review this assessment first.')).toBeTruthy();
  expect(view.queryByText('Create internal maintenance task')).toBeNull();
  expect(mockPost).not.toHaveBeenCalled();
});

it('preserves the draft after an unconfirmed save and can recover the existing task', async () => {
  mockGet
    .mockResolvedValueOnce({ canCreate: true, ticket: null })
    .mockResolvedValueOnce({ canCreate: false, ticket });
  mockPost.mockRejectedValue(new Error('Network'));
  const view = render(
    <AssessmentMaintenanceHandoff
      propertyId='property-a'
      assessmentId='assessment-a'
      openTicket={jest.fn()}
    />
  );
  fireEvent.press(await view.findByText('Create internal maintenance task'));
  fireEvent.changeText(
    view.getByLabelText('Task title'),
    'Check kitchen window'
  );
  fireEvent.changeText(
    view.getByLabelText('Room, reviewed finding and next action'),
    'Kitchen: failed seal; inspect and replace.'
  );
  fireEvent.press(view.getByText('Save internal task'));
  expect(await view.findByText(/your draft is still here/i)).toBeTruthy();
  expect(view.getByLabelText('Task title').props.value).toBe(
    'Check kitchen window'
  );
  fireEvent.press(view.getByText('Recheck handoff'));
  expect(await view.findByText('Open maintenance task')).toBeTruthy();
});
