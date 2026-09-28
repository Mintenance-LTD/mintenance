import React from 'react';
import { Alert, Linking } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DisputeDetailsScreen } from '../DisputeDetailsScreen';
import { readDispute, safeEvidenceUrl } from '../../services/DisputeReader';
import { PaymentCard } from '../payment/components/PaymentHistoryCard';
import { JobQuickActions } from '../job-details/components/JobQuickActions';

const mockGet = jest.fn();
let mockUser: { id: string } | null = { id: 'actor' };
jest.mock('../../utils/mobileApiClient', () => ({
  mobileApiClient: { get: (...args: unknown[]) => mockGet(...args) },
}));
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => {
    const ReactModule = jest.requireActual('react');
    ReactModule.useEffect(callback, [callback]);
  },
}));
jest.mock('../../components/shared', () => {
  const { Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    ScreenHeader: () => null,
    LoadingSpinner: () => <Text>Loading</Text>,
    ErrorView: ({
      message,
      onRetry,
    }: {
      message: string;
      onRetry: () => void;
    }) => (
      <TouchableOpacity onPress={onRetry}>
        <Text>{message}</Text>
        <Text>Try Again</Text>
      </TouchableOpacity>
    ),
  };
});

const escrowId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const jobId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const recordId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const url =
  'https://storage.example.test/storage/v1/object/sign/job-attachments/job/disputes/actor/photo.jpg?token=fresh';
const record = {
  id: escrowId,
  job_id: jobId,
  status: 'disputed',
  dispute_record_id: recordId,
  dispute_record_status: 'open',
  dispute_reason: 'quality',
  description:
    'Work differs from agreement.\n\nEvidence:\n1. private-reference',
  resolution: null,
  dispute_evidence: [{ label: 'Evidence 1', url }],
};
beforeEach(() => {
  mockGet.mockReset().mockResolvedValue(record);
  mockUser = { id: 'actor' };
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://storage.example.test';
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

function screen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const content = () => (
    <QueryClientProvider client={client}>
      <DisputeDetailsScreen
        route={{ params: { escrowId } } as never}
        navigation={{ goBack: jest.fn() } as never}
      />
    </QueryClientProvider>
  );
  return { ...render(content()), content };
}

it('shows the statement and unavailable evidence without exposing raw storage references', async () => {
  mockGet.mockResolvedValue({
    ...record,
    archived: true,
    status: 'archived',
    dispute_evidence: [{ label: 'Evidence 1', url: null }],
  });
  const view = screen();
  await view.findByText('Retained dispute record');
  expect(view.getByText('Work differs from agreement.')).toBeTruthy();
  expect(
    view.getByText('Evidence 1 is unavailable. Refresh to retry.')
  ).toBeTruthy();
  expect(view.queryByText(/private-reference/)).toBeNull();
  expect(view.getByText(/Archived does not mean/)).toBeTruthy();
});

it('renews authorization and the URL before opening an attachment', async () => {
  const view = screen();
  await view.findByLabelText('Open Evidence 1');
  const freshUrl = url.replace('fresh', 'renewed');
  mockGet.mockResolvedValue({
    ...record,
    dispute_evidence: [{ label: 'Evidence 1', url: freshUrl }],
  });
  fireEvent.press(view.getByLabelText('Open Evidence 1'));
  await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith(freshUrl));
  expect(Linking.openURL).not.toHaveBeenCalledWith(url);
});

it('hides stale details and never opens cached evidence when renewed access fails', async () => {
  const view = screen();
  await view.findByLabelText('Open Evidence 1');
  mockGet.mockRejectedValue(new Error('denied'));
  fireEvent.press(view.getByLabelText('Open Evidence 1'));
  await view.findByText('Try Again');
  expect(Linking.openURL).not.toHaveBeenCalled();
  expect(view.queryByText('Work differs from agreement.')).toBeNull();
  mockGet.mockResolvedValue(record);
  fireEvent.press(view.getByText('Try Again'));
  await view.findByText('Work differs from agreement.');
});

it('does not open evidence after the signed-in account changes during renewal', async () => {
  const view = screen();
  await view.findByLabelText('Open Evidence 1');
  let finish!: (value: unknown) => void;
  mockGet.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  fireEvent.press(view.getByLabelText('Open Evidence 1'));
  await waitFor(() => expect(finish).toBeDefined());
  mockUser = null;
  view.rerender(view.content());
  await act(async () => finish(record));
  expect(Linking.openURL).not.toHaveBeenCalled();
  expect(view.getByText('Please sign in to view this dispute.')).toBeTruthy();
});

it('shows an empty state only for a successful lookup with no record', async () => {
  mockGet.mockResolvedValue({
    ...record,
    status: 'held',
    dispute_record_id: null,
  });
  const view = screen();
  await view.findByText('No dispute record is available for this payment.');
});

it('offers a direct dispute entry for a disputed payment and the job quick action', () => {
  const onDisputePress = jest.fn();
  const payment = {
    id: escrowId,
    jobId,
    jobTitle: 'Synthetic job',
    amount: 10,
    status: 'disputed',
    createdAt: '2026-09-24',
  };
  const view = render(
    <PaymentCard payment={payment} onDisputePress={onDisputePress} />
  );
  fireEvent.press(view.getByLabelText('View dispute record'));
  expect(onDisputePress).toHaveBeenCalledWith(payment);
  const onDisputeDetailsPress = jest.fn();
  const actions = render(
    <JobQuickActions
      jobId={jobId}
      jobTitle='Synthetic job'
      status='disputed'
      isOwner={false}
      canApprove={false}
      isCompletionConfirmedByHomeowner={false}
      onTimelinePress={jest.fn()}
      onEditPress={jest.fn()}
      onSignOffPress={jest.fn()}
      onDisputePress={jest.fn()}
      onDisputeDetailsPress={onDisputeDetailsPress}
    />
  );
  fireEvent.press(actions.getByText('View Dispute Record'));
  expect(onDisputeDetailsPress).toHaveBeenCalledTimes(1);
});

it('rejects mismatched and malformed records instead of showing a false empty state', async () => {
  mockGet.mockResolvedValue({ ...record, id: recordId });
  await expect(readDispute({ escrowId })).rejects.toThrow();
  mockGet.mockResolvedValue({});
  await expect(readDispute({ escrowId })).rejects.toThrow();
  mockGet.mockResolvedValue({ ...record, dispute_record_id: null });
  await expect(readDispute({ escrowId })).rejects.toThrow();
});

it('resolves job entry through the authorized escrow API and validates the linked job', async () => {
  mockGet
    .mockResolvedValueOnce({ escrow: { id: escrowId } })
    .mockResolvedValueOnce(record);
  expect(await readDispute({ jobId })).toEqual(record);
  expect(mockGet).toHaveBeenNthCalledWith(1, `/api/jobs/${jobId}/escrow`, {
    signal: undefined,
  });
  expect(mockGet).toHaveBeenNthCalledWith(2, `/api/disputes/${escrowId}`, {
    signal: undefined,
  });
  mockGet.mockResolvedValueOnce({ escrow: null });
  expect(await readDispute({ jobId })).toBeNull();
});

it.each([
  'https://storage.example.test.attacker.test/storage/v1/object/sign/job-attachments/photo',
  'https://user:pass@storage.example.test/storage/v1/object/sign/job-attachments/photo',
  'http://storage.example.test/storage/v1/object/sign/job-attachments/photo',
  'file:///private/photo',
  'https://storage.example.test/storage/v1/object/public/job-attachments/photo',
])('does not open an unsafe evidence URL: %s', (value) => {
  expect(safeEvidenceUrl(value)).toBeNull();
});
