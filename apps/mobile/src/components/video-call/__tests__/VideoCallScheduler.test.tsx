import React from 'react';
import { Alert, Platform } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import VideoCallScheduler from '../VideoCallScheduler';
import { mobileApiClient } from '../../../utils/mobileApiClient';
jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    post: jest.fn(),
    get: jest.fn().mockResolvedValue({ calls: [] }),
    delete: jest.fn(),
  },
}));
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user', first_name: 'Alex' } }),
}));
jest.mock('../../../utils/haptics', () => ({
  __esModule: true,
  default: { light: jest.fn(), medium: jest.fn() },
}));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
const post = mobileApiClient.post as jest.Mock;
const props = {
  jobId: 'job',
  otherUserId: 'other',
  otherUserName: 'Sam',
  isVisible: true,
  onClose: jest.fn(),
  onScheduled: jest.fn(),
};
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
it('schedules an ordinary phone call through the authenticated API', async () => {
  post.mockResolvedValue({ id: 'saved' });
  const screen = render(<VideoCallScheduler {...props} />);
  expect(screen.getByText('A reminder to call by phone')).toBeTruthy();
  fireEvent.press(screen.getByText('Schedule Call'));
  await waitFor(() =>
    expect(props.onScheduled).toHaveBeenCalledWith('saved', expect.any(Date))
  );
  expect(post).toHaveBeenCalledWith(
    '/api/phone-calls',
    expect.objectContaining({
      jobId: 'job',
      otherUserId: 'other',
      purpose: 'consultation',
      requestId: expect.stringMatching(/^[a-f0-9-]{36}$/),
    })
  );
});
it('keeps the request ID when retrying a failed save', async () => {
  post
    .mockRejectedValueOnce(new Error('Network failure'))
    .mockResolvedValueOnce({ id: 'saved' });
  const screen = render(<VideoCallScheduler {...props} />);
  fireEvent.press(screen.getByText('Schedule Call'));
  await waitFor(() =>
    expect(Alert.alert).toHaveBeenCalledWith(
      'Scheduling Failed',
      expect.any(String),
      expect.any(Array)
    )
  );
  fireEvent.press(screen.getByText('Schedule Call'));
  await waitFor(() => expect(props.onScheduled).toHaveBeenCalled());
  expect(post.mock.calls[0][1].requestId).toBe(post.mock.calls[1][1].requestId);
});

it('chooses both a date and time on Android before scheduling', async () => {
  const originalOS = Platform.OS;
  Platform.OS = 'android';
  try {
    post.mockResolvedValue({ id: 'saved' });
    const screen = render(<VideoCallScheduler {...props} />);
    fireEvent.press(screen.getByLabelText('Choose call date and time'));
    expect(screen.getByTestId('call-date-time-picker').props.mode).toBe('date');
    const date = new Date(Date.now() + 86400000);
    fireEvent(
      screen.getByTestId('call-date-time-picker'),
      'onChange',
      { type: 'set' },
      date
    );
    expect(screen.getByTestId('call-date-time-picker').props.mode).toBe('time');
    date.setHours(14, 30, 0, 0);
    fireEvent(
      screen.getByTestId('call-date-time-picker'),
      'onChange',
      { type: 'set' },
      date
    );
    expect(screen.queryByTestId('call-date-time-picker')).toBeNull();
    fireEvent.press(screen.getByText('Schedule Call'));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        '/api/phone-calls',
        expect.objectContaining({ scheduledTime: date.toISOString() })
      )
    );
  } finally {
    Platform.OS = originalOS;
  }
});
