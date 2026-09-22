import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { DisputeScreen } from '../DisputeScreen';

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockUpload = jest.fn();
const mockSign = jest.fn();
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'actor' } }),
}));
jest.mock('../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));
jest.mock('../../config/supabase', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: (...args: unknown[]) => mockUpload(...args),
        createSignedUrl: (...args: unknown[]) => mockSign(...args),
      }),
    },
  },
}));
jest.mock('../../components/shared', () => ({
  ScreenHeader: () => null,
  LoadingSpinner: () => null,
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('expo-image-picker', () => ({
  MediaTypeOptions: { Images: 'images' },
  requestMediaLibraryPermissionsAsync: async () => ({ status: 'granted' }),
  launchImageLibraryAsync: async () => ({
    canceled: false,
    assets: [{ uri: 'file:///evidence.jpg' }],
  }),
}));
const originalFetch = global.fetch;
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockGet.mockResolvedValue({ escrow: { id: 'escrow' } });
  mockPost.mockResolvedValue({
    disputeId: 'escrow',
    disputeRecordId: 'record',
  });
  mockUpload.mockResolvedValue({ error: null });
  mockSign.mockResolvedValue({
    data: { signedUrl: 'https://example.test/evidence' },
    error: null,
  });
  global.fetch = jest.fn().mockResolvedValue({
    blob: async () => ({ arrayBuffer: async () => new ArrayBuffer(1) }),
  });
});
afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

function form() {
  const view = render(
    <DisputeScreen
      route={{ params: { jobId: 'job', jobTitle: 'Synthetic job' } } as never}
      navigation={{ goBack: jest.fn() } as never}
    />
  );
  fireEvent.press(view.getByLabelText('Dispute reason: Work Quality'));
  fireEvent.changeText(
    view.getByLabelText('Describe the dispute'),
    'The completed work does not match our agreement.'
  );
  return view;
}

it('never reports success for an unconfirmed response and preserves the description', async () => {
  mockPost.mockResolvedValue({});
  const view = form();
  fireEvent.press(view.getByLabelText('Submit dispute'));
  await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
  await act(async () => {});
  expect(Alert.alert).not.toHaveBeenCalled();
  expect(view.getByLabelText('Describe the dispute').props.value).toContain(
    'does not match'
  );
});

it('blocks a second tap while submission is pending', async () => {
  let finish!: (value: unknown) => void;
  mockGet.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const view = form();
  const button = view.getByLabelText('Submit dispute');
  act(() => {
    fireEvent.press(button);
    fireEvent.press(button);
  });
  expect(mockGet).toHaveBeenCalledTimes(1);
  await act(async () => finish({ escrow: { id: 'escrow' } }));
  expect(mockPost).toHaveBeenCalledTimes(1);
  expect(Alert.alert).toHaveBeenCalledWith(
    'Dispute Submitted',
    expect.any(String),
    expect.any(Array)
  );
});

it('does not submit after evidence fails and reuses uploaded evidence after an uncertain response', async () => {
  const view = form();
  await act(async () =>
    fireEvent.press(view.getByLabelText('Add evidence photos'))
  );
  mockUpload.mockResolvedValueOnce({ error: { message: 'offline' } });
  await act(async () => fireEvent.press(view.getByLabelText('Submit dispute')));
  expect(mockPost).not.toHaveBeenCalled();
  expect(Alert.alert).not.toHaveBeenCalled();
  mockPost.mockRejectedValueOnce(new Error('connection interrupted'));
  await act(async () => fireEvent.press(view.getByLabelText('Submit dispute')));
  expect(mockPost).toHaveBeenCalledTimes(1);
  await act(async () => fireEvent.press(view.getByLabelText('Submit dispute')));
  expect(mockPost).toHaveBeenCalledTimes(2);
  expect(mockPost.mock.calls[1]).toEqual(mockPost.mock.calls[0]);
  expect(mockUpload).toHaveBeenCalledTimes(2);
  expect(mockSign).not.toHaveBeenCalled();
  expect(mockPost.mock.calls[0][1].evidence[0]).toMatch(
    /^job-attachments:job\/disputes\/actor\//
  );
});
