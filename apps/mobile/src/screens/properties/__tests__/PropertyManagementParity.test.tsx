import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ComplianceCertificates } from '../components/ComplianceCertificates';
import { RecurringMaintenance } from '../components/RecurringMaintenance';
import { SpendingAnalytics } from '../components/SpendingAnalytics';
import {
  isOpenPropertyJob,
  PROPERTY_JOB_STATUS_LABELS,
} from '@mintenance/shared';
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockUser = { id: 'owner' };
jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
const clients: QueryClient[] = [];
function wrap(node: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  clients.push(client);
  return render(
    <QueryClientProvider client={client}>{node}</QueryClientProvider>
  );
}
beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  mockUser.id = 'owner';
});
afterEach(() => clients.splice(0).forEach((client) => client.clear()));
it('shows a certificate connection failure with retry, not invented missing certificates', async () => {
  mockGet
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({ certificates: [] });
  const view = wrap(<ComplianceCertificates propertyId='property' />);
  await waitFor(() =>
    expect(
      view.getByText('Could not load certificates. Tap to retry.')
    ).toBeTruthy()
  );
  expect(view.queryByText('Gas Safety')).toBeNull();
  fireEvent.press(view.getByLabelText('Retry loading certificates'));
  await waitFor(() =>
    expect(
      view.getByText('No certificate records have been added.')
    ).toBeTruthy()
  );
});
it('preserves separate room certificate records and supports search', async () => {
  mockGet.mockResolvedValue({
    certificates: [
      {
        id: 'one',
        cert_type: 'gas_safety',
        certificate_number: 'CERT-1',
        issuer_name: 'Alpha',
      },
      {
        id: 'two',
        cert_type: 'gas_safety',
        certificate_number: 'CERT-2',
        issuer_name: 'Beta',
      },
    ],
  });
  const view = wrap(<ComplianceCertificates propertyId='property' />);
  await waitFor(() => expect(view.getByText('Number: CERT-2')).toBeTruthy());
  fireEvent.changeText(view.getByLabelText('Search certificates'), 'Alpha');
  expect(view.getByText('Number: CERT-1')).toBeTruthy();
  expect(view.queryByText('Number: CERT-2')).toBeNull();
});
it('uses the selected first due date and suppresses duplicate create taps', async () => {
  mockGet.mockResolvedValue({ schedules: [] });
  let finish!: (value: unknown) => void;
  mockPost.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  const view = wrap(<RecurringMaintenance propertyId='property' />);
  fireEvent.press(view.getByLabelText('Add recurring schedule'));
  fireEvent.changeText(
    view.getByLabelText('Schedule title'),
    'Synthetic maintenance'
  );
  fireEvent.changeText(
    view.getByLabelText('First due date, YYYY-MM-DD'),
    '2026-12-15'
  );
  fireEvent.press(view.getByText('Add Schedule'));
  fireEvent.press(view.getByText('Add Schedule'));
  await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
  expect(mockPost).toHaveBeenCalledWith(
    '/api/properties/property/recurring-maintenance',
    expect.objectContaining({
      next_due_date: '2026-12-15',
      frequency: 'monthly',
    })
  );
  await act(async () =>
    finish({ schedule: { id: 'schedule', property_id: 'property' } })
  );
});
it('uses shared open statuses and describes budgets by creation date', () => {
  expect(isOpenPropertyJob('posted')).toBe(true);
  expect(isOpenPropertyJob('disputed')).toBe(true);
  expect(isOpenPropertyJob('draft')).toBe(false);
  expect(PROPERTY_JOB_STATUS_LABELS.assigned).toBe('Assigned');
  const view = render(
    <SpendingAnalytics
      jobs={[
        {
          id: 'job',
          status: 'completed',
          budget: 100,
          created_at: new Date().toISOString(),
        },
      ]}
    />
  );
  expect(view.getByText('COMPLETED-JOB BUDGETS')).toBeTruthy();
  expect(
    view.getByText('Grouped by job creation month, not payment date.')
  ).toBeTruthy();
});

it('rejects an impossible due date without sending a schedule', async () => {
  mockGet.mockResolvedValue({ schedules: [] });
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const view = wrap(<RecurringMaintenance propertyId='property' />);
  fireEvent.press(view.getByLabelText('Add recurring schedule'));
  fireEvent.changeText(
    view.getByLabelText('Schedule title'),
    'Synthetic maintenance'
  );
  fireEvent.changeText(
    view.getByLabelText('First due date, YYYY-MM-DD'),
    '2026-02-30'
  );
  fireEvent.press(view.getByText('Add Schedule'));
  expect(mockPost).not.toHaveBeenCalled();
  expect(alert).toHaveBeenCalled();
  expect(view.getByDisplayValue('2026-02-30')).toBeTruthy();
  alert.mockRestore();
});

it('preserves schedule input when the server does not confirm the created record', async () => {
  mockGet.mockResolvedValue({ schedules: [] });
  mockPost.mockResolvedValue({});
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const view = wrap(<RecurringMaintenance propertyId='property' />);
  fireEvent.press(view.getByLabelText('Add recurring schedule'));
  fireEvent.changeText(
    view.getByLabelText('Schedule title'),
    'Synthetic maintenance'
  );
  fireEvent.changeText(
    view.getByLabelText('First due date, YYYY-MM-DD'),
    '2026-12-15'
  );
  fireEvent.press(view.getByText('Add Schedule'));
  await waitFor(() =>
    expect(alert).toHaveBeenCalledWith(
      'Error',
      expect.stringContaining('could not be confirmed')
    )
  );
  expect(view.getByDisplayValue('Synthetic maintenance')).toBeTruthy();
  expect(view.getByDisplayValue('2026-12-15')).toBeTruthy();
  alert.mockRestore();
});
