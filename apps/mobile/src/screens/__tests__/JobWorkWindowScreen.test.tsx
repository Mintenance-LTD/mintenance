import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JobWorkWindowScreen } from '../JobWorkWindowScreen';
import { mobileApiClient } from '../../utils/mobileApiClient';

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'homeowner' } }),
}));
jest.mock('../../utils/mobileApiClient', () => ({
  mobileApiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));
jest.mock('../../components/shared', () => ({
  ErrorView: () => null,
  LoadingSpinner: () => null,
  ScreenHeader: () => null,
}));

it('flags an invalid saved work window and blocks reversed or equal dates before sending', async () => {
  jest.mocked(mobileApiClient.get).mockResolvedValue({
    scheduled_start_date: '2026-11-28T15:00:00Z',
    scheduled_end_date: '2026-11-25T15:00:00Z',
    scheduled_duration_hours: null,
    active: true,
    proposal: null,
  });
  jest.mocked(mobileApiClient.post).mockResolvedValue({});
  const client = new QueryClient({
    defaultOptions: { queries: { gcTime: 0 } },
  });
  const ui = render(
    <QueryClientProvider client={client}>
      <JobWorkWindowScreen
        route={{
          key: 'window',
          name: 'JobWorkWindow',
          params: { jobId: 'job' },
        }}
        navigation={
          { goBack: jest.fn() } as React.ComponentProps<
            typeof JobWorkWindowScreen
          >['navigation']
        }
      />
    </QueryClientProvider>
  );
  expect(await ui.findByText(/saved end time is invalid/)).toBeTruthy();
  fireEvent.press(ui.getByText('Propose new dates'));
  fireEvent.changeText(
    ui.getByLabelText('Start date and time (UK)'),
    '2027-01-14 10:00'
  );
  for (const end of ['2027-01-13 11:00', '2027-01-14 10:00']) {
    fireEvent.changeText(ui.getByLabelText('End date and time (UK)'), end);
    expect(ui.getByText('End time must be after start time.')).toBeTruthy();
    fireEvent.press(ui.getByText('Send proposal'));
    expect(mobileApiClient.post).not.toHaveBeenCalled();
  }

  fireEvent.changeText(
    ui.getByLabelText('End date and time (UK)'),
    '2027-01-14 11:00'
  );
  expect(ui.queryByText('End time must be after start time.')).toBeNull();
  fireEvent.press(ui.getByText('Send proposal'));
  await waitFor(() =>
    expect(mobileApiClient.post).toHaveBeenCalledWith(
      '/api/jobs/job/schedule',
      { uk_start: '2027-01-14T10:00', uk_end: '2027-01-14T11:00' }
    )
  );
  ui.unmount();
  client.clear();
});
